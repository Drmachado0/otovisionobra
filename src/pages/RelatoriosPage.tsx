import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Filter,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RelatoriosPage() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [comissoes, setComissoes] = useState<any[]>([]);
  const [etapas, setEtapas] = useState<any[]>([]);
  const [orcamento, setOrcamento] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const fetchData = useCallback(async () => {
    const [configRes, transRes, comprasRes, comRes, etapasRes] = await Promise.all([
      supabase.from("obra_config").select("orcamento_total").limit(1).maybeSingle(),
      supabase.from("obra_transacoes_fluxo").select("*").is("deleted_at", null).order("data", { ascending: false }),
      supabase.from("obra_compras").select("*").is("deleted_at", null).order("data", { ascending: false }),
      supabase.from("obra_comissao_pagamentos").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("obra_cronograma").select("*").order("inicio_previsto", { ascending: true }),
    ]);
    if (configRes.data) setOrcamento(Number(configRes.data.orcamento_total) || 0);
    if (transRes.data) setTransacoes(transRes.data);
    if (comprasRes.data) setCompras(comprasRes.data);
    if (comRes.data) setComissoes(comRes.data);
    if (etapasRes.data) setEtapas(etapasRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filterByDate = (items: any[], dateField: string) => {
    return items.filter(item => {
      const d = item[dateField];
      if (!d) return true;
      if (dataInicio && d < dataInicio) return false;
      if (dataFim && d > dataFim) return false;
      return true;
    });
  };

  const filterByCategoria = (items: any[]) => {
    if (categoriaFiltro === "todas") return items;
    return items.filter(i => i.categoria === categoriaFiltro);
  };

  const categorias = [...new Set(transacoes.map(t => t.categoria).filter(Boolean))];

  const exportCSV = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
    const header = columns.map(c => c.label).join(",");
    const rows = data.map(row => columns.map(c => {
      const val = row[c.key];
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
    }).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename}.csv exportado`);
  };

  const filteredTrans = filterByCategoria(filterByDate(transacoes, "data"));
  const filteredCompras = filterByCategoria(filterByDate(compras, "data"));
  const filteredComissoes = filterByDate(comissoes, "data_pagamento");

  const totalSaidas = filteredTrans.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
  const totalEntradas = filteredTrans.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-in">
        <div className="h-7 w-44 rounded bg-muted animate-pulse" />
        <div className="glass-card p-5 h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Relatórios
        </h1>
        <p className="text-sm text-muted-foreground">Análise e exportação de dados</p>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
          <div><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Resumo executivo */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold mb-4">Resumo Executivo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Orçamento</p>
            <p className="text-lg font-bold">{formatCurrency(orcamento)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Saídas</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalSaidas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Entradas</p>
            <p className="text-lg font-bold text-success">{formatCurrency(totalEntradas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(orcamento - totalSaidas)}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="financeiro">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="comissao">Comissão</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() =>
              exportCSV(filteredTrans, "relatorio-financeiro", [
                { key: "data", label: "Data" }, { key: "tipo", label: "Tipo" },
                { key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" },
                { key: "valor", label: "Valor" }, { key: "forma_pagamento", label: "Pagamento" },
              ])
            }>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Tipo</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Categoria</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Valor</th>
                </tr></thead>
                <tbody>
                  {filteredTrans.slice(0, 50).map((t, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-3">{formatDate(t.data)}</td>
                      <td className={`p-3 ${t.tipo === "Entrada" ? "text-success" : "text-destructive"}`}>{t.tipo}</td>
                      <td className="p-3 max-w-[200px] truncate">{t.descricao}</td>
                      <td className="p-3">{t.categoria}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(t.valor))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTrans.length > 50 && <p className="text-xs text-muted-foreground text-center py-2">Mostrando 50 de {filteredTrans.length}</p>}
          </div>
        </TabsContent>

        <TabsContent value="compras" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() =>
              exportCSV(filteredCompras, "relatorio-compras", [
                { key: "data", label: "Data" }, { key: "fornecedor", label: "Fornecedor" },
                { key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" },
                { key: "valor_total", label: "Valor" }, { key: "status_entrega", label: "Status" },
              ])
            }>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Fornecedor</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Descrição</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                </tr></thead>
                <tbody>
                  {filteredCompras.slice(0, 50).map((c, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-3">{formatDate(c.data)}</td>
                      <td className="p-3">{c.fornecedor}</td>
                      <td className="p-3 max-w-[200px] truncate">{c.descricao}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(c.valor_total))}</td>
                      <td className="p-3">{c.status_entrega}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comissao" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() =>
              exportCSV(filteredComissoes, "relatorio-comissao", [
                { key: "mes", label: "Mês" }, { key: "valor", label: "Valor" },
                { key: "pago", label: "Pago" }, { key: "data_pagamento", label: "Data Pagamento" },
                { key: "observacoes", label: "Observações" },
              ])
            }>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Mês</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Valor</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Observações</th>
                </tr></thead>
                <tbody>
                  {filteredComissoes.map((c, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-3">{c.mes}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(Number(c.valor))}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.pago ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {c.pago ? "Pago" : "Pendente"}
                        </span>
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{c.observacoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="etapas" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() =>
              exportCSV(etapas, "relatorio-etapas", [
                { key: "nome", label: "Etapa" }, { key: "status", label: "Status" },
                { key: "percentual_conclusao", label: "Progresso %" },
                { key: "custo_previsto", label: "Custo Previsto" }, { key: "custo_real", label: "Custo Real" },
                { key: "inicio_previsto", label: "Início" }, { key: "fim_previsto", label: "Fim" },
              ])
            }>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Etapa</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Progresso</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Previsto</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Real</th>
                </tr></thead>
                <tbody>
                  {etapas.map((e, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-3 font-medium">{e.nome}</td>
                      <td className="p-3">{e.status}</td>
                      <td className="p-3 text-right">{e.percentual_conclusao}%</td>
                      <td className="p-3 text-right">{formatCurrency(Number(e.custo_previsto))}</td>
                      <td className={`p-3 text-right ${Number(e.custo_real) > Number(e.custo_previsto) ? "text-destructive" : ""}`}>
                        {formatCurrency(Number(e.custo_real))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
