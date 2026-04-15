import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency } from "@/lib/formatters";
import { Percent, CheckCircle, Clock, DollarSign, TrendingUp, TrendingDown, BarChart3, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComissaoDetailDrawer } from "@/components/ComissaoDetailDrawer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PERCENTUAL_COMISSAO = 8;

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  created_at: string;
  updated_at: string;
  transacao_id: string | null;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
}

interface TransacaoSaida {
  data: string;
  valor: number;
  categoria: string;
  descricao: string;
}

export default function ComissaoPage() {
  const [totalGasto, setTotalGasto] = useState(0);
  const [transacoesSaida, setTransacoesSaida] = useState<TransacaoSaida[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selectedComissao, setSelectedComissao] = useState<ComissaoRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    const [transRes, comRes] = await Promise.all([
      supabase.from("obra_transacoes_fluxo").select("data, valor, categoria, descricao").eq("tipo", "Saída").is("deleted_at", null),
      supabase.from("obra_comissao_pagamentos").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
    ]);

    if (transRes.data) {
      setTransacoesSaida(transRes.data as TransacaoSaida[]);
      setTotalGasto(transRes.data.reduce((s, t) => s + Number(t.valor), 0));
    }
    if (comRes.data) {
      setComissoes(comRes.data as unknown as ComissaoRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_comissao_pagamentos", fetchData);

  // === Computed values ===
  const comissaoTotal = totalGasto * (PERCENTUAL_COMISSAO / 100);
  const comissaoPaga = comissoes.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0);
  const comissaoPendente = Math.max(comissaoTotal - comissaoPaga, 0);

  // Monthly data: group transactions by month
  const dadosMensais = useMemo(() => {
    const mesesMap = new Map<string, { gastos: number; comissaoGerada: number; comissaoPaga: number }>();

    // Group transactions by YYYY-MM
    transacoesSaida.forEach(t => {
      const mes = t.data?.slice(0, 7) || "sem-data";
      const current = mesesMap.get(mes) || { gastos: 0, comissaoGerada: 0, comissaoPaga: 0 };
      current.gastos += Number(t.valor);
      current.comissaoGerada = current.gastos * (PERCENTUAL_COMISSAO / 100);
      mesesMap.set(mes, current);
    });

    // Add paid commissions by month
    comissoes.forEach(c => {
      if (!c.pago) return;
      // Try to match mes field to YYYY-MM format or use as-is
      const mes = c.mes?.match(/\d{4}-\d{2}/) ? c.mes.slice(0, 7) : c.mes;
      const current = mesesMap.get(mes) || { gastos: 0, comissaoGerada: 0, comissaoPaga: 0 };
      current.comissaoPaga += Number(c.valor);
      mesesMap.set(mes, current);
    });

    return Array.from(mesesMap.entries())
      .map(([mes, data]) => ({ mes, ...data, pendente: Math.max(data.comissaoGerada - data.comissaoPaga, 0) }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [transacoesSaida, comissoes]);

  // KPIs extras
  const mediaMensal = dadosMensais.length > 0 ? comissaoTotal / dadosMensais.length : 0;
  const mesMaiorComissao = dadosMensais.reduce((max, m) => m.comissaoGerada > (max?.comissaoGerada || 0) ? m : max, dadosMensais[0]);

  // Available months for filter
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    comissoes.forEach(c => { if (c.mes) set.add(c.mes); });
    return Array.from(set).sort();
  }, [comissoes]);

  // Filtered commissions
  const comissoesFiltradas = useMemo(() => {
    return comissoes.filter(c => {
      if (filtroMes !== "todos" && c.mes !== filtroMes) return false;
      if (filtroStatus === "pago" && !c.pago) return false;
      if (filtroStatus === "pendente" && c.pago) return false;
      return true;
    });
  }, [comissoes, filtroMes, filtroStatus]);

  // Chart data
  const chartData = useMemo(() => {
    return dadosMensais.slice(-12).map(m => ({
      mes: m.mes.length >= 7 ? m.mes.slice(5, 7) + "/" + m.mes.slice(0, 4) : m.mes,
      Gastos: Math.round(m.gastos),
      "Comissão Gerada": Math.round(m.comissaoGerada),
      "Comissão Paga": Math.round(m.comissaoPaga),
    }));
  }, [dadosMensais]);

  const formatMes = (mes: string) => {
    if (!mes || mes.length < 7) return mes || "—";
    const [y, m] = mes.split("-");
    const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${nomes[parseInt(m) - 1] || m}/${y}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Comissão</h1>
        <p className="text-sm text-muted-foreground">Comissão do construtor — {PERCENTUAL_COMISSAO}% sobre gastos</p>
      </div>

      {/* ===== SEÇÃO A: KPIs ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { icon: <DollarSign className="w-4 h-4 text-info" />, label: "Base (Gastos)", value: formatCurrency(totalGasto), cls: "stat-card-info" },
          { icon: <Percent className="w-4 h-4 text-primary" />, label: "Comissão Total", value: formatCurrency(comissaoTotal), cls: "stat-card-primary" },
          { icon: <CheckCircle className="w-4 h-4 text-success" />, label: "Pago", value: formatCurrency(comissaoPaga), cls: "stat-card-success", color: "text-success" },
          { icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendente", value: formatCurrency(comissaoPendente), cls: "stat-card-warning", color: "text-warning" },
          { icon: <BarChart3 className="w-4 h-4 text-primary" />, label: "Média Mensal", value: formatCurrency(mediaMensal), cls: "stat-card-primary" },
          { icon: <TrendingUp className="w-4 h-4 text-success" />, label: "Maior Mês", value: mesMaiorComissao ? formatMes(mesMaiorComissao.mes) : "—", cls: "stat-card-success" },
        ].map((c, i) => (
          <div key={c.label} className={`${c.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 mb-1.5">{c.icon}<span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</span></div>
            <p className={`text-lg font-bold ${c.color || ""}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Comissão Paga</span>
          <span className="text-sm font-bold text-primary">
            {comissaoTotal > 0 ? `${((comissaoPaga / comissaoTotal) * 100).toFixed(1)}%` : "0%"}
          </span>
        </div>
        <Progress value={comissaoTotal > 0 ? Math.min((comissaoPaga / comissaoTotal) * 100, 100) : 0} className="h-3" />
      </div>

      {/* ===== SEÇÃO B: Comparativo Mensal ===== */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Acompanhamento Mensal
        </h2>

        {chartData.length > 0 ? (
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Gastos" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} opacity={0.4} />
                <Bar dataKey="Comissão Gerada" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Comissão Paga" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado mensal disponível</p>
        )}

        {/* Monthly comparison table */}
        {dadosMensais.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Mês</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Gastos</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Comissão</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Pago</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Pendente</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Var.</th>
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-medium">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {dadosMensais.slice(-12).map((m, i, arr) => {
                  const prev = i > 0 ? arr[i - 1] : null;
                  const variacao = prev && prev.comissaoGerada > 0
                    ? ((m.comissaoGerada - prev.comissaoGerada) / prev.comissaoGerada) * 100
                    : null;
                  const progressPct = m.comissaoGerada > 0 ? Math.min((m.comissaoPaga / m.comissaoGerada) * 100, 100) : 0;

                  return (
                    <tr key={m.mes} className="border-b border-border/50 table-row-interactive">
                      <td className="py-2.5 px-2 font-medium">{formatMes(m.mes)}</td>
                      <td className="py-2.5 px-2 text-right text-muted-foreground">{formatCurrency(m.gastos)}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-primary">{formatCurrency(m.comissaoGerada)}</td>
                      <td className="py-2.5 px-2 text-right text-success">{formatCurrency(m.comissaoPaga)}</td>
                      <td className="py-2.5 px-2 text-right text-warning">{formatCurrency(m.pendente)}</td>
                      <td className="py-2.5 px-2 text-center">
                        {variacao !== null ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${variacao >= 0 ? "text-success" : "text-destructive"}`}>
                            {variacao >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(variacao).toFixed(0)}%
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <Progress value={progressPct} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{progressPct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== SEÇÃO C: Detalhamento ===== */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold">Detalhamento de Pagamentos</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {mesesDisponiveis.map(m => (
                  <SelectItem key={m} value={m}>{formatMes(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {comissoesFiltradas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento encontrado</p>
        ) : (
          <div className="space-y-1">
            {comissoesFiltradas.map((c, i) => (
              <div
                key={c.id}
                onClick={() => { setSelectedComissao(c); setDrawerOpen(true); }}
                className="flex items-center justify-between py-3 px-3 rounded-lg table-row-interactive animate-fade-in-up cursor-pointer"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
                    {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.fornecedor || c.observacoes || c.mes || "Sem referência"}</p>
                      {c.auto && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatMes(c.mes)}</span>
                      {c.categoria && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{c.categoria}</span>
                        </>
                      )}
                      {c.forma_pagamento && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{c.forma_pagamento}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold">{formatCurrency(Number(c.valor))}</p>
                  {c.pago ? (
                    <Badge className="bg-success/10 text-success border-success/20 text-[10px]">Pago</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Pendente</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <ComissaoDetailDrawer
        comissao={selectedComissao}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchData}
      />
    </div>
  );
}
