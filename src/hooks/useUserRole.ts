import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "financeiro" | "construtor" | "visualizador";

interface RolePermissions {
  canEditFinanceiro: boolean;
  canEditCompras: boolean;
  canEditComissao: boolean;
  canViewAll: boolean;
  canManageUsers: boolean;
  canDeleteRecords: boolean;
  isReadOnly: boolean;
}

const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  admin: {
    canEditFinanceiro: true,
    canEditCompras: true,
    canEditComissao: true,
    canViewAll: true,
    canManageUsers: true,
    canDeleteRecords: true,
    isReadOnly: false,
  },
  financeiro: {
    canEditFinanceiro: true,
    canEditCompras: true,
    canEditComissao: false,
    canViewAll: false,
    canManageUsers: false,
    canDeleteRecords: false,
    isReadOnly: false,
  },
  construtor: {
    canEditFinanceiro: false,
    canEditCompras: false,
    canEditComissao: false,
    canViewAll: false,
    canManageUsers: false,
    canDeleteRecords: false,
    isReadOnly: true,
  },
  visualizador: {
    canEditFinanceiro: false,
    canEditCompras: false,
    canEditComissao: false,
    canViewAll: false,
    canManageUsers: false,
    canDeleteRecords: false,
    isReadOnly: true,
  },
};

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setRole((data?.role as AppRole) ?? "admin");
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  const permissions = role ? ROLE_PERMISSIONS[role] : ROLE_PERMISSIONS.visualizador;

  return { role, loading, permissions };
}
