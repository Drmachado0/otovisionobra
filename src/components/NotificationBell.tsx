import { useState, useRef, useEffect } from "react";
import { Bell, Check, AlertTriangle, Info, ShoppingCart } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const ICON_MAP: Record<string, React.ReactNode> = {
  alerta: <AlertTriangle className="w-4 h-4 text-warning" />,
  info: <Info className="w-4 h-4 text-info" />,
  compra: <ShoppingCart className="w-4 h-4 text-primary" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "border-l-destructive",
  media: "border-l-warning",
  baixa: "border-l-muted-foreground",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse-glow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-card z-50 animate-slide-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-semibold">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.status === "nao_lida") markAsRead(n.id);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-accent/50 transition-colors border-l-2 ${
                    PRIORITY_COLORS[n.prioridade] || "border-l-transparent"
                  } ${n.status === "nao_lida" ? "bg-accent/30" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{ICON_MAP[n.tipo] || <Info className="w-4 h-4 text-muted-foreground" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatTimeAgo(n.created_at)}</p>
                    </div>
                    {n.status === "nao_lida" && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
