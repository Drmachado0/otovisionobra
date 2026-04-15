
## Diagnóstico

O problema está na própria tela `src/pages/LeitorIAPage.tsx`:

- O botão só fica realmente funcional quando existe texto no `textarea`:
  `disabled={loading || !texto.trim()}`
- Quando o usuário envia PDF/imagem, `handleFileUpload` apenas salva o arquivo em `file` e mostra um toast antigo; ele não preenche `texto` e não chama a IA.
- Nas evidências do preview, não houve requisição de rede para a function ao clicar, o que confirma que o fluxo atual nem chega a disparar processamento.
- Essa página ainda usa o fluxo antigo `processar-documento` (texto puro), enquanto o projeto já possui o fluxo novo `processar-documento-ia` + `useDocumentos`, com suporte a PDF/imagem/CSV, persistência e deduplicação.

## Plano de correção

### 1. Trocar o Leitor IA para o pipeline atual de documentos
Atualizar `LeitorIAPage.tsx` para usar o fluxo moderno já existente no projeto, em vez do handler legado baseado só em texto.

Implementação:
- Se houver arquivo selecionado, processar pelo fluxo de `processar-documento-ia`.
- Se houver apenas texto colado, reutilizar o mesmo pipeline criando um `.txt` temporário em memória ou chamando a mesma function com `texto`.
- Remover a dependência do `processar-documento` nessa tela para evitar dois comportamentos diferentes no produto.

### 2. Corrigir a lógica do botão
Ajustar a regra do CTA para refletir o uso real:

- Habilitar o botão quando existir **arquivo OU texto**
- Desabilitar apenas quando não houver nenhuma entrada
- Exibir loading real durante o envio
- Melhorar feedback visual do estado desabilitado para não parecer “clicável sem ação”

### 3. Atualizar o upload e a UX da tela
O upload atual está desatualizado para o escopo real do sistema.

Ajustes:
- Aceitar também `CSV` e `WEBP`, alinhando com o backend atual
- Remover o toast “cole o texto manualmente por enquanto” para PDF/imagem, porque isso contradiz a arquitetura já implementada
- Mostrar instrução clara: “Envie arquivo ou cole texto”
- Opcionalmente auto-preencher o texto apenas para `.txt/.csv`, mantendo arquivo binário no fluxo de IA

### 4. Mapear o retorno novo para a UI existente
A UI da direita hoje espera o formato antigo:
- `fornecedor`
- `valor`
- `data`
- `tipo`
- `descricao`
- `categoria`

Mas a Claude function retorna algo como:
- `fornecedor_ou_origem`
- `valor_total`
- `data_documento`
- `tipo_documento`
- `descricao`
- `categoria_sugerida`

Plano:
- Criar um mapeamento simples do payload novo para o estado `dados`
- Manter a experiência atual de edição/salvamento sem quebrar o formulário

Exemplo de normalização:
```ts
{
  fornecedor: ai.fornecedor_ou_origem ?? "",
  valor: ai.valor_total ?? 0,
  data: ai.data_documento ?? "",
  tipo: ai.tipo_documento ?? "Outro",
  descricao: ai.descricao ?? "",
  categoria: ai.categoria_sugerida ?? "Outro",
}
```

### 5. Reaproveitar persistência e deduplicação existentes
Para não duplicar regra de negócio no frontend:

- Reusar `useDocumentos.ts` sempre que possível
- Aproveitar:
  - hash do arquivo
  - registro em `obra_documentos_processados`
  - eventos em `obra_eventos_processamento`
  - persistência de `obra_movimentacoes_extraidas`
  - deduplicação já implementada na edge function

Se necessário, vou ajustar `useDocumentos` para retornar também o payload processado ou buscar o documento recém-processado por `docId`, permitindo que o `LeitorIAPage` continue exibindo os dados extraídos à direita.

## Arquivos a ajustar

- `src/pages/LeitorIAPage.tsx`
  - corrigir botão
  - trocar handler antigo
  - alinhar tipos aceitos
  - mapear retorno novo
- `src/hooks/useDocumentos.ts`
  - expor/reutilizar o processamento para o Leitor IA sem duplicação
- Sem mudança obrigatória na edge function, a princípio
  - o problema principal está no frontend e no uso do fluxo antigo

## QA planejado

Vou validar estes cenários após implementar:

1. JPG/PNG/PDF selecionado com textarea vazio:
   - botão habilita
   - loading aparece
   - requisição é enviada
   - dados extraídos aparecem

2. TXT/CSV:
   - processa normalmente

3. Texto colado sem arquivo:
   - processa normalmente

4. Arquivo duplicado:
   - erro claro de duplicidade

5. Erro da IA:
   - toast visível e estado volta ao normal

6. Salvamento após extração:
   - continua funcionando

7. Teste end-to-end no fluxo da tela `/leitor-ia`, inclusive em viewport menor
