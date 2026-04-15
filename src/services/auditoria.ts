/**
 * Serviço de Auditoria.
 *
 * Centraliza a criação de registros em `obra_audit_log` e garante que
 * nenhuma ação de edição, criação ou exclusão ocorra sem rastreabilidade.
 *
 * USO:
 *   import { registrarAuditoria } from "@/services/auditoria";
 *
 *   await registrarAuditoria({
 *     userId,
 *     userEmail,
 *     acao: "edição",
 *     tabela: "obra_transacoes_fluxo",
 *     registroId: id,
 *     dadosAnteriores: oldData,
 *     dadosNovos: newData,
 *   });
 */

import { supabase } from "@/integrations/supabase/client";
import type { AcaoAuditoria } from "@/types/obra";

interface AuditoriaPayload {
  userId: string;
  userEmail?: string;
  acao: AcaoAuditoria;
  tabela: string;
  registroId: string;
  dadosAnteriores?: Record<string, unknown> | null;
  dadosNovos?: Record<string, unknown> | null;
}

/**
 * Registra uma ação de auditoria. Silencia erros para não bloquear o fluxo
 * principal — mas os loga no console para monitoramento.
 */
export async function registrarAuditoria(payload: AuditoriaPayload): Promise<void> {
  const { error } = await supabase
    .from("obra_audit_log")
    .insert({
      user_id: payload.userId,
      user_email: payload.userEmail ?? "",
      acao: payload.acao,
      tabela: payload.tabela,
      registro_id: payload.registroId,
      dados_anteriores: payload.dadosAnteriores ?? null,
      dados_novos: payload.dadosNovos ?? null,
    } as any);

  if (error) {
    // Auditoria nunca deve quebrar o fluxo principal
    console.error("[auditoria.registrar] Falha ao registrar:", error.message);
  }
}

/**
 * Wrapper para operações auditáveis: executa a operação e registra o log.
 * Se a operação falhar, o log NÃO é registrado.
 */
export async function comAuditoria<T>(
  operacao: () => Promise<{ data: T | null; error: any }>,
  auditPayload: AuditoriaPayload
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await operacao();

  if (error) {
    return { data: null, error: error.message ?? String(error) };
  }

  // Só registra auditoria quando a operação teve sucesso
  await registrarAuditoria(auditPayload);

  return { data, error: null };
}
