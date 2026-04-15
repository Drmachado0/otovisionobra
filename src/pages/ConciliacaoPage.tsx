import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Play,
  Undo2,
  Plus,
  XCircle,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  LinkIcon,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConciliacao, type MovimentacaoExtraida, type Conciliacao, calcMatchScore } from "@/hooks/useConciliacao";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { formatCurrency, formatDate } from "@/lib/formatters";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  conciliado_automaticamente: { label: "Auto", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Zap },
  conciliado_manualmente: { label: "Manual", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
  sugestao_disponivel: { label: "Sugestão", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: LinkIcon },
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  nao_analisado: { label: "Não analisado", color: "bg-muted text-muted-foreground border-border", icon: Clock },
  divergente: { label: "Divergente", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  duplicidade_suspeita: { label: "Duplicidade", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: Copy },
  desfeita: { label: "Desfeita", color: "bg-muted text-muted-foreground border-border", icon: Undo2 },
  ignorado_temporariamente: { label: "Ignorado", color: "bg-muted text-muted-foreground border-border", icon: Clock },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 95 ? "bg-emerald-500/20 text-emerald-400" :
    score >= 75 ? "bg-blue-500/20 text-blue-400" :
    score >= 50 ? "bg-amber-500/20 text-amber-400" :
    "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{score}%</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1 text-[11px]`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function ConciliacaoPage() {
  const {
    movimentacoes, transacoes, conciliacoes, sugestoes, stats, loading, fetchError,
    fetchAll, runMatching, conciliarManual, desfazerConciliacao,
    marcarDivergente, criarTransacaoDeMov,
  } = useConciliacao();

  useRealtimeSubscription("obra_conciliacoes_bancarias", fetchAll);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [activeTab, setActiveTab] = useState("visao-geral");

  // Dialog states
  const [conciliarDialog, setConciliarDialog] = useState<{ movId: string; concId?: string } | null>(null);
  const [desfazerDialog, setDesfazerDialog] = useState<string | null>(null);
  const [divergenteDialog, setDivergenteDialog] = useState<string | null>(null);
  const [criarTxDialog, setCriarTxDialog] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [selectedTxId, setSelectedTxId] = useState("");
  const [selectedContaId, setSelectedContaId] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("");

  // Enriched conciliations with movimentacao data
  const enrichedConcs = useMemo(() => {
    return conciliacoes
      .filter(c => c.status_conciliacao !== "desfeita")
      .map(c => {
        const mov = movimentacoes.find(m => m.id === c.movimentacao_extraida_id);
        const tx = c.transacao_id ? transacoes.find(t => t.id === c.transacao_id) : null;
        return { ...c, mov, tx };
      })
      .filter(c => {
        if (!c.mov) return false;
        if (statusFilter !== "todos" && c.status_conciliacao !== statusFilter) return false;
        if (tipoFilter !== "todos" && c.mov.tipo_movimentacao !== tipoFilter) return false;
        if (searchTerm) {
          const s = searchTerm.toLowerCase();
          return c.mov.descricao.toLowerCase().includes(s) || (c.tx?.descricao || "").toLowerCase().includes(s);
        }
        return true;
      });
  }, [conciliacoes, movimentacoes, transacoes, statusFilter, tipoFilter, searchTerm]);

  // Unanalyzed movimentacoes
  const unanalyzedMovs = useMemo(() => {
    const concMovIds = new Set(conciliacoes.filter(c => c.status_conciliacao !== "desfeita").map(c => c.movimentacao_extraida_id));
    return movimentacoes.filter(m => !concMovIds.has(m.id));
  }, [movimentacoes, conciliacoes]);

  // Suggestions for a given movimentacao
  const getSugestoes = (movId: string) => {
    return sugestoes
      .filter(s => s.movimentacao_extraida_id === movId && s.status_sugestao === "pendente")
      .map(s => ({ ...s, transacao: transacoes.find(t => t.id === s.transacao_id) }));
  };

  // CSV export
  const exportCSV = () => {
    const headers = ["Data Mov.", "Descrição Mov.", "Valor", "Tipo", "Status", "Score", "Transação Vinculada", "Data Transação"];
    const rows = enrichedConcs.map(c => [
      c.mov?.data_movimentacao || "",
      c.mov?.descricao || "",
      c.mov?.valor?.toString() || "",
      c.mov?.tipo_movimentacao || "",
      c.status_conciliacao,
      c.score_compatibilidade.toString(),
      c.tx?.descricao || "",
      c.tx?.data || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conciliacao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const kpiCards = [
    { label: "Total Importado", value: stats.total, icon: ArrowLeftRight, color: "text-primary" },
    { label: "Conciliado", value: stats.conciliado, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pendente", value: stats.pendente, icon: Clock, color: "text-amber-400" },
    { label: "Divergente", value: stats.divergente, icon: AlertTriangle, color: "text-red-400" },
    { label: "Duplicidade", value: stats.duplicidade, icon: Copy, color: "text-orange-400" },
    { label: "Taxa Automação", value: `${stats.taxaAutomacao.toFixed(0)}%`, icon: Zap, color: "text-blue-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Conciliação Bancária</h1>
        <div className="glass-card p-6 flex items-center gap-4 border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Erro ao carregar dados de conciliação</p>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
          </div>
          <button onClick={fetchAll} className="text-xs text-primary hover:underline">Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Conciliação Bancária</h1>
          <p className="text-sm text-muted-foreground">Compare extratos importados com lançamentos existentes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={runMatching} className="gap-1">
            <Play className="w-4 h-4" /> Executar Matching
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes ({unanalyzedMovs.length + enrichedConcs.filter(c => ["pendente", "sugestao_disponivel", "nao_analisado"].includes(c.status_conciliacao)).length})</TabsTrigger>
          <TabsTrigger value="conciliados">Conciliados</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="conciliado_automaticamente">Auto</SelectItem>
              <SelectItem value="conciliado_manualmente">Manual</SelectItem>
              <SelectItem value="sugestao_disponivel">Sugestão</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="divergente">Divergente</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tab: Visao Geral */}
        <TabsContent value="visao-geral" className="mt-4 space-y-2">
          {enrichedConcs.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="p-8 text-center text-muted-foreground">
              {movimentacoes.length === 0
                ? "Nenhuma movimentação importada. Importe extratos pelo módulo Pasta Sync."
                : "Clique em 'Executar Matching' para analisar as movimentações."}
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {enrichedConcs.map(c => (
                <ConciliacaoRow
                  key={c.id}
                  conc={c}
                  sugestoes={getSugestoes(c.movimentacao_extraida_id)}
                  onConciliar={(movId) => setConciliarDialog({ movId, concId: c.id })}
                  onDesfazer={() => setDesfazerDialog(c.id)}
                  onDivergente={() => setDivergenteDialog(c.id)}
                  onCriarTx={() => setCriarTxDialog(c.movimentacao_extraida_id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Pendentes */}
        <TabsContent value="pendentes" className="mt-4 space-y-2">
          {unanalyzedMovs.length > 0 && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <p className="text-sm text-amber-400 font-medium mb-2">
                  {unanalyzedMovs.length} movimentações ainda não analisadas
                </p>
                <Button size="sm" onClick={runMatching} className="gap-1">
                  <Play className="w-4 h-4" /> Analisar agora
                </Button>
              </CardContent>
            </Card>
          )}
          {enrichedConcs
            .filter(c => ["pendente", "sugestao_disponivel", "nao_analisado"].includes(c.status_conciliacao))
            .map(c => (
              <ConciliacaoRow
                key={c.id}
                conc={c}
                sugestoes={getSugestoes(c.movimentacao_extraida_id)}
                onConciliar={(movId) => setConciliarDialog({ movId, concId: c.id })}
                onDesfazer={() => setDesfazerDialog(c.id)}
                onDivergente={() => setDivergenteDialog(c.id)}
                onCriarTx={() => setCriarTxDialog(c.movimentacao_extraida_id)}
              />
            ))}
        </TabsContent>

        {/* Tab: Conciliados */}
        <TabsContent value="conciliados" className="mt-4 space-y-2">
          {enrichedConcs
            .filter(c => c.status_conciliacao.includes("conciliado"))
            .map(c => (
              <ConciliacaoRow
                key={c.id}
                conc={c}
                sugestoes={[]}
                onConciliar={() => {}}
                onDesfazer={() => setDesfazerDialog(c.id)}
                onDivergente={() => {}}
                onCriarTx={() => {}}
              />
            ))}
        </TabsContent>
      </Tabs>

      {/* Dialog: Conciliar Manual */}
      <Dialog open={!!conciliarDialog} onOpenChange={() => setConciliarDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Conciliar Manualmente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione a transação correspondente:</p>
            <Select value={selectedTxId} onValueChange={setSelectedTxId}>
              <SelectTrigger><SelectValue placeholder="Transação" /></SelectTrigger>
              <SelectContent>
                {transacoes.filter(t => !t.conciliado).slice(0, 50).map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {formatDate(t.data)} — {formatCurrency(t.valor)} — {t.descricao.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Observações (opcional)" value={motivo} onChange={e => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConciliarDialog(null)}>Cancelar</Button>
            <Button disabled={!selectedTxId} onClick={async () => {
              if (conciliarDialog) {
                await conciliarManual(conciliarDialog.movId, selectedTxId, motivo);
                setConciliarDialog(null);
                setSelectedTxId("");
                setMotivo("");
              }
            }}>Conciliar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Desfazer */}
      <Dialog open={!!desfazerDialog} onOpenChange={() => setDesfazerDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Desfazer Conciliação</DialogTitle></DialogHeader>
          <Textarea placeholder="Motivo..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesfazerDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (desfazerDialog) {
                await desfazerConciliacao(desfazerDialog, motivo);
                setDesfazerDialog(null);
                setMotivo("");
              }
            }}>Desfazer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Divergente */}
      <Dialog open={!!divergenteDialog} onOpenChange={() => setDivergenteDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Marcar como Divergente</DialogTitle></DialogHeader>
          <Textarea placeholder="Observação..." value={motivo} onChange={e => setMotivo(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDivergenteDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (divergenteDialog) {
                await marcarDivergente(divergenteDialog, motivo);
                setDivergenteDialog(null);
                setMotivo("");
              }
            }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Transação */}
      <Dialog open={!!criarTxDialog} onOpenChange={() => setCriarTxDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Nova Transação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {criarTxDialog && (() => {
              const mov = movimentacoes.find(m => m.id === criarTxDialog);
              return mov ? (
                <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                  <p><strong>Descrição:</strong> {mov.descricao}</p>
                  <p><strong>Valor:</strong> {formatCurrency(mov.valor)}</p>
                  <p><strong>Data:</strong> {formatDate(mov.data_movimentacao)}</p>
                  <p><strong>Tipo:</strong> {mov.tipo_movimentacao}</p>
                </div>
              ) : null;
            })()}
            <Input placeholder="Categoria" value={selectedCategoria} onChange={e => setSelectedCategoria(e.target.value)} />
            <Input placeholder="ID da Conta" value={selectedContaId} onChange={e => setSelectedContaId(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriarTxDialog(null)}>Cancelar</Button>
            <Button onClick={async () => {
              if (criarTxDialog) {
                await criarTransacaoDeMov(criarTxDialog, selectedContaId, selectedCategoria);
                setCriarTxDialog(null);
                setSelectedCategoria("");
                setSelectedContaId("");
              }
            }}>Criar e Conciliar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Row Component ── */
function ConciliacaoRow({
  conc,
  sugestoes,
  onConciliar,
  onDesfazer,
  onDivergente,
  onCriarTx,
}: {
  conc: Conciliacao & { mov?: MovimentacaoExtraida | null; tx?: any };
  sugestoes: any[];
  onConciliar: (movId: string) => void;
  onDesfazer: () => void;
  onDivergente: () => void;
  onCriarTx: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isConciliado = conc.status_conciliacao.includes("conciliado");

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
            <span className="text-xs text-muted-foreground">{conc.mov ? formatDate(conc.mov.data_movimentacao) : "-"}</span>
            <span className="text-sm truncate col-span-2">{conc.mov?.descricao || "-"}</span>
            <span className={`text-sm font-semibold ${conc.mov?.tipo_movimentacao === "entrada" ? "text-emerald-400" : "text-red-400"}`}>
              {conc.mov ? formatCurrency(conc.mov.valor) : "-"}
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status={conc.status_conciliacao} />
              {conc.score_compatibilidade > 0 && <ScoreBadge score={conc.score_compatibilidade} />}
            </div>
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Movimentação */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Extrato Importado</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Descrição:</span> {conc.mov?.descricao}</p>
                  <p><span className="text-muted-foreground">Valor:</span> {conc.mov ? formatCurrency(conc.mov.valor) : "-"}</p>
                  <p><span className="text-muted-foreground">Data:</span> {conc.mov ? formatDate(conc.mov.data_movimentacao) : "-"}</p>
                  <p><span className="text-muted-foreground">Tipo:</span> {conc.mov?.tipo_movimentacao}</p>
                </div>
              </div>

              {/* Transação vinculada ou sugestões */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                {conc.tx ? (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Transação Vinculada</p>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Descrição:</span> {conc.tx.descricao}</p>
                      <p><span className="text-muted-foreground">Valor:</span> {formatCurrency(conc.tx.valor)}</p>
                      <p><span className="text-muted-foreground">Data:</span> {formatDate(conc.tx.data)}</p>
                      <p><span className="text-muted-foreground">Categoria:</span> {conc.tx.categoria}</p>
                    </div>
                  </>
                ) : sugestoes.length > 0 ? (
                  <>
                    <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">Sugestões ({sugestoes.length})</p>
                    {sugestoes.slice(0, 3).map(s => (
                      <div key={s.id} className="mb-2 p-2 rounded bg-background/50 border border-border/30 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="truncate">{s.transacao?.descricao || "—"}</span>
                          <ScoreBadge score={s.score_compatibilidade} />
                        </div>
                        <p className="text-xs text-muted-foreground">{s.motivo_matching}</p>
                        <p className="text-xs">{s.transacao ? `${formatCurrency(s.transacao.valor)} — ${formatDate(s.transacao.data)}` : ""}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma transação vinculada ou sugerida.</p>
                )}
              </div>
            </div>

            {conc.motivo_matching && (
              <p className="text-xs text-muted-foreground">
                <strong>Motivo:</strong> {conc.motivo_matching}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {!isConciliado && (
                <>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onConciliar(conc.movimentacao_extraida_id)}>
                    <LinkIcon className="w-3 h-3" /> Conciliar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={onCriarTx}>
                    <Plus className="w-3 h-3" /> Nova Transação
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={onDivergente}>
                    <XCircle className="w-3 h-3" /> Divergente
                  </Button>
                </>
              )}
              {isConciliado && (
                <Button size="sm" variant="outline" className="gap-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10" onClick={onDesfazer}>
                  <Undo2 className="w-3 h-3" /> Desfazer
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
