import { describe, it, expect } from "vitest";

// ─── Lógica pura extraída de etapas.ts / useEtapas.ts ────────────────────────

function derivarStatusEtapa(percentual: number): string {
  if (percentual >= 100) return "Concluída";
  if (percentual > 0) return "Em andamento";
  return "Não Iniciada";
}

function detectarAtraso(fim_previsto: string | null, status: string): boolean {
  if (status === "Concluída") return false;
  if (!fim_previsto) return false;
  return new Date(fim_previsto) < new Date();
}

function calcularVarianca(previsto: number, real: number): number {
  return real - previsto;
}

function calcularVariancaPercent(previsto: number, real: number): number | null {
  if (previsto <= 0) return null;
  return ((real - previsto) / previsto) * 100;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("derivarStatusEtapa", () => {
  it("100% → Concluída", () => {
    expect(derivarStatusEtapa(100)).toBe("Concluída");
  });

  it("acima de 100% também retorna Concluída", () => {
    expect(derivarStatusEtapa(105)).toBe("Concluída");
  });

  it("50% → Em andamento", () => {
    expect(derivarStatusEtapa(50)).toBe("Em andamento");
  });

  it("1% → Em andamento", () => {
    expect(derivarStatusEtapa(1)).toBe("Em andamento");
  });

  it("0% → Não Iniciada", () => {
    expect(derivarStatusEtapa(0)).toBe("Não Iniciada");
  });
});

describe("detectarAtraso", () => {
  it("não atrasa etapa Concluída mesmo com data no passado", () => {
    expect(detectarAtraso("2020-01-01", "Concluída")).toBe(false);
  });

  it("não atrasa quando não há fim_previsto", () => {
    expect(detectarAtraso(null, "Em andamento")).toBe(false);
  });

  it("detecta atraso quando data no passado e não concluída", () => {
    expect(detectarAtraso("2020-01-01", "Em andamento")).toBe(true);
  });

  it("não atrasa quando data no futuro", () => {
    const futuro = new Date(Date.now() + 86400000 * 365).toISOString().split("T")[0];
    expect(detectarAtraso(futuro, "Em andamento")).toBe(false);
  });
});

describe("calcularVarianca", () => {
  it("variança positiva = custo acima do previsto", () => {
    expect(calcularVarianca(100_000, 120_000)).toBe(20_000);
  });

  it("variança negativa = custo abaixo do previsto", () => {
    expect(calcularVarianca(100_000, 80_000)).toBe(-20_000);
  });

  it("variança zero = dentro do orçamento", () => {
    expect(calcularVarianca(100_000, 100_000)).toBe(0);
  });
});

describe("calcularVariancaPercent", () => {
  it("retorna percentual correto", () => {
    expect(calcularVariancaPercent(100_000, 120_000)).toBeCloseTo(20);
  });

  it("retorna negativo quando abaixo do previsto", () => {
    expect(calcularVariancaPercent(100_000, 80_000)).toBeCloseTo(-20);
  });

  it("retorna null quando previsto é zero (divisão por zero)", () => {
    expect(calcularVariancaPercent(0, 50_000)).toBeNull();
  });

  it("retorna zero quando previsto = real", () => {
    expect(calcularVariancaPercent(100_000, 100_000)).toBeCloseTo(0);
  });
});
