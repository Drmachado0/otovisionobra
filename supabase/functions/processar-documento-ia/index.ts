import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function err(msg: string, status = 500) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Claude tool schema for structured extraction ----
const extractionTool = {
  name: "extrair_dados_documento",
  description:
    "Extrai dados financeiros estruturados de um documento brasileiro (NF, recibo, extrato, comprovante, boleto). Retorne todos os campos que conseguir identificar.",
  input_schema: {
    type: "object" as const,
    properties: {
      tipo_documento: {
        type: "string",
        enum: ["extrato_bancario", "nota_fiscal", "recibo", "comprovante", "boleto", "outro"],
        description: "Tipo do documento identificado",
      },
      confianca: {
        type: "number",
        description: "Confiança da extração de 0 a 100",
      },
      data_documento: {
        type: "string",
        description: "Data principal do documento no formato YYYY-MM-DD",
      },
      valor_total: {
        type: "number",
        description: "Valor total em reais (ex: 1500.50)",
      },
      fornecedor_ou_origem: {
        type: "string",
        description: "Nome do fornecedor, banco ou empresa emissora",
      },
      descricao: {
        type: "string",
        description: "Descrição resumida dos itens ou serviços",
      },
      categoria_sugerida: {
        type: "string",
        enum: [
          "Material",
          "Mão de Obra",
          "Equipamento",
          "Serviço",
          "Administrativo",
          "Transporte",
          "Alimentação",
          "Outro",
        ],
        description: "Categoria do gasto",
      },
      tipo_movimentacao: {
        type: "string",
        enum: ["entrada", "saida"],
        description: "Se é entrada ou saída de dinheiro",
      },
      observacoes: {
        type: "string",
        description: "Observações extras relevantes",
      },
      movimentacoes: {
        type: "array",
        description:
          "Linhas individuais de movimentação (use quando o documento for extrato bancário ou tiver múltiplas linhas)",
        items: {
          type: "object",
          properties: {
            data: { type: "string", description: "YYYY-MM-DD" },
            descricao: { type: "string" },
            valor: { type: "number" },
            tipo: { type: "string", enum: ["entrada", "saida"] },
            saldo: { type: "number", description: "Saldo após movimento, se disponível" },
            categoria_sugerida: { type: "string" },
          },
          required: ["data", "descricao", "valor", "tipo"],
        },
      },
    },
    required: ["tipo_documento", "confianca", "descricao"],
  },
};

