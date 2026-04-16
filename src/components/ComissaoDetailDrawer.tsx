import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CheckCircle, Clock, FileText, ShoppingCart, Receipt, ArrowRight, Calculator, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Input } from "@/components/ui/input";

const PERCENTUAL_COMISSAO = 8;

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
  transacao_id: string | null;
  created_at: string;
}

interface TransacaoVinculada {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  forma_pagamento: string;
  tipo: string;
  origem_tipo: string | null;
}

export function parseObservacoes(obs: string) {
  if (!obs) return { tipo: "Manual", referencia: "", fornecedor: "" };

  const nfMatch = obs.match(/^(NF\s*\d+)\s*[-–]\s*(.+)/i);
  if (nfMatch) return { tipo: "NF", referencia: nfMatch[1].trim(), fornecedor: nfMatch[2].trim() };

  const orcMatch = obs.match(/^Orçamento\s*[-–]\s*([^(]+)\s*\(([^)]+)\)/i);
  if (orcMatch) return { tipo: "Orçamento", referencia: "", fornecedor: orcMatch[1].trim(), categoria: orcMatch[2].trim() };

  const orcSimple = obs.match(/^Orçamento\s*[-–]\s*(.+)/i);
  if (orcSimple) return { tipo: "Orçamento", referencia: "", fornecedor: orcSimple[1].trim() };

  const compraMatch = obs.match(/^Compra\s*[-–]\s*(.+)/i);
  if (compraMatch) return { tipo: "Compra", referencia: "", fornecedor: compraMatch[1].trim() };

  return { tipo: "Manual", referencia: obs, fornecedor: "" };
}

function OrigemBadge({ tipo }: { tipo: string }) {
  const config: Record<string, { cls: string; icon: React.ReactNode }> = {
    NF: { cls: "badge-info", icon: <Receipt className="w-3 h-3" /> },
    Orçamento: { cls: "badge-warning", icon: <FileText className="w-3 h-3" /> },
    Compra: { cls: "badge-primary", icon: <ShoppingCart className="w-3 h-3" /> },
    Manual: { cls: "badge-muted", icon: <FileText className="w-3 h-3" /> },
  };
  const c = config[tipo] || config.Manual;
  return (
    <span className={`${c.cls} inline-flex items-center gap-1 text-[10px]`}>
      {c.icon} {tipo}
    </span>
  );
}

