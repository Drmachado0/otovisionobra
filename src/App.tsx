import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import NotFound from "./pages/NotFound.tsx";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const FluxoCaixaPage = lazy(() => import("@/pages/FluxoCaixaPage"));
const ComprasPage = lazy(() => import("@/pages/ComprasPage"));
const LeitorIAPage = lazy(() => import("@/pages/LeitorIAPage"));
const ComissaoPage = lazy(() => import("@/pages/ComissaoPage"));
const AuditoriaPage = lazy(() => import("@/pages/AuditoriaPage"));
const CronogramaPage = lazy(() => import("@/pages/CronogramaPage"));
const PrevisaoPage = lazy(() => import("@/pages/PrevisaoPage"));
const InsightsPage = lazy(() => import("@/pages/InsightsPage"));
const RelatoriosPage = lazy(() => import("@/pages/RelatoriosPage"));
const PastaMonitorPage = lazy(() => import("@/pages/PastaMonitorPage"));
const ConciliacaoPage = lazy(() => import("@/pages/ConciliacaoPage"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fluxo" element={<FluxoCaixaPage />} />
          <Route path="/compras" element={<ComprasPage />} />
          <Route path="/leitor-ia" element={<LeitorIAPage />} />
          <Route path="/comissao" element={<ComissaoPage />} />
          <Route path="/auditoria" element={<AuditoriaPage />} />
          <Route path="/cronograma" element={<CronogramaPage />} />
          <Route path="/previsao" element={<PrevisaoPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          <Route path="/pasta-sync" element={<PastaMonitorPage />} />
          <Route path="/conciliacao" element={<ConciliacaoPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthenticatedApp />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
