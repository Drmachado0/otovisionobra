import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Plus, Search, Package, Truck, Clock, RefreshCw, CreditCard, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompraDetailDrawer, { getCompraType, parseParcelas, type CompraFull } from "@/components/CompraDetailDrawer";

const STATUS_COLORS: Record<string, string> = {
  Pedido: "badge-warning",
  Entregue: "badge-success",
  Cancelado: "badge-danger",
};

type TipoCompra = "Única" | "Parcelada" | "Recorrente";

function generateParcelas(valorTotal: number, numParcelas: number, dataInicio: string) {
  const valorParcela = Math.round((valorTotal / numParcelas) * 100) / 100;
  const parcelas = [];
  for (let i = 0; i < numParcelas; i++) {
    const d = new Date(dataInicio);
    d.setMonth(d.getMonth() + i);
    parcelas.push({
      numero: i + 1,
      valor: i === numParcelas - 1 ? Math.round((valorTotal - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela,
      data_vencimento: d.toISOString().split("T")[0],
      status: "Pendente",
    });
  }
  return parcelas;
}

export default function ComprasPage() {
  const { user } = useAuth();
  const [compras, setCompras] = useState<CompraFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<CompraFull | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | TipoCompra>("Todos");

  const [form, setForm] = useState({
    fornecedor: "",
    descricao: "",
    categoria: "Material",
    valor_total: "",
    data: new Date().toISOString().split("T")[0],
    status_entrega: "Pedido",
    forma_pagamento: "PIX",
    tipo_compra: "Única" as TipoCompra,
    numero_parcelas: "3",
    periodicidade: "Mensal",
    observacoes: "",
    conta_id: "",
  });

  const [contasFinanceiras, setContasFinanceiras] = useState<{ id: string; nome: string }[]>([]);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from("obra_compras")
      .select("id, fornecedor, descricao, categoria, valor_total, data, status_entrega, forma_pagamento, numero_parcelas, parcelas, observacoes, nf_vinculada")
      .is("deleted_at", null)
      .order("data", { ascending: false })
      .limit(500);
    if (error) {
      toast.error("Erro ao carregar compras: " + error.message);
    } else if (data) {
      setCompras(data.map((c: any) => ({
        ...c,
        parcelas: parseParcelas(c.parcelas),
        tipo_compra: getCompraType(c),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    supabase.from("obra_contas_financeiras").select("id, nome").eq("ativa", true).then(({ data }) => {
      if (data) setContasFinanceiras(data);
    });
  }, []);
  useRealtimeSubscription("obra_compras", fetchData);

  const resetForm = () => setForm({
    fornecedor: "", descricao: "", categoria: "Material", valor_total: "",
    data: new Date().toISOString().split("T")[0], status_entrega: "Pedido",
    forma_pagamento: "PIX", tipo_compra: "Única", numero_parcelas: "3",
    periodicidade: "Mensal", observacoes: "", conta_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fornecedor || !form.valor_total) {
      toast.error("Preencha fornecedor e valor");
      return;
    }
    setSaving(true);
    const valor = Number(form.valor_total);
    const isParcelada = form.tipo_compra === "Parcelada";
    const isRecorrente = form.tipo_compra === "Recorrente";
    const numParcelas = isParcelada ? Number(form.numero_parcelas) : 1;
    const parcelas = isParcelada ? generateParcelas(valor, numParcelas, form.data) : [];
    const obs = isRecorrente ? `[RECORRENTE] ${form.periodicidade} - ${form.descricao || form.fornecedor}` : form.observacoes;

    const { error } = await supabase.from("obra_compras").insert({
      user_id: user!.id,
      fornecedor: form.fornecedor,
      descricao: form.descricao,
      categoria: form.categoria,
      valor_total: valor,
      data: form.data,
      status_entrega: form.status_entrega,
      forma_pagamento: form.forma_pagamento,
      numero_parcelas: numParcelas,
      parcelas: parcelas as any,
      observacoes: obs,
      conta_id: form.conta_id,
    } as any);

    // For única and recorrente, create transaction immediately
    if (!error && !isParcelada) {
      await supabase.from("obra_transacoes_fluxo").insert({
        user_id: user!.id,
        tipo: "Saída",
        valor,
        data: form.data,
        categoria: form.categoria,
        descricao: isRecorrente ? `Assinatura: ${form.descricao || form.fornecedor}` : `Compra: ${form.descricao || form.fornecedor}`,
        forma_pagamento: form.forma_pagamento,
        recorrencia: isRecorrente ? form.periodicidade : "Única",
        referencia: "",
        conta_id: form.conta_id,
        observacoes: `Fornecedor: ${form.fornecedor}`,
        origem_tipo: "compra",
      } as any);
    }

    setSaving(false);
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
      toast.success(isParcelada ? `Compra parcelada em ${numParcelas}x registrada!` : isRecorrente ? "Assinatura registrada!" : "Compra registrada!");
      setShowForm(false);
      resetForm();
      fetchData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("obra_compras").update({ status_entrega: status }).eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success("Status atualizado"); fetchData(); }
  };

  const filtered = compras.filter((c) => {
    const matchSearch = search === "" ||
      c.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao?.toLowerCase().includes(search.toLowerCase()) ||
      c.categoria?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo === "Todos" || c.tipo_compra === filtroTipo;
    return matchSearch && matchTipo;
  });

  const totalCompras = filtered.reduce((s, c) => s + Number(c.valor_total), 0);
  const totalEntregue = filtered.filter(c => c.status_entrega === "Entregue").reduce((s, c) => s + Number(c.valor_total), 0);
  const totalPendente = totalCompras - totalEntregue;
  const parcelasPendentes = filtered.reduce((s, c) => {
    return s + parseParcelas(c.parcelas).filter(p => p.status === "Pendente").reduce((a, p) => a + p.valor, 0);
  }, 0);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-muted-foreground">Controle de aquisições, parcelamentos e assinaturas</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Compra
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { cls: "stat-card-info", icon: <Package className="w-4 h-4 text-info" />, label: "Total", value: formatCurrency(totalCompras) },
          { cls: "stat-card-success", icon: <Truck className="w-4 h-4 text-success" />, label: "Entregue", value: formatCurrency(totalEntregue), color: "text-success" },
          { cls: "stat-card-warning", icon: <Clock className="w-4 h-4 text-warning" />, label: "Pendente", value: formatCurrency(totalPendente), color: "text-warning" },
          { cls: "stat-card-info", icon: <CreditCard className="w-4 h-4 text-info" />, label: "Parcelas Pend.", value: formatCurrency(parcelasPendentes), color: "text-info" },
        ].map((m, i) => (
          <div key={m.label} className={`${m.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-2 mb-1">{m.icon}<span className="text-xs text-muted-foreground uppercase">{m.label}</span></div>
            <p className={`text-lg font-bold ${m.color || ""}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar compras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1">
          {(["Todos", "Única", "Parcelada", "Recorrente"] as const).map(t => (
            <Button key={t} size="sm" variant={filtroTipo === t ? "default" : "outline"} className="text-xs h-8" onClick={() => setFiltroTipo(t)}>
              {t === "Recorrente" && <RefreshCw className="w-3 h-3 mr-1" />}
              {t === "Parcelada" && <CreditCard className="w-3 h-3 mr-1" />}
              {t}
            </Button>
          ))}
        </div>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Parcelas</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const parcelas = parseParcelas(c.parcelas);
                  const pagas = parcelas.filter(p => p.status === "Paga").length;
                  return (
                    <tr key={c.id} className="table-row-interactive cursor-pointer" onClick={() => setSelectedCompra(c)}>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.data)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{c.fornecedor || "-"}</span>
                          {c.descricao && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.descricao}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={c.tipo_compra === "Recorrente" ? "secondary" : c.tipo_compra === "Parcelada" ? "outline" : "default"} className="text-xs">
                          {c.tipo_compra === "Recorrente" && <RefreshCw className="w-3 h-3 mr-1" />}
                          {c.tipo_compra === "Parcelada" ? `${c.numero_parcelas}x` : c.tipo_compra}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {c.tipo_compra === "Parcelada" && parcelas.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-success rounded-full" style={{ width: `${(pagas / parcelas.length) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{pagas}/{parcelas.length}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(Number(c.valor_total))}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <select
                          value={c.status_entrega}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer bg-transparent ${STATUS_COLORS[c.status_entrega] || "badge-muted"}`}
                        >
                          <option>Pedido</option>
                          <option>Entregue</option>
                          <option>Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <CompraDetailDrawer
        compra={selectedCompra}
        open={!!selectedCompra}
        onClose={() => setSelectedCompra(null)}
        onRefresh={() => { setSelectedCompra(null); fetchData(); }}
        userId={user?.id || ""}
      />

      {/* Dialog Nova Compra */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div>
              <Label className="text-xs text-muted-foreground">Tipo de Compra</Label>
              <div className="flex gap-2 mt-1">
                {(["Única", "Parcelada", "Recorrente"] as TipoCompra[]).map(t => (
                  <Button key={t} type="button" size="sm" variant={form.tipo_compra === t ? "default" : "outline"} className="flex-1 text-xs" onClick={() => setForm(f => ({ ...f, tipo_compra: t }))}>
                    {t === "Recorrente" && <RefreshCw className="w-3 h-3 mr-1" />}
                    {t === "Parcelada" && <CreditCard className="w-3 h-3 mr-1" />}
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <Input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Valor Total (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="mt-1" />
              </div>
            </div>

            {/* Parcelada fields */}
            {form.tipo_compra === "Parcelada" && (
              <div className="p-3 rounded-lg border border-border bg-secondary/30 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Número de Parcelas</Label>
                  <Input type="number" min="2" max="48" value={form.numero_parcelas} onChange={e => setForm(f => ({ ...f, numero_parcelas: e.target.value }))} className="mt-1" />
                </div>
                {form.valor_total && Number(form.numero_parcelas) >= 2 && (
                  <p className="text-xs text-muted-foreground">
                    {form.numero_parcelas}x de <span className="font-semibold text-foreground">{formatCurrency(Number(form.valor_total) / Number(form.numero_parcelas))}</span>
                  </p>
                )}
              </div>
            )}

            {/* Recorrente fields */}
            {form.tipo_compra === "Recorrente" && (
              <div className="p-3 rounded-lg border border-border bg-secondary/30">
                <Label className="text-xs text-muted-foreground">Periodicidade</Label>
                <select value={form.periodicidade} onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option>Mensal</option><option>Trimestral</option><option>Anual</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option>Material</option><option>Mão de Obra</option><option>Equipamento</option><option>Serviço</option><option>Assinatura</option><option>Outro</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pagamento</Label>
                <select value={form.forma_pagamento} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  <option>PIX</option><option>Cartão</option><option>Boleto</option><option>Dinheiro</option><option>Transferência</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="mt-1" placeholder={form.tipo_compra === "Recorrente" ? "Ex: Internet, Câmeras, Aluguel..." : ""} />
            </div>

            {form.tipo_compra !== "Recorrente" && (
              <div>
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Input value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="mt-1" />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <select value={form.conta_id} onChange={e => setForm(f => ({ ...f, conta_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="">Sem conta vinculada</option>
                {contasFinanceiras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : form.tipo_compra === "Parcelada" ? `Registrar ${form.numero_parcelas}x` : form.tipo_compra === "Recorrente" ? "Registrar Assinatura" : "Registrar Compra"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
