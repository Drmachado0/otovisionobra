import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

// --- Projection helpers ---
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay() + 1); r.setHours(0, 0, 0, 0); return r; }
function fmtWeek(d: Date) {
  const end = addDays(d, 6);
  const f = (dt: Date) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `${f(d)} - ${f(end)}`;
}

function addFrequency(date: Date, freq: string): Date {
  const d = new Date(date);
  switch (freq) {
    case "Semanal": d.setDate(d.getDate() + 7); break;
    case "Quinzenal": d.setDate(d.getDate() + 14); break;
    case "Mensal": d.setMonth(d.getMonth() + 1); break;
    case "Trimestral": d.setMonth(d.getMonth() + 3); break;
    case "Anual": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

interface WeekRow {
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
  acumulado: number;
}

function generateProjection(
  transacoes: any[],
  compras: any[],
  numWeeks: number,
  cenario: string,
): WeekRow[] {
  const now = new Date();
  const today = startOfWeek(now);

  // 1. Calculate average weekly entradas/saidas from last 60 days
  const d60ago = addDays(now, -60);
  const recent = transacoes.filter(t => {
    const td = new Date(t.data);
    return td >= d60ago && td <= now;
  });
  const weeks60 = 60 / 7;
  const avgEntradas = recent.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0) / weeks60;
  const avgSaidas = recent.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0) / weeks60;

  // 2. Recurring transactions – future dates
  const recurringMothers = transacoes.filter(t =>
    (t.recorrencia_mae || (t.recorrencia_grupo_id === t.id)) &&
    t.recorrencia_ativa &&
    t.recorrencia_frequencia
  );

  // 3. Future parcels from compras
  const futureParcels: { data: string; valor: number; tipo: string }[] = [];
  compras.forEach(c => {
    const parcelas = Array.isArray(c.parcelas) ? c.parcelas : [];
    parcelas.forEach((p: any) => {
      if (p.status === "Pendente" && p.vencimento) {
        futureParcels.push({ data: p.vencimento, valor: Number(p.valor || 0), tipo: "Saída" });
      }
    });
  });

  // Build week buckets
  const rows: WeekRow[] = [];
  let acumulado = 0;

  // Current balance (all-time)
  const allEntradas = transacoes.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
  const allSaidas = transacoes.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
  acumulado = allEntradas - allSaidas;

  // Cenario multiplier
  const entradaMult = cenario === "conservador" ? 0.8 : cenario === "otimista" ? 1.2 : 1;
  const saidaMult = 1; // saídas stay the same in all scenarios

  for (let w = 0; w < numWeeks; w++) {
    const weekStart = addDays(today, w * 7);
    const weekEnd = addDays(weekStart, 6);

    let entradas = avgEntradas * entradaMult;
    let saidas = avgSaidas * saidaMult;

    // Add recurring transactions falling in this week
    recurringMothers.forEach(m => {
      const freq = m.recorrencia_frequencia || m.recorrencia;
      if (!freq || freq === "Única") return;
      const mDate = new Date(m.data);
      const endDate = m.recorrencia_fim ? new Date(m.recorrencia_fim) : null;
      let nextDate = new Date(mDate);

      // Fast-forward to near weekStart
      let safety = 0;
      while (nextDate < weekStart && safety < 500) {
        nextDate = addFrequency(nextDate, freq);
        safety++;
      }

      // Check if any occurrence falls in this week
      while (nextDate <= weekEnd && safety < 600) {
        if (endDate && nextDate > endDate) break;
        if (nextDate >= weekStart && nextDate <= weekEnd) {
          const val = Number(m.valor);
          if (m.tipo === "Entrada") entradas += val * entradaMult;
          else saidas += val * saidaMult;
        }
        nextDate = addFrequency(nextDate, freq);
        safety++;
      }
    });

    // Add future parcels
    futureParcels.forEach(p => {
      const pd = new Date(p.data);
      if (pd >= weekStart && pd <= weekEnd) {
        saidas += p.valor;
      }
    });

    const saldo = entradas - saidas;
    acumulado += saldo;

    rows.push({
      label: fmtWeek(weekStart),
      entradas: Math.round(entradas * 100) / 100,
      saidas: Math.round(saidas * 100) / 100,
      saldo: Math.round(saldo * 100) / 100,
      acumulado: Math.round(acumulado * 100) / 100,
    });
  }

  return rows;
}

