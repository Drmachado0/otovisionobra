/**
 * Serviço de Etapas / Cronograma.
 * Centraliza queries de `obra_cronograma` com tipagem e error handling.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Etapa, StatusEtapa } from "@/types/obra";
import type { ServiceResult } from "./transacoes";

export type EtapaInsert = Omit<Etapa, "id" | "created_at">;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listEtapas(): Promise<{ data: Etapa[]; error: string | null }> {
  const { data, error } = await supabase
    .from("obra_cronograma")
    .select("*")
    .order("inicio_previsto", { ascending: true });

  if (error) {
    console.error("[etapas.list]", error);
    return { data: [], error: error.message };
  }

  return { data: (data as Etapa[]) ?? [], error: null };
}

export async function getResumoEtapas(): Promise<{
  total: number;
  concluidas: number;
  atrasadas: number;
  custoTotalPrevisto: number;
  custoTotalReal: number;
  progressoMedio: number;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("obra_cronograma")
    .select("status, custo_previsto, custo_real, percentual_conclusao, fim_previsto");

  if (error) {
    console.error("[etapas.resumo]", error);
    return { total: 0, concluidas: 0, atrasadas: 0, custoTotalPrevisto: 0, custoTotalReal: 0, progressoMedio: 0, error: error.message };
  }

  const rows = data ?? [];
  const agora = new Date();
  return {
    total: rows.length,
    concluidas: rows.filter(e => e.status === "Concluída").length,
    atrasadas: rows.filter(e =>
      e.status !== "Concluída" && e.fim_previsto && new Date(e.fim_previsto) < agora
    ).length,
    custoTotalPrevisto: rows.reduce((s, e) => s + Number(e.custo_previsto ?? 0), 0),
    custoTotalReal: rows.reduce((s, e) => s + Number(e.custo_real ?? 0), 0),
    progressoMedio: rows.length > 0
      ? rows.reduce((s, e) => s + Number(e.percentual_conclusao ?? 0), 0) / rows.length
      : 0,
    error: null,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createEtapa(
  payload: Partial<EtapaInsert> & { user_id: string; nome: string }
): Promise<ServiceResult<Etapa>> {
  const { data, error } = await supabase
    .from("obra_cronograma")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error("[etapas.create]", error);
    return { data: null, error: error.message };
  }

  return { data: data as Etapa, error: null };
}

export async function updateEtapa(
  id: string,
  payload: Partial<EtapaInsert>
): Promise<ServiceResult<Etapa>> {
  const { data, error } = await supabase
    .from("obra_cronograma")
    .update(payload as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[etapas.update]", error);
    return { data: null, error: error.message };
  }

  return { data: data as Etapa, error: null };
}

export async function updateProgressoEtapa(
  id: string,
  percentual: number,
  status?: StatusEtapa
): Promise<{ error: string | null }> {
  const payload: any = { percentual_conclusao: Math.max(0, Math.min(100, percentual)) };

  // Auto-deriva status se não fornecido
  if (!status) {
    if (percentual >= 100) payload.status = "Concluída";
    else if (percentual > 0) payload.status = "Em andamento";
  } else {
    payload.status = status;
  }

  const { error } = await supabase
    .from("obra_cronograma")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[etapas.updateProgresso]", error);
    return { error: error.message };
  }

  return { error: null };
}

export async function deleteEtapa(id: string): Promise<{ error: string | null }> {
  // obra_cronograma não tem deleted_at na schema atual — usa DELETE físico
  // TODO: Adicionar deleted_at à tabela obra_cronograma para soft delete
  const { error } = await supabase
    .from("obra_cronograma")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[etapas.delete]", error);
    return { error: error.message };
  }

  return { error: null };
}
