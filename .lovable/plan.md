

## Plan: Design System Overhaul + Transaction Detail Enhancement

This is a comprehensive improvement covering two areas: (1) upgrading the visual design system across all pages and (2) adding detailed transaction views with more information.

### Current Issues Identified

- **Transactions show minimal info**: only type, date, description, category, value. Missing: forma_pagamento, observacoes, origem_tipo, conciliado status, conta_id, recorrencia
- **No transaction detail view**: clicking a row does nothing -- no drawer/modal with full info
- **No edit/delete on transactions**: users can only add, not modify
- **Inconsistent component usage**: some pages use raw HTML inputs/selects, others use shadcn components (Input, Select, Dialog)
- **No micro-interactions or hover states** on cards
- **Tables lack row click actions** across all modules
- **No pagination** on any list
- **Header is underutilized**: no breadcrumb, no page context

### Changes

#### 1. Enhanced Design System (CSS + Tailwind)
**File: `src/index.css`**
- Add subtle gradient backgrounds on page headers
- Add `@keyframes fade-in-up` for staggered card animations
- Add `.glass-card-interactive` variant with scale transform on hover
- Improve stat-card styles with subtle inner glow
- Add `.badge-*` utility classes for consistent status badges
- Add `.table-row-interactive` for hover/click feedback on table rows

**File: `tailwind.config.ts`**
- Add `fade-in-up` animation with staggered delays
- Add `scale-in` keyframe for modals/dialogs

#### 2. Transaction Detail Drawer
**New file: `src/components/TransacaoDetailDrawer.tsx`**
- Full-width Sheet (drawer) showing all transaction fields
- Fields displayed: tipo, valor, data, categoria, descricao, forma_pagamento, observacoes, origem_tipo, conciliado status, recorrencia, conta, created_at
- Origin badge (manual, IA, compra, conciliacao)
- Conciliation status indicator
- Edit button that toggles inline editing
- Soft-delete button with ConfirmDialog

#### 3. FluxoCaixaPage Improvements
**File: `src/pages/FluxoCaixaPage.tsx`**
- Fetch ALL fields from `obra_transacoes_fluxo` (forma_pagamento, observacoes, origem_tipo, conciliado, recorrencia, conta_id, created_at)
- Add `forma_pagamento` column to table
- Add `origem` badge column (Manual, IA, Compra, Conciliacao)
- Clickable rows open TransacaoDetailDrawer
- Add date range filter (inicio/fim)
- Add category filter dropdown
- Add pagination (50 per page)
- Use shadcn Dialog instead of raw modal for new transaction form
- Add edit capability via the drawer

#### 4. ComprasPage Improvements
**File: `src/pages/ComprasPage.tsx`**
- Clickable rows open detail view showing: fornecedor, itens, parcelas, NF vinculada, observacoes, data_entrega_prevista/real
- Add `forma_pagamento` column
- Use shadcn components consistently (Dialog, Select, Input)

#### 5. DashboardPage Polish
**File: `src/pages/DashboardPage.tsx`**
- Add staggered animation on KPI cards (delay per card)
- Recent transactions show forma_pagamento and origem badge
- Clickable recent transactions open detail drawer
- Add "Ver todos" link to fluxo page

#### 6. Consistent Shadcn Usage Across All Pages
- Replace raw `<select>`, `<input>`, `<button>` in FluxoCaixaPage, ComprasPage, LeitorIAPage, LoginPage with shadcn `Select`, `Input`, `Button`
- Use `Sheet` for detail views, `Dialog` for creation forms
- Use `Badge` for status indicators everywhere

#### 7. AppLayout Polish
**File: `src/components/AppLayout.tsx`**
- Add breadcrumb showing current page name in header
- Add subtle border-bottom glow on active nav item
- Smoother mobile menu animation (slide-in from left)

### Technical Details

- Transaction detail drawer receives a transaction ID, fetches full row including observacoes/origem_tipo
- Edit uses `supabase.from("obra_transacoes_fluxo").update(...)` 
- Soft-delete sets `deleted_at = now()`
- No database migration needed -- all fields already exist in the schema
- Pagination uses `.range(from, to)` on Supabase queries
- All pages get consistent input styling via shared CSS utility classes

### Files to Create
- `src/components/TransacaoDetailDrawer.tsx`

### Files to Edit
- `src/index.css` -- design system utilities
- `tailwind.config.ts` -- new animations
- `src/pages/FluxoCaixaPage.tsx` -- full rewrite with details, filters, pagination
- `src/pages/ComprasPage.tsx` -- shadcn components, detail view
- `src/pages/DashboardPage.tsx` -- animations, clickable transactions
- `src/components/AppLayout.tsx` -- breadcrumb, nav polish
- `src/pages/LoginPage.tsx` -- shadcn inputs
- `src/pages/ComissaoPage.tsx` -- consistent components
- `src/pages/LeitorIAPage.tsx` -- consistent components

