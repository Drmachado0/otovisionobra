import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency } from "@/lib/formatters";
import { Percent, CheckCircle, Clock, DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const PERCENTUAL_COMISSAO = 8;

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
}

export default function ComissaoPage() {
  const [totalGasto, setTotalGasto] = useState(0);
  const [comissoes, setComissoes] = useState<ComissaoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [transRes, comRes] = await Promise.all([
      supabase.from("obra_transacoes_fluxo").select("tipo, valor").eq("tipo", "Saída").is("deleted_at", null),
      supabase.from("obra_comissao_pagamentos").select("id, mes, valor, pago, data_pagamento").is("deleted_at", null).order("created_at", { ascending: false }),
    ]);

    if (transRes.data) {
      setTotalGasto(transRes.data.reduce((s, t) => s + Number(t.valor), 0));
    }
    if (comRes.data) {
      setComissoes(comRes.data as ComissaoRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);
  useRealtimeSubscription("obra_comissao_pagamentos", fetchData);

  const comissaoTotal = totalGasto * (PERCENTUAL_COMISSAO / 100);
  const comissaoPaga = comissoes.filter(c => c.pago).reduce((s, c) => s + Number(c.valor), 0);
  const comissaoPendente = comissaoTotal - comissaoPaga;

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

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-info", icon: <DollarSign className="w-4 h-4 text-info" />, label: "Base (Gastos)", value: formatCurrency(totalGasto) },
          { cls: "stat-card-primary", icon: <Percent className="w-4 h-4 text-primary" />, label: "Comissão Total", value: formatCurrency(comissaoTotal) },
          { cls: "stat-card-success", icon: <CheckCircle className="w-4 h-4 text-success" />, label: "Pago", value: formatCurrency(comissaoPaga), color: "text-success" },
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendente", value: formatCurrency(Math.max(comissaoPendente, 0)), color: "text-warning" },
        ].map((c, i) => (
          <div key={c.label} className={`${c.cls} p-5 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
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

      {/* History */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Histórico de Pagamentos</h2>
        {comissoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado</p>
        ) : (
          <div className="space-y-1">
            {comissoes.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors hover:bg-accent/50 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
                    {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.mes || "Sem mês"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.pago ? <span className="badge-success text-[10px]">Pago</span> : <span className="badge-warning text-[10px]">Pendente</span>}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(Number(c.valor))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
