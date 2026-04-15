import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global para capturar erros de renderização React.
 *
 * Evita que um erro em uma página quebre todo o app. Mostra um fallback
 * amigável com opção de recarregar.
 *
 * USO em App.tsx:
 *   <ErrorBoundary>
 *     <AuthenticatedApp />
 *   </ErrorBoundary>
 *
 * USO em páginas individuais:
 *   <ErrorBoundary fallback={<p>Erro ao carregar esta seção.</p>}>
 *     <ComponenteComplexo />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] glass-card p-8 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold mb-1">Algo deu errado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ocorreu um erro inesperado nesta página. Você pode tentar recarregar.
            </p>
            {this.state.error && (
              <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={this.handleReset}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
