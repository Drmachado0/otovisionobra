/**
 * Hook para gestão de compras.
 * Centraliza fetch, realtime e operações de escrita de obra_compras.
 */

import { useCallback, useEffect, useState } from "react";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { listCompras, updateStatusCompra, softDeleteCompra, type ListComprasOptions } from "@/services/compras";
import type { Compra, StatusCompra } from "@/types/obra";
import { toast } from "sonner";

export function useCompras(opts: ListComprasOptions = {}) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompras = useCallback(async () => {
    const { data, error: err } = await listCompras(opts);
    if (err) {
      setError(err);
    } else {
      setCompras(data);
      setError(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.search, opts.status, opts.categoria, opts.etapaId]);

  useEffect(() => { fetchCompras(); }, [fetchCompras]);
  useRealtimeSubscription("obra_compras", fetchCompras);

  const changeStatus = async (id: string, status: StatusCompra) => {
    const { error: err } = await updateStatusCompra(id, status);
    if (err) {
      toast.error("Erro ao atualizar status: " + err);
    } else {
      toast.success("Status atualizado");
      fetchCompras();
    }
  };

  const removeCompra = async (id: string) => {
    const { error: err } = await softDeleteCompra(id);
    if (err) {
      toast.error("Erro ao excluir compra: " + err);
    } else {
      toast.success("Compra excluída");
      fetchCompras();
    }
  };

  const totais = {
    total: compras.reduce((s, c) => s + Number(c.valor), 0),
    entregue: compras
      .filter((c) => c.status === "Entregue")
      .reduce((s, c) => s + Number(c.valor), 0),
    pendente: compras
      .filter((c) => c.status !== "Entregue" && c.status !== "Cancelada")
      .reduce((s, c) => s + Number(c.valor), 0),
  };

  return { compras, loading, error, totais, refetch: fetchCompras, changeStatus, removeCompra };
}
