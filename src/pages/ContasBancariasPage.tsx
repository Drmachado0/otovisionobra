import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import {
  Plus, Wallet, Building2, CreditCard, PiggyBank, TrendingUp,
  ToggleLeft, ToggleRight, Pencil, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Conta {
  id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  cor: string;
  ativa: boolean;
  observacoes: string;
  created_at: string;
}

interface Transacao {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
  categoria: string;
  conta_id: string;
}

const TIPOS_CONTA = ["Caixa", "Banco", "Cartão de Crédito", "Investimento", "Poupança"];

const TIPO_ICONS: Record<string, React.ReactNode> = {
  Caixa: <Wallet className="w-5 h-5" />,
  Banco: <Building2 className="w-5 h-5" />,
  "Cartão de Crédito": <CreditCard className="w-5 h-5" />,
  Investimento: <TrendingUp className="w-5 h-5" />,
  Poupança: <PiggyBank className="w-5 h-5" />,
};

const CORES = ["#10B981", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#6366F1"];

export default function ContasBancariasPage() {
  const { user } = useAuth();
  const [contas, setContas] = useState<Conta[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editConta, setEditConta] = useState<Conta | null>(null);
  const [extratoConta, setExtratoConta] = useState<Conta | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    tipo: "Banco",
    saldo_inicial: "",
    cor: "#3B82F6",
    observacoes: "",
  });

  const fetchData = useCallback(async () => {
    const [contasRes, transRes] = await Promise.all([
      supabase.from("obra_contas_financeiras").select("*").order("created_at", { ascending: true }),
      supabase.from("obra_transacoes_fluxo").select("id, tipo, valor, data, descricao, categoria, conta_id").is("deleted_at", null).neq("conta_id", ""),
    ]);
    if (contasRes.data) setContas(contasRes.data as Conta[]);
    if (transRes.data) setTransacoes(transRes.data as Transacao[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_contas_financeiras", fetchData);

  const getSaldo = (conta: Conta) => {
    const movs = transacoes.filter(t => t.conta_id === conta.id);
    const entradas = movs.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
    const saidas = movs.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
    return conta.saldo_inicial + entradas - saidas;
  };

  const saldoTotal = contas.filter(c => c.ativa).reduce((s, c) => s + getSaldo(c), 0);
  const contasAtivas = contas.filter(c => c.ativa).length;
  const contasInativas = contas.filter(c => !c.ativa).length;

  const resetForm = () => setForm({ nome: "", tipo: "Banco", saldo_inicial: "", cor: "#3B82F6", observacoes: "" });

  const openEdit = (c: Conta) => {
    setEditConta(c);
    setForm({ nome: c.nome, tipo: c.tipo, saldo_inicial: String(c.saldo_inicial), cor: c.cor, observacoes: c.observacoes });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast.error("Informe o nome da conta"); return; }
    setSaving(true);

    const payload = {
      nome: form.nome,
      tipo: form.tipo,
      saldo_inicial: Number(form.saldo_inicial) || 0,
      cor: form.cor,
      observacoes: form.observacoes,
    };

    if (editConta) {
      const { error } = await supabase.from("obra_contas_financeiras").update(payload).eq("id", editConta.id);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Conta atualizada!");
    } else {
      const { error } = await supabase.from("obra_contas_financeiras").insert({ ...payload, user_id: user!.id } as any);
      if (error) toast.error("Erro: " + error.message);
      else toast.success("Conta criada!");
    }

    setSaving(false);
    setShowForm(false);
    setEditConta(null);
    resetForm();
    fetchData();
  };

  const toggleAtiva = async (conta: Conta) => {
    const { error } = await supabase.from("obra_contas_financeiras").update({ ativa: !conta.ativa }).eq("id", conta.id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(conta.ativa ? "Conta desativada" : "Conta reativada"); fetchData(); }
  };

  const extratoTransacoes = extratoConta
    ? transacoes.filter(t => t.conta_id === extratoConta.id).sort((a, b) => b.data.localeCompare(a.data))
    : [];

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="text-2xl font-bold">Contas Bancárias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas financeiras</p>
        </div>
        <Button onClick={() => { resetForm(); setEditConta(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { cls: "stat-card-info", label: "Saldo Total", value: formatCurrency(saldoTotal), color: saldoTotal >= 0 ? "text-success" : "text-destructive" },
          { cls: "stat-card-success", label: "Contas Ativas", value: String(contasAtivas), color: "text-success" },
          { cls: "stat-card-warning", label: "Contas Inativas", value: String(contasInativas), color: "text-muted-foreground" },
        ].map((k, i) => (
          <div key={k.label} className={`${k.cls} p-4 animate-fade-in-up`} style={{ animationDelay: `${i * 100}ms` }}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{k.label}</p>
            <p className={`text-lg font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contas.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map((conta, i) => {
            const saldo = getSaldo(conta);
            const movCount = transacoes.filter(t => t.conta_id === conta.id).length;
            return (
              <div
                key={conta.id}
                className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.02] animate-fade-in-up ${!conta.ativa ? "opacity-50" : ""}`}
                style={{ animationDelay: `${i * 80}ms`, borderLeft: `3px solid ${conta.cor}` }}
                onClick={() => setExtratoConta(conta)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${conta.cor}20`, color: conta.cor }}>
                      {TIPO_ICONS[conta.tipo] || <Wallet className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{conta.nome}</h3>
                      <p className="text-xs text-muted-foreground">{conta.tipo}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(conta); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleAtiva(conta); }}>
                      {conta.ativa ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo atual</p>
                    <p className={`text-xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(saldo)}
                    </p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Saldo inicial: {formatCurrency(conta.saldo_inicial)}</span>
                    <span>{movCount} mov.</span>
                  </div>
                  {!conta.ativa && (
                    <Badge variant="secondary" className="text-xs">Inativa</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Extrato Drawer */}
      <Sheet open={!!extratoConta} onOpenChange={open => !open && setExtratoConta(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {extratoConta && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${extratoConta.cor}20`, color: extratoConta.cor }}>
                    {TIPO_ICONS[extratoConta.tipo] || <Wallet className="w-4 h-4" />}
                  </div>
                  {extratoConta.nome}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-sm font-medium">{extratoConta.tipo}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground">Saldo Atual</p>
                    <p className={`text-sm font-bold ${getSaldo(extratoConta) >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(getSaldo(extratoConta))}
                    </p>
                  </div>
                </div>

                {extratoConta.observacoes && (
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{extratoConta.observacoes}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-3">Extrato ({extratoTransacoes.length} movimentações)</h4>
                  {extratoTransacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação vinculada</p>
                  ) : (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {extratoTransacoes.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                          <div>
                            <p className="text-sm font-medium">{t.descricao || t.categoria}</p>
                            <p className="text-xs text-muted-foreground">{t.data}</p>
                          </div>
                          <span className={`text-sm font-semibold ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                            {t.tipo === "Entrada" ? "+" : "-"} {formatCurrency(Number(t.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditConta(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editConta ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="mt-1" placeholder="Ex: Banco do Brasil" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                  {TIPOS_CONTA.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Saldo Inicial (R$)</Label>
                <Input type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} className="mt-1" placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cor</Label>
              <div className="flex gap-2 mt-1">
                {CORES.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, cor: c }))}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Salvando..." : editConta ? "Salvar Alterações" : "Criar Conta"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
