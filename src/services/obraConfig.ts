/**
 * Serviço de configuração da obra.
 *
 * Centraliza leitura/escrita de `obra_config`.
 * Usado por Dashboard, Comissão, Previsão, Insights, Relatórios e Configurações
 * — que atualmente duplicam a mesma query com .maybeSingle().
 */

import { supabase } from "@/integrations/supabase/client";
import type { ObraConfig } from "@/types/obra";
import type { ServiceResult } from "./transacoes";

const DEFAULTS: ObraConfig = {
  nome_obra: "",
  endereco: "",
  responsavel: "",
  contato_responsavel: "",
  area_construida: 0,
  orcamento_total: 0,
  data_inicio: "",
  data_termino: "",
  percentual_comissao: 8,
  categorias: [],
  formas_pagamento: [],
};

export async function getObraConfig(): Promise<ServiceResult<ObraConfig>> {
  const { data, error } = await supabase
    .from("obra_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[obraConfig.get]", error);
    return { data: DEFAULTS, error: error.message };
  }

  // Garante valores padrão para campos ausentes no banco
  const config: ObraConfig = {
    ...DEFAULTS,
    ...(data as any),
    percentual_comissao: (data as any)?.percentual_comissao ?? 8,
  };

  return { data: config, error: null };
}

export async function upsertObraConfig(
  payload: Partial<ObraConfig> & { user_id: string }
): Promise<ServiceResult<ObraConfig>> {
  const { data, error } = await supabase
    .from("obra_config")
    .upsert(payload as any, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[obraConfig.upsert]", error);
    return { data: null, error: error.message };
  }

  return { data: data as ObraConfig, error: null };
}

/** Lê somente o percentual de comissão (com fallback 8%) */
export async function getPercentualComissao(): Promise<number> {
  const { data } = await supabase
    .from("obra_config")
    .select("percentual_comissao")
    .limit(1)
    .maybeSingle();

  return (data as any)?.percentual_comissao ?? 8;
}
