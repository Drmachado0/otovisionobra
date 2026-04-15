/**
 * Hook para gestão do fluxo de caixa.
 * Centraliza fetch, paginação, realtime e totais de obra_transacoes_fluxo.
 */

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { listTransacoes, getTotaisPorTipo, type ListTransacoesOptions } from "@/services/transacoes";
import type { Transacao } from "@/types/obra";
import { toast } from "sonner";

const DEFAULT_PAGE_SIZE = 50;

export function useTransacoes(opts: ListTransacoesOptions = {}) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totais, setTotais] = useState({
    totalEntradas: 0,
    totalSaidas: 0,
  });

  const fetchTransacoes = useCallback(async () => {
    const { data, count, error: err } = await listTransacoes({
      ...opts,
      pageSize: opts.pageSize ?? DEFAULT_PAGE_SIZE,
    });

    if (err) {
      setError(err);
      toast.error("Erro ao carregar transações: " + err);
    } else {
      setTransacoes(data);
      setTotalCount(count);
      setError(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.tipo, opts.categoria, opts.dateFrom, opts.dateTo, opts.search, opts.page]);

  const fetchTotais = useCallback(async () => {
    const { totalEntradas, totalSaidas } = await getTotaisPorTipo();
    setTotais({ totalEntradas, totalSaidas });
  }, []);

  useEffect(() => {
    fetchTransacoes();
    fetchTotais();
  }, [fetchTransacoes, fetchTotais]);

  useRealtimeSubscription("obra_transacoes_fluxo", () => {
    fetchTransacoes();
    fetchTotais();
  });

  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.ceil(totalCount / pageSize);
  const saldo = totais.totalEntradas - totais.totalSaidas;

  return {
    transacoes,
    totalCount,
    totalPages,
    loading,
    error,
    totais: { ...totais, saldo },
    refetch: fetchTransacoes,
  };
}
