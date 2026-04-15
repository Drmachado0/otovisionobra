import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Plus, Search, Package, Truck, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  Pedido: "badge-warning",
  Entregue: "badge-success",
  Cancelado: "badge-danger",
};

export default function ComprasPage() {
  const { user } = useAuth();
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
      .is("deleted_at", null)
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
      user_id: user!.id,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria,
      valor_total: Number(form.valor_total),
      data: form.data,
      status_entrega: form.status_entrega,
      forma_pagamento: form.forma_pagamento,
    } as any);

    if (!error) {
      await supabase.from("obra_transacoes_fluxo").insert({
        user_id: user!.id,
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
      } as any);
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
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Controle de aquisições da obra</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Compra
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { cls: "stat-card-info", icon: <Package className="w-4 h-4 text-info" />, label: "Total", value: formatCurrency(totalCompras) },
          { cls: "stat-card-success", icon: <Truck className="w-4 h-4 text-success" />, label: "Entregue", value: formatCurrency(totalEntregue), color: "text-success" },
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendente", value: formatCurrency(totalPendente), color: "text-warning" },
        ].map((m, i) => (
          <div key={m.label} className={`${m.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 mb-1">{m.icon}<span className="text-xs text-muted-foreground uppercase">{m.label}</span></div>
            <p className={`text-lg font-bold ${m.color || ""}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar compras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Pagamento</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row-interactive">
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.data)}</td>
                    <td className="px-4 py-3 font-medium">{c.fornecedor || "-"}</td>
                    <td className="px-4 py-3"><span className="badge-muted">{c.categoria}</span></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{c.forma_pagamento || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(c.valor_total))}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={c.status_entrega}
                        onChange={e => { e.stopPropagation(); updateStatus(c.id, e.target.value); }}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer bg-transparent ${STATUS_COLORS[c.status_entrega] || "badge-muted"}`}
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

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nova Compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                  <option>Material</option><option>Mão de Obra</option><option>Equipamento</option><option>Serviço</option><option>Outro</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pagamento</Label>
                <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                  <option>PIX</option><option>Cartão</option><option>Boleto</option><option>Dinheiro</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Registrar Compra"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
