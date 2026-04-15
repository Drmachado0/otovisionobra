

## Plan: Unificar Categorias em Todo o Sistema

### Problema
As categorias estão hardcoded em 3 lugares diferentes com listas inconsistentes, e nenhuma usa as categorias reais configuradas em `obra_config.categorias`. O banco já tem transações com categorias como "Madeiras", "Estrutura", "Equipamentos Médicos" que nem aparecem nos filtros/formulários.

### Comparação atual

```text
obra_config (DB)          FluxoCaixa/Drawer       ComprasPage
─────────────────         ─────────────────       ─────────────
Elétrica                  Material                Material
Hidráulica                Mão de Obra             Mão de Obra
Acabamento                Equipamento             Equipamento
Estrutura                 Serviço                 Serviço
Mobiliário                Administrativo          Assinatura
Equipamentos Médicos      Transporte              Outro
TI                        Alimentação
Materiais de Construção   Aporte
Mão de Obra               Outro
Outros
Madeiras
Tijolos
```

### Solução
Criar uma lista unificada que combina `obra_config.categorias` + categorias específicas do fluxo (Aporte, Serviço, etc.) e usá-la em todos os módulos. Onde possível, buscar do `obra_config` em tempo real.

### Lista unificada proposta
Acabamento, Administrativo, Alimentação, Aporte, Elétrica, Equipamento, Equipamentos Médicos, Estrutura, Hidráulica, Madeiras, Mão de Obra, Materiais de Construção, Mobiliário, Serviço, TI, Tijolos, Transporte, Outro

### Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/formatters.ts` | Exportar `CATEGORIAS_PADRAO` como lista unificada |
| `src/pages/FluxoCaixaPage.tsx` | Importar e usar `CATEGORIAS_PADRAO` |
| `src/components/TransacaoDetailDrawer.tsx` | Importar e usar `CATEGORIAS_PADRAO` |
| `src/pages/ComprasPage.tsx` | Substituir options hardcoded por `CATEGORIAS_PADRAO` |
| `src/pages/NotasFiscaisPage.tsx` | Usar `CATEGORIAS_PADRAO` nos formulários |

### Detalhes técnicos
- Centralizar a constante em `formatters.ts` para importação única
- Manter "Aporte" apenas visível no Fluxo de Caixa (é tipo Entrada, não faz sentido em