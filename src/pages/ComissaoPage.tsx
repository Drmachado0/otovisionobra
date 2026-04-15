import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency } from "@/lib/formatters";
import { Percent, CheckCircle, Clock, DollarSign } from "lucide-react";

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
      supabase.from("obra_transacoes_fluxo").select("tipo, valor").eq("tipo", "Saída"),
      supabase.from("obra_comissao_pagamentos").select("id, mes, valor, pago, data_pagamento").order("created_at", { ascending: false }),
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
      <div>
        <h1 className="text-2xl font-bold">Comissão</h1>
        <p className="text-sm text-muted-foreground">Comissão do construtor — {PERCENTUAL_COMISSAO}% sobre gastos</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card-info p-5">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-info" /><span className="text-xs text-muted-foreground uppercase">Base (Gastos)</span></div>
          <p className="text-xl font-bold">{formatCurrency(totalGasto)}</p>
        </div>
        <div className="stat-card-primary p-5">
          <div className="flex items-center gap-2 mb-2"><Percent className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground uppercase">Comissão Total</span></div>
          <p className="text-xl font-bold">{formatCurrency(comissaoTotal)}</p>
        </div>
        <div className="stat-card-success p-5">
          <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground uppercase">Pago</span></div>
          <p className="text-xl font-bold text-success">{formatCurrency(comissaoPaga)}</p>
        </div>
        <div className="stat-card-warning p-5">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground uppercase">Pendente</span></div>
          <p className="text-xl font-bold text-warning">{formatCurrency(Math.max(comissaoPendente, 0))}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Comissão Paga</span>
          <span className="text-sm font-bold text-primary">
            {comissaoTotal > 0 ? `${((comissaoPaga / comissaoTotal) * 100).toFixed(1)}%` : "0%"}
          </span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${comissaoTotal > 0 ? Math.min((comissaoPaga / comissaoTotal) * 100, 100) : 0}%` }}
          />
        </div>
      </div>

      {/* History */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Histórico de Pagamentos</h2>
        {comissoes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pagamento registrado</p>
        ) : (
          <div className="space-y-3">
            {comissoes.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.pago ? "bg-success/10" : "bg-warning/10"}`}>
                    {c.pago ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.mes || "Sem mês"}</p>
                    <p className="text-xs text-muted-foreground">{c.pago ? "Pago" : "Pendente"}</p>
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
