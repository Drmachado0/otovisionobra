/**
 * Tipos de domínio centralizados do OTOVISION Obra.
 *
 * Todos os componentes e hooks devem importar tipos deste arquivo,
 * e não do `integrations/supabase/types.ts` diretamente (que mistura
 * tabelas de outros sistemas).
 */

// ─── Origem de lançamentos ────────────────────────────────────────────────────

export type OrigemTipo =
  | "manual"
  | "ia"
  | "ia_pasta"
  | "conciliacao"
  | "sistema";

// ─── Transações / Fluxo de Caixa ─────────────────────────────────────────────

export interface Transacao {
  id: string;
  user_id: string;
  tipo: "Entrada" | "Saída";
  valor: number;
  data: string;
  categoria: string;
  descricao: string;
  forma_pagamento: string;
  observacoes: string;
  origem_tipo: OrigemTipo | null;
  origem_id: string | null;
  conciliado: boolean;
  conciliado_em: string | null;
  recorrencia: string;
  conta_id: string;
  referencia: string;
  etapa_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ─── Compras ──────────────────────────────────────────────────────────────────

export type StatusCompra = "Pendente" | "Entregue" | "Cancelada";

export interface Compra {
  id: string;
  user_id: string;
  fornecedor: string;
  categoria: string;
  valor: number;
  data: string;
  status: StatusCompra;
  descricao: string;
  origem_tipo: OrigemTipo | null;
  etapa_id: string | null;
  transacao_id: string | null;
  arquivo_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ─── Etapas / Cronograma ──────────────────────────────────────────────────────

export type StatusEtapa =
  | "Não iniciada"
  | "Em andamento"
  | "Concluída"
  | "Atrasada"
  | "Pausada";

export interface Etapa {
  id: string;
  user_id: string;
  nome: string;
  descricao: string;
  data_inicio: string;
  fim_previsto: string;
  fim_real: string | null;
  custo_previsto: number;
  custo_real: number;
  status: StatusEtapa;
  percentual_conclusao: number;
  ordem: number;
  cor: string;
  created_at: string;
}

// ─── Comissão ─────────────────────────────────────────────────────────────────

export interface ComissaoPagamento {
  id: string;
  user_id: string;
  mes: string;
  valor: number;
  pago: boolean;
  data_pagamento: string | null;
  observacoes: string;
  auto: boolean;
  categoria: string;
  fornecedor: string;
  forma_pagamento: string;
  transacao_id: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ─── Documentos Processados ───────────────────────────────────────────────────

export type StatusProcessamento =
  | "pendente"
  | "processando"
  | "processado"
  | "revisao"
  | "erro";

export type DuplicidadeStatus =
  | "unico"
  | "suspeita"
  | "duplicado_confirmado";

export interface DocumentoProcessado {
  id: string;
  user_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  origem_arquivo: string;
  caminho_origem: string;
  hash_arquivo: string;
  storage_path: string;
  status_processamento: StatusProcessamento;
  tipo_documento: string;
  confianca_extracao: number;
  payload_bruto: Record<string, unknown> | null;
  payload_normalizado: PayloadNormalizado | null;
  motivo_erro: string;
  motivo_revisao: string;
  duplicidade_status: DuplicidadeStatus;
  duplicidade_score: number;
  documento_relacionado_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Estrutura retornada pela Edge Function de processamento IA */
export interface PayloadNormalizado {
  tipo_documento: string;
  data_documento: string;
  valor_total: number;
  fornecedor_ou_origem: string;
  descricao: string;
  categoria_sugerida: string;
  tipo_movimentacao: "entrada" | "saida" | "outro";
  confianca_extracao: number;
  observacoes: string;
}

// ─── Movimentações Extraídas ──────────────────────────────────────────────────

export type StatusRevisao =
  | "pendente"
  | "aprovado"
  | "rejeitado"
  | "ignorado";

export interface MovimentacaoExtraida {
  id: string;
  user_id: string;
  documento_id: string;
  data_movimentacao: string;
  descricao: string;
  valor: number;
  tipo_movimentacao: string;
  saldo: number | null;
  categoria_sugerida: string;
  score_confianca: number;
  score_duplicidade: number;
  status_revisao: StatusRevisao;
  transacao_id: string | null;
  created_at: string;
}

// ─── Conciliação Bancária ─────────────────────────────────────────────────────

export type StatusConciliacao =
  | "conciliado_automaticamente"
  | "conciliado_manualmente"
  | "sugestao_disponivel"
  | "pendente"
  | "nao_analisado"
  | "divergente"
  | "duplicidade_suspeita"
  | "desfeita"
  | "ignorado_temporariamente";

export interface Conciliacao {
  id: string;
  movimentacao_extraida_id: string;
  transacao_id: string | null;
  status_conciliacao: StatusConciliacao;
  score_compatibilidade: number;
  tipo_conciliacao: string;
  motivo_matching: string;
  observacoes: string;
  conciliado_por: string | null;
  conciliado_em: string | null;
  desfeito_por: string | null;
  desfeito_em: string | null;
  motivo_desfazer: string;
  created_at: string;
  updated_at: string;
}

// ─── Auditoria ────────────────────────────────────────────────────────────────

export type AcaoAuditoria = "criação" | "edição" | "exclusão";

export interface AuditLog {
  id: string;
  user_email: string;
  user_id: string;
  acao: AcaoAuditoria;
  tabela: string;
  registro_id: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  created_at: string;
}

// ─── Config da Obra ───────────────────────────────────────────────────────────

export interface ObraConfig {
  id?: string;
  user_id?: string;
  nome_obra: string;
  endereco: string;
  responsavel: string;
  contato_responsavel: string;
  area_construida: number;
  orcamento_total: number;
  data_inicio: string;
  data_termino: string;
  categorias?: string[];
  formas_pagamento?: string[];
  percentual_comissao?: number;
}

// ─── Notificações ────────────────────────────────────────────────────────────

export type PrioridadeNotificacao = "baixa" | "media" | "alta" | "critica";
export type StatusNotificacao = "nao_lida" | "lida" | "arquivada";

export interface Notificacao {
  id: string;
  user_id: string;
  tipo: string;
  mensagem: string;
  status: StatusNotificacao;
  prioridade: PrioridadeNotificacao;
  link?: string;
  created_at: string;
}

// ─── Conta Financeira ─────────────────────────────────────────────────────────

export interface ContaFinanceira {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number;
  cor: string;
  observacoes: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}
