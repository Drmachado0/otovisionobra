/**
 * Testes para lógica pura de services e utilidades.
 *
 * Apenas funções sem I/O são testadas aqui.
 * Queries Supabase são testadas via integração (manual ou CI com Supabase local).
 */

import { describe, it, expect } from "vitest";

// ─── calcMatchScore já está em conciliacao.test.ts ───────────────────────────
// ─── formatters já está em formatters.test.ts ─────────────────────────────────

// ─── Lógica de comissão ───────────────────────────────────────────────────────

function calcularComissao(totalSaidas: number, percentual: number): number {
  return totalSaidas * (percentual / 100);
}

describe("calcularComissao", () => {
  it("calcula 8% corretamente", () => {
    expect(calcularComissao(100_000, 8)).toBe(8_000);
  });

  it("calcula percentual fracionado", () => {
    expect(calcularComissao(50_000, 7.5)).toBeCloseTo(3_750);
  });

  it("retorna zero para total zero", () => {
    expect(calcularComissao(0, 8)).toBe(0);
  });

  it("retorna zero para percentual zero", () => {
    expect(calcularComissao(100_000, 0)).toBe(0);
  });

  it("não ultrapassa 100%", () => {
    const resultado = calcularComissao(50_000, 100);
    expect(resultado).toBe(50_000);
  });
});

// ─── Lógica de projeção financeira ───────────────────────────────────────────

function calcularProjecao(totalGasto: number, progressoPercent: number): number | null {
  if (progressoPercent <= 5) return null; // dados insuficientes
  return totalGasto / (progressoPercent / 100);
}

describe("calcularProjecao", () => {
  it("projeta custo final com base no progresso", () => {
    // Gastou 50k com 50% concluído → projeção = 100k
    expect(calcularProjecao(50_000, 50)).toBe(100_000);
  });

  it("retorna null com progresso <= 5%", () => {
    expect(calcularProjecao(10_000, 5)).toBeNull();
    expect(calcularProjecao(10_000, 3)).toBeNull();
  });

  it("projeção com 25% concluído", () => {
    expect(calcularProjecao(25_000, 25)).toBe(100_000);
  });

  it("projeção com 100% concluído é o próprio gasto", () => {
    expect(calcularProjecao(87_500, 100)).toBe(87_500);
  });
});

// ─── Lógica de burn rate ──────────────────────────────────────────────────────

function calcularBurnRate(totalGasto: number, diasDecorridos: number): number {
  return totalGasto / Math.max(1, diasDecorridos);
}

function calcularDiasRestantes(saldo: number, burnRate: number): number {
  if (burnRate <= 0) return Infinity;
  return saldo / burnRate;
}

describe("calcularBurnRate", () => {
  it("calcula gasto diário médio", () => {
    expect(calcularBurnRate(30_000, 30)).toBe(1_000);
  });

  it("evita divisão por zero (usa mínimo 1 dia)", () => {
    expect(calcularBurnRate(10_000, 0)).toBe(10_000);
  });
});

describe("calcularDiasRestantes", () => {
  it("estima dias restantes com base no burn rate", () => {
    expect(calcularDiasRestantes(30_000, 1_000)).toBe(30);
  });

  it("retorna Infinity quando burn rate é zero", () => {
    expect(calcularDiasRestantes(30_000, 0)).toBe(Infinity);
  });
});

// ─── Detecção de risco orçamentário ──────────────────────────────────────────

function detectarRisco(projecao: number, orcamento: number): "baixo" | "medio" | "alto" {
  if (projecao > orcamento * 1.1) return "alto";
  if (projecao > orcamento * 1.0) return "medio";
  return "baixo";
}

describe("detectarRisco", () => {
  it("risco baixo quando projeção dentro do orçamento", () => {
    expect(detectarRisco(90_000, 100_000)).toBe("baixo");
  });

  it("risco médio quando projeção ultrapassa orçamento (até 10%)", () => {
    expect(detectarRisco(105_000, 100_000)).toBe("medio");
  });

  it("risco alto quando projeção supera 110% do orçamento", () => {
    expect(detectarRisco(115_000, 100_000)).toBe("alto");
  });

  it("risco baixo na fronteira exata do orçamento (projeção = orçamento)", () => {
    // projecao === orcamento → NÃO satisfaz `> orcamento * 1.0` → retorna "baixo"
    expect(detectarRisco(100_000, 100_000)).toBe("baixo");
  });

  it("risco médio quando projeção supera em R$ 1,00", () => {
    expect(detectarRisco(100_001, 100_000)).toBe("medio");
  });
});
