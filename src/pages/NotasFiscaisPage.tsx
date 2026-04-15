import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FileText, Search, CreditCard, Trash2, Eye, AlertCircle,
  CheckCircle2, Clock, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import PagamentoDialog from "@/components/PagamentoDialog";
import ConfirmDialog from "@/components/ConfirmDialog";

interface NotaFiscal {
  id: string;
  numero: string;
  fornecedor: string;
  descricao: string;
  categoria: string;
  valor_bruto: number;
  valor_liquido: number;
  data_emissao: string;
  data_vencimento: string;
  status: string;
  forma_pagamento: string;
  deleted_at: string | null;
}

export default function NotasFiscaisPage() {
  const { user } = useAuth();
  const [nfs, setNfs] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("ativas");

  // Payment dialog
  const [pagamentoNf, setPagamentoNf] = useState<NotaFiscal | null>(null);

  // Delete dialog
  const [deleteNf, setDeleteNf] = useState<NotaFiscal | null>(null);

  const fetchNfs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("obra_notas_fiscais")
      .select("id, numero, fornecedor, descricao, categoria, valor_bruto, valor_liquido, data_emissao, data_vencimento, status, forma_pagamento, deleted_at")
      .eq("user_id", user.id)
      .order("data_emissao", { ascending: false });
    setNfs((data as NotaFiscal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNfs(); }, [user]);

  const ativas = useMemo(() => nfs.filter((n) => !n.deleted_at), [nfs]);
  const arquivadas = useMemo(() => nfs.filter((n) => n.deleted_at), [nfs]);

  const listToShow = tab === "ativas" ? ativas : arquivadas;
  const filtered = useMemo(() => {
    if (!search) return listToShow;
    const s = search.toLowerCase();
    return listToShow.filter(
      (n) =>
        n.numero?.toLowerCase().includes(s) ||
        n.fornecedor?.toLowerCase().includes(s) ||
        n.descricao?.toLowerCase().includes(s)
    );
  }, [listToShow, search]);

  // Summary
  const totalNfs = ativas.length;
  const pagas = ativas.filter((n) => n.status === "Paga").length;
  const pendentes = ativas.filter((n) => n.status !== "Paga").length;
  const vencidas = ativas.filter(
    (n) => n.status !== "Paga" && n.data_vencimento && new Date(n.data_vencimento) < new Date()
  ).length;
  const totalValor = ativas.reduce((s, n) => s + (n.valor_liquido || n.valor_bruto || 0), 0);

  const handleDelete = async () => {
    if (!deleteNf || !user) return;
    const { error } = await supabase
      .from("obra_notas_fiscais")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteNf.id);
    if (error) toast.error("Erro ao arquivar NF");
    else toast.success("NF arquivada");
    setDeleteNf(null);
    fetchNfs();
  };

  const statusBadge = (nf: NotaFiscal) => {
    if (nf.status === "Paga")
      return <Badge className="bg-success/20 text-success border-0 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Paga</Badge>;
    const vencida = nf.data_vencimento && new Date(nf.data_vencimento) < new Date();
    if (vencida)
      return <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Vencida</Badge>;
    return <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas Fiscais</h1>
          <p className="text-sm text-muted-foreground">Gerencie notas fiscais e registre pagamentos</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Total NFs</p>
          <p className="text-2xl font-bold">{totalNfs}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(totalValor)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" />Pagas</p>
          <p className="text-2xl font-bold text-success">{pagas}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="w-3 h-3" />Pendentes</p>
          <p className="text-2xl font-bold">{pendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3 text-destructive" />Vencidas</p>
          <p className="text-2xl font-bold text-destructive">{vencidas}</p>
        </CardContent></Card>
      </div>

      {/* Tabs + Search */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="ativas">Ativas ({ativas.length})</TabsTrigger>
            <TabsTrigger value="arquivo">Arquivo ({arquivadas.length})</TabsTrigger>
          </TabsList>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar NF..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </div>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma nota fiscal encontrada</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((nf) => (
                    <TableRow key={nf.id}>
                      <TableCell className="font-mono text-xs">{nf.numero || "—"}</TableCell>
                      <TableCell className="font-medium">{nf.fornecedor || "—"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(nf.valor_liquido || nf.valor_bruto || 0)}</TableCell>
                      <TableCell className="text-sm">{formatDate(nf.data_emissao)}</TableCell>
                      <TableCell className="text-sm">{formatDate(nf.data_vencimento)}</TableCell>
                      <TableCell>{statusBadge(nf)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {nf.status !== "Paga" && !nf.deleted_at && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() => setPagamentoNf(nf)}
                            >
                              <DollarSign className="w-3 h-3 mr-1" />Pagar
                            </Button>
                          )}
                          {!nf.deleted_at && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDeleteNf(nf)}>
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      {pagamentoNf && user && (
        <PagamentoDialog
          open={!!pagamentoNf}
          onClose={() => setPagamentoNf(null)}
          onSuccess={fetchNfs}
          tipo="nf"
          id={pagamentoNf.id}
          fornecedor={pagamentoNf.fornecedor}
          valor={pagamentoNf.valor_liquido || pagamentoNf.valor_bruto || 0}
          categoria={pagamentoNf.categoria}
          descricao={pagamentoNf.descricao}
          userId={user.id}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteNf}
        title="Arquivar Nota Fiscal"
        message={`Tem certeza que deseja arquivar a NF ${deleteNf?.numero || ""} de ${deleteNf?.fornecedor || ""}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteNf(null)}
      />
    </div>
  );
}