// ---- Helper: build Claude messages based on input type ----
function buildMessages(
  texto: string | undefined,
  base64Content: string | undefined,
  mediaType: string | undefined,
  nomeArquivo: string
) {
  const systemPrompt = `Você é um assistente especializado em extrair dados financeiros de documentos brasileiros (notas fiscais, recibos, extratos bancários, boletos, comprovantes).

Analise o documento fornecido e use a ferramenta extrair_dados_documento para retornar os dados estruturados.

Regras:
- Datas no formato YYYY-MM-DD
- Valores numéricos sem formatação (ex: 1500.50, não "R$ 1.500,50")
- Se for extrato bancário, extraia TODAS as linhas individuais no campo movimentacoes
- Se não conseguir identificar um campo, omita-o
- confianca: 0-100, indique o quão confiante você está na extração
- Arquivo: ${nomeArquivo}`;

  const userContent: Array<Record<string, unknown>> = [];

  // If we have base64 content (PDF or image), add as image/document
  if (base64Content && mediaType) {
    if (mediaType === "application/pdf") {
      userContent.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64Content,
        },
      });
    } else {
      // image types
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Content,
        },
      });
    }
    userContent.push({
      type: "text",
      text: "Extraia todos os dados financeiros deste documento.",
    });
  } else if (texto) {
    userContent.push({
      type: "text",
      text: `Extraia os dados financeiros do seguinte documento:\n\n${texto.slice(0, 30000)}`,
    });
  }

  return { systemPrompt, userContent };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      texto,
      base64_content,
      media_type,
      nome_arquivo = "desconhecido",
      tipo_arquivo = "",
      documento_id,
      user_id,
      persistir = false,
    } = body;

    // Validate input: need either texto or base64_content
    if ((!texto || texto.trim().length < 5) && !base64_content) {
      return err("Forneça 'texto' (min 5 chars) ou 'base64_content' com 'media_type'", 400);
    }

    if (base64_content && !media_type) {
      return err("'media_type' é obrigatório quando usar 'base64_content'", 400);
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY não configurada");
    }

    // Build messages for Claude
    const { systemPrompt, userContent } = buildMessages(
      texto,
      base64_content,
      media_type,
      nome_arquivo
    );

    if (userContent.length === 0) {
      return err("Nenhum conteúdo válido para processar", 400);
    }

    // Call Claude API
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        tools: [extractionTool],
        tool_choice: { type: "tool", name: "extrair_dados_documento" },
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorText);
      if (claudeResponse.status === 429) {
        return err("Limite de requisições da API excedido. Tente novamente em alguns segundos.", 429);
      }
      if (claudeResponse.status === 401) {
        return err("ANTHROPIC_API_KEY inválida ou expirada.", 401);
      }
      throw new Error(`Erro na API Claude: ${claudeResponse.status}`);
    }

    const claudeResult = await claudeResponse.json();

    // Extract tool use result
    const toolUse = claudeResult.content?.find(
      (block: { type: string }) => block.type === "tool_use"
    );
    if (!toolUse?.input) {
      throw new Error("Claude não retornou dados estruturados via tool_use");
    }

    const dados = toolUse.input;

    // ---- Persistence (optional, when called with persistir=true) ----
    if (persistir && documento_id && user_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const confianca = dados.confianca || 0;
      const statusFinal = confianca >= 70 ? "processado" : "revisao";
      const motivoRevisao =
        confianca < 70 ? `Confiança baixa na extração (${confianca}%)` : "";

      // Update documento
      await supabase
        .from("obra_documentos_processados")
        .update({
          status_processamento: statusFinal,
          tipo_documento: dados.tipo_documento || "",
          confianca_extracao: confianca,
          payload_bruto: dados,
          payload_normalizado: dados,
          motivo_revisao: motivoRevisao,
          motivo_erro: "",
        })
        .eq("id", documento_id);

      // Register processing event
      await supabase.from("obra_eventos_processamento").insert({
        user_id,
        documento_id,
        etapa: "ia_extracao_claude",
        status: "sucesso",
        mensagem: `Extração via Claude concluída (${confianca}%)`,
        detalhes: { modelo: "claude-sonnet-4-20250514", tokens: claudeResult.usage },
      });

      // Save extracted movements with deduplication
      const movs = dados.movimentacoes || [];
      const rowsToInsert: Array<Record<string, unknown>> = [];

      if (movs.length > 0) {
        for (const m of movs) {
          // Check content dedup: same user, same date, same value, same description
          const { data: existing } = await supabase
            .from("obra_movimentacoes_extraidas")
            .select("id")
            .eq("user_id", user_id)
            .eq("data_movimentacao", m.data || new Date().toISOString().split("T")[0])
            .eq("valor", m.valor || 0)
            .eq("descricao", m.descricao || "")
            .limit(1);

          if (existing && existing.length > 0) {
            // Mark document as having duplicates
            await supabase
              .from("obra_documentos_processados")
              .update({
                duplicidade_status: "suspeita",
                duplicidade_score: 85,
              })
              .eq("id", documento_id);

            await supabase.from("obra_eventos_processamento").insert({
              user_id,
              documento_id,
              etapa: "deduplicacao",
              status: "alerta",
              mensagem: `Movimentação duplicada: ${m.descricao} R$ ${m.valor}`,
              detalhes: { existente_id: existing[0].id, valor: m.valor, data: m.data },
            });
            continue; // skip duplicate
          }

          rowsToInsert.push({
            user_id,
            documento_id,
            data_movimentacao: m.data || new Date().toISOString().split("T")[0],
            descricao: m.descricao || "",
            valor: m.valor || 0,
            tipo_movimentacao: m.tipo || "saida",
            saldo: m.saldo ?? null,
            categoria_sugerida: m.categoria_sugerida || "Outro",
            score_confianca: confianca,
            status_revisao: statusFinal === "processado" ? "aprovado" : "pendente",
          });
        }
      } else if (dados.valor_total) {
        // Single movement doc — also dedup check
        const { data: existing } = await supabase
          .from("obra_movimentacoes_extraidas")
          .select("id")
          .eq("user_id", user_id)
          .eq("data_movimentacao", dados.data_documento || new Date().toISOString().split("T")[0])
          .eq("valor", dados.valor_total || 0)
          .eq("descricao", dados.descricao || "")
          .limit(1);

        if (existing && existing.length > 0) {
          await supabase
            .from("obra_documentos_processados")
            .update({
              duplicidade_status: "suspeita",
              duplicidade_score: 85,
              status_processamento: "revisao",
              motivo_revisao: "Movimentação com mesmos dados já existe no sistema",
            })
            .eq("id", documento_id);
        } else {
          rowsToInsert.push({
            user_id,
            documento_id,
            data_movimentacao: dados.data_documento || new Date().toISOString().split("T")[0],
            descricao: dados.descricao || "",
            valor: dados.valor_total || 0,
            tipo_movimentacao: dados.tipo_movimentacao || "saida",
            categoria_sugerida: dados.categoria_sugerida || "Outro",
            score_confianca: confianca,
            status_revisao: statusFinal === "processado" ? "aprovado" : "pendente",
          });
        }
      }

      if (rowsToInsert.length > 0) {
        await supabase.from("obra_movimentacoes_extraidas").insert(rowsToInsert);
      }

      // Cross-check with existing transactions (obra_transacoes_fluxo)
      if (dados.valor_total && dados.data_documento) {
        const { data: similar } = await supabase
          .from("obra_transacoes_fluxo")
          .select("id, valor, data, descricao")
          .eq("user_id", user_id)
          .eq("valor", dados.valor_total)
          .eq("data", dados.data_documento)
          .is("deleted_at", null)
          .limit(5);

        if (similar && similar.length > 0) {
          await supabase
            .from("obra_documentos_processados")
            .update({
              duplicidade_status: "suspeita",
              duplicidade_score: 80,
              status_processamento: "revisao",
              motivo_revisao: `Possível duplicata: ${similar.length} transação(ões) com mesmo valor e data`,
            })
            .eq("id", documento_id);

          await supabase.from("obra_eventos_processamento").insert({
            user_id,
            documento_id,
            etapa: "deduplicacao_transacoes",
            status: "alerta",
            mensagem: `${similar.length} transações similares encontradas`,
            detalhes: { similar },
          });
        }
      }
    }

    return ok(dados);
  } catch (error) {
    console.error("processar-documento-ia error:", error);
    return err(error instanceof Error ? error.message : "Erro desconhecido");
  }
});
