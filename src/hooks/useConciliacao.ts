import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

/* ── Types ── */
export interface MovimentacaoExtraida {
  id: string;
  documento_id: string;
  data_movimentacao: string;
  descricao: string;
  valor: number;
  tipo_movimentacao: string;
  saldo: number | null;
  categoria_sugerida: string;
  score_confianca: number;
  score_duplicidade: number;
  status_revisao: string;
  transacao_id: string | null;
  created_at: string;
}

export interface Transacao {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  forma_pagamento: string;
  conta_id: string;
  observacoes: string;
  referencia: string;
  origem_tipo: string | null;
  origem_id: string | null;
  conciliado: boolean;
  conciliado_em: string | null;
}

export interface Conciliacao {
  id: string;
  movimentacao_extraida_id: string;
  transacao_id: string | null;
  status_conciliacao: string;
  score_compatibilidade: number;
  tipo_conciliacao: string;
  motivo_matching: string;
  observacoes: string;
  conciliado_por: string | null;
  conciliado_em: string | null;
  desfeito_por: string | null;
  desfeito_em: string | null;
  motivo_desfazer: string;
  created_at: string;
  updated_at: string;
}

export interface Sugestao {
  id: string;
  movimentacao_extraida_id: string;
  transacao_id: string;
  score_compatibilidade: number;
  motivo_matching: string;
  status_sugestao: string;
  transacao?: Transacao;
}

export interface ConciliacaoStats {
  total: number;
  conciliado: number;
  pendente: number;
  divergente: number;
  duplicidade: number;
  taxaAutomacao: number;
}

/* ── Matching Engine ── */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

function textSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().trim(), nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

export function calcMatchScore(
  mov: MovimentacaoExtraida,
  tx: Transacao
): { score: number; motivos: string[] } {
  const motivos: string[] = [];
  let score = 0;

  // Value match (40 pts)
  if (Math.abs(mov.valor - tx.valor) < 0.01) {
    score += 40;
    motivos.push("Valor exato");
  } else if (Math.abs(mov.valor - tx.valor) / Math.max(mov.valor, tx.valor) < 0.02) {
    score += 25;
    motivos.push("Valor muito próximo");
  }

  // Date match (30 pts)
  const dMov = new Date(mov.data_movimentacao).getTime();
  const dTx = new Date(tx.data).getTime();
  const diffDays = Math.abs(dMov - dTx) / 86400000;
  if (diffDays === 0) {
    score += 30;
    motivos.push("Mesma data");
  } else if (diffDays <= 1) {
    score += 25;
    motivos.push("Data próxima (±1 dia)");
  } else if (diffDays <= 3) {
    score += 15;
    motivos.push("Data próxima (±3 dias)");
  }

  // Type compatibility (15 pts)
  const movTipo = mov.tipo_movimentacao.toLowerCase();
  const txTipo = tx.tipo.toLowerCase();
  const compatible =
    (movTipo.includes("entrada") && txTipo.includes("entrada")) ||
    (movTipo.includes("saida") && txTipo.includes("saída")) ||
    (movTipo.includes("saída") && txTipo.includes("saída")) ||
    (movTipo.includes("saida") && txTipo.includes("saida"));
  if (compatible) {
    score += 15;
    motivos.push("Tipo compatível");
  }

  // Description similarity (15 pts)
  const sim = textSimilarity(mov.descricao, tx.descricao);
  if (sim > 0.7) {
    score += 15;
    motivos.push("Descrição semelhante");
  } else if (sim > 0.4) {
    score += 8;
    motivos.push("Descrição parcialmente semelhante");
  }

  return { score: Math.min(score, 100), motivos };
}

