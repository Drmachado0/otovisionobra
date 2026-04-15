/**
 * Hook centralizado para leitura da configuração da obra.
 *
 * 5 páginas diferentes (Dashboard, Comissão, Previsão, Insights, Relatórios)
 * duplicam a mesma query `obra_config`. Este hook elimina essa duplicação,
 * cacheia o resultado e provê loading/error state consistente.
 */

import { useCallback, useEffect, useState } from "react";
import { getObraConfig } from "@/services/obraConfig";
import type { ObraConfig } from "@/types/obra";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

interface UseObraConfigReturn {
  config: ObraConfig;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_CONFIG: ObraConfig = {
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

export function useObraConfig(): UseObraConfigReturn {
  const [config, setConfig] = useState<ObraConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const { data, error: err } = await getObraConfig();
    if (err) {
      setError(err);
    } else if (data) {
      setConfig(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Atualiza em tempo real quando a config da obra é alterada
  useRealtimeSubscription("obra_config", fetchConfig);

  return { config, loading, error, refetch: fetchConfig };
}
