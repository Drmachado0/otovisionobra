import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texto, nome_arquivo, tipo_arquivo } = await req.json();

    if (!texto || typeof texto !== "string" || texto.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Conteúdo do documento é obrigatório (mínimo 5 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em extrair dados financeiros de documentos brasileiros. Analise o texto e determine:
1. O tipo do documento (extrato_bancario, nota_fiscal, recibo, comprovante, outro)
2. Se for extrato bancário, extraia TODAS as linhas de movimentação individualmente.
3. Se for outro tipo, extraia os dados como documento único.

Use a função disponível para retornar os dados estruturados.
- Datas no formato YYYY-MM-DD
- Valores numéricos sem formatação (ex: 1500.50)
- confianca: número de 0 a 100
- tipo_movimentacao: "entrada" ou "saida"
- categoria_sugerida: Material, Mão de Obra, Equipamento, Serviço, Administrativo, Transporte, Alimentação, Outro

Arquivo: ${nome_arquivo || 'desconhecido'} (${tipo_arquivo || 'desconhecido'})`,
          },
          {
            role: "user",
            content: `Extraia os dados financeiros:\n\n${texto.slice(0, 12000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extrair_dados_documento",
              description: "Extrai dados financeiros estruturados de um documento",
              parameters: {
                type: "object",
                properties: {
                  tipo_documento: {
                    type: "string",
                    enum: ["extrato_bancario", "nota_fiscal", "recibo", "comprovante", "outro"],
                  },
                  confianca: { type: "number", description: "Confiança da extração (0-100)" },
                  data_documento: { type: "string", description: "Data principal YYYY-MM-DD" },
                  valor_total: { type: "number" },
                  fornecedor_ou_origem: { type: "string" },
                  descricao: { type: "string" },
                  categoria_sugerida: {
                    type: "string",
                    enum: ["Material", "Mão de Obra", "Equipamento", "Serviço", "Administrativo", "Transporte", "Alimentação", "Outro"],
                  },
                  tipo_movimentacao: { type: "string", enum: ["entrada", "saida"] },
                  observacoes: { type: "string" },
                  movimentacoes: {
                    type: "array",
                    description: "Linhas individuais (para extratos bancários)",
                    items: {
                      type: "object",
                      properties: {
                        data: { type: "string" },
                        descricao: { type: "string" },
                        valor: { type: "number" },
                        tipo: { type: "string", enum: ["entrada", "saida"] },
                        saldo: { type: "number" },
                        categoria_sugerida: { type: "string" },
                      },
                      required: ["data", "descricao", "valor", "tipo"],
                    },
                  },
                },
                required: ["tipo_documento", "confianca", "descricao"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extrair_dados_documento" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`Erro do gateway de IA: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("IA não retornou dados estruturados");
    }

    const dados = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(dados), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("processar-pasta error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
