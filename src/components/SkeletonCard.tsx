export function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-5 w-5 rounded bg-muted" />
      </div>
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="h-2.5 w-16 rounded bg-muted" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-border/50 flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-muted flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border/30 flex gap-4">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="h-3 rounded bg-muted flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
