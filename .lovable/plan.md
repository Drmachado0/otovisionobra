

## Plan: Organizar Pasta Sincronizada por Tipo e Data

### Problema atual
A página mostra todos os documentos em uma tabela plana, sem agrupamento por tipo (NF, recibo, etc.) nem descrição do conteúdo. O campo `payload_normalizado` já contém dados úteis como `tipo_documento`, `descricao`, `fornecedor_ou_origem`, `valor_total` e `data_documento` -- basta exibi-los.

### O que será feito

#### 1. Agrupamento visual por tipo de documento
- Agrupar documentos por `tipo_documento` (nota_fiscal, recibo, extrato, boleto, outro)
- Cada grupo terá um header colapsável com ícone, nome do tipo e contagem
- Dentro de cada grupo, ordenar por data (`payload_normalizado.data_documento` ou `created_at`)

#### 2. Adicionar colunas de identificação rápida
- **Fornecedor**: de `payload_normalizado.fornecedor_ou_origem`
- **Valor**: de `payload_normalizado.valor_total`
- **Descrição**: de `payload_normalizado.descricao` (truncada)
- **Data do doc**: de `payload_normalizado.data_documento` (data real do documento, não upload)

#### 3. Filtro por tipo de documento
- Adicionar filtro select com opções: Todos, Notas Fiscais, Recibos, Extratos, Boletos, Outros

#### 4. Layout melhorado
- Manter a tabela mas com as novas colunas informativas
- Cards colapsáveis por tipo quando agrupados
- Badge colorido por tipo (NF=blue, Recibo=green, Extrato=purple, Boleto=amber, Outro=gray)

### Arquivo

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/PastaMonitorPage.tsx` -- adicionar agrupamento, colunas descritivas, filtro por tipo |

### Detalhes técnicos
- Extrair dados de `doc.payload_normalizado` (já é um objeto JSON no estado)
- Agrupar com `reduce` por `tipo_documento`
- Usar `Collapsible` do shadcn ou simples toggle de estado
- Sem migração necessária -- todos os dados já existem no payload

