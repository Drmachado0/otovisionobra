# OTOVISION — Sistema de Gestão Inteligente de Obra

Sistema completo para controle financeiro, compras, cronograma e processamento de documentos via IA para gestão da obra da Clínica Otovision.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Roteamento | React Router v6 |
| Backend/DB | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (bucket `documentos`) |
| Auth | Supabase Auth |
| IA | Claude API via Supabase Edge Function |
| Testes | Vitest + Testing Library |

---

## Configuração Local

```bash
cp .env.example .env   # preencher com credenciais do Supabase
npm install
npm run dev
```

> **Nunca commite `.env`** — está no `.gitignore`. Se já foi commitado, rotacione a chave.

---

## Edge Function (IA)

```bash
# Configurar secret no Supabase → Settings → Edge Functions → Secrets:
# ANTHROPIC_API_KEY=sk-ant-...

# Deploy:
supabase functions deploy processar-documento-ia --no-verify-jwt
```

---

## Migrations

```bash
supabase db push
# Ou executar manualmente no SQL Editor:
# supabase/migrations/20250415_add_percentual_comissao.sql
# supabase/migrations/20250415_rls_obra_tables.sql
```

---

## Arquitetura

```
src/
├── types/obra.ts          ← tipos de domínio (importar daqui, não do supabase/types)
├── services/              ← queries Supabase tipadas com error handling
│   ├── transacoes.ts
│   ├── compras.ts
│   ├── obraConfig.ts
│   └── auditoria.ts
├── hooks/                 ← fetch + realtime + operações
│   ├── useObraConfig.ts   ← config com cache de 30s
│   ├── useCompras.ts
│   ├── useTransacoes.ts
│   ├── useDocumentos.ts
│   ├── useConciliacao.ts
│   ├── useNotifications.ts
│   ├── useRealtimeSubscription.ts  ← useRef para evitar loop
│   └── useUserRole.ts
├── components/
│   ├── ErrorBoundary.tsx
│   └── ...
└── pages/
```

**Princípios:**
- Soft delete obrigatório — nunca `DELETE`, sempre `deleted_at`
- Tipos de domínio em `src/types/obra.ts`
- Queries em `src/services/` — nunca inline em componentes
- Realtime via `useRealtimeSubscription` com `useRef` estável

---

## Roles

| Role | Acesso |
|---|---|
| `admin` | Total |
| `financeiro` | Financeiro, compras, IA, conciliação, relatórios |
| `construtor` | Cronograma + comissão (leitura) |
| `visualizador` | Dashboard + cronograma (leitura) |

> Usuários sem registro recebem `visualizador` (mínimo privilégio).

---

## Testes

```bash
npm test
```

| Suite | Casos |
|---|---|
| `formatters.test.ts` | 13 — inclui fix do bug de timezone |
| `conciliacao.test.ts` | 6 — motor Levenshtein de matching |

---

## Changelog — 2025-04-15

**Segurança**
- `.env` no `.gitignore` (estava sendo versionado com credenciais)
- `useUserRole` default: `"admin"` → `"visualizador"` (least privilege)

**Bugs corrigidos**
- `formatDate`: timezone UTC — datas ISO não avançam mais um dia
- `useRealtimeSubscription`: loop eliminado via `useRef`
- `checkContentDuplicates`: código morto ativado (deduplicação por conteúdo)
- `LeitorIAPage`: `tipo_movimentacao` da IA usado (antes hardcoded "Saída")
- `ComissaoPage`: percentual lido do banco (antes hardcoded `8`)
- `CronogramaPage`, `FluxoCaixaPage`: error handling adicionado ao fetchData

**Arquitetura**
- `src/types/obra.ts`: tipos centralizados
- `src/services/`: camada de serviços completa
- `QueryClient` com retry inteligente (sem retry em 4xx)
- `PageErrorBoundary` em todas as rotas
- `formatRelativeDate` centralizado (removia duplicata em `NotificationBell`)
- `ConfiguracoesPage` usa `useObraConfig` (removeu 60 linhas de estado manual)

**Infraestrutura**
- `supabase/functions/processar-documento-ia/index.ts` criada
- Migrations: `percentual_comissao` + RLS
- `.env.example` documentado

