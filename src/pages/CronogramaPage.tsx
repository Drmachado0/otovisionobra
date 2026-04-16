import { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Etapa {
  id: string;
  nome: string;
  categoria: string;
  responsavel: string;
  inicio_previsto: string;
  fim_previsto: string;
  inicio_real: string | null;
  fim_real: string | null;
  status: string;
  percentual_conclusao: number;
  custo_previsto: number;
  custo_real: number;
  observacoes: string;
  descricao: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  "Não Iniciada": { label: "Não Iniciada", color: "text-muted-foreground", bg: "bg-muted/50", icon: Clock },
  "Em Andamento": { label: "Em Andamento", color: "text-info", bg: "bg-info/10", icon: TrendingUp },
  "Concluída": { label: "Concluída", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  "Atrasada": { label: "Atrasada", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle },
};

const emptyForm = {
  nome: "", categoria: "", responsavel: "", inicio_previsto: "", fim_previsto: "",
  status: "Não Iniciada", percentual_conclusao: 0, custo_previsto: 0, descricao: "", observacoes: "",
};

interface FormErrors {
  nome?: string;
  percentual_conclusao?: string;
  custo_previsto?: string;
  datas?: string;
}

/** Returns budget health: green (<= 80%), yellow (80-100%), red (> 100%) */
function getBudgetHealth(custoReal: number, custoPrevisto: number): "green" | "yellow" | "red" | null {
  if (custoPrevisto <= 0) return null;
  const pct = (custoReal / custoPrevisto) * 100;
  if (pct > 100) return "red";
  if (pct > 80) return "yellow";
  return "green";
}

function getBudgetEmoji(health: "green" | "yellow" | "red" | null) {
  if (health === "green") return "🟢";
  if (health === "yellow") return "🟡";
  if (health === "red") return "🔴";
  return "";
}

function getBudgetBarColor(health: "green" | "yellow" | "red" | null) {
  if (health === "red") return "bg-[#EF4444]";
  if (health === "yellow") return "bg-[#F59E0B]";
  return "bg-[#10B981]";
}

export default function CronogramaPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<Etapa | null>(null);
  const [orcamentoObra, setOrcamentoObra] = useState(0);

  const fetchData = useCallback(async () => {
    const [{ data }, { data: config }] = await Promise.all([
      supabase.from("obra_cronograma").select("*").order("inicio_previsto", { ascending: true }),
      supabase.from("obra_config").select("orcamento_total").limit(1).maybeSingle(),
    ]);
    if (data) setEtapas(data as unknown as Etapa[]);
    if (config) setOrcamentoObra(Number(config.orcamento_total) || 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeSubscription("obra_cronograma", fetchData);

  const stats = useMemo(() => {
    const total = etapas.length;
    const concluidas = etapas.filter(e => e.status === "Concluída").length;
    const atrasadas = etapas.filter(e => {
      if (e.status === "Concluída") return false;
      return e.fim_previsto && new Date(e.fim_previsto) < new Date();
    }).length;
    const acima = etapas.filter(e => e.custo_real > e.custo_previsto && e.custo_previsto > 0).length;
    const custoTotal = etapas.reduce((s, e) => s + e.custo_previsto, 0);
    const custoReal = etapas.reduce((s, e) => s + e.custo_real, 0);
    const progressoGeral = total > 0 ? etapas.reduce((s, e) => s + e.percentual_conclusao, 0) / total : 0;
    return { total, concluidas, atrasadas, acima, custoTotal, custoReal, progressoGeral };
  }, [etapas]);

  const openNew = () => { setForm(emptyForm); setEditId(null); setErrors({}); setDialogOpen(true); };
  const openEdit = (e: Etapa) => {
    setForm({
      nome: e.nome, categoria: e.categoria, responsavel: e.responsavel,
      inicio_previsto: e.inicio_previsto, fim_previsto: e.fim_previsto,
      status: e.status, percentual_conclusao: e.percentual_conclusao,
      custo_previsto: e.custo_previsto, descricao: e.descricao, observacoes: e.observacoes,
    });
    setEditId(e.id);
    setErrors({});
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.nome.trim()) errs.nome = "Nome é obrigatório";
    const pct = Number(form.percentual_conclusao);
    if (pct < 0 || pct > 100) errs.percentual_conclusao = "Deve ser entre 0 e 100";
    if (Number(form.custo_previsto) < 0) errs.custo_previsto = "Orçamento não pode ser negativo";
    if (form.inicio_previsto && form.fim_previsto && form.fim_previsto < form.inicio_previsto) {
      errs.datas = "Data fim deve ser após data início";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const newCustoPrevisto = Number(form.custo_previsto);

    // Check budget sum vs obra total
    if (orcamentoObra > 0 && newCustoPrevisto > 0) {
      const somaOutras = etapas
        .filter(e => e.id !== editId)
        .reduce((s, e) => s + e.custo_previsto, 0);
      const novaTotal = somaOutras + newCustoPrevisto;
      if (novaTotal > orcamentoObra) {
        toast.warning(
          `⚠️ A soma dos orçamentos das etapas (${formatCurrency(novaTotal)}) ultrapassa o orçamento total da obra (${formatCurrency(orcamentoObra)})`,
          { duration: 6000 }
        );
      }
    }

    // Auto-status based on progress
    let autoStatus = form.status;
    const pct = Number(form.percentual_conclusao);
    if (pct >= 100) {
      autoStatus = "Concluída";
    } else if (pct > 0 && autoStatus === "Não Iniciada") {
      autoStatus = "Em Andamento";
    } else if (pct === 0 && autoStatus === "Concluída") {
      autoStatus = "Não Iniciada";
    }

    const payload = {
      nome: form.nome, categoria: form.categoria, responsavel: form.responsavel,
      inicio_previsto: form.inicio_previsto, fim_previsto: form.fim_previsto,
      status: autoStatus, percentual_conclusao: pct,
      custo_previsto: newCustoPrevisto, descricao: form.descricao, observacoes: form.observacoes,
    };

    if (editId) {
      const { error } = await supabase.from("obra_cronograma").update(payload).eq("id", editId);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Etapa atualizada");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("obra_cronograma").insert({ ...payload, user_id: user!.id });
      if (error) toast.error("Erro ao criar"); else toast.success("Etapa criada");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("obra_cronograma").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Etapa excluída"); fetchData(); }
  };

  // Timeline calculations
  const timelineData = useMemo(() => {
    if (!etapas.length) return { minDate: new Date(), maxDate: new Date(), items: [] };
    const dates = etapas.flatMap(e => [e.inicio_previsto, e.fim_previsto].filter(Boolean).map(d => new Date(d)));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const range = max.getTime() - min.getTime() || 1;
    const items = etapas.map(e => {
      const start = e.inicio_previsto ? new Date(e.inicio_previsto) : min;
      const end = e.fim_previsto ? new Date(e.fim_previsto) : max;
      return {
        ...e,
        left: ((start.getTime() - min.getTime()) / range) * 100,
        width: Math.max(((end.getTime() - start.getTime()) / range) * 100, 3),
      };
    });
    return { minDate: min, maxDate: max, items };
  }, [etapas]);

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-52 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const orcHealthGlobal = getBudgetHealth(stats.custoReal, stats.custoTotal);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cronograma da Obra</h1>
          <p className="text-sm text-muted-foreground">Planejamento e acompanhamento das etapas</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nova Etapa
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card-info p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="stat-card-success p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Concluídas</p>
          <p className="text-xl font-bold mt-1">{stats.concluidas}</p>
        </div>
        <div className="stat-card-danger p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Atrasadas</p>
          <p className="text-xl font-bold mt-1">{stats.atrasadas}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Orçamento Etapas
          </p>
          <p className={`text-lg font-bold mt-1 ${stats.acima > 0 ? "text-[#EF4444]" : ""}`}>
            {formatCurrency(stats.custoReal)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            de {formatCurrency(stats.custoTotal)} previsto
            {stats.acima > 0 && (
              <span className="text-[#EF4444] font-medium ml-1">• {stats.acima} acima</span>
            )}
          </p>
        </div>
      </div>

      {/* Progress geral */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Progresso Geral da Obra</span>
          <span className="text-sm font-bold text-primary">{stats.progressoGeral.toFixed(1)}%</span>
        </div>
        <Progress value={stats.progressoGeral} className="h-3" />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Previsto: {formatCurrency(stats.custoTotal)}</span>
          <span>Realizado: {formatCurrency(stats.custoReal)}</span>
        </div>
      </div>

      {/* Timeline visual */}
      {timelineData.items.length > 0 && (
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Timeline
          </h2>
          <div className="space-y-3">
            {timelineData.items.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG["Não Iniciada"];
              const isOverBudget = item.custo_real > item.custo_previsto && item.custo_previsto > 0;
              const isLate = item.status !== "Concluída" && item.fim_previsto && new Date(item.fim_previsto) < new Date();
              const health = getBudgetHealth(item.custo_real, item.custo_previsto);
              return (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => openEdit(item)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${cfg.bg}`}>
                      <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <span className="text-sm font-medium flex-1">
                      {item.nome}
                      {health && <span className="ml-1.5 text-xs">{getBudgetEmoji(health)}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      {isLate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Atrasada</span>}
                      {isOverBudget && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Acima</span>}
                      <span className="text-xs text-muted-foreground">{item.percentual_conclusao}%</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="ml-9">
                    <div className="relative h-6 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                          isLate ? "bg-destructive/60" : item.status === "Concluída" ? "bg-success/60" : "bg-info/60"
                        }`}
                        style={{ left: `${item.left}%`, width: `${item.width}%` }}
                      />
                      <div
                        className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                          isLate ? "bg-destructive" : item.status === "Concluída" ? "bg-success" : "bg-primary"
                        }`}
                        style={{
                          left: `${item.left}%`,
                          width: `${(item.width * item.percentual_conclusao) / 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{item.inicio_previsto ? formatDate(item.inicio_previsto) : "—"}</span>
                      <span>{item.fim_previsto ? formatDate(item.fim_previsto) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Etapas list */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Detalhes das Etapas</h2>
        {etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa cadastrada</p>
        ) : (
          <div className="space-y-3">
            {etapas.map((e) => {
              const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG["Não Iniciada"];
              const health = getBudgetHealth(e.custo_real, e.custo_previsto);
              const financialPct = e.custo_previsto > 0 ? (e.custo_real / e.custo_previsto) * 100 : 0;
              return (
                <div
                  key={e.id}
                  onClick={() => openEdit(e)}
                  className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                        <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.nome}</p>
                        <p className="text-xs text-muted-foreground">{e.categoria || e.responsavel || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${health === "red" ? "text-[#EF4444]" : ""}`}>
                        {formatCurrency(e.custo_real)} / {formatCurrency(e.custo_previsto)}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.percentual_conclusao}% concluído</p>
                    </div>
                  </div>
                  {/* Financial progress bar */}
                  {e.custo_previsto > 0 && (
                    <div className="mt-2 ml-11">
                      <div className="relative h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${getBudgetBarColor(health)}`}
                          style={{ width: `${Math.min(financialPct, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {financialPct.toFixed(1)}% do orçamento
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label><Input value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} /></div>
              <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início Previsto</Label><Input type="date" value={form.inicio_previsto} onChange={e => setForm(f => ({ ...f, inicio_previsto: e.target.value }))} /></div>
              <div><Label>Fim Previsto</Label><Input type="date" value={form.fim_previsto} onChange={e => setForm(f => ({ ...f, fim_previsto: e.target.value }))} /></div>
            </div>
            {errors.datas && <p className="text-xs text-destructive">{errors.datas}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não Iniciada">Não Iniciada</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                    <SelectItem value="Atrasada">Atrasada</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Auto-ajustado pelo progresso</p>
              </div>
              <div>
                <Label>Progresso (%)</Label>
                <Input type="number" min={0} max={100} value={form.percentual_conclusao} onChange={e => setForm(f => ({ ...f, percentual_conclusao: Number(e.target.value) }))} />
                {errors.percentual_conclusao && <p className="text-xs text-destructive mt-1">{errors.percentual_conclusao}</p>}
              </div>
            </div>
            <div>
              <Label>Orçamento Previsto (R$)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.custo_previsto}
                onChange={e => setForm(f => ({ ...f, custo_previsto: Number(e.target.value) }))}
                placeholder="0,00"
              />
              {errors.custo_previsto && <p className="text-xs text-destructive mt-1">{errors.custo_previsto}</p>}
              {orcamentoObra > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Orçamento total da obra: {formatCurrency(orcamentoObra)}
                </p>
              )}
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Salvando..." : "Salvar"}</Button>
              {editId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    const target = etapas.find(e => e.id === editId);
                    if (target) { setDialogOpen(false); setDeleteTarget(target); }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Etapa"
        message={`Deseja excluir a etapa "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
