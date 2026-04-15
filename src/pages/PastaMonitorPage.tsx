import { useState, useRef, useMemo } from "react";
import { useDocumentos, type DocumentoProcessado } from "@/hooks/useDocumentos";
import { formatCurrency } from "@/lib/formatters";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2,
  Eye, RotateCcw, FolderSync, Search, ChevronDown, ChevronRight,
  FileCheck, FileClock, FileWarning, FileX, Copy,
  Receipt, FileSpreadsheet, CreditCard, File
} from "lucide-react";
import { toast } from "sonner";
import DocumentoReviewPanel from "@/components/DocumentoReviewPanel";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "text-muted-foreground", icon: Clock },
  processando: { label: "Processando", color: "text-blue-400", icon: Loader2 },
  processado: { label: "Processado", color: "text-emerald-400", icon: CheckCircle2 },
  revisao: { label: "Revisão", color: "text-amber-400", icon: AlertTriangle },
  erro: { label: "Erro", color: "text-red-400", icon: XCircle },
};

const TIPO_DOC_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  nota_fiscal: { label: "Notas Fiscais", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  recibo: { label: "Recibos", icon: Receipt, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  extrato: { label: "Extratos", icon: FileSpreadsheet, color: "text-purple-400", bg: "bg-purple-500/10" },
  boleto: { label: "Boletos", icon: CreditCard, color: "text-amber-400", bg: "bg-amber-500/10" },
  outro: { label: "Outros", icon: File, color: "text-muted-foreground", bg: "bg-muted/30" },
};

function getPayloadField(doc: DocumentoProcessado, field: string): any {
  const p = doc.payload_normalizado;
  if (!p || typeof p !== "object") return null;
  return (p as any)[field] ?? null;
}

function DocTypeBadge({ tipo }: { tipo: string }) {
  const cfg = TIPO_DOC_CONFIG[tipo] || TIPO_DOC_CONFIG.outro;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label.replace(/s$/, "")}
    </span>
  );
}

