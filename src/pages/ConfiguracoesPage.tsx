import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Settings, Shield, Download, Trash2, Users, Info, AlertTriangle,
  Loader2, Check, Building2, Save, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";

interface UserWithRole {
  id: string;
  email: string;
  role: string;
}

interface ObraConfig {
  id?: string;
  nome_obra: string;
  endereco: string;
  responsavel: string;
  contato_responsavel: string;
  area_construida: number;
  orcamento_total: number;
  data_inicio: string;
  data_termino: string;
}

const ROLES = ["admin", "financeiro", "construtor", "visualizador"];

const defaultObraConfig: ObraConfig = {
  nome_obra: "",
  endereco: "",
  responsavel: "",
  contato_responsavel: "",
  area_construida: 0,
  orcamento_total: 0,
  data_inicio: "",
  data_termino: "",
};

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDangerDialog, setShowDangerDialog] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [comissaoRate, setComissaoRate] = useState("8");

  // Notification preferences
  const NOTIF_TYPES = [
    { tipo: "etapa_atrasada", label: "Etapas atrasadas", desc: "Notificar quando etapas passam do prazo" },
    { tipo: "comissao_pendente", label: "Comissões pendentes", desc: "Notificar sobre comissões aguardando pagamento" },
    { tipo: "parcela_vencendo", label: "Parcelas vencendo", desc: "Notificar 3 dias antes do vencimento de parcelas" },
    { tipo: "nf_pendente", label: "Notas fiscais pendentes", desc: "Notificar NFs pendentes há mais de 7 dias" },
    { tipo: "orcamento_alerta", label: "Alerta de orçamento", desc: "Notificar quando gastos ultrapassam 80% do orçamento" },
  ];
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [loadingNotifPrefs, setLoadingNotifPrefs] = useState(true);

  const fetchNotifPrefs = useCallback(async () => {
    if (!user) return;
    setLoadingNotifPrefs(true);
    const { data } = await supabase
      .from("obra_notification_preferences")
      .select("tipo, enabled")
      .eq("user_id", user.id);
    const prefs: Record<string, boolean> = {};
    for (const t of NOTIF_TYPES) prefs[t.tipo] = true; // default enabled
    for (const row of data || []) prefs[(row as any).tipo] = (row as any).enabled;
    setNotifPrefs(prefs);
    setLoadingNotifPrefs(false);
  }, [user]);

  const toggleNotifPref = async (tipo: string, enabled: boolean) => {
    if (!user) return;
    setNotifPrefs(prev => ({ ...prev, [tipo]: enabled }));
    const { error } = await supabase
      .from("obra_notification_preferences")
      .upsert({ user_id: user.id, tipo, enabled } as any, { onConflict: "user_id,tipo" });
    if (error) {
      toast.error("Erro ao salvar preferência");
      setNotifPrefs(prev => ({ ...prev, [tipo]: !enabled }));
    }
  };

  // Obra config state
  const [obraConfig, setObraConfig] = useState<ObraConfig>(defaultObraConfig);
  const [obraConfigId, setObraConfigId] = useState<string | null>(null);
  const [loadingObra, setLoadingObra] = useState(true);
  const [savingObra, setSavingObra] = useState(false);

  useEffect(() => {
    fetchObraConfig();
    if (role === "admin") {
      fetchUsers();
    }
  }, [role]);

  const fetchObraConfig = async () => {
    setLoadingObra(true);
    const { data, error } = await supabase
      .from("obra_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (data) {
      setObraConfigId(data.id);
      setObraConfig({
        id: data.id,
        nome_obra: data.nome_obra || "",
        endereco: data.endereco || "",
        responsavel: data.responsavel || "",
        contato_responsavel: data.contato_responsavel || "",
        area_construida: Number(data.area_construida) || 0,
        orcamento_total: Number(data.orcamento_total) || 0,
        data_inicio: data.data_inicio || "",
        data_termino: data.data_termino || "",
      });
    }
    setLoadingObra(false);
  };

  const handleSaveObra = async () => {
    if (!user) return;
    setSavingObra(true);
    try {
      const payload = {
        nome_obra: obraConfig.nome_obra,
        endereco: obraConfig.endereco,
        responsavel: obraConfig.responsavel,
        contato_responsavel: obraConfig.contato_responsavel,
        area_construida: obraConfig.area_construida,
        orcamento_total: obraConfig.orcamento_total,
        data_inicio: obraConfig.data_inicio,
        data_termino: obraConfig.data_termino,
        user_id: user.id,
      };

      let error;
      if (obraConfigId) {
        ({ error } = await supabase
          .from("obra_config")
          .update(payload)
          .eq("id", obraConfigId));
      } else {
        ({ error } = await supabase
          .from("obra_config")
          .insert(payload));
      }

      if (error) throw error;
      toast.success("Dados da obra salvos com sucesso!");
      fetchObraConfig();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSavingObra(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (roles) {
      // Fetch emails for user IDs
      const userIds = roles.map((r: any) => r.user_id);
      const userList: UserWithRole[] = roles.map((r: any) => ({
        id: r.user_id,
        email: r.user_id === user?.id ? (user?.email || r.user_id) : r.user_id,
        role: r.role,
      }));
      setUsers(userList);
    }
    setLoadingUsers(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole } as any)
      .eq("user_id", userId);

    if (error) {
      toast.error("Erro ao atualizar role: " + error.message);
    } else {
      toast.success("Role atualizada!");
      fetchUsers();
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/exportar-backup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Erro na exportação");

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-otovision-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    }
    setExporting(false);
  };

  const handleDeleteAll = async () => {
    if (dangerConfirm !== "APAGAR TUDO") return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/limpar-dados-obra`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao apagar dados");
      }

      toast.success("Todos os dados foram apagados!");
      setShowDangerDialog(false);
      setDangerConfirm("");
    } catch (err: any) {
      toast.error(err.message);
    }
    setDeleting(false);
  };

  const updateObraField = (field: keyof ObraConfig, value: string | number) => {
    setObraConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8 animate-slide-in max-w-3xl">
      <div className="page-header">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie o sistema, usuários e dados</p>
      </div>

      {/* Info do Sistema */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" /> Informações do Sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Versão</p>
            <p className="text-sm font-medium">OTOVISION v1.0</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Seu Perfil</p>
            <Badge className="text-xs mt-1">{role || "carregando..."}</Badge>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium truncate">{user?.email || "-"}</p>
          </div>
        </div>
      </section>

      {/* Dados da Obra */}
      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Dados da Obra
          </h2>
          <Button onClick={handleSaveObra} disabled={savingObra || loadingObra} size="sm" className="gap-2">
            {savingObra ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
        {loadingObra ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Nome da Obra</Label>
              <Input
                value={obraConfig.nome_obra}
                onChange={e => updateObraField("nome_obra", e.target.value)}
                placeholder="Ex: Clínica Otovision"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Endereço</Label>
              <Input
                value={obraConfig.endereco}
                onChange={e => updateObraField("endereco", e.target.value)}
                placeholder="Rua, número, cidade..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Input
                value={obraConfig.responsavel}
                onChange={e => updateObraField("responsavel", e.target.value)}
                placeholder="Nome do responsável"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contato do Responsável</Label>
              <Input
                value={obraConfig.contato_responsavel}
                onChange={e => updateObraField("contato_responsavel", e.target.value)}
                placeholder="Telefone ou email"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Área Construída (m²)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={obraConfig.area_construida || ""}
                onChange={e => updateObraField("area_construida", parseFloat(e.target.value) || 0)}
                placeholder="658"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usado no cálculo do KPI Custo/m² no Dashboard (atualização em tempo real)
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Orçamento Total (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={obraConfig.orcamento_total || ""}
                onChange={e => updateObraField("orcamento_total", parseFloat(e.target.value) || 0)}
                placeholder="1500000"
                className="mt-1"
              />
              {obraConfig.orcamento_total > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(obraConfig.orcamento_total)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de Início</Label>
              <Input
                type="date"
                value={obraConfig.data_inicio}
                onChange={e => updateObraField("data_inicio", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data de Término</Label>
              <Input
                type="date"
                value={obraConfig.data_termino}
                onChange={e => updateObraField("data_termino", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </section>

      {/* Preferências */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Preferências
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Taxa de Comissão (%)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={comissaoRate}
              onChange={e => setComissaoRate(e.target.value)}
              className="mt-1 max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-1">Usado no cálculo automático de comissão</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Moeda</Label>
            <Input value="BRL (R$)" disabled className="mt-1 max-w-[160px]" />
          </div>
        </div>
      </section>

      {/* Gerenciamento de Usuários */}
      {role === "admin" && (
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Usuários e Permissões
          </h2>
          {loadingUsers ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário com role atribuída</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <div>
                    <p className="text-sm truncate max-w-[280px]">{u.email !== u.id ? u.email : u.id.substring(0, 8) + "..."}</p>
                    {u.id === user?.id && <Badge variant="outline" className="text-[10px] ml-2">Você</Badge>}
                  </div>
                  <select
                    value={u.role}
                    onChange={e => updateRole(u.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Backup */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" /> Backup de Dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Exporte todos os seus dados em formato JSON.
        </p>
        <Button onClick={handleExportBackup} disabled={exporting} className="gap-2">
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? "Exportando..." : "Exportar Backup (JSON)"}
        </Button>
      </section>

      {/* Danger Zone */}
      {role === "admin" && (
        <section className="rounded-lg border-2 border-destructive/30 p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Zona de Perigo
          </h2>
          <p className="text-sm text-muted-foreground">
            Ações irreversíveis. Recomendamos exportar um backup antes de prosseguir.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDangerDialog(true)}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Apagar Todos os Dados
          </Button>
        </section>
      )}

      {/* Danger Confirmation Dialog */}
      <Dialog open={showDangerDialog} onOpenChange={open => { if (!open) { setShowDangerDialog(false); setDangerConfirm(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirmar Exclusão Total
            </DialogTitle>
            <DialogDescription>
              Esta ação vai apagar <strong>permanentemente</strong> todos os dados financeiros, compras, comissões, documentos e configurações da obra. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">
                Digite <span className="font-mono font-bold text-destructive">APAGAR TUDO</span> para confirmar:
              </Label>
              <Input
                value={dangerConfirm}
                onChange={e => setDangerConfirm(e.target.value)}
                placeholder="APAGAR TUDO"
                className="mt-2 border-destructive/50 focus-visible:ring-destructive"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowDangerDialog(false); setDangerConfirm(""); }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={dangerConfirm !== "APAGAR TUDO" || deleting}
                onClick={handleDeleteAll}
                className="flex-1 gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Apagando..." : "Apagar Tudo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
