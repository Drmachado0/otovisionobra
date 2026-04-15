import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
}

const CATEGORIAS = [
  "Material", "Mão de Obra", "Equipamento", "Serviço", "Administrativo",
  "Transporte", "Alimentação", "Aporte", "Outro",
];

export default function FluxoCaixaPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tipo: "Saída",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "Material",
    descricao: "",
    forma_pagamento: "PIX",
    observacoes: "",
  });

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("obra_transacoes_fluxo")
      .select("id, tipo, valor, data, categoria, descricao, forma_pagamento, observacoes")
      .order("data", { ascending: false })
      .limit(500);
    if (data) setTransacoes(data as Transacao[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.valor || Number(form.valor) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      tipo: form.tipo,
      valor: Number(form.valor),
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao,
      forma_pagamento: form.forma_pagamento,
      observacoes: form.observacoes,
      recorrencia: "Única",
      referencia: "",
      conta_id: "",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Transação registrada!");
      setShowForm(false);
      setForm({ tipo: "Saída", valor: "", data: new Date().toISOString().split("T")[0], categoria: "Material", descricao: "", forma_pagamento: "PIX", observacoes: "" });
      fetchData();
    }
  };

  const filtered = transacoes.filter((t) => {
    const matchSearch = search === "" ||
      t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      t.categoria?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || t.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const totalEntradas = filtered.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = filtered.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas financeiras</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Transação
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card-success p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Entradas</p>
          <p className="text-lg font-bold text-success mt-1">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="stat-card-danger p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Saídas</p>
          <p className="text-lg font-bold text-destructive mt-1">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="stat-card-info p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo</p>
          <p className={`text-lg font-bold mt-1 ${totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(totalEntradas - totalSaidas)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todos</option>
          <option value="Entrada">Entradas</option>
          <option value="Saída">Saídas</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Nenhuma transação encontrada</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/30 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"
                      }`}>
                        {t.tipo === "Entrada" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.data)}</td>
                    <td className="px-4 py-3 font-medium">{t.descricao || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md bg-secondary text-xs">{t.categoria || "-"}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      t.tipo === "Entrada" ? "text-success" : "text-destructive"
                    }`}>
                      {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
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
              <h2 className="text-lg font-bold">Nova Transação</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option>Saída</option>
                    <option>Entrada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Valor (R$)</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
                <input type="text" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Cimento CP-II" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Forma de Pagamento</label>
                <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option>PIX</option>
                  <option>Cartão</option>
                  <option>Boleto</option>
                  <option>Dinheiro</option>
                  <option>Transferência</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Salvando..." : "Registrar Transação"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
