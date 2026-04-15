

## Plan: Botões de Editar e Excluir na Comissão

### O que será feito

Adicionar ações de **editar** e **excluir** nos lançamentos de comissão, tanto na lista quanto no drawer de detalhes.

### Alterações

#### 1. `src/components/ComissaoDetailDrawer.tsx`
- Adicionar botões "Editar" e "Excluir" no rodapé do drawer
- **Editar**: abre um modo inline com campos editáveis (valor, mês, status pago/pendente, observações, fornecedor, categoria, forma de pagamento)
- **Excluir**: soft delete (`deleted_at = now()`) com confirmação via `ConfirmDialog` (já existe no projeto)
- Callback `onUpdate` para notificar o pai que houve mudança

#### 2. `src/pages/ComissaoPage.tsx`
- Passar callback `onUpdate={fetchData}` para o drawer para recarregar após edição/exclusão
- Adicionar botão de swipe/ícone de exclusão rápida na lista (ícone Trash ao lado direito de cada item)

### Detalhes técnicos
- Exclusão: `supabase.from("obra_comissao_pagamentos").update({ deleted_at: new Date().toISOString() }).eq("id", id)`
- Edição: `supabase.from("obra_comissao_pagamentos").update({...campos}).eq("id", id)`
- Usar `ConfirmDialog` existente para confirmar exclusão
- Toast de sucesso/erro após cada ação

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/ComissaoDetailDrawer.tsx` — adicionar edição inline + exclusão com confirmação |
| Editar | `src/pages/ComissaoPage.tsx` — passar `onUpdate` callback, adicionar ícone de delete rápido na lista |

