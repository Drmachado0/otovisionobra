import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentos } from "@/hooks/useDocumentos";
import { formatCurrency } from "@/lib/formatters";
import { Upload, FileText, Check, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DadosExtraidos {
  valor: number;
  data: string;
  fornecedor: string;
  tipo: string;
  descricao: string;
  categoria: string;
}

export default function LeitorIAPage() {
  const { user } = useAuth();
  const { uploadEProcessar } = useDocumentos();
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<DadosExtraidos | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasInput = !!(file || texto.trim());

  const mapAiResponse = (ai: any): DadosExtraidos => ({
    fornecedor: ai.fornecedor_ou_origem ?? "",
    valor: ai.valor_total ?? 0,
    data: ai.data_documento ?? "",
    tipo: ai.tipo_documento ?? "Outro",
    descricao: ai.descricao ?? "",
    categoria: ai.categoria_sugerida ?? "Outro",
  });

  const processarDocumento = async () => {
    if (!hasInput || !user) return;
    setLoading(true);
    setDados(null);

    try {
      if (file) {
        const isTextFile =
          file.type === "text/plain" ||
          file.type === "text/csv" ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".csv");

        let textoParaEnviar = texto.trim();
        if (isTextFile && !textoParaEnviar) {
          textoParaEnviar = await file.text();
        }

        const docId = await uploadEProcessar(file);
        if (!docId) {
          setLoading(false);
          return;
        }

        const { data: docData } = await supabase
          .from("obra_documentos_processados")
          .select("payload_normalizado, status_processamento, motivo_revisao")
          .eq("id", docId)
          .single();

        if (docData?.payload_normalizado) {
          setDados(mapAiResponse(docData.payload_normalizado));
          setEditMode(true);
          if (docData.status_processamento === "revisao") {
            toast.warning(docData.motivo_revisao || "Documento requer revisão");
          }
        } else {
          toast.info("Documento registrado mas sem dados extraídos.");
        }
      } else if (texto.trim()) {
        const { data: aiData, error } = await supabase.functions.invoke("processar-documento-ia", {
          body: {
            texto,
            nome_arquivo: "texto_colado.txt",
            tipo_arquivo: "text/plain",
            persistir: false,
          },
        });

        if (error) throw new Error(error.message || "Erro na comunicação com a IA");
        if (aiData?.error) throw new Error(aiData.error);

        setDados(mapAiResponse(aiData));
        setEditMode(true);
        toast.success("Documento processado!");
      }
    } catch (err: any) {
      console.error("LeitorIA processamento error:", err);
      toast.error("Erro ao processar: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    if (f.type === "text/plain" || f.type === "text/csv" || f.name.endsWith(".txt") || f.name.endsWith(".csv")) {
      const text = await f.text();
      setTexto(text);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      if (f.type === "text/plain" || f.type === "text/csv") {
        f.text().then(setTexto);
      }
    }
  };

  const salvarTransacao = async () => {
    if (!dados || !user) return;
    setSaving(true);

    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: user.id,
      tipo: "Saída",
      valor: dados.valor,
      data: dados.data || new Date().toISOString().split("T")[0],
      categoria: dados.categoria || "Material",
      descricao: dados.descricao || `${dados.tipo}: ${dados.fornecedor}`,
      forma_pagamento: "",
      recorrencia: "Única",
      referencia: "",
      conta_id: "",
      observacoes: `Origem: IA | Fornecedor: ${dados.fornecedor}`,
      origem_tipo: "ia",
    } as any);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Transação salva com sucesso!");
      setDados(null);
      setTexto("");
      setFile(null);
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="page-header">
        <h1 className="text-2xl font-bold">Leitor IA</h1>
        <p className="text-sm text-muted-foreground">Extraia dados de notas fiscais, recibos e extratos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="glass-card-interactive p-8 text-center border-2 border-dashed border-border/50 hover:border-primary/30"
          >
            <input type="file" id="file-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv" onChange={handleFileUpload} />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Arraste um arquivo ou clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, imagem, CSV ou texto</p>
            </label>
            {file && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Ou cole o texto do documento</Label>
            <Textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={8}
              placeholder="Cole aqui o conteúdo da nota fiscal, recibo ou extrato..."
              className="mt-1 font-mono"
            />
          </div>

          <Button
            onClick={processarDocumento}
            disabled={loading || !hasInput}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><FileText className="w-4 h-4" /> Processar com IA</>}
          </Button>
        </div>

        {/* Output area */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Dados Extraídos
          </h2>

          {!dados ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Envie ou cole um documento para começar</p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in-up">
              {[
                { label: "Fornecedor", key: "fornecedor" as const },
                { label: "Valor", key: "valor" as const },
                { label: "Data", key: "data" as const },
                { label: "Tipo", key: "tipo" as const },
                { label: "Categoria", key: "categoria" as const },
                { label: "Descrição", key: "descricao" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  {editMode ? (
                    <Input
                      type={key === "valor" ? "number" : "text"}
                      value={String(dados[key] ?? "")}
                      onChange={e => setDados(d => d ? { ...d, [key]: key === "valor" ? Number(e.target.value) : e.target.value } : d)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm font-medium px-3 py-2">
                      {key === "valor" ? formatCurrency(dados.valor) : String(dados[key] || "-")}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditMode(!editMode)}
                  className="flex-1 gap-2"
                >
                  <Edit className="w-4 h-4" /> {editMode ? "Visualizar" : "Editar"}
                </Button>
                <Button
                  onClick={salvarTransacao}
                  disabled={saving}
                  className="flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
