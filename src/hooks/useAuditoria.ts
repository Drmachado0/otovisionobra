/**
 * Hook para registrar auditoria nas mutações.
 *
 * Encapsula `registrarAuditoria` do service com o contexto do usuário
 * já resolvido, facilitando o uso em qualquer componente/hook.
 *
 * Uso:
 *   const { auditar } = useAuditoria();
 *
 *   await auditar({
 *     acao: "edição",
 *     tabela: "obra_transacoes_fluxo",
 *     registroId: id,
 *     dadosAnteriores: antigo,
 *     dadosNovos: novo,
 *   });
 */

import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { registrarAuditoria } from "@/services/auditoria";
import type { AcaoAuditoria } from "@/types/obra";

interface AuditarPayload {
  acao: AcaoAuditoria;
  tabela: string;
  registroId: string;
  dadosAnteriores?: Record<string, unknown> | null;
  dadosNovos?: Record<string, unknown> | null;
}

export function useAuditoria() {
  const { user } = useAuth();

  const auditar = useCallback(
    async (payload: AuditarPayload) => {
      if (!user) return;
      await registrarAuditoria({
        userId: user.id,
        userEmail: user.email ?? "",
        ...payload,
      });
    },
    [user]
  );

  return { auditar };
}
