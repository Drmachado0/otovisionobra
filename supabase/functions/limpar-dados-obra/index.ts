import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "obra_eventos_conciliacao",
  "obra_sugestoes_conciliacao",
  "obra_conciliacoes_bancarias",
  "obra_movimentacoes_extraidas",
  "obra_eventos_processamento",
  "obra_documentos_processados",
  "obra_registro_mao_de_obra",
  "obra_comissao_pagamentos",
  "obra_compras",
  "obra_transacoes_fluxo",
  "obra_notas_fiscais",
  "obra_orcamentos",
  "obra_composicoes",
  "obra_leitor_historico",
  "obra_medicoes",
  "obra_diario",
  "obra_cronograma",
  "obra_funcionarios",
  "obra_fornecedores",
  "obra_contas_financeiras",
  "obra_config",
  "obra_notificacoes",
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

  // Verify admin role
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleData?.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Apenas administradores podem apagar dados" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Log action before deleting
  await supabaseAdmin.from("obra_audit_log").insert({
    user_id: userId,
    user_email: (claimsData.claims as Record<string, unknown>).email as string || "",
    acao: "limpeza_total",
    tabela: "todas_obra_*",
    registro_id: "",
    dados_novos: { action: "DELETE_ALL", tables: TABLES },
  });

  const results: Record<string, string> = {};

  for (const table of TABLES) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("user_id", userId);

    results[table] = error ? `erro: ${error.message}` : "ok";
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Dados apagados com sucesso",
      details: results,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
});
