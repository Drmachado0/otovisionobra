import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatMes } from "@/lib/formatters";
import { Percent, CheckCircle, Clock, DollarSign, TrendingUp, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Progress } from "@/components/ui/progress";
import ComissaoDetailDrawer, { parseObservacoes } from "@/components/ComissaoDetailDrawer";

const PERCENTUAL_COMISSAO = 8;

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
  transacao_id: string | null;
  created_at: string;
}

function OrigemBadgeSmall({ obs }: { obs: string }) {
  const { tipo } = parseObservacoes(obs);
  const cls: Record<string, string> = {
    NF: "badge-info",
    Orçamento: "badge-warning",
    Compra: "badge-primary",
    Manual: "badge-muted",
  };
  return <span className={`${cls[tipo] || cls.Manual} text-[10px]`}>{tipo}</span>;
}

export default function ComissaoPage() {
  const [totalGasto, setTotalGasto] = useState(0);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ComissaoRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");
  const [deleteTarget, setDeleteTarget] = useState<ComissaoRow | null>(null);

  const handleQuickDelete = (c: ComissaoRow) => {
    setDeleteTarget(c);
  };

  const confirmQuickDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Comissão excluída");
      fetchData();
    }
  };

  const fetchData = useCallback(async () => {
    const [transRes, comRes] = await Promise.all([
      supabase.from("obra_transacoes_fluxo").select("tipo, valor").eq("tipo", "Saída").is("deleted_at", null),
      supabase.from("obra_comissao_pagamentos")
        .select("id, mes, valor, pago, data_pagamento, observacoes, auto, categoria, fornecedor, forma_pagamento, transacao_id, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    if (transRes.data) setTotalGasto(transRes.data.reduce((s, t) => s + Number(t.valor), 0));
    if (comRes.data) setComissoes(comRes.data as ComissaoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_comissao_pagamentos", fetchData);

  const comissaoTotal = totalGasto * (PERCENTUAL_COMISSAO / 100);
  const comissaoPaga = comissoes.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0);
  const comissaoPendente = comissaoTotal - comissaoPaga;

  // Média mensal
  const mesesUnicos = new Set(comissoes.map(c => c.mes).filter(Boolean));
  const mediaMensal = mesesUnicos.size > 0 ? comissaoPaga / mesesUnicos.size : 0;

  // Mês com maior comissão
  const porMes: Record<string, number> = {};
  comissoes.forEach(c => { if (c.mes) porMes[c.mes] = (porMes[c.mes] || 0) + Number(c.valor); });
  const mesMaior = Object.entries(porMes).sort((a, b) => b[1] - a[1])[0];

  const filtered = comissoes.filter(c => {
    if (filtroStatus === "pago") return c.pago;
    if (filtroStatus === "pendente") return !c.pago;
    return true;
  });

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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { cls: "stat-card-info", icon: <DollarSign className="w-4 h-4 text-info" />, label: "Base (Gastos)", value: formatCurrency(totalGasto) },
          { cls: "stat-card-primary", icon: <Percent className="w-4 h-4 text-primary" />, label: "Comissão Total", value: formatCurrency(comissaoTotal) },
          { cls: "stat-card-success", icon: <CheckCircle className="w-4 h-4 text-success" />, label: "Pago", value: formatCurrency(comissaoPaga), color: "text-success" },
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendente", value: formatCurrency(Math.max(comissaoPendente, 0)), color: "text-warning" },
          { cls: "stat-card-primary", icon: <TrendingUp className="w-4 h-4 text-primary" />, label: "Média Mensal", value: formatCurrency(mediaMensal) },
          { cls: "stat-card-info", icon: <Calendar className="w-4 h-4 text-info" />, label: "Mês Maior", value: mesMaior ? `${formatMes(mesMaior[0])} (${formatCurrency(mesMaior[1])})` : "—" },
        ].map((c, i) => (
          <div key={c.label} className={`${c.cls} p-5 animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 mb-2">{c.icon}<span className="text-xs text-muted-foreground uppercase">{c.label}</span></div>
            <p className={`text-xl font-bold ${c.color || ""}`}>{c.value}</p>
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

      {/* Filtros + History */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Detalhamento de Pagamentos</h2>
          <div className="flex gap-1">
            {(["todos", "pago", "pendente"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFiltroStatus(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filtroStatus === f ? "bg-primary text-primary-foreground" : "bg-accent/50 text-muted-foreground hover:bg-accent"
                }`}
              >
                {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : "Pendentes"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento encontrado</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((c, i) => {
              const parsed = parseObservacoes(c.observacoes);
              const displayFornecedor = c.fornecedor || parsed.fornecedor;
              const valorBase = Number(c.valor) / (PERCENTUAL_COMISSAO / 100);

              return (
                <div
                  key={c.id}
                  onClick={() => { setSelected(c); setDrawerOpen(true); }}
                  className="flex items-center justify-between py-3 px-3 rounded-lg transition-colors hover:bg-accent/50 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
                      {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">
                          {c.observacoes || c.mes || "Sem referência"}
                        </p>
                        <OrigemBadgeSmall obs={c.observacoes} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {displayFornecedor && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{displayFornecedor}</span>
                        )}
                        {c.mes && <span className="text-[10px] text-muted-foreground/60">· {formatMes(c.mes)}</span>}
                        {c.pago
                          ? <span className="badge-success text-[9px]">Pago</span>
                          : <span className="badge-warning text-[9px]">Pendente</span>}
                        {c.auto && <span className="badge-info text-[9px]">Auto</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(Number(c.valor))}</p>
                      <p className="text-[10px] text-muted-foreground">
                        de {formatCurrency(valorBase)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickDelete(c); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ComissaoDetailDrawer comissao={selected} open={drawerOpen} onOpenChange={setDrawerOpen} onUpdate={fetchData} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Comissão"
        message={`Deseja excluir o lançamento de ${deleteTarget ? formatCurrency(Number(deleteTarget.valor)) : ""}?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={confirmQuickDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
