import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import { Upload, FileText, Check, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<DadosExtraidos | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const processarTexto = async (conteudo: string) => {
    if (!conteudo.trim()) {
      toast.error("Cole ou envie um documento");
      return;
    }
    setLoading(true);
    setDados(null);

    try {
      const { data, error } = await supabase.functions.invoke("processar-documento", {
        body: { texto: conteudo },
      });

      console.log("processar-documento response:", { data, error });

      if (error) {
        const msg = error?.message || "Erro na comunicação com a IA";
        throw new Error(msg);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setDados(data as DadosExtraidos);
      setEditMode(true);
      toast.success("Documento processado!");
    } catch (err: any) {
      console.error("processar-documento error:", err);
      toast.error("Erro ao processar: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    if (f.type === "text/plain" || f.name.endsWith(".txt")) {
      const text = await f.text();
      setTexto(text);
    } else {
      toast.info("Para PDFs e imagens, cole o texto extraído manualmente por enquanto");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      if (f.type === "text/plain") {
        f.text().then(setTexto);
      }
    }
  };

  const salvarTransacao = async () => {
    if (!dados) return;
    setSaving(true);

    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: user!.id,
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
      <div>
        <h1 className="text-2xl font-bold">Leitor IA</h1>
        <p className="text-sm text-muted-foreground">Extraia dados de notas fiscais, recibos e extratos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-4">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="glass-card p-8 text-center border-2 border-dashed border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <input type="file" id="file-upload" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.txt" onChange={handleFileUpload} />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Arraste um arquivo ou clique para enviar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, imagem ou texto</p>
            </label>
            {file && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ou cole o texto do documento</label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={8}
              placeholder="Cole aqui o conteúdo da nota fiscal, recibo ou extrato..."
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
            />
          </div>

          <button
            onClick={() => processarTexto(texto)}
            disabled={loading || !texto.trim()}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><FileText className="w-4 h-4" /> Processar com IA</>}
          </button>
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
            <div className="space-y-4">
              {[
                { label: "Fornecedor", key: "fornecedor" as const },
                { label: "Valor", key: "valor" as const },
                { label: "Data", key: "data" as const },
                { label: "Tipo", key: "tipo" as const },
                { label: "Categoria", key: "categoria" as const },
                { label: "Descrição", key: "descricao" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                  {editMode ? (
                    <input
                      type={key === "valor" ? "number" : "text"}
                      value={String(dados[key] ?? "")}
                      onChange={e => setDados(d => d ? { ...d, [key]: key === "valor" ? Number(e.target.value) : e.target.value } : d)}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  ) : (
                    <p className="text-sm font-medium px-3 py-2">
                      {key === "valor" ? formatCurrency(dados.valor) : String(dados[key] || "-")}
                    </p>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit className="w-4 h-4" /> {editMode ? "Visualizar" : "Editar"}
                </button>
                <button
                  onClick={salvarTransacao}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
