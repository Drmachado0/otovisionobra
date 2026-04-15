/**
 * Serviço de Transações / Fluxo de Caixa.
 *
 * Centraliza todas as queries de `obra_transacoes_fluxo` com:
 * - tipagem explícita
 * - tratamento consistente de erros
 * - soft delete respeitado em todas as queries
 */

import { supabase } from "@/integrations/supabase/client";
import type { Transacao, OrigemTipo } from "@/types/obra";

export type TransacaoInsert = Omit<
  Transacao,
  "id" | "created_at" | "deleted_at" | "conciliado" | "conciliado_em"
>;

export interface ListTransacoesOptions {
  userId?: string;
  tipo?: "Entrada" | "Saída";
  categoria?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listTransacoes(
  opts: ListTransacoesOptions = {}
): Promise<{ data: Transacao[]; count: number; error: string | null }> {
  const { tipo, categoria, dateFrom, dateTo, search, page = 0, pageSize = 50 } = opts;

  let query = supabase
    .from("obra_transacoes_fluxo")
    .select(
      "id, user_id, tipo, valor, data, categoria, descricao, forma_pagamento, observacoes, origem_tipo, origem_id, conciliado, conciliado_em, recorrencia, conta_id, referencia, etapa_id, created_at",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("data", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);
  if (categoria && categoria !== "todos") query = query.eq("categoria", categoria);
  if (dateFrom) query = query.gte("data", dateFrom);
  if (dateTo) query = query.lte("data", dateTo);
  if (search) query = query.or(`descricao.ilike.%${search}%,categoria.ilike.%${search}%`);

  const from = page * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[transacoes.list]", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: (data as Transacao[]) ?? [], count: count ?? 0, error: null };
}

export async function getTotaisPorTipo(userId?: string): Promise<{
  totalEntradas: number;
  totalSaidas: number;
  error: string | null;
}> {
  let query = supabase
    .from("obra_transacoes_fluxo")
    .select("tipo, valor")
    .is("deleted_at", null);

  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    console.error("[transacoes.totais]", error);
    return { totalEntradas: 0, totalSaidas: 0, error: error.message };
  }

  const rows = data ?? [];
  const totalEntradas = rows
    .filter((t) => t.tipo === "Entrada")
    .reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = rows
    .filter((t) => t.tipo === "Saída")
    .reduce((s, t) => s + Number(t.valor), 0);

  return { totalEntradas, totalSaidas, error: null };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTransacao(
  payload: TransacaoInsert
): Promise<ServiceResult<Transacao>> {
  const { data, error } = await supabase
    .from("obra_transacoes_fluxo")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error("[transacoes.create]", error);
    return { data: null, error: error.message };
  }

  return { data: data as Transacao, error: null };
}

export async function updateTransacao(
  id: string,
  payload: Partial<TransacaoInsert>
): Promise<ServiceResult<Transacao>> {
  const { data, error } = await supabase
    .from("obra_transacoes_fluxo")
    .update(payload as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[transacoes.update]", error);
    return { data: null, error: error.message };
  }

  return { data: data as Transacao, error: null };
}

/** Soft delete — nunca exclui permanentemente */
export async function softDeleteTransacao(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("obra_transacoes_fluxo")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (error) {
    console.error("[transacoes.delete]", error);
    return { error: error.message };
  }

  return { error: null };
}
