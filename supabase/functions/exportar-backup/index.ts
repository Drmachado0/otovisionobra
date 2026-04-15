import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "obra_transacoes_fluxo",
  "obra_compras",
  "obra_comissao_pagamentos",
  "obra_notas_fiscais",
  "obra_documentos_processados",
  "obra_cronograma",
  "obra_config",
  "obra_contas_financeiras",
  "obra_fornecedores",
  "obra_funcionarios",
  "obra_diario",
  "obra_medicoes",
  "obra_orcamentos",
  "obra_composicoes",
  "obra_leitor_historico",
  "obra_notificacoes",
  "obra_audit_log",
  "obra_conciliacoes_bancarias",
  "obra_movimentacoes_extraidas",
  "obra_eventos_processamento",
  "obra_eventos_conciliacao",
  "obra_registro_mao_de_obra",
  "obra_sugestoes_conciliacao",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } =
    await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const backup: Record<string, unknown[]> = {};

  for (const table of TABLES) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("user_id", userId);

    if (!error && data) {
      backup[table] = data;
    }
  }

  return new Response(
    JSON.stringify({
      version: "1.0",
      exported_at: new Date().toISOString(),
      user_id: userId,
      tables: backup,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
