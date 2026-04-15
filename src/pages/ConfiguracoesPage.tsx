import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Settings, Shield, Download, Trash2, Users, Info, AlertTriangle,
  Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface UserWithRole {
  id: string;
  email: string;
  role: string;
}

const ROLES = ["admin", "financeiro", "construtor", "visualizador"];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { role, permissions } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDangerDialog, setShowDangerDialog] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [comissaoRate, setComissaoRate] = useState("8");

  useEffect(() => {
    if (role === "admin") {
      fetchUsers();
    }
  }, [role]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (roles) {
      const userList: UserWithRole[] = roles.map((r: any) => ({
        id: r.user_id,
        email: r.user_id,
        role: r.role,
      }));
      setUsers(userList);
    }
    setLoadingUsers(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
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
                    <p className="text-sm font-mono truncate max-w-[280px]">{u.id}</p>
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
          Exporte todos os seus dados em formato JSON. O arquivo incluirá transações, compras, comissões, notas fiscais, documentos e mais.
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
