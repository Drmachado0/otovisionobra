import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const NOTIFICATION_TYPES = [
  "etapa_atrasada",
  "comissao_pendente",
  "parcela_vencendo",
  "nf_pendente",
  "orcamento_alerta",
] as const;

type NotificationType = (typeof NOTIFICATION_TYPES)[number];

async function getEnabledTypes(userId: string): Promise<Set<NotificationType>> {
  const { data } = await supabase
    .from("obra_notification_preferences")
    .select("tipo, enabled")
    .eq("user_id", userId);

  const disabled = new Set(
    (data || []).filter((p: any) => !p.enabled).map((p: any) => p.tipo)
  );

  return new Set(
    NOTIFICATION_TYPES.filter((t) => !disabled.has(t))
  );
}

async function getRecentNotifications(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("obra_notificacoes")
    .select("tipo, link")
    .eq("user_id", userId)
    .gte("created_at", since);
  return new Set((data || []).map((n: any) => `${n.tipo}::${n.link || ""}`));
}

async function insertNotification(
  userId: string,
  tipo: NotificationType,
  titulo: string,
  mensagem: string,
  prioridade: string,
  link?: string
) {
  await supabase.from("obra_notificacoes").insert({
    user_id: userId,
    tipo,
    titulo,
    mensagem,
    prioridade,
    link: link || "",
    status: "nao_lida",
  } as any);
}

async function checkEtapasAtrasadas(userId: string, existing: Set<string>) {
  const { data } = await supabase
    .from("obra_cronograma")
    .select("id, nome, fim_previsto, percentual_conclusao, status")
    .eq("user_id", userId)
    .lt("fim_previsto", new Date().toISOString())
    .lt("percentual_conclusao", 100)
    .neq("status", "Concluída");

  for (const etapa of data || []) {
    const key = `etapa_atrasada::/cronograma#${etapa.id}`;
    if (existing.has(key)) continue;
    await insertNotification(
      userId,
      "etapa_atrasada",
      `Etapa atrasada: ${etapa.nome}`,
      `A etapa "${etapa.nome}" passou do prazo (${new Date(etapa.fim_previsto).toLocaleDateString("pt-BR")}) com ${etapa.percentual_conclusao}% concluído.`,
      "alta",
      `/cronograma#${etapa.id}`
    );
  }
}

async function checkComissoesPendentes(userId: string, existing: Set<string>) {
  const { data } = await supabase
    .from("obra_comissao_pagamentos")
    .select("id, mes, valor")
    .eq("user_id", userId)
    .eq("pago", false)
    .is("deleted_at", null);

  if (!data?.length) return;
  const key = `comissao_pendente::/comissao`;
  if (existing.has(key)) return;

  await insertNotification(
    userId,
    "comissao_pendente",
    `${data.length} comissão(ões) pendente(s)`,
    `Existem ${data.length} comissões aguardando pagamento.`,
    "media",
    "/comissao"
  );
}

async function checkParcelasVencendo(userId: string, existing: Set<string>) {
  const { data } = await supabase
    .from("obra_compras")
    .select("id, fornecedor, parcelas")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  for (const compra of data || []) {
    const parcelas = Array.isArray(compra.parcelas) ? compra.parcelas : [];
    for (const p of parcelas as any[]) {
      if (p.status === "Paga" || !p.vencimento) continue;
      const venc = new Date(p.vencimento).getTime();
      const diff = venc - now;
      if (diff > 0 && diff <= threeDays) {
        const key = `parcela_vencendo::/compras#${compra.id}-p${p.numero}`;
        if (existing.has(key)) continue;
        await insertNotification(
          userId,
          "parcela_vencendo",
          `Parcela vencendo: ${compra.fornecedor}`,
          `Parcela ${p.numero} de ${compra.fornecedor} vence em ${new Date(p.vencimento).toLocaleDateString("pt-BR")}.`,
          "alta",
          `/compras#${compra.id}-p${p.numero}`
        );
      }
    }
  }
}

async function checkNfsPendentes(userId: string, existing: Set<string>) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("obra_notas_fiscais")
    .select("id, numero, fornecedor, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("status", "in", '("Ativa","Paga")')
    .lt("created_at", sevenDaysAgo);

  for (const nf of data || []) {
    const key = `nf_pendente::/notas-fiscais#${nf.id}`;
    if (existing.has(key)) continue;
    await insertNotification(
      userId,
      "nf_pendente",
      `NF pendente: ${nf.numero || nf.fornecedor}`,
      `A nota fiscal ${nf.numero} de ${nf.fornecedor} está com status "${nf.status}" há mais de 7 dias.`,
      "media",
      `/notas-fiscais#${nf.id}`
    );
  }
}

async function checkOrcamento(userId: string, existing: Set<string>) {
  const key = `orcamento_alerta::/fluxo`;
  if (existing.has(key)) return;

  const { data: config } = await supabase
    .from("obra_config")
    .select("orcamento_total")
    .eq("user_id", userId)
    .maybeSingle();

  if (!config?.orcamento_total || config.orcamento_total <= 0) return;

  const { data: transacoes } = await supabase
    .from("obra_transacoes_fluxo")
    .select("valor")
    .eq("user_id", userId)
    .eq("tipo", "Saída")
    .is("deleted_at", null);

  const totalGasto = (transacoes || []).reduce((s: number, t: any) => s + Number(t.valor || 0), 0);
  const pct = (totalGasto / config.orcamento_total) * 100;

  if (pct >= 80) {
    await insertNotification(
      userId,
      "orcamento_alerta",
      `Orçamento em ${pct.toFixed(0)}%`,
      `O total gasto (R$ ${totalGasto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) já atingiu ${pct.toFixed(1)}% do orçamento total.`,
      pct >= 95 ? "alta" : "media",
      "/fluxo"
    );
  }
}

export function useNotificationGenerator() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const enabledTypes = await getEnabledTypes(user.id);
        const existing = await getRecentNotifications(user.id);

        const checks: Promise<void>[] = [];
        if (enabledTypes.has("etapa_atrasada")) checks.push(checkEtapasAtrasadas(user.id, existing));
        if (enabledTypes.has("comissao_pendente")) checks.push(checkComissoesPendentes(user.id, existing));
        if (enabledTypes.has("parcela_vencendo")) checks.push(checkParcelasVencendo(user.id, existing));
        if (enabledTypes.has("nf_pendente")) checks.push(checkNfsPendentes(user.id, existing));
        if (enabledTypes.has("orcamento_alerta")) checks.push(checkOrcamento(user.id, existing));

        await Promise.allSettled(checks);
      } catch (err) {
        console.error("Notification generator error:", err);
      }
    })();
  }, [user]);
}
