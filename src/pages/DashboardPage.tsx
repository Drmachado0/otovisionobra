import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

interface TransacaoRow {
  tipo: string;
  valor: number;
  categoria: string;
  data: string;
  descricao: string;
}

export default function DashboardPage() {
  const [orcamentoTotal, setOrcamentoTotal] = useState(0);
  const [totalGasto, setTotalGasto] = useState(0);
  const [transacoes, setTransacoes] = useState<TransacaoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [configRes, transRes] = await Promise.all([
      supabase.from("obra_config").select("orcamento_total").limit(1).maybeSingle(),
      supabase
        .from("obra_transacoes_fluxo")
        .select("tipo, valor, categoria, data, descricao")
        .order("data", { ascending: false })
        .limit(100),
    ]);

    if (configRes.data) setOrcamentoTotal(Number(configRes.data.orcamento_total) || 0);

    if (transRes.data) {
      const rows = transRes.data as TransacaoRow[];
      setTransacoes(rows);
      const gasto = rows
        .filter((t) => t.tipo === "Saída")
        .reduce((sum, t) => sum + Number(t.valor), 0);
      setTotalGasto(gasto);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_config", fetchData);

  const saldo = orcamentoTotal - totalGasto;
  const percentual = orcamentoTotal > 0 ? (totalGasto / orcamentoTotal) * 100 : 0;
  const alerts: string[] = [];
  if (percentual > 90) alerts.push("⚠️ Orçamento acima de 90%!");
  if (percentual > 100) alerts.push("🚨 Orçamento ULTRAPASSADO!");

  const totalEntradas = transacoes
    .filter((t) => t.tipo === "Entrada")
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const recentes = transacoes.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral financeira da obra Otovision</p>
      </div>

      {/* Alerts */}
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          variant="info"
          label="Orçamento Total"
          value={formatCurrency(orcamentoTotal)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          variant="danger"
          label="Total Gasto"
          value={formatCurrency(totalGasto)}
          icon={<TrendingDown className="w-5 h-5" />}
          sub={`${formatPercent(percentual)} executado`}
        />
        <StatCard
          variant="success"
          label="Saldo Restante"
          value={formatCurrency(saldo)}
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          variant="warning"
          label="Total Entradas"
          value={formatCurrency(totalEntradas)}
          icon={<Activity className="w-5 h-5" />}
        />
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
              percentual > 100
                ? "bg-destructive"
                : percentual > 80
                ? "bg-warning"
                : "bg-primary"
            }`}
            style={{ width: `${Math.min(percentual, 100)}%` }}
          />
        </div>
      </div>

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
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    {t.tipo === "Entrada" ? (
                      <ArrowUpRight className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.descricao || t.categoria || "Sem descrição"}</p>
                    <p className="text-xs text-muted-foreground">{t.categoria}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  t.tipo === "Entrada" ? "text-success" : "text-destructive"
                }`}>
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

function StatCard({
  variant,
  label,
  value,
  icon,
  sub,
}: {
  variant: "success" | "danger" | "info" | "warning";
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  const classes = {
    success: "stat-card-success",
    danger: "stat-card-danger",
    info: "stat-card-info",
    warning: "stat-card-warning",
  };
  const iconColor = {
    success: "text-success",
    danger: "text-destructive",
    info: "text-info",
    warning: "text-warning",
  };

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
