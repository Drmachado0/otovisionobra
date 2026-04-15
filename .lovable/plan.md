

## Plan: Dados da Obra nas Configurações (com Custo/m² em tempo real)

### Problema
A `obra_config` já tem os campos `nome_obra`, `endereco`, `responsavel`, `contato_responsavel`, `area_construida`, `orcamento_total`, `data_inicio`, `data_termino`, mas a página de Configurações não permite editá-los. O valor de `area_construida` (atualmente 658 m²) alimenta o KPI "Custo/m²" no Dashboard, mas não há interface para atualizá-lo.

### O que será feito

Adicionar uma seção "Dados da Obra" na `ConfiguracoesPage` com formulário editável para todos os campos de `obra_config`:

- **Nome da obra** (text)
- **Endereço** (text)
- **Responsável** + Contato (text)
- **Área construída (m²)** (number) -- atualiza o Custo/m² do dashboard em tempo real via realtime subscription já existente
- **Orçamento total** (number/currency)
- **Data início** / **Data término** (date)
- **Categorias** e **Formas de pagamento** (readonly ou editável)

O formulário faz `upsert` na tabela `obra_config` ao salvar. Como o Dashboard já tem `useRealtimeSubscription("obra_config", fetchData)`, qualquer alteração nos dados reflete automaticamente no KPI Custo/m².

### Arquivos

| Acao | Arquivo |
|------|---------|
| Editar | `src/pages/ConfiguracoesPage.tsx` -- adicionar seção "Dados da Obra" com fetch + form + save |

### Detalhes
- Fetch `obra_config` no `useEffect`, popular state do formulário
- Botão "Salvar" faz `upsert` com `onConflict: 'user_id'` ou `update` pelo `id`
- Seção posicionada logo após "Informações do Sistema"
- Sem migração necessária -- todos os campos já existem

