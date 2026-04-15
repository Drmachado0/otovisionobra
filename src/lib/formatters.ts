export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string): string {
  if (!date) return "-";
  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  } catch {
    return date;
  }
}

export const CATEGORIAS_PADRAO = [
  "Acabamento", "Administrativo", "Alimentação", "Aporte", "Elétrica",
  "Equipamento", "Equipamentos Médicos", "Estrutura", "Hidráulica",
  "Madeiras", "Mão de Obra", "Materiais de Construção", "Mobiliário",
  "Serviço", "TI", "Tijolos", "Transporte", "Outro",
];

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const MESES_PT: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

export function formatMes(mes: string): string {
  if (!mes) return "-";
  const parts = mes.split("-");
  if (parts.length === 2) {
    const nomeMes = MESES_PT[parts[1]];
    if (nomeMes) return `${nomeMes}/${parts[0]}`;
  }
  return mes;
}
