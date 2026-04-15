import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatPercent, formatDateTime, formatRelativeDate } from "@/lib/formatters";

describe("formatCurrency", () => {
  it("formata valores positivos em BRL", () => {
    expect(formatCurrency(1500)).toContain("1.500");
    expect(formatCurrency(1500)).toContain("R$");
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toContain("0,00");
  });

  it("formata valores decimais", () => {
    expect(formatCurrency(1234.56)).toContain("1.234,56");
  });
});

describe("formatDate", () => {
  it("retorna traço para string vazia", () => {
    expect(formatDate("")).toBe("-");
  });

  it("não desloca um dia para datas ISO sem hora (bug de timezone)", () => {
    // Bug original: new Date("2025-03-15") = UTC midnight → UTC-3 = 14/03/2025
    // Correção: timeZone: "UTC" garante que "2025-03-15" → "15/03/2025"
    const result = formatDate("2025-03-15");
    expect(result).toBe("15/03/2025");
  });

  it("formata data com dia, mês e ano corretos", () => {
    expect(formatDate("2025-01-01")).toBe("01/01/2025");
    expect(formatDate("2025-12-31")).toBe("31/12/2025");
  });

  it("retorna a string original em caso de data inválida", () => {
    expect(formatDate("data-invalida")).toBe("data-invalida");
  });
});

describe("formatPercent", () => {
  it("formata com 1 casa decimal", () => {
    expect(formatPercent(75.5)).toBe("75.5%");
    expect(formatPercent(100)).toBe("100.0%");
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("arredonda corretamente", () => {
    expect(formatPercent(33.333)).toBe("33.3%");
    expect(formatPercent(66.666)).toBe("66.7%");
  });
});

describe("formatDateTime", () => {
  it("retorna traço para string vazia", () => {
    expect(formatDateTime("")).toBe("-");
  });

  it("inclui hora e minuto", () => {
    const result = formatDateTime("2025-03-15T14:30:00");
    expect(result).toContain("14:30");
  });
});

describe("formatRelativeDate", () => {
  it("retorna traço para string vazia", () => {
    expect(formatRelativeDate("")).toBe("-");
  });

  it("retorna 'agora' para data muito recente", () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toBe("agora");
  });
});
