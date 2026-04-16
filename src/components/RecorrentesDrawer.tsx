import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  RefreshCw, Pause, Play, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";

interface RecurringTx {
  id: string;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string;
  recorrencia_frequencia: string;
  recorrencia_ativa: boolean;
  recorrencia_fim: string | null;
  recorrencia_max_ocorrencias: number | null;
  recorrencia_ocorrencias_criadas: number;
  data: string;
}

function getNextDate(lastDate: string, freq: string): string {
  const d = new Date(lastDate);
  switch (freq) {
    case "Semanal": d.setDate(d.getDate() + 7); break;
    case "Quinzenal": d.setDate(d.getDate() + 14); break;
    case "Mensal": d.setMonth(d.getMonth() + 1); break;
    case "Trimestral": d.setMonth(d.getMonth() + 3); break;
    case "Anual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split("T")[0];
}

function getStatus(tx: RecurringTx): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (!tx.recorrencia_ativa) {
    if (tx.recorrencia_max_ocorrencias && tx.recorrencia_ocorrencias_criadas >= tx.recorrencia_max_ocorrencias) {
      return { label: "Finalizada", variant: "secondary" };
    }
    if (tx.recorrencia_fim && new Date() > new Date(tx.recorrencia_fim)) {
      return { label: "Finalizada", variant: "secondary" };
    }
    return { label: "Pausada", variant: "destructive" };
  }
  return { label: "Ativa", variant: "default" };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function RecorrentesDrawer({ open, onOpenChange, onUpdated }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<RecurringTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RecurringTx | null>(null);

  const fetchRecurrentes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("obra_transacoes_fluxo")
      .select("id, descricao, valor, tipo, categoria, recorrencia_frequencia, recorrencia_ativa, recorrencia_fim, recorrencia_max_ocorrencias, recorrencia_ocorrencias_criadas, data, recorrencia_grupo_id, recorrencia_mae")
      .eq("user_id", user.id)
      .eq("recorrencia_mae", true)
      .not("recorrencia_frequencia", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    setItems((data || []) as RecurringTx[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) fetchRecurrentes();
  }, [open, fetchRecurrentes]);

  const toggleActive = async (tx: RecurringTx) => {
    const newActive = !tx.recorrencia_ativa;
    await supabase
      .from("obra_transacoes_fluxo")
      .update({ recorrencia_ativa: newActive } as any)
      .eq("id", tx.id);
    toast.success(newActive ? "Recorrente retomada" : "Recorrente pausada");
    fetchRecurrentes();
    onUpdated();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Soft delete the template
    await supabase
      .from("obra_transacoes_fluxo")
      .update({ deleted_at: new Date().toISOString(), recorrencia_ativa: false } as any)
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Recorrente excluída");
    fetchRecurrentes();
    onUpdated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" /> Transações Recorrentes
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transação recorrente cadastrada
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((tx) => {
                const status = getStatus(tx);
                const nextDate = getNextDate(tx.data, tx.recorrencia_frequencia);
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{tx.descricao || "Sem descrição"}</p>
                          <Badge variant={status.variant} className="text-[10px] shrink-0">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm font-semibold ${tx.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>
                            {tx.tipo === "Entrada" ? "+" : "-"}{formatCurrency(Number(tx.valor))}
                          </span>
                          <span className="text-xs text-muted-foreground">{tx.recorrencia_frequencia}</span>
                          <span className="text-xs text-muted-foreground">• {tx.categoria}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          <span>Início: {formatDate(tx.data)}</span>
                          {tx.recorrencia_ativa && <span>Próxima: {formatDate(nextDate)}</span>}
                          {tx.recorrencia_max_ocorrencias && (
                            <span>{tx.recorrencia_ocorrencias_criadas}/{tx.recorrencia_max_ocorrencias} geradas</span>
                          )}
                          {tx.recorrencia_fim && <span>Até: {formatDate(tx.recorrencia_fim)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleActive(tx)}
                          title={tx.recorrencia_ativa ? "Pausar" : "Retomar"}
                        >
                          {tx.recorrencia_ativa ? (
                            <Pause className="w-3.5 h-3.5 text-warning" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-success" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteTarget(tx)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Recorrente"
        message={`Deseja excluir a transação recorrente "${deleteTarget?.descricao}"? As transações já geradas serão mantidas.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
