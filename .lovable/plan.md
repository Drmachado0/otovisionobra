

## Plan: Botão de Pagamento com Anexo de Recibo + Página de Notas Fiscais

### Contexto
A tabela `obra_notas_fiscais` e a função `pagar_nf_atomica` já existem no banco. Faltam:
- Uma página dedicada de Notas Fiscais
- Um fluxo de pagamento com anexo de recibo (comprovante) que salva no storage e registra como documento processado na pasta sync

### O que será feito

#### 1. Criar página `NotasFiscaisPage.tsx`
- Listar NFs de `obra_notas_fiscais` com tabs Ativas/Arquivo
- Cards de resumo: Total NFs, Pagas, Pendentes, Vencidas
- Busca por número ou fornecedor
- Botão "+ Nova NF" para criar manualmente
- Ações por linha: Visualizar, Editar, Pagar, Excluir (soft delete)

#### 2. Criar componente `PagamentoDialog.tsx` (reutilizável)
- Dialog modal "Confirmar Pagamento" com:
  - Resumo: NF/Compra, Fornecedor, Valor, Comissão (8%)
  - Select de conta para débito (de `obra_contas_financeiras`)
  - Forma de pagamento: PIX / Cartão / Boleto
  - Input de anexo (recibo/comprovante) -- upload para storage
- Ao confirmar:
  - Chamar `pagar_nf_atomica` (para NFs) ou lógica similar para compras
  - Upload do recibo no storage em `{user_id}/recibos/{nf_id}/{filename}`
  - Criar registro em `obra_documentos_processados` com `tipo_documento: "recibo"` e `origem_arquivo: "pagamento"` para aparecer organizado na Pasta Sync

#### 3. Integrar PagamentoDialog nas Compras
- No `CompraDetailDrawer`, para compras "Única", adicionar botão "Registrar Pagamento" que abre o mesmo dialog
- Para parcelas, manter o fluxo atual mas adicionar opção de anexar recibo

#### 4. Rota e navegação
- Adicionar rota `/notas-fiscais` no `App.tsx`
- Adicionar item "Notas Fiscais" no menu lateral em `AppLayout.tsx` (na seção Financeiro, após Fluxo de Caixa)

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/NotasFiscaisPage.tsx` -- listagem completa de NFs |
| Criar | `src/components/PagamentoDialog.tsx` -- dialog reutilizável de pagamento com anexo |
| Editar | `src/App.tsx` -- adicionar rota `/notas-fiscais` |
| Editar | `src/components/AppLayout.tsx` -- adicionar nav item |
| Editar | `src/components/CompraDetailDrawer.tsx` -- integrar PagamentoDialog para compras únicas |

### Detalhes técnicos
- `PagamentoDialog` recebe props genéricas: `tipo` ("nf" | "compra"), `id`, `fornecedor`, `valor`, `categoria`, `onSuccess`
- Para NFs usa `pagar_nf_atomica` RPC que já existe e cria transação + comissão atomicamente
- Para compras, cria transação via `create_compra_atomica` ou insert direto
- Upload de recibo: `supabase.storage.from("documentos").upload(path, file)` + insert em `obra_documentos_processados` com hash, tipo "recibo", status "processado"
- Fetch de contas: `obra_contas_financeiras` para popular o select de conta

