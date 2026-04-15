import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  CheckCircle, Clock, Pencil, Trash2, Save, X,
  DollarSign, Calendar, Tag, User, CreditCard, FileText, Link2
} from "lucide-react";

interface ComissaoRow {
  id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string;
  observacoes: string;
  auto: boolean;
  created_at: string;
  updated_at: string;
  transacao_id: string | null;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
}

interface Props {
  comissao: ComissaoRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function ComissaoDetailDrawer({ comissao, open, onOpenChange, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ComissaoRow>>({});

  if (!comissao) return null;

  const startEdit = () => {
    setForm({
      valor: comissao.valor,
      mes: comissao.mes,
      observacoes: comissao.observacoes,
      fornecedor: comissao.fornecedor,
      categoria: comissao.categoria,
      forma_pagamento: comissao.forma_pagamento,
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm({}); };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq("id", comissao.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Comissão atualizada");
    setEditing(false);
    onUpdated();
  };

  const marcarPago = async () => {
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ pago: true, data_pagamento: new Date().toISOString().split("T")[0], updated_at: new Date().toISOString() })
      .eq("id", comissao.id);
    if (error) { toast.error("Erro ao marcar como pago"); return; }
    toast.success("Marcado como pago");
    onUpdated();
  };

  const softDelete = async () => {
    const { error } = await supabase
      .from("obra_comissao_pagamentos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", comissao.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Comissão removida");
    onOpenChange(false);
    onUpdated();
  };

  const DetailRow = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: React.ReactNode; color?: string }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-4 h-4 mt-0.5 ${color || "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="text-sm font-medium mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Detalhes da Comissão
          </SheetTitle>
        </SheetHeader>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          {comissao.pago ? (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle className="w-3 h-3 mr-1" /> Pago
            </Badge>
          ) : (
            <Badge className="bg-warning/10 text-warning border-warning/20">
              <Clock className="w-3 h-3 mr-1" /> Pendente
            </Badge>
          )}
          {comissao.auto && (
            <Badge variant="secondary" className="text-xs">Automático</Badge>
          )}
        </div>

        <Separator className="mb-4" />

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Valor</label>
              <Input type="number" step="0.01" value={form.valor || ""} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mês Referência</label>
              <Input value={form.mes || ""} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fornecedor</label>
              <Input value={form.fornecedor || ""} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input value={form.categoria || ""} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Forma de Pagamento</label>
              <Input value={form.forma_pagamento || ""} onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEdit} disabled={saving} className="flex-1"><Save className="w-4 h-4 mr-1" />Salvar</Button>
              <Button variant="outline" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <DetailRow icon={DollarSign} label="Valor" value={formatCurrency(Number(comissao.valor))} color="text-primary" />
            <DetailRow icon={Calendar} label="Mês Referência" value={comissao.mes || "—"} />
            <DetailRow icon={Calendar} label="Data Pagamento" value={comissao.data_pagamento || "—"} />
            <DetailRow icon={User} label="Fornecedor" value={comissao.fornecedor || comissao.observacoes || "—"} />
            <DetailRow icon={Tag} label="Categoria" value={comissao.categoria || "—"} />
            <DetailRow icon={CreditCard} label="Forma Pagamento" value={comissao.forma_pagamento || "—"} />
            <DetailRow icon={FileText} label="Observações" value={comissao.observacoes || "—"} />
            {comissao.transacao_id && (
              <DetailRow icon={Link2} label="Transação Vinculada" value={
                <span className="text-xs font-mono text-primary">{comissao.transacao_id.slice(0, 8)}...</span>
              } />
            )}
            <Separator className="my-3" />
            <DetailRow icon={Calendar} label="Criado em" value={formatDate(comissao.created_at)} />
            <DetailRow icon={Calendar} label="Atualizado em" value={formatDate(comissao.updated_at)} />
          </div>
        )}

        {!editing && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-col gap-2">
              {!comissao.pago && (
                <Button onClick={marcarPago} className="w-full bg-success hover:bg-success/90">
                  <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Pago
                </Button>
              )}
              <Button variant="outline" onClick={startEdit} className="w-full">
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
              <ConfirmDialog
                title="Excluir Comissão"
                description="Tem certeza que deseja excluir este registro de comissão?"
                onConfirm={softDelete}
                trigger={
                  <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                  </Button>
                }
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
