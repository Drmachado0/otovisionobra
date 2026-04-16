import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

function addFrequency(date: Date, freq: string): Date {
  const d = new Date(date);
  switch (freq) {
    case "Semanal": d.setDate(d.getDate() + 7); break;
    case "Quinzenal": d.setDate(d.getDate() + 14); break;
    case "Mensal": d.setMonth(d.getMonth() + 1); break;
    case "Trimestral": d.setMonth(d.getMonth() + 3); break;
    case "Anual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export function useRecurringTransactions(onGenerated?: () => void) {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        // Fetch all "mother" recurring transactions that are active
        const { data: mothers } = await supabase
          .from("obra_transacoes_fluxo")
          .select("*")
          .eq("user_id", user.id)
          .eq("recorrencia_ativa", true)
          .eq("recorrencia_mae", true)
          .not("recorrencia_frequencia", "is", null)
          .is("deleted_at", null);

        if (!mothers?.length) return;

        const templates = mothers as any[];

        let generated = 0;

        for (const tpl of templates) {
          const freq = tpl.recorrencia_frequencia || tpl.recorrencia;
          if (!freq || freq === "Única") continue;

          const grupoId = tpl.recorrencia_grupo_id || tpl.id;
          const startDate = new Date(tpl.data);
          const endDate = tpl.recorrencia_fim ? new Date(tpl.recorrencia_fim) : null;
          const maxOcc = tpl.recorrencia_max_ocorrencias || null;
          let occCreated = tpl.recorrencia_ocorrencias_criadas || 0;

          // Find all existing children
          const { data: children } = await supabase
            .from("obra_transacoes_fluxo")
            .select("data")
            .eq("recorrencia_grupo_id", grupoId)
            .neq("id", tpl.id)
            .is("deleted_at", null);

          const existingDates = new Set((children || []).map((c: any) => c.data?.split("T")[0]));

          // Calculate dates that should exist
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          let nextDate = addFrequency(startDate, freq);
          const toInsert: string[] = [];

          while (nextDate <= today) {
            if (endDate && nextDate > endDate) break;
            if (maxOcc && (occCreated + toInsert.length) >= maxOcc) break;

            const dateStr = toDateStr(nextDate);
            if (!existingDates.has(dateStr)) {
              toInsert.push(dateStr);
            }
            nextDate = addFrequency(nextDate, freq);
          }

          if (toInsert.length > 0) {
            const inserts = toInsert.map(d => ({
              user_id: user.id,
              tipo: tpl.tipo,
              valor: tpl.valor,
              data: d,
              categoria: tpl.categoria,
              descricao: tpl.descricao,
              forma_pagamento: tpl.forma_pagamento,
              observacoes: tpl.observacoes || "",
              recorrencia: freq,
              recorrencia_grupo_id: grupoId,
              recorrencia_frequencia: freq,
              referencia: tpl.referencia || "",
              conta_id: tpl.conta_id || "",
              origem_tipo: "recorrente",
              recorrencia_mae: false,
            }));

            const { error } = await supabase.from("obra_transacoes_fluxo").insert(inserts as any);
            if (!error) {
              generated += toInsert.length;
              occCreated += toInsert.length;

              // Update mother
              const shouldDeactivate =
                (maxOcc && occCreated >= maxOcc) ||
                (endDate && nextDate > endDate);

              await supabase
                .from("obra_transacoes_fluxo")
                .update({
                  recorrencia_ocorrencias_criadas: occCreated,
                  ...(shouldDeactivate ? { recorrencia_ativa: false } : {}),
                } as any)
                .eq("id", tpl.id);
            }
          }

          // Check if should deactivate (even if nothing to insert)
          if (maxOcc && occCreated >= maxOcc) {
            await supabase.from("obra_transacoes_fluxo").update({ recorrencia_ativa: false } as any).eq("id", tpl.id);
          }
          if (endDate && new Date() > endDate) {
            await supabase.from("obra_transacoes_fluxo").update({ recorrencia_ativa: false } as any).eq("id", tpl.id);
          }
        }

        if (generated > 0) {
          onGenerated?.();
        }
      } catch (err) {
        console.error("Recurring transactions error:", err);
      }
    })();
  }, [user]);
}
