import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Check, RefreshCw, CreditCard, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Parcela {
  numero: number;
  valor: number;
  data_vencimento: string;
  status: string;
}

export interface CompraFull {
  id: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  data: string;
  status_entrega: string;
  forma_pagamento: string;
  numero_parcelas: number;
  parcelas: Parcela[];
  observacoes: string;
  nf_vinculada: string;
  tipo_compra: string; // computed: "Única" | "Parcelada" | "Recorrente"
}

interface Props {
  compra: CompraFull | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  userId: string;
}

export function getCompraType(c: { numero_parcelas: number; observacoes: string; forma_pagamento: string }): string {
  if (c.observacoes?.startsWith("[RECORRENTE]")) return "Recorrente";
  if (c.numero_parcelas > 1) return "Parcelada";
  return "Única";
}

export function parseParcelas(raw: any): Parcela[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as Parcela[];
}

export default function CompraDetailDrawer({ compra, open, onClose, onRefresh, userId }: Props) {
  if (!compra) return null;

  const parcelas = parseParcelas(compra.parcelas);
  const tipo = compra.tipo_compra;
  const pagas = parcelas.filter(p => p.status === "Paga").length;

  const handlePagarParcela = async (parcela: Parcela) => {
    // Update parcela status in the array
    const updatedParcelas = parcelas.map(p =>
      p.numero === parcela.numero ? { ...p, status: "Paga" } : p
    );
    const todasPagas = updatedParcelas.every(p => p.status === "Paga");

    const { error: errCompra } = await supabase
      .from("obra_compras")
      .update({
        parcelas: updatedParcelas as any,
        status_entrega: todasPagas ? "Entregue" : "Pedido",
      })
      .eq("id", compra.id);

    if (errCompra) {
      toast.error("Erro ao atualizar parcela");
      return;
    }

    // Create transaction for this installment
    const { error: errTx } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: userId,
      tipo: "Saída",
      valor: parcela.valor,
      data: parcela.data_vencimento,
      categoria: compra.categoria,
      descricao: `Parcela ${parcela.numero}/${compra.numero_parcelas} - ${compra.descricao || compra.fornecedor}`,
      forma_pagamento: compra.forma_pagamento,
      recorrencia: "Única",
      referencia: "",
      conta_id: "",
      observacoes: `Fornecedor: ${compra.fornecedor}`,
      origem_tipo: "compra",
      origem_id: compra.id,
    } as any);

    if (errTx) toast.error("Parcela paga mas erro ao criar transação");
    else toast.success(`Parcela ${parcela.numero} paga!`);
    onRefresh();
  };

  const recorrenteInfo = tipo === "Recorrente"
    ? compra.observacoes.replace("[RECORRENTE] ", "")
    : null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {compra.fornecedor || "Compra"}
            <Badge variant={tipo === "Recorrente" ? "secondary" : tipo === "Parcelada" ? "outline" : "default"} className="text-xs">
              {tipo === "Recorrente" && <RefreshCw className="w-3 h-3 mr-1" />}
              {tipo === "Parcelada" ? `${compra.numero_parcelas}x` : tipo}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* General info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs block">Valor Total</span><span className="font-bold text-lg">{formatCurrency(compra.valor_total)}</span></div>
            <div><span className="text-muted-foreground text-xs block">Data</span><span>{formatDate(compra.data)}</span></div>
            <div><span className="text-muted-foreground text-xs block">Categoria</span><span className="badge-muted px-2 py-0.5 rounded text-xs">{compra.categoria}</span></div>
            <div><span className="text-muted-foreground text-xs block">Pagamento</span><span>{compra.forma_pagamento}</span></div>
            {compra.descricao && <div className="col-span-2"><span className="text-muted-foreground text-xs block">Descrição</span><span>{compra.descricao}</span></div>}
            {compra.nf_vinculada && <div className="col-span-2"><span className="text-muted-foreground text-xs block">NF Vinculada</span><span>{compra.nf_vinculada}</span></div>}
          </div>

          {/* Recorrente info */}
          {tipo === "Recorrente" && recorrenteInfo && (
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-info" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Assinatura Recorrente</span>
              </div>
              <p className="text-sm">{recorrenteInfo}</p>
            </div>
          )}

          {/* Parcelas table */}
          {tipo === "Parcelada" && parcelas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Parcelas</span>
                <span className="text-xs text-muted-foreground">{pagas}/{parcelas.length} pagas</span>
              </div>
              {/* progress bar */}
              <div className="w-full h-2 bg-secondary rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${(pagas / parcelas.length) * 100}%` }} />
              </div>
              <div className="space-y-2">
                {parcelas.map(p => {
                  const isPaga = p.status === "Paga";
                  const isVencida = !isPaga && new Date(p.data_vencimento) < new Date();
                  return (
                    <div key={p.numero} className={`flex items-center justify-between p-2.5 rounded-lg border ${isPaga ? "border-success/30 bg-success/5" : isVencida ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium w-6 text-center text-muted-foreground">{p.numero}</span>
                        <div>
                          <p className="text-sm font-medium">{formatCurrency(p.valor)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.data_vencimento)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPaga ? (
                          <Badge className="bg-success/20 text-success border-0 text-xs"><Check className="w-3 h-3 mr-1" />Paga</Badge>
                        ) : isVencida ? (
                          <>
                            <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Vencida</Badge>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePagarParcela(p)}>
                              <CreditCard className="w-3 h-3 mr-1" />Pagar
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handlePagarParcela(p)}>
                            <CreditCard className="w-3 h-3 mr-1" />Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações */}
          {compra.observacoes && tipo !== "Recorrente" && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Observações</span>
              <p className="text-sm text-muted-foreground">{compra.observacoes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