function DocumentRow({ doc, onSelect, onReprocess }: {
  doc: DocumentoProcessado;
  onSelect: () => void;
  onReprocess: () => void;
}) {
  const cfg = STATUS_CONFIG[doc.status_processamento] || STATUS_CONFIG.pendente;
  const Icon = cfg.icon;
  const fornecedor = getPayloadField(doc, "fornecedor_ou_origem") || getPayloadField(doc, "fornecedor");
  const valor = getPayloadField(doc, "valor_total");
  const descricao = getPayloadField(doc, "descricao");
  const dataDoc = getPayloadField(doc, "data_documento");

  return (
    <tr className="border-b border-border/30 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <span className="truncate block max-w-[180px] text-sm" title={doc.nome_arquivo}>{doc.nome_arquivo}</span>
            {descricao && <p className="text-xs text-muted-foreground truncate max-w-[180px]" title={descricao}>{descricao}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {fornecedor || "-"}
      </td>
      <td className="px-4 py-3">
        {valor ? (
          <span className="text-sm font-medium">{formatCurrency(Number(valor))}</span>
        ) : "-"}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
          <Icon className={`w-3.5 h-3.5 ${doc.status_processamento === "processando" ? "animate-spin" : ""}`} />
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {doc.confianca_extracao > 0 ? (
          <span className={`text-xs font-medium ${doc.confianca_extracao >= 70 ? "text-emerald-400" : doc.confianca_extracao >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {doc.confianca_extracao}%
          </span>
        ) : "-"}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {dataDoc ? new Date(dataDoc).toLocaleDateString("pt-BR") : new Date(doc.created_at).toLocaleDateString("pt-BR")}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onSelect} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Visualizar">
            <Eye className="w-4 h-4" />
          </button>
          {(doc.status_processamento === "erro" || doc.status_processamento === "revisao") && (
            <button onClick={onReprocess} className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Reprocessar">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DocumentGroup({ tipo, docs, onSelect, onReprocess }: {
  tipo: string;
  docs: DocumentoProcessado[];
  onSelect: (doc: DocumentoProcessado) => void;
  onReprocess: (doc: DocumentoProcessado) => void;
}) {
  const [open, setOpen] = useState(true);
  const cfg = TIPO_DOC_CONFIG[tipo] || TIPO_DOC_CONFIG.outro;

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <span className="font-medium text-sm">{cfg.label}</span>
        <span className="text-xs text-muted-foreground">({docs.length})</span>
        <div className="ml-auto">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-border/30">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Arquivo</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Fornecedor</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Valor</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Confiança</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Data</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  onSelect={() => onSelect(doc)}
                  onReprocess={() => onReprocess(doc)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PastaMonitorPage() {
  const { documentos, loading, stats, uploadEProcessar, reprocessar, fetchDocumentos } = useDocumentos();
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentoProcessado | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const validTypes = ["text/plain", "text/csv", "application/pdf", "image/jpeg", "image/png", "image/webp"];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!validTypes.includes(file.type) && !["txt", "csv", "pdf", "jpg", "jpeg", "png", "webp"].includes(ext || "")) {
        toast.error(`Tipo inválido: ${file.name}`);
        continue;
      }
      await uploadEProcessar(file);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      if (filterStatus !== "todos" && d.status_processamento !== filterStatus) return false;
      if (filterTipo !== "todos" && (d.tipo_documento || "outro") !== filterTipo) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fornecedor = (getPayloadField(d, "fornecedor_ou_origem") || "").toLowerCase();
        const descricao = (getPayloadField(d, "descricao") || "").toLowerCase();
        if (!d.nome_arquivo.toLowerCase().includes(term) && !fornecedor.includes(term) && !descricao.includes(term)) return false;
      }
      return true;
    });
  }, [documentos, filterStatus, filterTipo, searchTerm]);

  const grouped = useMemo(() => {
    const groups: Record<string, DocumentoProcessado[]> = {};
    const order = ["nota_fiscal", "recibo", "extrato", "boleto", "outro"];

    for (const doc of filtered) {
      const tipo = doc.tipo_documento && doc.tipo_documento !== "" ? doc.tipo_documento : "outro";
      const key = order.includes(tipo) ? tipo : "outro";
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }

    // Sort each group by date desc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const dateA = getPayloadField(a, "data_documento") || a.created_at;
        const dateB = getPayloadField(b, "data_documento") || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }

    return order.filter((t) => groups[t]?.length > 0).map((t) => ({ tipo: t, docs: groups[t] }));
  }, [filtered]);

  const statCards = [
    { label: "Pendentes", value: stats.pendentes, icon: FileClock, color: "text-muted-foreground", bg: "bg-muted/30", filter: "pendente" },
    { label: "Processados", value: stats.processados, icon: FileCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", filter: "processado" },
    { label: "Em Revisão", value: stats.revisao, icon: FileWarning, color: "text-amber-400", bg: "bg-amber-500/10", filter: "revisao" },
    { label: "Com Erro", value: stats.erro, icon: FileX, color: "text-red-400", bg: "bg-red-500/10", filter: "erro" },
    { label: "Duplicados", value: stats.duplicados, icon: Copy, color: "text-purple-400", bg: "bg-purple-500/10", filter: "" },
  ];

  if (selectedDoc) {
    return <DocumentoReviewPanel documento={selectedDoc} onBack={() => { setSelectedDoc(null); fetchDocumentos(); }} />;
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderSync className="w-6 h-6 text-primary" /> Pasta Sincronizada
          </h1>
          <p className="text-sm text-muted-foreground">Documentos organizados por tipo, data e descrição</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Enviando..." : "Enviar Arquivos"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.filter ? "todos" : s.filter)}
            className={`glass-card p-4 text-left transition-all hover:ring-1 hover:ring-primary/30 ${filterStatus === s.filter ? "ring-1 ring-primary/50" : ""}`}
          >
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="glass-card p-6 border-2 border-dashed border-border/50 hover:border-primary/30 transition-colors text-center"
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Arraste arquivos aqui ou clique em "Enviar Arquivos"</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, imagem (JPG, PNG, WEBP), TXT ou CSV</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por arquivo, fornecedor ou descrição..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="nota_fiscal">Notas Fiscais</option>
          <option value="recibo">Recibos</option>
          <option value="extrato">Extratos</option>
          <option value="boleto">Boletos</option>
          <option value="outro">Outros</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todos Status</option>
          <option value="pendente">Pendente</option>
          <option value="processando">Processando</option>
          <option value="processado">Processado</option>
          <option value="revisao">Revisão</option>
          <option value="erro">Erro</option>
        </select>
      </div>

      {/* Grouped documents */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : grouped.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <DocumentGroup
              key={g.tipo}
              tipo={g.tipo}
              docs={g.docs}
              onSelect={setSelectedDoc}
              onReprocess={(doc) => reprocessar(doc.id, "")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
