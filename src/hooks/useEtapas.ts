/**
 * Hook para gestão de etapas do cronograma.
 * Centraliza fetch, realtime e operações de escrita de obra_cronograma.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { listEtapas, updateProgressoEtapa, deleteEtapa, getResumoEtapas } from "@/services/etapas";
import type { Etapa, StatusEtapa } from "@/types/obra";
import { toast } from "sonner";

export function useEtapas() {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEtapas = useCallback(async () => {
    const { data, error: err } = await listEtapas();
    if (err) {
      setError(err);
      toast.error("Erro ao carregar cronograma: " + err);
    } else {
      setEtapas(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEtapas(); }, [fetchEtapas]);
  useRealtimeSubscription("obra_cronograma", fetchEtapas);

  const updateProgresso = async (id: string, percentual: number, status?: StatusEtapa) => {
    const { error: err } = await updateProgressoEtapa(id, percentual, status);
    if (err) {
      toast.error("Erro ao atualizar progresso: " + err);
    } else {
      fetchEtapas();
    }
  };

  const removeEtapa = async (id: string) => {
    const { error: err } = await deleteEtapa(id);
    if (err) {
      toast.error("Erro ao excluir etapa: " + err);
    } else {
      toast.success("Etapa excluída");
      fetchEtapas();
    }
  };

  /** Métricas agregadas calculadas no cliente */
  const stats = useMemo(() => {
    const agora = new Date();
    const total = etapas.length;
    const concluidas = etapas.filter(e => e.status === "Concluída").length;
    const atrasadas = etapas.filter(e =>
      e.status !== "Concluída" && e.fim_previsto && new Date(e.fim_previsto) < agora
    ).length;
    const custoTotalPrevisto = etapas.reduce((s, e) => s + Number(e.custo_previsto ?? 0), 0);
    const custoTotalReal = etapas.reduce((s, e) => s + Number(e.custo_real ?? 0), 0);
    const progressoMedio = total > 0
      ? etapas.reduce((s, e) => s + Number(e.percentual_conclusao ?? 0), 0) / total
      : 0;
    const acimaOrcamento = etapas.filter(e =>
      Number(e.custo_previsto) > 0 && Number(e.custo_real) > Number(e.custo_previsto)
    ).length;

    return {
      total,
      concluidas,
      atrasadas,
      acimaOrcamento,
      custoTotalPrevisto,
      custoTotalReal,
      progressoMedio,
      variancaTotal: custoTotalReal - custoTotalPrevisto,
    };
  }, [etapas]);

  return { etapas, loading, error, stats, refetch: fetchEtapas, updateProgresso, removeEtapa };
}
