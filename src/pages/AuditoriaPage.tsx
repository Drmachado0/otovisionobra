import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { History, Plus, Edit, Trash2, Search, Filter } from "lucide-react";
import { SkeletonTable } from "@/components/SkeletonCard";

interface AuditLog {
  id: string;
  user_email: string;
  acao: string;
  tabela: string;
  registro_id: string;
  created_at: string;
  dados_anteriores: any;
  dados_novos: any;
}

const ACAO_ICON: Record<string, React.ReactNode> = {
  "criação": <Plus className="w-3.5 h-3.5 text-success" />,
  "edição": <Edit className="w-3.5 h-3.5 text-info" />,
  "exclusão": <Trash2 className="w-3.5 h-3.5 text-destructive" />,
};

const ACAO_COLOR: Record<string, string> = {
  "criação": "bg-success/10",
  "edição": "bg-info/10",
  "exclusão": "bg-destructive/10",
};

const TABELA_LABELS: Record<string, string> = {
  obra_transacoes_fluxo: "Transação",
  obra_compras: "Compra",
  obra_notas_fiscais: "Nota Fiscal",
  obra_fornecedores: "Fornecedor",
  obra_comissao_pagamentos: "Comissão",
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTabela, setFilterTabela] = useState("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("obra_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setLogs(data as AuditLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useRealtimeSubscription("obra_audit_log", fetchLogs);

  const filtered = logs.filter((l) => {
    const matchSearch = search === "" ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.tabela?.toLowerCase().includes(search.toLowerCase()) ||
      l.acao?.toLowerCase().includes(search.toLowerCase());
    const matchTabela = filterTabela === "todos" || l.tabela === filterTabela;
    return matchSearch && matchTabela;
  });

  const formatDateTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" /> Auditoria
        </h1>
        <p className="text-sm text-muted-foreground">Histórico completo de alterações no sistema</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuário, tabela..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterTabela}
          onChange={(e) => setFilterTabela(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="todos">Todas as tabelas</option>
          <option value="obra_transacoes_fluxo">Transações</option>
          <option value="obra_compras">Compras</option>
          <option value="obra_notas_fiscais">Notas Fiscais</option>
          <option value="obra_fornecedores">Fornecedores</option>
          <option value="obra_comissao_pagamentos">Comissões</option>
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum registro de auditoria encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <button
              key={log.id}
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              className="w-full text-left glass-card p-4 hover:border-primary/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ACAO_COLOR[log.acao] || "bg-muted"}`}>
                  {ACAO_ICON[log.acao] || <Edit className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{log.acao}</span>
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium">
                      {TABELA_LABELS[log.tabela] || log.tabela}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {log.user_email || "Sistema"} • {formatDateTime(log.created_at)}
                  </p>
                </div>
              </div>

              {expandedId === log.id && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                  {log.dados_anteriores && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Dados Anteriores</p>
                      <pre className="text-xs bg-secondary/50 p-2 rounded-md overflow-x-auto max-h-32 text-muted-foreground">
                        {JSON.stringify(log.dados_anteriores, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.dados_novos && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Dados Novos</p>
                      <pre className="text-xs bg-secondary/50 p-2 rounded-md overflow-x-auto max-h-32 text-muted-foreground">
                        {JSON.stringify(log.dados_novos, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
