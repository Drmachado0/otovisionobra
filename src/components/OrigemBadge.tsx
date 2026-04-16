interface OrigemBadgeProps {
  origem?: string | null;
  compact?: boolean;
  className?: string;
  isMae?: boolean;
}

function getOrigemBadgeConfig(origem?: string | null, isMae?: boolean) {
  switch (origem) {
    case "ia":
      return { label: "IA", className: "badge-info" };
    case "compra":
      return { label: "Compra", className: "badge-warning" };
    case "conciliacao":
      return { label: "Conciliação", className: "badge-primary" };
    case "pasta":
      return { label: "Pasta", className: "badge-success" };
    case "recorrente":
      return { label: isMae ? "Recorrente 🔄" : "Recorrente", className: "badge-primary" };
    case "nf":
      return { label: "NF", className: "badge-info" };
    default:
      return { label: "Manual", className: "badge-muted" };
  }
}

export default function OrigemBadge({ origem, compact = false, className = "", isMae = false }: OrigemBadgeProps) {
  const badge = getOrigemBadgeConfig(origem, isMae);
  const compactClass = compact ? " text-[10px]" : "";

  return <span className={`${badge.className}${compactClass}${className ? ` ${className}` : ""}`}>{badge.label}</span>;
}
