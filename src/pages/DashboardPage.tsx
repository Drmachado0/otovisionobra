import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Flame,
  Target,
  ShieldAlert,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TransacaoRow {
  tipo: string;
  valor: number;
  categoria: string;
  data: string;
  descricao: string;
}

interface ConfigRow {
  orcamento_total: number;
  area_construida: number;
  data_inicio: string;
}

export default function DashboardPage() {
  const [config, setConfig] = useState<ConfigRow>({ orcamento_total: 0, area_construida: 0, data_inicio: "" });
  const [totalGasto, setTotalGasto] = useState(0);
  const [transacoes, setTransacoes] = useState<TransacaoRow[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [configRes, transRes, etapasRes] = await Promise.all([
      supabase.from("obra_config").select("orcamento_total, area_construida, data_inicio").limit(1).maybeSingle(),
      supabase.from("obra_transacoes_fluxo").select("tipo, valor, categoria, data, descricao").is("deleted_at", null).order("data", { ascending: false }).limit(100),
      supabase.from("obra_cronograma").select("nome, custo_previsto, custo_real, status, percentual_conclusao, fim_previsto"),
    ]);
    if (configRes.data) setConfig(configRes.data as ConfigRow);
    if (transRes.data) {
      const rows = transRes.data as TransacaoRow[];
      setTransacoes(rows);
      setTotalGasto(rows.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0));
    }
    if (etapasRes.data) setEtapas(etapasRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_config", fetchData);
  useRealtimeSubscription("obra_cronograma", fetchData);

  const orcamentoTotal = config.orcamento_total;
  const saldo = orcamentoTotal - totalGasto;
  const percentual = orcamentoTotal > 0 ? (totalGasto / orcamentoTotal) * 100 : 0;

  const totalEntradas = transacoes.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
  const recentes = transacoes.slice(0, 5);

  // Advanced KPIs
  const kpis = useMemo(() => {
    const area = config.area_construida || 1;
    const custoM2 = totalGasto / area;

    // Burn rate: gasto por dia
    const inicio = config.data_inicio ? new Date(config.data_inicio) : null;
    const diasDecorridos = inicio ? Math.max(1, Math.floor((Date.now() - inicio.getTime()) / 86400000)) : 1;
    const burnRate = totalGasto / diasDecorridos;
    const diasRestantes = burnRate > 0 ? saldo / burnRate : 0;

    // Progresso etapas
    const progressoGeral = etapas.length > 0 ? etapas.reduce((s: number, e: any) => s + e.percentual_conclusao, 0) / etapas.length : 0;
    const etapasAtrasadas = etapas.filter((e: any) => e.status !== "Concluída" && e.fim_previsto && new Date(e.fim_previsto) < new Date()).length;

    // Risco
    const projecao = progressoGeral > 5 ? totalGasto / (progressoGeral / 100) : orcamentoTotal;
    const risco = projecao > orcamentoTotal * 1.1 ? "alto" : projecao > orcamentoTotal * 1.0 ? "medio" : "baixo";

    return { custoM2, burnRate, diasRestantes, progressoGeral, etapasAtrasadas, projecao, risco };
  }, [totalGasto, config, saldo, etapas, orcamentoTotal]);

  const alerts: string[] = [];
  if (percentual > 90) alerts.push("⚠️ Orçamento acima de 90%!");
  if (percentual > 100) alerts.push("🚨 Orçamento ULTRAPASSADO!");
  if (kpis.etapasAtrasadas > 0) alerts.push(`⏰ ${kpis.etapasAtrasadas} etapa(s) atrasada(s)`);

  const riscoConfig = {
    baixo: { label: "Baixo", color: "text-success", bg: "bg-success" },
    medio: { label: "Médio", color: "text-warning", bg: "bg-warning" },
    alto: { label: "Alto", color: "text-destructive", bg: "bg-destructive" },
  };
  const rc = riscoConfig[kpis.risco as keyof typeof riscoConfig];

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div><div className="h-7 w-40 rounded bg-muted animate-pulse" /><div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
              <div className="flex justify-between"><div className="h-3 w-20 rounded bg-muted" /><div className="h-5 w-5 rounded bg-muted" /></div>
              <div className="h-6 w-28 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Executivo</h1>
        <p className="text-sm text-muted-foreground">Visão macro da obra Otovision</p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard variant="info" label="Orçamento Total" value={formatCurrency(orcamentoTotal)} icon={<DollarSign className="w-5 h-5" />} />
        <StatCard variant="danger" label="Total Gasto" value={formatCurrency(totalGasto)} icon={<TrendingDown className="w-5 h-5" />} sub={`${formatPercent(percentual)} executado`} />
        <StatCard variant="success" label="Saldo Restante" value={formatCurrency(saldo)} icon={<Wallet className="w-5 h-5" />} />
        <StatCard variant="warning" label="Total Entradas" value={formatCurrency(totalEntradas)} icon={<Activity className="w-5 h-5" />} />
      </div>

      {/* Advanced KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card-primary p-4">
          <div className="flex items-center gap-2 mb-2">
            <Ruler className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo/m²</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(kpis.custoM2)}</p>
        </div>
        <div className="stat-card-warning p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-warning" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Burn Rate/dia</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(kpis.burnRate)}</p>
          <p className="text-[10px] text-muted-foreground">~{Math.round(kpis.diasRestantes)} dias restantes</p>
        </div>
        <div className="stat-card-info p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-info" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Projeção Final</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(kpis.projecao)}</p>
        </div>
        <div className="glass-card p-4 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${rc.bg}`} />
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className={`w-4 h-4 ${rc.color}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risco</span>
          </div>
          <p className={`text-lg font-bold ${rc.color}`}>{rc.label}</p>
          <p className="text-[10px] text-muted-foreground">{kpis.progressoGeral.toFixed(1)}% concluído</p>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progresso do Orçamento</span>
          <span className="text-sm font-bold text-primary">{formatPercent(Math.min(percentual, 100))}</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              percentual > 100 ? "bg-destructive" : percentual > 80 ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>
      </div>

      {/* Progresso das etapas */}
      {etapas.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4">Progresso por Etapa</h2>
          <div className="space-y-3">
            {etapas.slice(0, 6).map((e: any, i: number) => {
              const isLate = e.status !== "Concluída" && e.fim_previsto && new Date(e.fim_previsto) < new Date();
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      {e.nome}
                      {isLate && <span className="text-[9px] px-1 rounded bg-destructive/10 text-destructive">atrasada</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.percentual_conclusao}%</span>
                  </div>
                  <Progress value={e.percentual_conclusao} className="h-2" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Últimas Transações</h2>
        {recentes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação registrada</p>
        ) : (
          <div className="space-y-3">
            {recentes.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"}`}>
                    {t.tipo === "Entrada" ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.descricao || t.categoria || "Sem descrição"}</p>
                    <p className="text-xs text-muted-foreground">{t.categoria}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                  {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ variant, label, value, icon, sub }: {
  variant: "success" | "danger" | "info" | "warning";
  label: string; value: string; icon: React.ReactNode; sub?: string;
}) {
  const classes = { success: "stat-card-success", danger: "stat-card-danger", info: "stat-card-info", warning: "stat-card-warning" };
  const iconColor = { success: "text-success", danger: "text-destructive", info: "text-info", warning: "text-warning" };
  return (
    <div className={`${classes[variant]} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={iconColor[variant]}>{icon}</div>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
