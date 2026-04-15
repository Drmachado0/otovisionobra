import { useState, useRef } from "react";
import { useDocumentos, type DocumentoProcessado } from "@/hooks/useDocumentos";
import { formatCurrency } from "@/lib/formatters";
import {
  Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2,
  Eye, RotateCcw, FolderSync, Filter, Search, ChevronDown, ChevronUp,
  FileCheck, FileClock, FileWarning, FileX, Copy
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

export default function PastaMonitorPage() {
  const { documentos, loading, fetchError, stats, uploadEProcessar, reprocessar, fetchDocumentos } = useDocumentos();
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
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

  const filtered = documentos.filter((d) => {
    if (filterStatus !== "todos" && d.status_processamento !== filterStatus) return false;
    if (searchTerm && !d.nome_arquivo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const statCards = [
    { label: "Pendentes", value: stats.pendentes, icon: FileClock, color: "text-muted-foreground", bg: "bg-muted/30" },
    { label: "Processados", value: stats.processados, icon: FileCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Em Revisão", value: stats.revisao, icon: FileWarning, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Com Erro", value: stats.erro, icon: FileX, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Duplicados", value: stats.duplicados, icon: Copy, color: "text-purple-400", bg: "bg-purple-500/10" },
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
          <p className="text-sm text-muted-foreground">Processamento automático de documentos financeiros via IA</p>
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
            onClick={() => setFilterStatus(s.label === "Pendentes" ? "pendente" : s.label === "Processados" ? "processado" : s.label === "Em Revisão" ? "revisao" : s.label === "Com Erro" ? "erro" : "todos")}
            className={`glass-card p-4 text-left transition-all hover:ring-1 hover:ring-primary/30 ${filterStatus === (s.label === "Pendentes" ? "pendente" : s.label === "Processados" ? "processado" : s.label === "Em Revisão" ? "revisao" : s.label === "Com Erro" ? "erro" : "") ? "ring-1 ring-primary/50" : ""}`}
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
            placeholder="Buscar arquivo..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="processando">Processando</option>
          <option value="processado">Processado</option>
          <option value="revisao">Revisão</option>
          <option value="erro">Erro</option>
        </select>
      </div>

      {/* Documents table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : fetchError ? (
        <div className="glass-card p-6 flex items-center gap-4 border-destructive/20">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Erro ao carregar documentos</p>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
          </div>
          <button onClick={fetchDocumentos} className="text-xs text-primary hover:underline">Tentar novamente</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Arquivo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tipo Doc</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Confiança</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Duplicidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const cfg = STATUS_CONFIG[doc.status_processamento] || STATUS_CONFIG.pendente;
                  const Icon = cfg.icon;
                  return (
                    <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[200px]" title={doc.nome_arquivo}>{doc.nome_arquivo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {doc.tipo_documento ? doc.tipo_documento.replace("_", " ") : "-"}
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
                      <td className="px-4 py-3">
                        <span className={`text-xs ${doc.duplicidade_status === "unico" ? "text-muted-foreground" : doc.duplicidade_status === "suspeita" ? "text-amber-400" : "text-red-400"}`}>
                          {doc.duplicidade_status === "unico" ? "Único" : doc.duplicidade_status === "suspeita" ? "Suspeita" : "Duplicado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1.5 rounded-md hover:bg-accent transition-colors"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(doc.status_processamento === "erro" || doc.status_processamento === "revisao") && (
                            <button
                              onClick={() => reprocessar(doc.id, "")}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors"
                              title="Reprocessar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
