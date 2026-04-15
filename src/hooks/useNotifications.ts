import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

export interface Notification {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  status: string;
  prioridade: string;
  link: string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("obra_notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => n.status === "nao_lida").length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useRealtimeSubscription("obra_notificacoes", fetchNotifications);

  const markAsRead = async (id: string) => {
    await supabase
      .from("obra_notificacoes")
      .update({ status: "lida", read_at: new Date().toISOString() } as any)
      .eq("id", id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("obra_notificacoes")
      .update({ status: "lida", read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("status", "nao_lida");
    fetchNotifications();
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
