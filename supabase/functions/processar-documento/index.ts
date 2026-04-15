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
    const { texto } = await req.json();

    if (!texto || typeof texto !== "string" || texto.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Texto do documento é obrigatório (mínimo 5 caracteres)" }),
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
            content: `Você é um assistente especializado em extrair dados financeiros de documentos brasileiros (notas fiscais, recibos, extratos bancários, boletos). Analise o texto fornecido e extraia as informações usando a função disponível. Se não conseguir identificar algum campo, use string vazia para textos e 0 para valores numéricos. Datas devem estar no formato YYYY-MM-DD. O campo "tipo" deve ser um dos: "NF", "Recibo", "Extrato", "Boleto", "Outro". A categoria deve ser uma das: "Material", "Mão de Obra", "Equipamento", "Serviço", "Administrativo", "Transporte", "Alimentação", "Outro".`,
          },
          {
            role: "user",
            content: `Extraia os dados financeiros do seguinte documento:\n\n${texto.slice(0, 8000)}`,
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
                  valor: {
                    type: "number",
                    description: "Valor total em reais (ex: 1500.50)",
                  },
                  data: {
                    type: "string",
                    description: "Data do documento no formato YYYY-MM-DD",
                  },
                  fornecedor: {
                    type: "string",
                    description: "Nome do fornecedor ou empresa emissora",
                  },
                  tipo: {
                    type: "string",
                    enum: ["NF", "Recibo", "Extrato", "Boleto", "Outro"],
                    description: "Tipo do documento",
                  },
                  descricao: {
                    type: "string",
                    description: "Descrição resumida dos itens ou serviços",
                  },
                  categoria: {
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
                },
                required: ["valor", "data", "fornecedor", "tipo", "descricao", "categoria"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "extrair_dados_documento" },
        },
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
    console.error("processar-documento error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
