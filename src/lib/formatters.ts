export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata uma data para pt-BR.
 *
 * Datas vindas do Supabase no formato "YYYY-MM-DD" são interpretadas como
 * UTC midnight. Sem ajuste, o `Intl.DateTimeFormat` converteria para o fuso
 * local e mostraria o dia anterior no Brasil (UTC-3).
 *
 * Solução: forçar `timeZone: "UTC"` para que o formato use o mesmo fuso
 * da string recebida, sem deslocamento.
 */
export function formatDate(date: string): string {
  if (!date) return "-";
  try {
    // Para strings "YYYY-MM-DD" (sem hora) usamos UTC explícito
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: isDateOnly ? "UTC" : undefined,
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDateTime(date: string): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatRelativeDate(date: string): string {
  if (!date) return "-";
  try {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return formatDate(date);
  } catch {
    return date;
  }
}
