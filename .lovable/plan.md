
## Plan: Correções do Relatório de Testes — Fluxo de Caixa

### Problemas identificados

1. **BUG-001**: Painel de detalhes mostra dados antigos após edição. Causa: `selectedTransacao` em `FluxoCaixaPage` não é atualizado quando `fetchData` retorna novos dados.
2. **MEL-001/002**: Sem feedback visual ao submeter valor zero ou negativo. O `toast.error` já existe no código (linha 88), mas não dispara porque o `<Input type="number">` com valor vazio retorna `""` que falha no `Number()` silenciosamente.
3. **MEL-004**: Categoria "Material" aparece em dados antigos mas não existe na lista unificada — já corrigido na última iteração com `CATEGORIAS_PADRAO`.

### Alterações

#### 1. `src/pages/FluxoCaixaPage.tsx`
- Após `fetchData`, atualizar `selectedTransacao` com os dados frescos do array (match por ID)
- Adicionar estado de erro no formulário para destacar campo valor em vermelho quando inválido

#### 2. `src/components/TransacaoDetailDrawer.tsx`
- Após `handleSave` com sucesso, atualizar a prop `transacao` via callback que passa os dados editados de volta ao pai
- Alternativa mais simples: no `FluxoCaixaPage`, usar `useEffect` para sincronizar `selectedTransacao` com `transacoes`

### Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/FluxoCaixaPage.tsx` | Sync selectedTransacao com transacoes; adicionar validação visual no form |
| `src/components/TransacaoDetailDrawer.tsx` | Nenhuma mudança necessária |

### Detalhes técnicos
- Adicionar `useEffect` que, quando `transacoes` muda e `selectedTransacao` existe, atualiza `selectedTransacao` com `transacoes.find(t => t.id === selectedTransacao.id)`
- No formulário, mostrar borda vermelha e mensagem abaixo do campo valor quando inválido
