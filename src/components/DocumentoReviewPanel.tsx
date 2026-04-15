import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentos, type DocumentoProcessado, type MovimentacaoExtraida, type EventoProcessamento } from "@/hooks/useDocumentos";
import { formatCurrency } from "@/lib/formatters";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, FileText,
  Check, X, Edit, Loader2, History, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  documento: DocumentoProcessado;
  onBack: () => void;
}

export default function DocumentoReviewPanel({ documento, onBack }: Props) {
  const { user } = useAuth();
  const { aprovarMovimentacao, registrarEvento } = useDocumentos();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoExtraida[]>([]);
  const [eventos, setEventos] = useState<EventoProcessamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMov, setEditingMov] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MovimentacaoExtraida>>({});
  const [showTimeline, setShowTimeline] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    fetchData();
  }, [documento.id]);

  const fetchData = async () => {
    const [movsRes, eventsRes] = await Promise.all([
      supabase.from("obra_movimentacoes_extraidas").select("*").eq("documento_id", documento.id).order("data_movimentacao"),
      supabase.from("obra_eventos_processamento").select("*").eq("documento_id", documento.id).order("created_at", { ascending: false }),
    ]);
    setMovimentacoes((movsRes.data as MovimentacaoExtraida[]) || []);
    setEventos((eventsRes.data as EventoProcessamento[]) || []);
    setLoading(false);
  };

  const handleAprovar = async (mov: MovimentacaoExtraida) => {
    setSaving(mov.id);
    const dados = editingMov === mov.id ? { ...mov, ...editData } : mov;
    await aprovarMovimentacao(mov.id, dados, documento.id);
    await fetchData();
    setSaving(null);
    setEditingMov(null);
  };

  const handleDescartar = async (movId: string) => {
    await supabase.from("obra_movimentacoes_extraidas").update({ status_revisao: "descartado" } as any).eq("id", movId);
    await registrarEvento(documento.id, "revisao", "descartado", `Movimentação ${movId} descartada`);
    toast.info("Movimentação descartada");
    await fetchData();
  };

  const handleReprocessManual = async () => {
    if (!manualText.trim() || manualText.trim().length < 5) {
      toast.error("Cole o texto do documento (mínimo 5 caracteres)");
      return;
    }
    setLoading(true);
    try {
      const { data: aiData, error } = await supabase.functions.invoke("processar-pasta", {
        body: { texto: manualText, nome_arquivo: documento.nome_arquivo, tipo_arquivo: documento.tipo_arquivo },
      });
      if (error) throw error;

      const confianca = aiData.confianca || 0;
      await supabase.from("obra_documentos_processados").update({
        status_processamento: confianca >= 70 ? "processado" : "revisao",
        tipo_documento: aiData.tipo_documento || "",
        confianca_extracao: confianca,
        payload_normalizado: aiData,
        motivo_revisao: confianca < 70 ? "Confiança baixa" : "",
        motivo_erro: "",
      } as any).eq("id", documento.id);

      // Save movements
      const movs = aiData.movimentacoes || [];
      if (movs.length > 0) {
        const rows = movs.map((m: any) => ({
          user_id: user!.id,
          documento_id: documento.id,
          data_movimentacao: m.data || new Date().toISOString().split("T")[0],
          descricao: m.descricao || "",
          valor: m.valor || 0,
          tipo_movimentacao: m.tipo || "saida",
          saldo: m.saldo ?? null,
          categoria_sugerida: m.categoria_sugerida || "Outro",
          score_confianca: confianca,
          status_revisao: "pendente",
        }));
        await supabase.from("obra_movimentacoes_extraidas").insert(rows as any);
      } else if (aiData.valor_total) {
        await supabase.from("obra_movimentacoes_extraidas").insert({
          user_id: user!.id,
          documento_id: documento.id,
          data_movimentacao: aiData.data_documento || new Date().toISOString().split("T")[0],
          descricao: aiData.descricao || "",
          valor: aiData.valor_total || 0,
          tipo_movimentacao: aiData.tipo_movimentacao || "saida",
          categoria_sugerida: aiData.categoria_sugerida || "Outro",
          score_confianca: confianca,
          status_revisao: "pendente",
        } as any);
      }

      await registrarEvento(documento.id, "reprocessamento_manual", "sucesso", `Texto fornecido manualmente, confiança ${confianca}%`);
      toast.success("Processado com sucesso!");
      await fetchData();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha"));
    }
    setLoading(false);
  };

  const payload = documento.payload_normalizado as any;
  const confianca = documento.confianca_extracao;
  const confiancaColor = confianca >= 70 ? "text-emerald-400" : confianca >= 40 ? "text-amber-400" : "text-red-400";
  const confiancaBg = confianca >= 70 ? "bg-emerald-500/10" : confianca >= 40 ? "bg-amber-500/10" : "bg-red-500/10";

  const pendentes = movimentacoes.filter((m) => m.status_revisao === "pendente");
  const aprovadas = movimentacoes.filter((m) => m.status_revisao === "aprovado");

  return (
    <div className="space-y-6 animate-slide-in">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {documento.nome_arquivo}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {documento.tipo_documento ? documento.tipo_documento.replace("_", " ") : "Tipo não identificado"} •
              Criado em {new Date(documento.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {confianca > 0 && (
              <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${confiancaBg} ${confiancaColor}`}>
                {confianca}% confiança
              </span>
            )}
            <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              documento.status_processamento === "processado" ? "bg-emerald-500/10 text-emerald-400" :
              documento.status_processamento === "revisao" ? "bg-amber-500/10 text-amber-400" :
              documento.status_processamento === "erro" ? "bg-red-500/10 text-red-400" :
              "bg-muted/30 text-muted-foreground"
            }`}>
              {documento.status_processamento === "processado" ? "Processado" :
               documento.status_processamento === "revisao" ? "Em Revisão" :
               documento.status_processamento === "erro" ? "Erro" : documento.status_processamento}
            </span>
          </div>
        </div>

        {documento.motivo_erro && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <strong>Erro:</strong> {documento.motivo_erro}
          </div>
        )}
        {documento.motivo_revisao && (
          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
            <strong>Revisão:</strong> {documento.motivo_revisao}
          </div>
        )}
        {documento.duplicidade_status !== "unico" && (
          <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400">
            <strong>Duplicidade ({documento.duplicidade_score}%):</strong> {documento.duplicidade_status === "suspeita" ? "Suspeita de duplicação" : "Duplicado confirmado"}
          </div>
        )}
      </div>

      {/* Manual text input for PDFs/images */}
      {(documento.status_processamento === "revisao" || documento.status_processamento === "erro") && movimentacoes.length === 0 && (
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-sm font-semibold">Fornecer texto manualmente</h3>
          <p className="text-xs text-muted-foreground">Para PDFs e imagens, cole o texto extraído do documento abaixo:</p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder="Cole aqui o conteúdo do documento..."
            className="w-full px-4 py-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono"
          />
          <button
            onClick={handleReprocessManual}
            disabled={loading || !manualText.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Processar com IA
          </button>
        </div>
      )}

      {/* Extracted data summary */}
      {payload && typeof payload === "object" && Object.keys(payload).length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-3">Dados Extraídos pela IA</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {payload.fornecedor_ou_origem && (
              <div><p className="text-xs text-muted-foreground">Fornecedor</p><p className="text-sm font-medium">{payload.fornecedor_ou_origem}</p></div>
            )}
            {payload.valor_total != null && (
              <div><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-sm font-medium">{formatCurrency(payload.valor_total)}</p></div>
            )}
            {payload.data_documento && (
              <div><p className="text-xs text-muted-foreground">Data</p><p className="text-sm font-medium">{payload.data_documento}</p></div>
            )}
            {payload.categoria_sugerida && (
              <div><p className="text-xs text-muted-foreground">Categoria</p><p className="text-sm font-medium">{payload.categoria_sugerida}</p></div>
            )}
            {payload.tipo_movimentacao && (
              <div><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm font-medium capitalize">{payload.tipo_movimentacao}</p></div>
            )}
            {payload.observacoes && (
              <div className="col-span-full"><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm">{payload.observacoes}</p></div>
            )}
          </div>
        </div>
      )}

      {/* Movimentações */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : movimentacoes.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">
            Movimentações Extraídas ({movimentacoes.length})
            {pendentes.length > 0 && <span className="text-amber-400 ml-2">({pendentes.length} pendente{pendentes.length > 1 ? "s" : ""})</span>}
          </h3>
          <div className="space-y-2">
            {movimentacoes.map((mov) => {
              const isEditing = editingMov === mov.id;
              const isSaving = saving === mov.id;
              return (
                <div key={mov.id} className={`p-4 rounded-lg border transition-colors ${
                  mov.status_revisao === "aprovado" ? "border-emerald-500/20 bg-emerald-500/5" :
                  mov.status_revisao === "descartado" ? "border-red-500/20 bg-red-500/5 opacity-50" :
                  "border-border/50 bg-secondary/30"
                }`}>
                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Data</label>
                        <input type="date" value={editData.data_movimentacao || mov.data_movimentacao}
                          onChange={(e) => setEditData((d) => ({ ...d, data_movimentacao: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Valor</label>
                        <input type="number" step="0.01" value={editData.valor ?? mov.valor}
                          onChange={(e) => setEditData((d) => ({ ...d, valor: Number(e.target.value) }))}
                          className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Tipo</label>
                        <select value={editData.tipo_movimentacao || mov.tipo_movimentacao}
                          onChange={(e) => setEditData((d) => ({ ...d, tipo_movimentacao: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-sm">
                          <option value="entrada">Entrada</option>
                          <option value="saida">Saída</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Categoria</label>
                        <select value={editData.categoria_sugerida || mov.categoria_sugerida}
                          onChange={(e) => setEditData((d) => ({ ...d, categoria_sugerida: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-sm">
                          {["Material", "Mão de Obra", "Equipamento", "Serviço", "Administrativo", "Transporte", "Alimentação", "Outro"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-full">
                        <label className="text-xs text-muted-foreground">Descrição</label>
                        <input type="text" value={editData.descricao ?? mov.descricao}
                          onChange={(e) => setEditData((d) => ({ ...d, descricao: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-xs text-muted-foreground">{new Date(mov.data_movimentacao + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                          <span className="truncate">{mov.descricao || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-sm font-medium ${mov.tipo_movimentacao === "entrada" ? "text-emerald-400" : "text-red-400"}`}>
                            {mov.tipo_movimentacao === "entrada" ? "+" : "-"}{formatCurrency(mov.valor)}
                          </span>
                          <span className="text-xs text-muted-foreground">{mov.categoria_sugerida}</span>
                          {mov.status_revisao === "aprovado" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      </div>
                    </div>
                  )}

                  {mov.status_revisao === "pendente" && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      <button
                        onClick={() => { if (isEditing) { setEditingMov(null); setEditData({}); } else { setEditingMov(mov.id); setEditData({}); } }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-accent flex items-center gap-1 transition-colors"
                      >
                        <Edit className="w-3 h-3" /> {isEditing ? "Cancelar" : "Editar"}
                      </button>
                      <button
                        onClick={() => handleAprovar(mov)}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Aprovar
                      </button>
                      <button
                        onClick={() => handleDescartar(mov.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" /> Descartar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="glass-card p-6">
        <button onClick={() => setShowTimeline(!showTimeline)} className="w-full flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Timeline de Processamento ({eventos.length})</span>
          {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showTimeline && (
          <div className="mt-4 space-y-3">
            {eventos.map((evt) => (
              <div key={evt.id} className="flex gap-3 text-sm">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                    evt.status === "sucesso" ? "bg-emerald-400" :
                    evt.status === "erro" ? "bg-red-400" :
                    evt.status === "alerta" ? "bg-amber-400" :
                    "bg-blue-400"
                  }`} />
                  <div className="w-px flex-1 bg-border/30 mt-1" />
                </div>
                <div className="pb-4">
                  <p className="font-medium">{evt.etapa.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{evt.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(evt.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