interface Props {
  comissao: ComissaoRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export default function ComissaoDetailDrawer({ comissao, open, onOpenChange, onUpdate }: Props) {
  const [transacao, setTransacao] = useState<TransacaoVinculada | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [editValor, setEditValor] = useState("");
  const [editMes, setEditMes] = useState("");
  const [editPago, setEditPago] = useState(false);
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editFornecedor, setEditFornecedor] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editFormaPagamento, setEditFormaPagamento] = useState("");

  useEffect(() => {
    if (!comissao?.transacao_id || !open) { setTransacao(null); return; }
    setLoadingTx(true);
    supabase
      .from("obra_transacoes_fluxo")
      .select("id, descricao, categoria, valor, data, forma_pagamento, tipo, origem_tipo")
      .eq("id", comissao.transacao_id)
      .maybeSingle()
      .then(({ data }) => {
        setTransacao(data as TransacaoVinculada | null);
        setLoadingTx(false);
      });
  }, [comissao?.transacao_id, open]);

  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const startEditing = () => {
    if (!comissao) return;
    setEditValor(String(comissao.valor));
    setEditMes(comissao.mes);
    setEditPago(comissao.pago);
    setEditObservacoes(comissao.observacoes);
    setEditFornecedor(comissao.fornecedor);
    setEditCategoria(comissao.categoria);
    setEditFormaPagamento(comissao.forma_pagamento);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!comissao) return;
    setSaving(true);
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({
        valor: parseFloat(editValor) || 0,
        mes: editMes,
        pago: editPago,
        observacoes: editObservacoes,
        fornecedor: editFornecedor,
        categoria: editCategoria,
        forma_pagamento: editFormaPagamento,
      })
      .eq("id", comissao.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Comissão atualizada");
      setEditing(false);
      onOpenChange(false);
      onUpdate?.();
    }
  };

  const handleDelete = async () => {
    if (!comissao) return;
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", comissao.id);
    setConfirmDelete(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Comissão excluída");
      onOpenChange(false);
      onUpdate?.();
    }
  };

  if (!comissao) return null;

  const parsed = parseObservacoes(comissao.observacoes);
  const valorBase = comissao.valor / (PERCENTUAL_COMISSAO / 100);
  const displayFornecedor = comissao.fornecedor || parsed.fornecedor;
  const displayCategoria = comissao.categoria || (parsed as any).categoria || "";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <OrigemBadge tipo={parsed.tipo} />
              {editing ? "Editar Comissão" : "Detalhes da Comissão"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            {editing ? (
              /* ---- EDIT MODE ---- */
              <div className="space-y-4">
                <div className="glass-card p-4 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Valor</label>
                    <Input type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Mês Ref.</label>
                    <Input value={editMes} onChange={e => setEditMes(e.target.value)} placeholder="2025-01" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Status</label>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setEditPago(false)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${!editPago ? "bg-warning text-warning-foreground" : "bg-accent/50 text-muted-foreground"}`}
                      >
                        Pendente
                      </button>
                      <button
                        onClick={() => setEditPago(true)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${editPago ? "bg-success text-success-foreground" : "bg-accent/50 text-muted-foreground"}`}
                      >
                        Pago
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Fornecedor</label>
                    <Input value={editFornecedor} onChange={e => setEditFornecedor(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Categoria</label>
                    <Input value={editCategoria} onChange={e => setEditCategoria(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Forma de Pagamento</label>
                    <Input value={editFormaPagamento} onChange={e => setEditFormaPagamento(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase">Observações</label>
                    <Input value={editObservacoes} onChange={e => setEditObservacoes(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            ) : (
              /* ---- VIEW MODE ---- */
              <>
                {/* Valor & Status */}
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">Valor Comissão</span>
                    <span className="text-lg font-bold">{formatCurrency(Number(comissao.valor))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">Status</span>
                    {comissao.pago
                      ? <span className="badge-success inline-flex items-center gap-1 text-xs"><CheckCircle className="w-3 h-3" /> Pago</span>
                      : <span className="badge-warning inline-flex items-center gap-1 text-xs"><Clock className="w-3 h-3" /> Pendente</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground uppercase">Mês Ref.</span>
                    <span className="text-sm font-medium">{comissao.mes || "—"}</span>
                  </div>
                  {comissao.data_pagamento && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Data Pgto.</span>
                      <span className="text-sm">{comissao.data_pagamento}</span>
                    </div>
                  )}
                  {comissao.auto && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground uppercase">Tipo</span>
                      <span className="badge-info text-[10px]">Automático</span>
                    </div>
                  )}
                </div>

                {/* Cálculo da Comissão */}
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" /> Cálculo da Comissão
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{PERCENTUAL_COMISSAO}% de</span>
                    <span className="text-primary font-bold">{formatCurrency(valorBase)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-bold">{formatCurrency(Number(comissao.valor))}</span>
                  </div>
                </div>

                {/* Origem da Comissão */}
                <div className="glass-card p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                    Origem da Comissão
                  </h3>
                  <div className="space-y-2.5">
                    {comissao.observacoes && (
                      <div>
                        <span className="text-xs text-muted-foreground">Referência</span>
                        <p className="text-sm font-medium">{comissao.observacoes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Tipo:</span>
                      <OrigemBadge tipo={parsed.tipo} />
                      {parsed.referencia && <span className="text-xs font-medium">{parsed.referencia}</span>}
                    </div>
                    {displayFornecedor && (
                      <div>
                        <span className="text-xs text-muted-foreground">Fornecedor</span>
                        <p className="text-sm font-medium">{displayFornecedor}</p>
                      </div>
                    )}
                    {displayCategoria && (
                      <div>
                        <span className="text-xs text-muted-foreground">Categoria</span>
                        <p className="text-sm font-medium">{displayCategoria}</p>
                      </div>
                    )}
                    {comissao.forma_pagamento && (
                      <div>
                        <span className="text-xs text-muted-foreground">Forma de Pagamento</span>
                        <p className="text-sm font-medium">{comissao.forma_pagamento}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transação Vinculada */}
                {comissao.transacao_id && (
                  <div className="glass-card p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                      Transação Vinculada
                    </h3>
                    {loadingTx ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : transacao ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Descrição</span>
                          <span className="text-sm font-medium text-right max-w-[60%] truncate">{transacao.descricao}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Valor Original</span>
                          <span className="text-sm font-bold text-primary">{formatCurrency(Number(transacao.valor))}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Data</span>
                          <span className="text-sm">{transacao.data}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Categoria</span>
                          <span className="text-sm">{transacao.categoria || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Forma Pagamento</span>
                          <span className="text-sm">{transacao.forma_pagamento || "—"}</span>
                        </div>
                        {transacao.origem_tipo && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Origem</span>
                            <span className="text-sm">{transacao.origem_tipo}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Transação não encontrada</p>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="text-[10px] text-muted-foreground/60 px-1">
                  Criado em {formatDate(comissao.created_at)} · ID: {comissao.id.slice(0, 8)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={startEditing}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir Comissão"
        message={`Deseja excluir este lançamento de ${formatCurrency(Number(comissao.valor))}? Esta ação pode ser revertida.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
