import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DocumentoProcessado {
  id: string;
  user_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  origem_arquivo: string;
  caminho_origem: string;
  hash_arquivo: string;
  status_processamento: string;
  tipo_documento: string;
  confianca_extracao: number;
  payload_bruto: any;
  payload_normalizado: any;
  motivo_erro: string;
  motivo_revisao: string;
  duplicidade_status: string;
  duplicidade_score: number;
  documento_relacionado_id: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoExtraida {
  id: string;
  user_id: string;
  documento_id: string;
  data_movimentacao: string;
  descricao: string;
  valor: number;
  tipo_movimentacao: string;
  saldo: number | null;
  categoria_sugerida: string;
  score_confianca: number;
  score_duplicidade: number;
  status_revisao: string;
  transacao_id: string | null;
  created_at: string;
}

export interface EventoProcessamento {
  id: string;
  user_id: string;
  documento_id: string;
  etapa: string;
  status: string;
  mensagem: string;
  detalhes: any;
  created_at: string;
}

async function computeHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useDocumentos() {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoProcessado[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocumentos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("obra_documentos_processados")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setDocumentos((data as DocumentoProcessado[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const registrarEvento = async (documento_id: string, etapa: string, status: string, mensagem: string, detalhes: any = {}) => {
    if (!user) return;
    await supabase.from("obra_eventos_processamento").insert({
      user_id: user.id,
      documento_id,
      etapa,
      status,
      mensagem,
      detalhes,
    } as any);
  };

  const uploadEProcessar = async (file: File) => {
    if (!user) return null;

    const hash = await computeHash(file);

    // Check dedup by hash
    const { data: existing } = await supabase
      .from("obra_documentos_processados")
      .select("id, nome_arquivo")
      .eq("user_id", user.id)
      .eq("hash_arquivo", hash)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error(`Arquivo duplicado! Já processado como "${existing[0].nome_arquivo}"`);
      return null;
    }

    // Create document record
    const { data: doc, error: docErr } = await supabase
      .from("obra_documentos_processados")
      .insert({
        user_id: user.id,
        nome_arquivo: file.name,
        tipo_arquivo: file.type || file.name.split(".").pop() || "",
        origem_arquivo: "upload",
        hash_arquivo: hash,
        status_processamento: "pendente",
      } as any)
      .select()
      .single();

    if (docErr || !doc) {
      toast.error("Erro ao registrar documento");
      return null;
    }

    const docId = (doc as any).id;
    await registrarEvento(docId, "upload", "sucesso", "Arquivo recebido");

    // Upload to storage
    const storagePath = `${user.id}/${docId}/${file.name}`;
    const { error: upErr } = await supabase.storage.from("documentos").upload(storagePath, file);
    if (upErr) {
      await supabase.from("obra_documentos_processados").update({ status_processamento: "erro", motivo_erro: "Falha no upload: " + upErr.message } as any).eq("id", docId);
      await registrarEvento(docId, "upload_storage", "erro", upErr.message);
      return null;
    }

    await supabase.from("obra_documentos_processados").update({ storage_path: storagePath, status_processamento: "processando" } as any).eq("id", docId);
    await registrarEvento(docId, "upload_storage", "sucesso", "Arquivo salvo no storage");

    // Read file content — text for CSV/TXT, base64 for PDF/images
    let texto = "";
    let base64Content = "";
    let mediaType = "";
    const isTextFile = file.type === "text/plain" || file.type === "text/csv" || file.name.endsWith(".txt") || file.name.endsWith(".csv");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (isTextFile) {
      texto = await file.text();
      if (texto.trim().length < 5) {
        await supabase.from("obra_documentos_processados").update({ status_processamento: "erro", motivo_erro: "Arquivo sem conteúdo legível" } as any).eq("id", docId);
        await registrarEvento(docId, "extracao_texto", "erro", "Conteúdo vazio");
        await fetchDocumentos();
        return docId;
      }
    } else if (isPdf || isImage) {
      // Convert to base64 for Claude vision/document processing
      const buffer = await file.arrayBuffer();
      base64Content = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      mediaType = isPdf ? "application/pdf" : file.type || "image/jpeg";
    } else {
      toast.info("Formato não suportado. Use PDF, imagem, CSV ou TXT.");
      await supabase.from("obra_documentos_processados").update({ status_processamento: "revisao", motivo_revisao: "Formato de arquivo não suportado automaticamente" } as any).eq("id", docId);
      await registrarEvento(docId, "extracao_texto", "revisao", "Formato não suportado: " + file.type);
      await fetchDocumentos();
      return docId;
    }

    // Call Claude AI via edge function
    await registrarEvento(docId, "ia_extracao", "processando", "Enviando para Claude IA...");
    try {
      const { data: aiData, error: aiErr } = await supabase.functions.invoke("processar-documento-ia", {
        body: {
          texto: texto || undefined,
          base64_content: base64Content || undefined,
          media_type: mediaType || undefined,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          documento_id: docId,
          user_id: user.id,
          persistir: true,
        },
      });
      if (aiErr) throw aiErr;

      const confianca = aiData.confianca || 0;
      // Persistence already handled by the edge function (persistir=true)
      await registrarEvento(docId, "ia_extracao", "sucesso", `Extração Claude concluída (${confianca}%)`);
      toast.success(`Documento processado via Claude (${confianca}% confiança)`);
    } catch (err: any) {
      await supabase.from("obra_documentos_processados").update({
        status_processamento: "erro",
        motivo_erro: err.message || "Erro na IA Claude",
      } as any).eq("id", docId);
      await registrarEvento(docId, "ia_extracao", "erro", err.message || "Erro desconhecido");
      toast.error("Erro no processamento IA");
    }

    await fetchDocumentos();
    return docId;
  };

  const checkContentDuplicates = async (docId: string, aiData: any, userId: string) => {
    if (!aiData.valor_total || !aiData.data_documento) return;

    const { data: similar } = await supabase
      .from("obra_transacoes_fluxo")
      .select("id, valor, data, descricao")
      .eq("user_id", userId)
      .eq("valor", aiData.valor_total)
      .eq("data", aiData.data_documento)
      .is("deleted_at", null)
      .limit(5);

    if (similar && similar.length > 0) {
      const score = 80;
      await supabase.from("obra_documentos_processados").update({
        duplicidade_status: "suspeita",
        duplicidade_score: score,
        status_processamento: "revisao",
        motivo_revisao: `Possível duplicata: ${similar.length} transação(ões) com mesmo valor e data`,
      } as any).eq("id", docId);
      await registrarEvento(docId, "deduplicacao", "alerta", `${similar.length} transações similares encontradas`, { similar });
    }
  };

  const reprocessar = async (docId: string, texto: string) => {
    if (!user) return;
    await supabase.from("obra_documentos_processados").update({ status_processamento: "processando" } as any).eq("id", docId);
    await registrarEvento(docId, "reprocessamento", "processando", "Reprocessamento iniciado");

    const doc = documentos.find((d) => d.id === docId);

    try {
      const { data: aiData, error } = await supabase.functions.invoke("processar-pasta", {
        body: { texto, nome_arquivo: doc?.nome_arquivo || "", tipo_arquivo: doc?.tipo_arquivo || "" },
      });
      if (error) throw error;

      const confianca = aiData.confianca || 0;
      const statusFinal = confianca >= 70 ? "processado" : "revisao";

      await supabase.from("obra_documentos_processados").update({
        status_processamento: statusFinal,
        tipo_documento: aiData.tipo_documento || "",
        confianca_extracao: confianca,
        payload_normalizado: aiData,
        motivo_revisao: confianca < 70 ? "Confiança baixa (" + confianca + "%)" : "",
        motivo_erro: "",
      } as any).eq("id", docId);

      await registrarEvento(docId, "reprocessamento", "sucesso", `Reprocessado (${confianca}%)`);
      toast.success("Reprocessamento concluído");
    } catch (err: any) {
      await supabase.from("obra_documentos_processados").update({ status_processamento: "erro", motivo_erro: err.message } as any).eq("id", docId);
      await registrarEvento(docId, "reprocessamento", "erro", err.message);
      toast.error("Erro no reprocessamento");
    }
    await fetchDocumentos();
  };

  const aprovarMovimentacao = async (movId: string, dados: Partial<MovimentacaoExtraida>, docId: string) => {
    if (!user) return;

    // Create transaction
    const { error } = await supabase.from("obra_transacoes_fluxo").insert({
      user_id: user.id,
      tipo: dados.tipo_movimentacao === "entrada" ? "Entrada" : "Saída",
      valor: dados.valor || 0,
      data: dados.data_movimentacao || new Date().toISOString().split("T")[0],
      categoria: dados.categoria_sugerida || "Outro",
      descricao: dados.descricao || "",
      forma_pagamento: "",
      recorrencia: "Única",
      referencia: "",
      conta_id: "",
      observacoes: `Origem: IA_PASTA | Doc: ${docId}`,
      origem_tipo: "ia_pasta",
      origem_id: docId,
    } as any);

    if (error) {
      toast.error("Erro ao criar transação: " + error.message);
      return;
    }

    await supabase.from("obra_movimentacoes_extraidas").update({ status_revisao: "aprovado" } as any).eq("id", movId);
    await registrarEvento(docId, "lancamento", "sucesso", `Movimentação aprovada e lançada: R$ ${dados.valor}`);
    toast.success("Lançamento criado!");
  };

  const stats = {
    pendentes: documentos.filter((d) => d.status_processamento === "pendente").length,
    processando: documentos.filter((d) => d.status_processamento === "processando").length,
    processados: documentos.filter((d) => d.status_processamento === "processado").length,
    revisao: documentos.filter((d) => d.status_processamento === "revisao").length,
    erro: documentos.filter((d) => d.status_processamento === "erro").length,
    duplicados: documentos.filter((d) => d.duplicidade_status !== "unico").length,
  };

  return { documentos, loading, stats, uploadEProcessar, reprocessar, aprovarMovimentacao, fetchDocumentos, registrarEvento };
}
