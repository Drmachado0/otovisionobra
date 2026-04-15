import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, CATEGORIAS_PADRAO } from "@/lib/formatters";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import OrigemBadge from "@/components/OrigemBadge";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Save,
  X,
  CreditCard,
  Tag,
  Calendar,
  FileText,
  Link2,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export interface TransacaoFull {
  id: string;
  tipo: string;
  valor: number;
  data: string;
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  origem_tipo?: string | null;
  conciliado?: boolean;
  recorrencia?: string;
  conta_id?: string;
  referencia?: string;
  created_at?: string;
}

interface Props {
  transacao: TransacaoFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const CATEGORIAS = CATEGORIAS_PADRAO;

const FORMAS_PAGAMENTO = ["PIX", "Cartão", "Boleto", "Dinheiro", "Transferência"];

export default function TransacaoDetailDrawer({ transacao, open, onOpenChange, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<TransacaoFull | null>(null);

  const startEdit = () => {
    setForm(transacao ? { ...transacao } : null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase
      .from("obra_transacoes_fluxo")
      .update({
        tipo: form.tipo,
        valor: form.valor,
        data: form.data,
        categoria: form.categoria,
        descricao: form.descricao,
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } else {
      toast.success("Transação atualizada!");
      setEditing(false);
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!transacao) return;
    setDeleting(true);
    const { error } = await supabase
      .from("obra_transacoes_fluxo")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", transacao.id);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Transação removida");
      onOpenChange(false);
      onUpdated();
    }
  };

  if (!transacao) return null;

  const t = editing && form ? form : transacao;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) cancelEdit(); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                t.tipo === "Entrada" ? "bg-success/10" : "bg-destructive/10"
              }`}>
                {t.tipo === "Entrada" ? (
                  <ArrowUpRight className="w-5 h-5 text-success" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold">{t.descricao || "Sem descrição"}</p>
                <p className={`text-xl font-bold ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                  {t.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(t.valor))}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pb-6">
            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              <OrigemBadge origem={t.origem_tipo} />
              {t.conciliado ? (
                <span className="badge-success"><CheckCircle2 className="w-3 h-3 mr-1" />Conciliado</span>
              ) : (
                <span className="badge-muted"><Clock className="w-3 h-3 mr-1" />Não conciliado</span>
              )}
              <Badge variant="outline">{t.tipo}</Badge>
            </div>

            <Separator />

            {/* Fields */}
            <div className="space-y-4">
              <DetailField icon={<Calendar className="w-4 h-4" />} label="Data" editing={editing}
                value={formatDate(t.data)} editValue={form?.data || ""}
                onChange={(v) => setForm(f => f ? { ...f, data: v } : f)} type="date" />

              <DetailField icon={<Tag className="w-4 h-4" />} label="Categoria" editing={editing}
                value={t.categoria || "-"} editValue={form?.categoria || ""}
                onChange={(v) => setForm(f => f ? { ...f, categoria: v } : f)}
                options={CATEGORIAS} />

              <DetailField icon={<CreditCard className="w-4 h-4" />} label="Forma de Pagamento" editing={editing}
                value={t.forma_pagamento || "-"} editValue={form?.forma_pagamento || ""}
                onChange={(v) => setForm(f => f ? { ...f, forma_pagamento: v } : f)}
                options={FORMAS_PAGAMENTO} />

              <DetailField icon={<RefreshCw className="w-4 h-4" />} label="Recorrência" editing={false}
                value={t.recorrencia || "Única"} />

              <DetailField icon={<Link2 className="w-4 h-4" />} label="Referência" editing={false}
                value={t.referencia || "-"} />

              {editing ? (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-2 mb-1.5">
                    <FileText className="w-4 h-4" /> Observações
                  </Label>
                  <Textarea value={form?.observacoes || ""} onChange={e => setForm(f => f ? { ...f, observacoes: e.target.value } : f)} rows={3} />
                </div>
              ) : (
                <DetailField icon={<FileText className="w-4 h-4" />} label="Observações" editing={false}
                  value={t.observacoes || "-"} />
              )}

              {t.created_at && (
                <div className="text-xs text-muted-foreground pt-2">
                  Criado em: {formatDate(t.created_at)}
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                    <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit} className="gap-2">
                    <X className="w-4 h-4" /> Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={startEdit} className="flex-1 gap-2">
                    <Edit2 className="w-4 h-4" /> Editar
                  </Button>
                  <Button variant="destructive" onClick={() => setShowDelete(true)} className="gap-2">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showDelete}
        title="Excluir Transação"
        message="Tem certeza que deseja excluir esta transação? A ação pode ser desfeita."
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        variant="danger"
      />
    </>
  );
}

function DetailField({ icon, label, value, editing, editValue, onChange, type, options }: {
  icon: React.ReactNode; label: string; value: string;
  editing?: boolean; editValue?: string; onChange?: (v: string) => void;
  type?: string; options?: string[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground flex items-center gap-2 mb-1.5">
        {icon} {label}
      </Label>
      {editing && onChange ? (
        options ? (
          <select value={editValue} onChange={e => onChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <Input type={type || "text"} value={editValue} onChange={e => onChange(e.target.value)} />
        )
      ) : (
        <p className="text-sm font-medium py-1">{value}</p>
      )}
    </div>
  );
}
