/**
 * Serviço de Compras.
 * Centraliza todas as queries de `obra_compras` com tipagem e error handling.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ServiceResult } from "./transacoes";

export interface CompraRow {
  id: string;
  user_id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
  numero_parcelas: number;
  parcelas: any;
  observacoes: string;
  nf_vinculada: string | null;
  conta_id: string | null;
  etapa_id: string | null;
  transacao_id: string | null;
  origem_tipo: string | null;
  deleted_at: string | null;
  created_at: string;
}

export type CompraInsert = Omit<CompraRow, "id" | "created_at" | "deleted_at">;

export async function listCompras(opts: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ data: CompraRow[]; count: number; error: string | null }> {
  const { search, status, page = 0, pageSize = 200 } = opts;

  let query = supabase
    .from("obra_compras")
    .select(
      "id, user_id, fornecedor, descricao, categoria, valor_total, data, status_entrega, forma_pagamento, numero_parcelas, parcelas, observacoes, nf_vinculada, conta_id, etapa_id, transacao_id, origem_tipo, created_at",
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("data", { ascending: false });

  if (search) {
    query = query.or(
      `fornecedor.ilike.%${search}%,descricao.ilike.%${search}%,categoria.ilike.%${search}%`
    );
  }
  if (status && status !== "todos") {
    query = query.eq("status_entrega", status);
  }

  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[compras.list]", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: (data as CompraRow[]) ?? [], count: count ?? 0, error: null };
}

export async function updateStatusCompra(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("obra_compras")
    .update({ status_entrega: status })
    .eq("id", id);

  if (error) {
    console.error("[compras.updateStatus]", error);
    return { error: error.message };
  }

  return { error: null };
}

export async function softDeleteCompra(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("obra_compras")
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (error) {
    console.error("[compras.delete]", error);
    return { error: error.message };
  }

  return { error: null };
}

export async function createCompra(
  payload: Partial<CompraInsert>
): Promise<ServiceResult<CompraRow>> {
  const { data, error } = await supabase
    .from("obra_compras")
    .insert(payload as any)
    .select()
    .single();

  if (error) {
    console.error("[compras.create]", error);
    return { data: null, error: error.message };
  }

  return { data: data as CompraRow, error: null };
}
