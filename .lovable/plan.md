

## Plan: Módulo de Contas Bancárias

### Contexto
A tabela `obra_contas_financeiras` já existe com 3 registros (Caixa Geral, Banco Principal, Cartão Corporativo), campos: `id, user_id, nome, tipo, saldo_inicial, cor, ativa, observacoes`. O campo `conta_id` existe em `obra_transacoes_fluxo` e `obra_compras` mas está vazio em todos os registros. Falta uma UI para gerenciar essas contas e vincular transações.

### Mudanças

#### 1. Nova página `ContasBancariasPage.tsx` (`/contas`)
- **KPIs**: Saldo total (saldo_inicial + entradas - saídas por conta), contas ativas, contas inativas
- **Lista de contas**: Card por conta com nome, tipo, cor, saldo calculado, badge ativa/inativa
- **Saldo por conta**: Calculado somando transações vinculadas via `conta_id`
- **Formulário Nova Conta**: nome, tipo (Caixa/Banco/Cartão de Crédito/Investimento/Poupança), saldo inicial, cor (color picker), observações
- **Editar/Desativar conta**: inline ou drawer
- **Ao clicar**: drawer com extrato filtrado (transações daquela conta)

#### 2. Integração com Fluxo de Caixa e Compras
- No formulário de nova transação (FluxoCaixaPage), adicionar select de conta (fetch de `obra_contas_financeiras` ativas)
- No formulário de nova compra (ComprasPage), adicionar select de conta
- Salvar `conta_id` ao criar transação/compra

#### 3. AppLayout -- Nav
- Adicionar item "Contas" com ícone `Wallet` entre "Fluxo de Caixa" e "Compras", roles: admin, financeiro

#### 4. App.tsx -- Rota
- Adicionar lazy import e rota `/contas`

### Arquivos
| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/ContasBancariasPage.tsx` |
| Editar | `src/components/AppLayout.tsx` -- add nav item |
| Editar | `src/App.tsx` -- add route |
| Editar | `src/pages/FluxoCaixaPage.tsx` -- add conta select no form |
| Editar | `src/pages/ComprasPage.tsx` -- add conta select no form |

### Sem migração necessária
A tabela `obra_contas_financeiras` já existe com RLS configurado. O campo `conta_id` já existe nas tabelas de transações e compras.

