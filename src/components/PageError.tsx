import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageErrorProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Exibe erros de query de forma consistente em todas as páginas.
 * Substitui os erros silenciados (sem feedback ao usuário).
 */
export default function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="glass-card p-6 flex items-start gap-4 border-destructive/20">
      <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4 text-destructive" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Erro ao carregar dados</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={onRetry}
        >
          <RefreshCw className="w-3 h-3" />
          Tentar
        </Button>
      )}
    </div>
  );
}
