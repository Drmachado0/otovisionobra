import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, ShoppingCart, FileText, Percent,
  Menu, X, Building2, History, Calendar, TrendingUp, Lightbulb,
  BarChart3, FolderSync, Landmark, ChevronRight, Wallet, Settings,
} from "lucide-react";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  allowedRoles?: AppRole[];
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/cronograma", label: "Cronograma", icon: Calendar },
  { path: "/fluxo", label: "Fluxo de Caixa", icon: ArrowLeftRight, allowedRoles: ["admin", "financeiro"] },
  { path: "/contas", label: "Contas", icon: Wallet, allowedRoles: ["admin", "financeiro"] },
  { path: "/compras", label: "Compras", icon: ShoppingCart, allowedRoles: ["admin", "financeiro"] },
  { path: "/notas-fiscais", label: "Notas Fiscais", icon: FileText, allowedRoles: ["admin", "financeiro"] },
  { path: "/previsao", label: "Previsão", icon: TrendingUp, allowedRoles: ["admin", "financeiro"] },
  { path: "/insights", label: "Insights", icon: Lightbulb },
  { path: "/leitor-ia", label: "Leitor IA", icon: FileText, allowedRoles: ["admin", "financeiro"] },
  { path: "/pasta-sync", label: "Pasta Sync", icon: FolderSync, allowedRoles: ["admin", "financeiro"] },
  { path: "/conciliacao", label: "Conciliação", icon: Landmark, allowedRoles: ["admin", "financeiro"] },
  { path: "/comissao", label: "Comissão", icon: Percent, allowedRoles: ["admin", "construtor"] },
  { path: "/relatorios", label: "Relatórios", icon: BarChart3, allowedRoles: ["admin", "financeiro"] },
  { path: "/auditoria", label: "Auditoria", icon: History, allowedRoles: ["admin"] },
  { path: "/configuracoes", label: "Configurações", icon: Settings, allowedRoles: ["admin"] },
];

function getPageLabel(pathname: string): string {
  const item = navItems.find(i => i.path === pathname);
  return item?.label || "";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role } = useUserRole();

  const visibleItems = navItems.filter(
    (item) => !item.allowedRoles || (role && item.allowedRoles.includes(role))
  );

  const currentPage = getPageLabel(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-wide">OTOVISION</h1>
            <p className="text-[10px] text-muted-foreground">Gestão de Obra</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary" />
                )}
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
            Sincronizado
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground p-1 lg:hidden">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">OTOVISION</span>
            </div>
            {/* Breadcrumb */}
            {currentPage && (
              <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>OTOVISION</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground font-medium">{currentPage}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {mobileOpen && (
          <div className="lg:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-sm pt-14 animate-slide-in-left">
            <nav className="px-4 py-4 space-y-1">
              {visibleItems.map((item, i) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium animate-fade-in-up ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
