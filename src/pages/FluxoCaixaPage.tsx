import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, CATEGORIAS_PADRAO } from "@/lib/formatters";
import {
  Plus, ArrowUpRight, ArrowDownRight, Search, X,
  ChevronLeft, ChevronRight, Filter, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrigemBadge from "@/components/OrigemBadge";
import TransacaoDetailDrawer, { type TransacaoFull } from "@/components/TransacaoDetailDrawer";

const CATEGORIAS = CATEGORIAS_PADRAO;

const FORMAS_PAGAMENTO = ["PIX", "Cartão", "Boleto", "Dinheiro", "Transferência"];
const PAGE_SIZE = 50;

export default function FluxoCaixaPage() {
  const { user } = useAuth();
  const [transacoes, setTransacoes] = useState<TransacaoFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedTransacao, setSelectedTransacao] = useState<TransacaoFull | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [contas, setContas] = useState<{ id: string; nome: string }[]>([]);

  const [valorError, setValorError] = useState("");

  const [form, setForm] = useState({
    tipo: "Saída",
    valor: "",
    data: new Date().toISOString().split("T")[0],
    categoria: "Material",
    descricao: "",
    forma_pagamento: "PIX",
    observacoes: "",
    conta_id: "",
  });

  const fetchData = useCallback(async () => {
    let query = supabase
      .from("obra_transacoes_fluxo")
      .select("id, tipo, valor, data, categoria, descricao, forma_pagamento, observacoes, origem_tipo, conciliado, recorrencia, conta_id, referencia, created_at", { count: "exact" })
      .is("deleted_at", null)
      .order("data", { ascending: false });

    if (filterTipo !== "todos") query = query.eq("tipo", filterTipo);
    if (filterCategoria !== "todos") query = query.eq("categoria", filterCategoria);
    if (dateFrom) query = query.gte("data", dateFrom);
    if (dateTo) query = query.lte("data", dateTo);
    if (search) query = query.or(`descricao.ilike.%${search}%,categoria.ilike.%${search}%`);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count } = await query;
    if (data) setTransacoes(data as TransacaoFull[]);
    if (count !== null) setTotalCount(count);
    setLoading(false);
  }, [page, filterTipo, filterCategoria, dateFrom, dateTo, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // BUG-001 fix: sync selectedTransacao with fresh data
  useEffect(() => {
    if (selectedTransacao) {
      const updated = transacoes.find(t => t.id === selectedTransacao.id);
      if (updated) setSelectedTransacao(updated);
    }
  }, [transacoes]);
  useEffect(() => {
    supabase.from("obra_contas_financeiras").select("id, nome").eq("ativa", true).then(({ data }) => {
      if (data) setContas(data);
    });
  }, []);
  useRealtimeSubscription("obra_transacoes_fluxo", fetchData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numVal = Number(form.valor);
    if (!form.valor || isNaN(numVal) || numVal <= 0) {
      setValorError("Informe um valor maior que zero");
      toast.error("Informe um valor válido");
      return;
    }
    setValorError("");
    setSaving(true);
    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: user!.id,
      tipo: form.tipo,
      valor: Number(form.valor),
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao,
      forma_pagamento: form.forma_pagamento,
      observacoes: form.observacoes,
      recorrencia: "Única",
      referencia: "",
      conta_id: form.conta_id,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Transação registrada!");
      setShowForm(false);
      setForm({ tipo: "Saída", valor: "", data: new Date().toISOString().split("T")[0], categoria: "Material", descricao: "", forma_pagamento: "PIX", observacoes: "", conta_id: "" });
      fetchData();
    }
  };

  const totalEntradas = transacoes.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
  const totalSaidas = transacoes.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const openDetail = (t: TransacaoFull) => {
    setSelectedTransacao(t);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas financeiras</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Transação
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { cls: "stat-card-success", label: "Entradas", value: formatCurrency(totalEntradas), color: "text-success" },
          { cls: "stat-card-danger", label: "Saídas", value: formatCurrency(totalSaidas), color: "text-destructive" },
          { cls: "stat-card-info", label: "Saldo", value: formatCurrency(totalEntradas - totalSaidas), color: totalEntradas - totalSaidas >= 0 ? "text-success" : "text-destructive" },
        ].map((c, i) => (
          <div key={i} className={`${c.cls} p-4`} style={{ animationDelay: `${i * 100}ms` }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-10"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => { setFilterTipo(e.target.value); setPage(0); }}
          className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos</option>
          <option value="Entrada">Entradas</option>
          <option value="Saída">Saídas</option>
        </select>
        <select
          value={filterCategoria}
          onChange={e => { setFilterCategoria(e.target.value); setPage(0); }}
          className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Categoria</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-auto" placeholder="De" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-auto" placeholder="Até" />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setPage(0); }}>
            <X className="w-3 h-3 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transacoes.length === 0 ? (
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Pagamento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Origem</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => (
                  <tr key={t.id} onClick={() => openDetail(t)} className="table-row-interactive">
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
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate" title={t.descricao || ""}>{t.descricao || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="badge-muted">{t.categoria || "-"}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />{t.forma_pagamento || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <OrigemBadge origem={t.origem_tipo} compact />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <TransacaoDetailDrawer
        transacao={selectedTransacao}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={fetchData}
      />

      {/* New Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                  <option>Saída</option>
                  <option>Entrada</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => { setForm(f => ({ ...f, valor: e.target.value })); setValorError(""); }} placeholder="0,00" className={`mt-1 ${valorError ? "border-destructive ring-destructive" : ""}`} />
                {valorError && <p className="text-xs text-destructive mt-1">{valorError}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Cimento CP-II" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
              <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                {FORMAS_PAGAMENTO.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <select value={form.conta_id} onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1">
                <option value="">Sem conta vinculada</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Registrar Transação"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