/* ── Hook ── */
export function useConciliacao() {
  const { user } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoExtraida[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [conciliacoes, setConciliacoes] = useState<Conciliacao[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ConciliacaoStats>({
    total: 0, conciliado: 0, pendente: 0, divergente: 0, duplicidade: 0, taxaAutomacao: 0,
  });

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [movRes, txRes, concRes, sugRes] = await Promise.all([
        supabase.from("obra_movimentacoes_extraidas").select("*").eq("user_id", user.id).order("data_movimentacao", { ascending: false }),
        supabase.from("obra_transacoes_fluxo").select("*").eq("user_id", user.id).is("deleted_at", null).order("data", { ascending: false }),
        supabase.from("obra_conciliacoes_bancarias").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("obra_sugestoes_conciliacao").select("*").eq("user_id", user.id).order("score_compatibilidade", { ascending: false }),
      ]);

      const movs = (movRes.data || []) as MovimentacaoExtraida[];
      const txs = (txRes.data || []) as Transacao[];
      const concs = (concRes.data || []) as Conciliacao[];
      const sugs = (sugRes.data || []) as Sugestao[];

      setMovimentacoes(movs);
      setTransacoes(txs);
      setConciliacoes(concs);
      setSugestoes(sugs);

      // Stats
      const conciliados = concs.filter(c => c.status_conciliacao.includes("conciliado"));
      const pendentes = concs.filter(c => ["nao_analisado", "pendente", "sugestao_disponivel"].includes(c.status_conciliacao));
      const divergentes = concs.filter(c => c.status_conciliacao === "divergente");
      const duplicados = concs.filter(c => c.status_conciliacao === "duplicidade_suspeita");
      const autoConc = conciliados.filter(c => c.tipo_conciliacao === "automatica");

      setStats({
        total: movs.length,
        conciliado: conciliados.length,
        pendente: movs.length - conciliados.length,
        divergente: divergentes.length,
        duplicidade: duplicados.length,
        taxaAutomacao: conciliados.length > 0 ? (autoConc.length / conciliados.length) * 100 : 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Run matching engine */
  const runMatching = useCallback(async () => {
    if (!user) return;
    const concMovIds = new Set(conciliacoes.filter(c => !["desfeita"].includes(c.status_conciliacao)).map(c => c.movimentacao_extraida_id));
    const concTxIds = new Set(conciliacoes.filter(c => c.status_conciliacao.includes("conciliado")).map(c => c.transacao_id));
    const pendingMovs = movimentacoes.filter(m => !concMovIds.has(m.id));
    const availableTxs = transacoes.filter(t => !concTxIds.has(t.id));

    let created = 0;
    for (const mov of pendingMovs) {
      const candidates: { tx: Transacao; score: number; motivos: string[] }[] = [];
      for (const tx of availableTxs) {
        const { score, motivos } = calcMatchScore(mov, tx);
        if (score >= 50) candidates.push({ tx, score, motivos });
      }
      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length === 1 && candidates[0].score >= 95) {
        // Auto conciliar
        const c = candidates[0];
        await supabase.from("obra_conciliacoes_bancarias").insert({
          user_id: user.id,
          movimentacao_extraida_id: mov.id,
          transacao_id: c.tx.id,
          status_conciliacao: "conciliado_automaticamente",
          score_compatibilidade: c.score,
          tipo_conciliacao: "automatica",
          motivo_matching: c.motivos.join("; "),
          conciliado_por: user.id,
          conciliado_em: new Date().toISOString(),
        });
        await supabase.from("obra_transacoes_fluxo").update({ conciliado: true, conciliado_em: new Date().toISOString() }).eq("id", c.tx.id);
        created++;
      } else if (candidates.length > 0) {
        // Criar sugestões
        for (const c of candidates.slice(0, 3)) {
          await supabase.from("obra_sugestoes_conciliacao").insert({
            user_id: user.id,
            movimentacao_extraida_id: mov.id,
            transacao_id: c.tx.id,
            score_compatibilidade: c.score,
            motivo_matching: c.motivos.join("; "),
          });
        }
        // Criar conciliação com status sugestão
        await supabase.from("obra_conciliacoes_bancarias").insert({
          user_id: user.id,
          movimentacao_extraida_id: mov.id,
          status_conciliacao: candidates[0].score >= 75 ? "sugestao_disponivel" : "pendente",
          score_compatibilidade: candidates[0].score,
          tipo_conciliacao: "",
          motivo_matching: candidates[0].motivos.join("; "),
        });
        created++;
      } else {
        await supabase.from("obra_conciliacoes_bancarias").insert({
          user_id: user.id,
          movimentacao_extraida_id: mov.id,
          status_conciliacao: "pendente",
          score_compatibilidade: 0,
          tipo_conciliacao: "",
          motivo_matching: "Nenhuma correspondência encontrada",
        });
        created++;
      }
    }

    toast.success(`Análise concluída: ${created} movimentações processadas`);
    await fetchAll();
  }, [user, movimentacoes, transacoes, conciliacoes, fetchAll]);

  /* Manual conciliation */
  const conciliarManual = useCallback(async (movId: string, txId: string, obs: string = "") => {
    if (!user) return;
    // Update or insert
    const existing = conciliacoes.find(c => c.movimentacao_extraida_id === movId && !["desfeita"].includes(c.status_conciliacao));
    if (existing) {
      await supabase.from("obra_conciliacoes_bancarias").update({
        transacao_id: txId,
        status_conciliacao: "conciliado_manualmente",
        tipo_conciliacao: "manual",
        conciliado_por: user.id,
        conciliado_em: new Date().toISOString(),
        observacoes: obs,
      }).eq("id", existing.id);
      await supabase.from("obra_eventos_conciliacao").insert({
        user_id: user.id,
        conciliacao_id: existing.id,
        acao: "conciliacao_manual",
        detalhes: { movimentacao_id: movId, transacao_id: txId },
      });
    } else {
      const { data } = await supabase.from("obra_conciliacoes_bancarias").insert({
        user_id: user.id,
        movimentacao_extraida_id: movId,
        transacao_id: txId,
        status_conciliacao: "conciliado_manualmente",
        tipo_conciliacao: "manual",
        conciliado_por: user.id,
        conciliado_em: new Date().toISOString(),
        observacoes: obs,
      }).select("id").single();
      if (data) {
        await supabase.from("obra_eventos_conciliacao").insert({
          user_id: user.id,
          conciliacao_id: data.id,
          acao: "conciliacao_manual",
          detalhes: { movimentacao_id: movId, transacao_id: txId },
        });
      }
    }
    await supabase.from("obra_transacoes_fluxo").update({ conciliado: true, conciliado_em: new Date().toISOString() }).eq("id", txId);
    toast.success("Conciliação realizada com sucesso");
    await fetchAll();
  }, [user, conciliacoes, fetchAll]);

  /* Undo conciliation */
  const desfazerConciliacao = useCallback(async (concId: string, motivo: string) => {
    if (!user) return;
    const conc = conciliacoes.find(c => c.id === concId);
    if (!conc) return;
    await supabase.from("obra_conciliacoes_bancarias").update({
      status_conciliacao: "desfeita",
      desfeito_por: user.id,
      desfeito_em: new Date().toISOString(),
      motivo_desfazer: motivo,
    }).eq("id", concId);
    if (conc.transacao_id) {
      await supabase.from("obra_transacoes_fluxo").update({ conciliado: false, conciliado_em: null }).eq("id", conc.transacao_id);
    }
    await supabase.from("obra_eventos_conciliacao").insert({
      user_id: user.id,
      conciliacao_id: concId,
      acao: "desfazer_conciliacao",
      detalhes: { motivo },
    });
    toast.success("Conciliação desfeita");
    await fetchAll();
  }, [user, conciliacoes, fetchAll]);

  /* Mark as divergent */
  const marcarDivergente = useCallback(async (concId: string, obs: string) => {
    if (!user) return;
    await supabase.from("obra_conciliacoes_bancarias").update({
      status_conciliacao: "divergente",
      observacoes: obs,
    }).eq("id", concId);
    await supabase.from("obra_eventos_conciliacao").insert({
      user_id: user.id,
      conciliacao_id: concId,
      acao: "marcar_divergente",
      detalhes: { observacoes: obs },
    });
    toast.success("Marcado como divergente");
    await fetchAll();
  }, [user, fetchAll]);

  /* Create transaction from movimentacao */
  const criarTransacaoDeMov = useCallback(async (movId: string, contaId: string, categoria: string) => {
    if (!user) return;
    const mov = movimentacoes.find(m => m.id === movId);
    if (!mov) return;
    const { data: tx } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: user.id,
      tipo: mov.tipo_movimentacao === "entrada" ? "Entrada" : "Saída",
      descricao: mov.descricao,
      categoria: categoria || mov.categoria_sugerida,
      valor: mov.valor,
      data: mov.data_movimentacao,
      forma_pagamento: "",
      conta_id: contaId,
      observacoes: `Criado via conciliação bancária`,
      recorrencia: "Única",
      referencia: `CONC-${movId.slice(0, 8)}`,
      origem_tipo: "conciliacao",
      origem_id: movId,
      conciliado: true,
      conciliado_em: new Date().toISOString(),
    }).select("id").single();

    if (tx) {
      await conciliarManual(movId, tx.id, "Transação criada via conciliação");
    }
    toast.success("Transação criada e conciliada");
  }, [user, movimentacoes, conciliarManual]);

  return {
    movimentacoes,
    transacoes,
    conciliacoes,
    sugestoes,
    stats,
    loading,
    fetchAll,
    runMatching,
    conciliarManual,
    desfazerConciliacao,
    marcarDivergente,
    criarTransacaoDeMov,
  };
}
