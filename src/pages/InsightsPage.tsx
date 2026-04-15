import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useObraConfig } from "@/hooks/useObraConfig";
import { formatCurrency } from "@/lib/formatters";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Zap,
  CheckCircle2,
} from "lucide-react";

interface Insight {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  icon: any;
  title: string;
  message: string;
  priority: "alta" | "media" | "baixa";
}

export default function InsightsPage() {
  const { config } = useObraConfig();
  const orcamento = config.orcamento_total;
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [transRes, etapasRes, comRes] = await Promise.all([
      supabase.from("obra_transacoes_fluxo").select("tipo, valor, categoria, data").is("deleted_at", null),
      supabase.from("obra_cronograma").select("nome, custo_previsto, custo_real, status, percentual_conclusao, fim_previsto"),
      supabase.from("obra_comissao_pagamentos").select("valor, pago").is("deleted_at", null),
    ]);
    const firstError = transRes.error ?? etapasRes.error ?? comRes.error;
    if (firstError) {
      setFetchError(firstError.message);
    } else {
      if (transRes.data) setTransacoes(transRes.data);
      if (etapasRes.data) setEtapas(etapasRes.data);
      if (comRes.data) setComissoes(comRes.data);
      setFetchError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_cronograma", fetchData);

  const insights = useMemo(() => {
    const result: Insight[] = [];
    const totalGasto = transacoes.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
    const pctGasto = orcamento > 0 ? (totalGasto / orcamento) * 100 : 0;

    // Budget insights
    if (pctGasto > 100) {
      result.push({ id: "budget-over", type: "danger", icon: AlertTriangle, title: "Orçamento Ultrapassado", message: `O gasto total (${formatCurrency(totalGasto)}) ultrapassou o orçamento em ${formatCurrency(totalGasto - orcamento)}.`, priority: "alta" });
    } else if (pctGasto > 85) {
      result.push({ id: "budget-high", type: "warning", icon: TrendingUp, title: "Orçamento Próximo do Limite", message: `Já foram gastos ${pctGasto.toFixed(1)}% do orçamento. Restam ${formatCurrency(orcamento - totalGasto)}.`, priority: "alta" });
    }

    // Etapas atrasadas
    const atrasadas = etapas.filter(e => e.status !== "Concluída" && e.fim_previsto && new Date(e.fim_previsto) < new Date());
    if (atrasadas.length > 0) {
      result.push({ id: "etapas-late", type: "warning", icon: Clock, title: `${atrasadas.length} Etapa(s) Atrasada(s)`, message: `As etapas "${atrasadas.map(e => e.nome).join('", "')}" estão além do prazo previsto.`, priority: "alta" });
    }

    // Etapas acima do orçamento
    const acimaOrc = etapas.filter(e => e.custo_real > e.custo_previsto && e.custo_previsto > 0);
    if (acimaOrc.length > 0) {
      const totalExcesso = acimaOrc.reduce((s, e) => s + (e.custo_real - e.custo_previsto), 0);
      result.push({ id: "etapas-over", type: "danger", icon: DollarSign, title: `${acimaOrc.length} Etapa(s) Acima do Orçamento`, message: `Excesso total de ${formatCurrency(totalExcesso)} nas etapas "${acimaOrc.map(e => e.nome).join('", "')}".`, priority: "alta" });
    }

    // Comissão acumulada
    const comissaoPendente = comissoes.filter(c => !c.pago).reduce((s, c) => s + Number(c.valor), 0);
    if (comissaoPendente > 0) {
      result.push({ id: "comissao", type: "info", icon: DollarSign, title: "Comissão Pendente", message: `Há ${formatCurrency(comissaoPendente)} em comissões pendentes de pagamento.`, priority: comissaoPendente > 10000 ? "alta" : "media" });
    }

    // Top categorias
    const porCategoria: Record<string, number> = {};
    transacoes.filter(t => t.tipo === "Saída").forEach(t => {
      const cat = t.categoria || "Outros";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor);
    });
    const topCats = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topCats.length > 0) {
      result.push({ id: "top-cat", type: "info", icon: TrendingUp, title: "Maiores Gastos por Categoria", message: topCats.map(([nome, val]) => `${nome}: ${formatCurrency(val)}`).join(" | "), priority: "media" });
    }

    // Progresso da obra
    if (etapas.length > 0) {
      const progMedio = etapas.reduce((s, e) => s + e.percentual_conclusao, 0) / etapas.length;
      const concluidas = etapas.filter(e => e.status === "Concluída").length;
      result.push({ id: "progress", type: "success", icon: CheckCircle2, title: "Progresso da Obra", message: `${progMedio.toFixed(1)}% concluído. ${concluidas} de ${etapas.length} etapas finalizadas.`, priority: "baixa" });
    }

    // Projeção
    if (etapas.length > 0 && totalGasto > 0) {
      const progMedio = etapas.reduce((s, e) => s + e.percentual_conclusao, 0) / etapas.length;
      if (progMedio > 5) {
        const projecao = totalGasto / (progMedio / 100);
        if (projecao > orcamento * 1.05) {
          result.push({ id: "projecao", type: "warning", icon: Zap, title: "Tendência de Estouro", message: `No ritmo atual, o custo final estimado é ${formatCurrency(projecao)}, ${((projecao / orcamento - 1) * 100).toFixed(1)}% acima do orçamento.`, priority: "alta" });
        }
      }
    }

    return result.sort((a, b) => {
      const p = { alta: 0, media: 1, baixa: 2 };
      return p[a.priority] - p[b.priority];
    });
  }, [transacoes, etapas, comissoes, orcamento]);

  const typeConfig = {
    danger: { bg: "bg-destructive/10", border: "border-destructive/20", iconColor: "text-destructive" },
    warning: { bg: "bg-warning/10", border: "border-warning/20", iconColor: "text-warning" },
    info: { bg: "bg-info/10", border: "border-info/20", iconColor: "text-info" },
    success: { bg: "bg-success/10", border: "border-success/20", iconColor: "text-success" },
  };

  const priorityBadge = {
    alta: "bg-destructive/10 text-destructive",
    media: "bg-warning/10 text-warning",
    baixa: "bg-muted text-muted-foreground",
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-52 rounded bg-muted animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card p-5 h-20 animate-pulse" />)}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6 animate-slide-in">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" /> Centro de Inteligência
        </h1>
        <div className="glass-card p-6 flex items-center gap-4 border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Erro ao carregar dados</p>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
          </div>
          <button onClick={fetchData} className="text-xs text-primary hover:underline">Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-primary" /> Centro de Inteligência
        </h1>
        <p className="text-sm text-muted-foreground">Análise automática dos dados da obra</p>
      </div>

      {insights.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Tudo sob controle! Nenhum insight crítico no momento.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const cfg = typeConfig[insight.type];
            return (
              <div key={insight.id} className={`glass-card p-4 border-l-4 ${cfg.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <insight.icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{insight.title}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityBadge[insight.priority]}`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
