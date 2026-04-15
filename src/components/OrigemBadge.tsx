interface OrigemBadgeProps {
  origem?: string | null;
  compact?: boolean;
  className?: string;
}

function getOrigemBadgeConfig(origem?: string | null) {
  switch (origem) {
    case "ia":
      return { label: "IA", className: "badge-info" };
    case "compra":
      return { label: "Compra", className: "badge-warning" };
    case "conciliacao":
      return { label: "Conciliação", className: "badge-primary" };
    case "pasta":
      return { label: "Pasta", className: "badge-success" };
    default:
      return { label: "Manual", className: "badge-muted" };
  }
}

export default function OrigemBadge({ origem, compact = false, className = "" }: OrigemBadgeProps) {
  const badge = getOrigemBadgeConfig(origem);
  const compactClass = compact ? " text-[10px]" : "";

  return <span className={`${badge.className}${compactClass}${className ? ` ${className}` : ""}`}>{badge.label}</span>;
}