const PERIODO_OPTIONS = [
  { value: "4", label: "4 semanas" },
  { value: "8", label: "8 semanas" },
  { value: "12", label: "12 semanas" },
  { value: "26", label: "6 meses" },
];

const CENARIO_OPTIONS = [
  { value: "conservador", label: "Conservador (-20% entradas)" },
  { value: "realista", label: "Realista" },
  { value: "otimista", label: "Otimista (+20% entradas)" },
];

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

  // Projection state
  const [projPeriodo, setProjPeriodo] = useState("12");
  const [projCenario, setProjCenario] = useState("realista");

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

  const exportPDF = (
    tabName: string,
    summaryRows: [string, string][],
    columns: { key: string; label: string; align?: "right" }[],
    data: any[],
    formatters?: Record<string, (v: any) => string>,
  ) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text("OTOVISION - Gestão de Obra", 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(`Relatório ${tabName}`, 14, 26);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Gerado em: ${dateStr}`, 14, 32);
    let filterText = "";
    if (dataInicio || dataFim) filterText += `Período: ${dataInicio || "—"} a ${dataFim || "—"}`;
    if (categoriaFiltro !== "todas") filterText += `${filterText ? " | " : ""}Categoria: ${categoriaFiltro}`;
    if (filterText) doc.text(filterText, 14, 37);

    // Summary box
    let startY = filterText ? 42 : 37;
    if (summaryRows.length) {
      doc.setFillColor(240, 243, 248);
      doc.roundedRect(14, startY, pageW - 28, 12, 2, 2, "F");
      doc.setFontSize(9);
      doc.setTextColor(50);
      const segW = (pageW - 28) / summaryRows.length;
      summaryRows.forEach(([label, value], i) => {
        const x = 14 + segW * i + segW / 2;
        doc.text(`${label}: ${value}`, x, startY + 7.5, { align: "center" });
      });
      startY += 16;
    }

    // Table
    const head = [columns.map(c => c.label)];
    const body = data.map(row => columns.map(c => {
      const val = row[c.key];
      if (formatters?.[c.key]) return formatters[c.key](val);
      return val ?? "";
    }));

    const colStyles: Record<number, any> = {};
    columns.forEach((c, i) => { if (c.align === "right") colStyles[i] = { halign: "right" }; });

    autoTable(doc, {
      head,
      body,
      startY,
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 7.5, textColor: 50 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: colStyles,
      margin: { left: 14, right: 14 },
      didDrawPage: (d: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`OTOVISION v1.0 - Página ${d.pageNumber} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      },
    });

    // Fix page numbers (rewrite footer on all pages)
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      const y = doc.internal.pageSize.getHeight() - 8;
      doc.text(`OTOVISION v1.0 - Página ${i} de ${totalPages}`, pageW / 2, y, { align: "center" });
    }

    const fileDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    doc.save(`OTOVISION_Relatorio_${tabName}_${fileDate}.pdf`);
    toast.success(`PDF ${tabName} exportado`);
  };

  const filteredTrans = filterByCategoria(filterByDate(transacoes, "data"));
  const filteredCompras = filterByCategoria(filterByDate(compras, "data"));
  const filteredComissoes = filterByDate(comissoes, "data_pagamento");

  const totalSaidas = filteredTrans.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
  const totalEntradas = filteredTrans.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);

  // Projection data
  const projectionRows = useMemo(
    () => generateProjection(transacoes, compras, Number(projPeriodo), projCenario),
    [transacoes, compras, projPeriodo, projCenario]
  );

  const saldoAtual = useMemo(() => {
    const e = transacoes.filter(t => t.tipo === "Entrada").reduce((s, t) => s + Number(t.valor), 0);
    const s = transacoes.filter(t => t.tipo === "Saída").reduce((s, t) => s + Number(t.valor), 0);
    return e - s;
  }, [transacoes]);

  const proj30 = useMemo(() => {
    const weeks4 = projectionRows.slice(0, 4);
    const entradas = weeks4.reduce((s, w) => s + w.entradas, 0);
    const saidas = weeks4.reduce((s, w) => s + w.saidas, 0);
    return { entradas, saidas, saldoProjetado: saldoAtual + entradas - saidas };
  }, [projectionRows, saldoAtual]);

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
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="comissao">Comissão</TabsTrigger>
          <TabsTrigger value="etapas">Etapas</TabsTrigger>
          <TabsTrigger value="projecao" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Projeção
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="space-y-3 mt-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() =>
              exportPDF("Financeiro",
                [["Orçamento", formatCurrency(orcamento)], ["Saídas", formatCurrency(totalSaidas)], ["Entradas", formatCurrency(totalEntradas)], ["Saldo", formatCurrency(orcamento - totalSaidas)]],
                [{ key: "data", label: "Data" }, { key: "tipo", label: "Tipo" }, { key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" }, { key: "valor", label: "Valor", align: "right" }, { key: "forma_pagamento", label: "Pagamento" }],
                filteredTrans,
                { data: (v: string) => formatDate(v), valor: (v: number) => formatCurrency(Number(v)) },
              )
            }>
              <FileText className="w-4 h-4" /> PDF
            </Button>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              const totalCompras = filteredCompras.reduce((s, c) => s + Number(c.valor_total), 0);
              const entregues = filteredCompras.filter(c => c.status_entrega === "Entregue").length;
              const pendentes = filteredCompras.length - entregues;
              exportPDF("Compras",
                [["Total", formatCurrency(totalCompras)], ["Entregues", String(entregues)], ["Pendentes", String(pendentes)]],
                [{ key: "data", label: "Data" }, { key: "fornecedor", label: "Fornecedor" }, { key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" }, { key: "valor_total", label: "Valor", align: "right" }, { key: "status_entrega", label: "Status" }],
                filteredCompras,
                { data: (v: string) => formatDate(v), valor_total: (v: number) => formatCurrency(Number(v)) },
              );
            }}>
              <FileText className="w-4 h-4" /> PDF
            </Button>
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

        {/* ===== PROJEÇÃO TAB ===== */}
        <TabsContent value="projecao" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Período</Label>
              <Select value={projPeriodo} onValueChange={setProjPeriodo}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cenário</Label>
              <Select value={projCenario} onValueChange={setProjCenario}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CENARIO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={() =>
              exportCSV(projectionRows, "projecao-financeira", [
                { key: "label", label: "Semana" },
                { key: "entradas", label: "Entradas Previstas" },
                { key: "saidas", label: "Saídas Previstas" },
                { key: "saldo", label: "Saldo Semanal" },
                { key: "acumulado", label: "Saldo Acumulado" },
              ])
            }>
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Atual</p>
              <p className={`text-lg font-bold mt-1 ${saldoAtual >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(saldoAtual)}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entradas Prev. 30d</p>
              <p className="text-lg font-bold mt-1 text-success">{formatCurrency(proj30.entradas)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saídas Prev. 30d</p>
              <p className="text-lg font-bold mt-1 text-destructive">{formatCurrency(proj30.saidas)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Proj. 30d</p>
              <p className={`text-lg font-bold mt-1 ${proj30.saldoProjetado >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(proj30.saldoProjetado)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Projeção Semanal
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={projectionRows} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval={Math.max(0, Math.floor(projectionRows.length / 6) - 1)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <ReTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#EF4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-muted-foreground font-medium">Semana</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Entradas Prev.</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Saídas Prev.</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Saldo Semanal</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {projectionRows.map((row, i) => {
                    const isNeg = row.acumulado < 0;
                    const isLow = orcamento > 0 && row.acumulado > 0 && row.acumulado < orcamento * 0.1;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-border/30 ${
                          isNeg ? "bg-destructive/5" : isLow ? "bg-warning/5" : "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="p-3 font-medium">{row.label}</td>
                        <td className="p-3 text-right text-success">{formatCurrency(row.entradas)}</td>
                        <td className="p-3 text-right text-destructive">{formatCurrency(row.saidas)}</td>
                        <td className={`p-3 text-right font-medium ${row.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                          {formatCurrency(row.saldo)}
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          isNeg ? "text-destructive" : isLow ? "text-warning" : "text-primary"
                        }`}>
                          {formatCurrency(row.acumulado)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
