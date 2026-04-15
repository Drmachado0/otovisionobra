import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Plus, Search, X, Package, Truck, Clock } from "lucide-react";
import { toast } from "sonner";

interface Compra {
  id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pedido: "bg-warning/10 text-warning",
  Entregue: "bg-success/10 text-success",
  Cancelado: "bg-destructive/10 text-destructive",
};

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fornecedor: "",
    descricao: "",
    categoria: "Material",
    valor_total: "",
    data: new Date().toISOString().split("T")[0],
    status_entrega: "Pedido",
    forma_pagamento: "PIX",
  });

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_compras")
      .select("id, fornecedor, descricao, categoria, valor_total, data, status_entrega, forma_pagamento")
      .order("data", { ascending: false })
      .limit(500);
    if (data) setCompras(data as Compra[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_compras", fetchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fornecedor || !form.valor_total) {
      toast.error("Preencha fornecedor e valor");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("obra_compras").insert({
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria,
      valor_total: Number(form.valor_total),
      data: form.data,
      status_entrega: form.status_entrega,
      forma_pagamento: form.forma_pagamento,
    });

    if (!error) {
      // Also create a transaction
      await supabase.from("obra_transacoes_fluxo").insert({
        tipo: "Saída",
        valor: Number(form.valor_total),
        data: form.data,
        categoria: form.categoria,
        descricao: `Compra: ${form.descricao || form.fornecedor}`,
        forma_pagamento: form.forma_pagamento,
        recorrencia: "Única",
        referencia: "",
        conta_id: "",
        observacoes: `Fornecedor: ${form.fornecedor}`,
        origem_tipo: "compra",
      });
    }

    setSaving(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success("Compra registrada!");
      setShowForm(false);
      setForm({ fornecedor: "", descricao: "", categoria: "Material", valor_total: "", data: new Date().toISOString().split("T")[0], status_entrega: "Pedido", forma_pagamento: "PIX" });
      fetchData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("obra_compras").update({ status_entrega: status }).eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success("Status atualizado"); fetchData(); }
  };

  const filtered = compras.filter((c) =>
    search === "" ||
    c.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
    c.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    c.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCompras = filtered.reduce((s, c) => s + Number(c.valor_total), 0);
  const totalEntregue = filtered.filter(c => c.status_entrega === "Entregue").reduce((s, c) => s + Number(c.valor_total), 0);
  const totalPendente = totalCompras - totalEntregue;

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Controle de aquisições da obra</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Nova Compra
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card-info p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-info" /><span className="text-xs text-muted-foreground uppercase">Total</span></div>
          <p className="text-lg font-bold">{formatCurrency(totalCompras)}</p>
        </div>
        <div className="stat-card-success p-4">
          <div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground uppercase">Entregue</span></div>
          <p className="text-lg font-bold text-success">{formatCurrency(totalEntregue)}</p>
        </div>
        <div className="stat-card-warning p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-warning" /><span className="text-xs text-muted-foreground uppercase">Pendente</span></div>
          <p className="text-lg font-bold text-warning">{formatCurrency(totalPendente)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Buscar compras..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma compra encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Fornecedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.data)}</td>
                    <td className="px-4 py-3 font-medium">{c.fornecedor || "-"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-md bg-secondary text-xs">{c.categoria}</span></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(c.valor_total))}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={c.status_entrega}
                        onChange={e => updateStatus(c.id, e.target.value)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[c.status_entrega] || "bg-secondary"}`}
                      >
                        <option>Pedido</option>
                        <option>Entregue</option>
                        <option>Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova Compra</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Fornecedor</label>
                <input type="text" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Material</option><option>Mão de Obra</option><option>Equipamento</option><option>Serviço</option><option>Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Pagamento</label>
                  <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>PIX</option><option>Cartão</option><option>Boleto</option><option>Dinheiro</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Salvando..." : "Registrar Compra"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
