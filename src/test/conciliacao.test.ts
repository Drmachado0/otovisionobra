import { describe, it, expect } from "vitest";
import { calcMatchScore } from "@/hooks/useConciliacao";
import type { MovimentacaoExtraida, Transacao } from "@/hooks/useConciliacao";

const baseMov: MovimentacaoExtraida = {
  id: "m1",
  documento_id: "d1",
  data_movimentacao: "2025-03-15",
  descricao: "Compra de material de construção",
  valor: 1500,
  tipo_movimentacao: "saida",
  saldo: null,
  categoria_sugerida: "Material",
  score_confianca: 90,
  score_duplicidade: 0,
  status_revisao: "pendente",
  transacao_id: null,
  created_at: "2025-03-15T10:00:00",
};

const baseTx: Transacao = {
  id: "t1",
  tipo: "Saída",
  descricao: "Material de construção",
  categoria: "Material",
  valor: 1500,
  data: "2025-03-15",
  forma_pagamento: "PIX",
  conta_id: "c1",
  observacoes: "",
  referencia: "",
  origem_tipo: null,
  origem_id: null,
  conciliado: false,
  conciliado_em: null,
};

describe("calcMatchScore", () => {
  it("score máximo para match perfeito (valor + data + tipo + descrição)", () => {
    const { score } = calcMatchScore(baseMov, baseTx);
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("valor diferente reduz score significativamente", () => {
    const tx = { ...baseTx, valor: 2000 };
    const { score } = calcMatchScore(baseMov, tx);
    expect(score).toBeLessThan(70);
  });

  it("data com 1 dia de diferença reduz um pouco (ainda aceitável)", () => {
    const tx = { ...baseTx, data: "2025-03-16" };
    const { score, motivos } = calcMatchScore(baseMov, tx);
    expect(motivos).toContain("Data próxima (±1 dia)");
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("tipo incompatível não recebe pontos de tipo", () => {
    const tx = { ...baseTx, tipo: "Entrada" };
    const { score, motivos } = calcMatchScore(baseMov, tx);
    expect(motivos).not.toContain("Tipo compatível");
  });

  it("retorna motivos não vazios para match acima de 50", () => {
    const { score, motivos } = calcMatchScore(baseMov, baseTx);
    expect(score).toBeGreaterThan(50);
    expect(motivos.length).toBeGreaterThan(0);
  });

  it("score zero para dados completamente diferentes", () => {
    const movDiferente: MovimentacaoExtraida = {
      ...baseMov,
      valor: 99999,
      data_movimentacao: "2020-01-01",
      descricao: "XYZXYZ",
      tipo_movimentacao: "entrada",
    };
    const { score } = calcMatchScore(movDiferente, baseTx);
    expect(score).toBeLessThan(20);
  });
});
