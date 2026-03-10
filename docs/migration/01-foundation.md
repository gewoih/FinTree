# Block 1 — Foundation & Design System

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в `vue-app/` за референсом. Используй только информацию из этого документа. После выполнения всего, что написано здесь, переходи к `02-types-and-api.md`.

---

## Shared Context

- Репозиторий: monorepo. Создай `react-app/` в корне репозитория, рядом с уже существующей `vue-app/`
- Backend API base: `https://localhost:5001` — проксировать через Vite на `/api`
- Auth: cookie-based сессия (httpOnly, `withCredentials: true`). Bearer JWT не используется — куки проставляет сервер автоматически. Refresh-эндпоинт: `POST /auth/refresh`
- Locale: `ru-RU` — все UI тексты, форматирование чисел и дат на русском
- Theme: dark по умолчанию (`:root`), light через класс `.light-mode` на `<html>`. Значение сохранять в `localStorage` под ключом `ft-theme`
- Min touch target: 44px
- Breakpoints: mobile `< 640px`, tablet `< 768px`, desktop `≥ 1024px`
- Financial values: `font-variant-numeric: tabular-nums`, right-aligned в таблицах
- Каждый data-driven компонент реализует все 5 состояний: `idle → loading → error (с кнопкой retry) → empty → success`

---

## Tech Stack

| Инструмент | Версия |
|---|---|
| React | 19 |
| TypeScript | ~5.x |
| Vite | latest |
| shadcn/ui | latest (New York style) |
| Tailwind CSS | v4 |
| TanStack Router | latest (code-based routing) |
| TanStack Query | v5 |
| Zustand | v5 |
| Axios | latest |
| React Hook Form | latest |
| Zod | latest |
| Recharts | latest |

---

## Goal

После выполнения этого блока должно существовать `react-app/` с полностью настроенным:
- Vite + React 19 + TypeScript
- shadcn/ui (New York style) поверх Tailwind CSS v4
- Design system: все `--ft-*` CSS-переменные + маппинг на shadcn-переменные в `globals.css`
- TanStack Router (skeleton с одним маршрутом `/`)
- TanStack Query client (настроен, но без запросов)
- Zustand stores: `authStore`, `userStore`, `uiStore`
- Axios instance (`api/index.ts`) с interceptors
- Структура папок `react-app/src/` в полном составе (папки созданы, `index.ts` или `.gitkeep` в каждой)

---

## Specs

### 1. Инициализация проекта

```bash
# В корне репозитория (рядом с vue-app/)
npm create vite@latest react-app -- --template react-ts
cd react-app
npm install
```

После создания:
1. Удали дефолтные файлы: `src/App.css`, `src/assets/react.svg`, содержимое `src/App.tsx` и `src/main.tsx` (они будут переписаны)
2. Оставь `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

---

### 2. Установка зависимостей

```bash
# Core
npm install @tanstack/react-router @tanstack/react-query zustand axios

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# Charts
npm install recharts

# shadcn/ui + Tailwind v4
npm install tailwindcss @tailwindcss/vite
npm install class-variance-authority clsx tailwind-merge lucide-react

# shadcn/ui init (выбери: New York style, CSS variables: yes)
npx shadcn@latest init
# Затем добавь базовые компоненты:
npx shadcn@latest add button input label card dialog sheet select toast badge separator skeleton
```

---

## Tailwind CSS v4 — критические отличия от v3

В v4 нет `tailwind.config.js` — конфигурация через CSS.
В `globals.css` используй `@import "tailwindcss"` (не `@tailwind base/components/utilities`).
Кастомные токены определяются через `@theme` блок:

```css
@import "tailwindcss";

@theme {
  --color-primary: var(--ft-primary-400);
  --color-background: var(--ft-bg-base);
  --font-sans: "Inter", sans-serif;
  --radius-md: var(--ft-radius-md);
}

/* ft-* токены определяются после */
:root {
  --ft-primary-400: #D4DE95;
  /* ... остальные токены ... */
}
```

Запрещено в v4:
- `tailwind.config.js` / `tailwind.config.ts`
- `@tailwind base;` `@tailwind components;` `@tailwind utilities;`
- `@apply` в произвольных CSS файлах (только в `globals.css`)
- `theme()` CSS функция (заменена на CSS vars)

Разрешено:
- `@layer base {}` `@layer components {}` для кастомных базовых стилей
- CSS custom properties напрямую
- Tailwind utility классы (`bg-background`, `text-foreground`) через shadcn mapping

---

### 3. Структура `react-app/src/`

Создай следующую структуру. В пустых папках создай файл `.gitkeep` или пустой `index.ts`:

```
react-app/src/
├── api/
│   ├── index.ts          ← axios instance
│   ├── auth.ts
│   ├── accounts.ts
│   ├── transactions.ts
│   ├── categories.ts
│   ├── transfers.ts
│   ├── analytics.ts
│   ├── goals.ts
│   ├── freedom.ts
│   ├── investments.ts
│   ├── admin.ts
│   └── queryKeys.ts
├── components/
│   ├── ui/               ← shadcn-generated компоненты (не трогать вручную)
│   ├── common/           ← общие компоненты: ErrorBoundary, LoadingSpinner, EmptyState, PageWrapper
│   ├── layout/           ← AppShell, Sidebar, BottomTabBar, TopBar
│   ├── analytics/        ← компоненты для аналитики (charts и т.д.)
│   └── features/         ← доменные компоненты (AccountCard, TransactionRow и т.д.)
├── hooks/                ← кастомные хуки (useAuth, useTheme и т.д.)
├── pages/                ← 18 страниц (см. список ниже)
├── router/
│   ├── index.tsx         ← TanStack Router instance
│   └── paths.ts          ← все route paths как константы
├── stores/
│   ├── authStore.ts
│   ├── userStore.ts
│   └── uiStore.ts
├── types/
│   └── index.ts          ← все DTO (см. Block 2)
├── utils/
│   ├── format.ts         ← форматирование чисел, дат, валют
│   └── cn.ts             ← утилита clsx + twMerge
└── styles/
    └── globals.css       ← дизайн-токены + shadcn vars (см. раздел Design System)
```

**18 страниц** (создай пустые файлы-заглушки с `export default function XxxPage() { return null; }`):

```
pages/
├── LandingPage.tsx
├── LoginPage.tsx
├── RegisterPage.tsx
├── AccountsPage.tsx
├── ExpensesPage.tsx         ← транзакции/расходы
├── CategoriesPage.tsx
├── AnalyticsPage.tsx
├── GoalsPage.tsx
├── FreedomCalculatorPage.tsx
├── InvestmentsPage.tsx
├── ReflectionsPage.tsx      ← список ретроспектив
├── RetroDetailPage.tsx      ← детальная ретроспектива
├── ProfilePage.tsx
├── AdminPage.tsx
├── TermsPage.tsx
├── PrivacyPolicyPage.tsx
├── BlogPage.tsx
└── CareersPage.tsx
```

---

### 4. `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
```

---

### 5. `tsconfig.app.json` (добавь path alias)

В секцию `compilerOptions` добавь:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### 6. Design System — `src/styles/globals.css`

Это главный файл стилей. Он делает три вещи:
1. Объявляет все `--ft-*` design tokens
2. Маппит shadcn-переменные (`--background`, `--foreground`, etc.) на `--ft-*` токены
3. Определяет базовые стили

Конвертация hex → HSL для shadcn:
- `#0F1117` → `222 17% 8%`
- `#161B26` → `222 22% 12%`
- `#1C2334` → `222 25% 15%`
- `#222B3E` → `220 28% 19%`
- `#F0F2F5` → `216 20% 95%`
- `#A8ADB8` → `220 9% 69%`
- `#72778A` → `228 10% 49%`
- `#D4DE95` → `74 55% 85%`
- `#DCE59E` → `74 57% 88%` (--ft-primary-200, hover в dark)
- `#B9CB7C` → `82 42% 64%` (--ft-primary-500, active в dark)
- `#527232` → `97 38% 32%` (--ft-primary-700, light mode interactive)
- `#3C5525` → `97 38% 24%` (--ft-primary-800, light hover)
- `#293C1A` → `97 38% 17%` (--ft-primary-900, light active)
- `#E8564D` → `3 76% 61%` (danger)
- `#F2F4F8` → `220 22% 96%` (light bg base)
- `#FFFFFF` → `0 0% 100%` (light surface base)
- `#F4F6FC` → `224 50% 97%` (light surface raised)
- `#141720` → `228 22% 10%` (light text primary)
- `#4A5068` → `228 16% 36%` (light text secondary)
- `#C6CBD9` → `225 16% 82%` (light border default)
- `#DDE1EC` → `225 20% 90%` (light border subtle)

```css
/* ============================================================
   react-app/src/styles/globals.css
   FinTree Design System — Design Tokens + shadcn var mapping
   ============================================================ */

@import "tailwindcss";

@layer base {
  :root {
    /* ━━━ COLOR PALETTE ━━━ */

    /* Primary (Olive) */
    --ft-primary-50:  #F6F8E8;
    --ft-primary-100: #ECF1CE;
    --ft-primary-200: #DCE59E;
    --ft-primary-300: #CEDA7E;
    --ft-primary-400: #D4DE95;
    --ft-primary-500: #B9CB7C;
    --ft-primary-600: #8FAA58;
    --ft-primary-700: #527232;
    --ft-primary-800: #3C5525;
    --ft-primary-900: #293C1A;
    --ft-primary-950: #192510;

    /* Success */
    --ft-success-50:  #F1FDF5;
    --ft-success-100: #DDFBE8;
    --ft-success-200: #BBF5D0;
    --ft-success-300: #86EBAE;
    --ft-success-400: #52DC8D;
    --ft-success-500: #2FC470;
    --ft-success-600: #22A95F;
    --ft-success-700: #187644;
    --ft-success-800: #145E36;
    --ft-success-900: #114B2B;

    /* Warning */
    --ft-warning-50:  #FCF7EA;
    --ft-warning-100: #F2E7C7;
    --ft-warning-200: #E3D094;
    --ft-warning-300: #D2B866;
    --ft-warning-400: #C7A246;
    --ft-warning-500: #BC8F30;
    --ft-warning-600: #9D7527;
    --ft-warning-700: #7E5D1F;
    --ft-warning-800: #604618;
    --ft-warning-900: #483412;

    /* Danger */
    --ft-danger-50:  #FFF3F2;
    --ft-danger-100: #FFE0DE;
    --ft-danger-200: #FFC1BC;
    --ft-danger-300: #FF9B93;
    --ft-danger-400: #FF756C;
    --ft-danger-500: #E8564D;
    --ft-danger-600: #C94139;
    --ft-danger-700: #A1342F;
    --ft-danger-800: #7F2A26;
    --ft-danger-900: #64211E;

    /* Info */
    --ft-info-50:  #EEF6F9;
    --ft-info-100: #D8EAF0;
    --ft-info-200: #B5D6E1;
    --ft-info-300: #8EBECC;
    --ft-info-400: #68A6B9;
    --ft-info-500: #488FA7;
    --ft-info-600: #3A748A;
    --ft-info-700: #2E5C6E;
    --ft-info-800: #244754;
    --ft-info-900: #1B353F;

    /* Orange */
    --ft-orange-50:  #FBF3EC;
    --ft-orange-100: #F2E1CF;
    --ft-orange-200: #E2C3A0;
    --ft-orange-300: #D0A271;
    --ft-orange-400: #C58C55;
    --ft-orange-500: #B97A43;
    --ft-orange-600: #996338;
    --ft-orange-700: #7A4F2D;
    --ft-orange-800: #5D3C22;
    --ft-orange-900: #462D1A;

    /* Neutrals */
    --ft-gray-50:  #F4F5F7;
    --ft-gray-100: #E9EAEE;
    --ft-gray-200: #D3D6DE;
    --ft-gray-300: #B6BAC6;
    --ft-gray-400: #8E93A2;
    --ft-gray-500: #676B7A;
    --ft-gray-600: #4E5260;
    --ft-gray-700: #383B48;
    --ft-gray-800: #252830;
    --ft-gray-900: #171921;
    --ft-gray-950: #0F1117;

    /* ━━━ SEMANTIC TOKENS — DARK THEME (DEFAULT) ━━━ */

    /* Backgrounds */
    --ft-bg-base:     #0F1117;
    --ft-bg-subtle:   #141820;
    --ft-bg-muted:    #181D28;
    --ft-bg-elevated: #1C2233;
    --ft-bg-overlay:  rgb(8 10 16 / 80%);

    /* Surfaces */
    --ft-surface-base:    #161B26;
    --ft-surface-raised:  #1C2334;
    --ft-surface-overlay: #222B3E;
    --ft-surface-soft:    #121722;
    --ft-surface-muted:   var(--ft-surface-overlay);

    /* Text */
    --ft-text-primary:    #F0F2F5;
    --ft-text-secondary:  #A8ADB8;
    --ft-text-tertiary:   #72778A;
    --ft-text-disabled:   #4A505E;
    --ft-text-inverse:    #141720;
    --ft-text-link:       var(--ft-primary-400);
    --ft-text-link-hover: var(--ft-primary-200);

    /* Borders */
    --ft-border-subtle:  #1E2330;
    --ft-border-default: #2A3242;
    --ft-border-strong:  #3A4558;
    --ft-border-soft:    #181F2E;
    --ft-border-inverse: rgb(240 242 245 / 10%);

    /* Interactive */
    --ft-interactive-default:  var(--ft-primary-400);
    --ft-interactive-hover:    var(--ft-primary-200);
    --ft-interactive-active:   var(--ft-primary-500);
    --ft-interactive-disabled: #1E2330;

    /* Focus */
    --ft-focus-ring:        #D4DE95;
    --ft-focus-ring-offset: #0F1117;

    /* Shadows */
    --ft-shadow-xs:    0 1px 2px rgb(0 0 0 / 40%);
    --ft-shadow-sm:    0 2px 8px rgb(0 0 0 / 45%);
    --ft-shadow-md:    0 4px 16px rgb(0 0 0 / 50%);
    --ft-shadow-lg:    0 8px 28px rgb(0 0 0 / 55%);
    --ft-shadow-xl:    0 12px 40px rgb(0 0 0 / 60%);
    --ft-shadow-2xl:   0 20px 52px rgb(0 0 0 / 65%);
    --ft-shadow-inner: inset 0 1px 0 rgb(255 255 255 / 3%);
    --ft-shadow-cta:        0 8px 20px color-mix(in srgb, var(--ft-primary-400) 28%, transparent);
    --ft-shadow-cta-hover:  0 12px 28px color-mix(in srgb, var(--ft-primary-400) 38%, transparent);
    --ft-shadow-cta-active: 0 6px 16px color-mix(in srgb, var(--ft-primary-400) 28%, transparent);

    /* Transitions */
    --ft-transition-fast: 150ms cubic-bezier(0.22, 1, 0.36, 1);
    --ft-transition-base: 220ms cubic-bezier(0.22, 1, 0.36, 1);
    --ft-transition-slow: 350ms cubic-bezier(0.22, 1, 0.36, 1);
    --ft-ease-in-out: cubic-bezier(0.22, 1, 0.36, 1);

    /* Z-Index */
    --ft-z-base:     0;
    --ft-z-above:    1;
    --ft-z-raised:   2;
    --ft-z-dropdown: 1000;
    --ft-z-sticky:   1020;
    --ft-z-drawer:   1030;
    --ft-z-modal:    1040;
    --ft-z-popover:  1050;
    --ft-z-toast:    1060;
    --ft-z-tooltip:  1070;

    /* Spacing */
    --ft-space-0:  0;
    --ft-space-1:  0.25rem;
    --ft-space-2:  0.5rem;
    --ft-space-3:  0.75rem;
    --ft-space-4:  1rem;
    --ft-space-5:  1.25rem;
    --ft-space-6:  1.5rem;
    --ft-space-7:  1.75rem;
    --ft-space-8:  2rem;
    --ft-space-9:  2.25rem;
    --ft-space-10: 2.5rem;
    --ft-space-12: 3rem;
    --ft-space-16: 4rem;
    --ft-space-20: 5rem;
    --ft-space-24: 6rem;

    /* Border Radius */
    --ft-radius-none: 0;
    --ft-radius-sm:   0.125rem;
    --ft-radius-md:   0.25rem;
    --ft-radius-lg:   0.375rem;
    --ft-radius-xl:   0.5rem;
    --ft-radius-full: 9999px;

    /* Typography */
    --ft-font-base:    'Inter', sans-serif;
    --ft-font-display: 'Inter', sans-serif;
    --ft-font-mono:    'JetBrains Mono', 'Fira Code', monospace;

    --ft-letter-spacing-display: -0.02em;
    --ft-letter-spacing-tight:   -0.01em;
    --ft-letter-spacing-normal:   0em;
    --ft-letter-spacing-wide:     0.06em;
    --ft-letter-spacing-wider:    0.08em;

    --ft-text-xs:   0.75rem;
    --ft-text-sm:   0.875rem;
    --ft-text-base: 1rem;
    --ft-text-lg:   1.125rem;
    --ft-text-xl:   1.25rem;
    --ft-text-2xl:  1.5rem;
    --ft-text-3xl:  2rem;
    --ft-text-4xl:  2.5rem;

    --ft-font-normal:   400;
    --ft-font-medium:   500;
    --ft-font-semibold: 600;
    --ft-font-bold:     700;

    --ft-leading-tight:   1.25;
    --ft-leading-normal:  1.5;
    --ft-leading-relaxed: 1.75;

    /* Layout */
    --ft-container-xs:  480px;
    --ft-container-sm:  640px;
    --ft-container-md:  768px;
    --ft-container-lg:  1024px;
    --ft-container-xl:  1280px;
    --ft-container-2xl: 1536px;
    --ft-layout-max-width:    var(--ft-container-2xl);
    --ft-layout-gutter:       clamp(var(--ft-space-4), 3vw, var(--ft-space-8));
    --ft-layout-page-padding: clamp(var(--ft-space-6), 4vw, var(--ft-space-10));
    --ft-layout-section-gap:  clamp(var(--ft-space-6), 3vw, var(--ft-space-9));
    --ft-layout-card-gap:     clamp(var(--ft-space-4), 2vw, var(--ft-space-6));
    --ft-app-shell-nav-height: 72px;
    --ft-bottom-bar-height:    64px;

    /* Component Sizes */
    --ft-control-height:      2.75rem;
    --ft-input-height-sm:     2.25rem;
    --ft-input-height-md:     2.75rem;
    --ft-input-height-lg:     3rem;
    --ft-form-control-height: 3rem;
    --ft-button-height-sm:    2.75rem;
    --ft-button-height-md:    3rem;
    --ft-button-height-lg:    3.25rem;

    /* Chart Palette */
    --ft-chart-1:        #D4DE95;
    --ft-chart-2:        #66C2D9;
    --ft-chart-3:        #5BD490;
    --ft-chart-4:        #F2B766;
    --ft-chart-5:        #C1A3FF;
    --ft-chart-risk:     #FFB454;
    --ft-chart-expense:  #D4DE95;
    --ft-chart-forecast: #7DA6E8;
    --ft-chart-optimistic: #5BD490;
    --ft-chart-baseline: #90A5C2;

    /* Status Badges (dark) */
    --ft-status-badge-success-text:   var(--ft-success-400);
    --ft-status-badge-success-bg:     color-mix(in srgb, var(--ft-success-500) 15%, transparent);
    --ft-status-badge-success-border: color-mix(in srgb, var(--ft-success-500) 30%, transparent);
    --ft-status-badge-warning-text:   var(--ft-warning-400);
    --ft-status-badge-warning-bg:     color-mix(in srgb, var(--ft-warning-500) 15%, transparent);
    --ft-status-badge-warning-border: color-mix(in srgb, var(--ft-warning-500) 30%, transparent);
    --ft-status-badge-danger-text:    var(--ft-danger-400);
    --ft-status-badge-danger-bg:      color-mix(in srgb, var(--ft-danger-500) 15%, transparent);
    --ft-status-badge-danger-border:  color-mix(in srgb, var(--ft-danger-500) 30%, transparent);
    --ft-status-badge-info-text:      var(--ft-info-400);
    --ft-status-badge-info-bg:        color-mix(in srgb, var(--ft-info-500) 18%, transparent);
    --ft-status-badge-info-border:    color-mix(in srgb, var(--ft-info-500) 32%, transparent);
    --ft-status-badge-secondary-text:   var(--ft-gray-400);
    --ft-status-badge-secondary-bg:     color-mix(in srgb, var(--ft-gray-500) 15%, transparent);
    --ft-status-badge-secondary-border: color-mix(in srgb, var(--ft-gray-500) 30%, transparent);

    /* KPI trend */
    --ft-kpi-trend-up-bg:   color-mix(in srgb, var(--ft-success-500) 20%, transparent);
    --ft-kpi-trend-down-bg: color-mix(in srgb, var(--ft-danger-500) 20%, transparent);

    /* Table */
    --ft-table-row-alt-bg:   color-mix(in srgb, var(--ft-primary-400) 12%, transparent);
    --ft-table-row-hover-bg: color-mix(in srgb, var(--ft-primary-400) 18%, transparent);

    /* Scrollbars */
    --ft-scrollbar-size:         10px;
    --ft-scrollbar-track:        color-mix(in srgb, var(--ft-surface-base) 58%, var(--ft-bg-base));
    --ft-scrollbar-thumb:        color-mix(in srgb, var(--ft-primary-400) 30%, var(--ft-surface-overlay));
    --ft-scrollbar-thumb-hover:  color-mix(in srgb, var(--ft-primary-400) 44%, var(--ft-surface-overlay));
    --ft-scrollbar-thumb-active: color-mix(in srgb, var(--ft-primary-400) 58%, var(--ft-surface-overlay));

    /* Skeleton shimmer */
    --ft-skeleton-shimmer-start: color-mix(in srgb, var(--ft-text-secondary) 8%, transparent);
    --ft-skeleton-shimmer-mid:   color-mix(in srgb, var(--ft-text-secondary) 18%, transparent);
    --ft-skeleton-shimmer-end:   color-mix(in srgb, var(--ft-text-secondary) 8%, transparent);

    /* Form field states */
    --ft-form-field-error-text:        var(--ft-danger-400);
    --ft-form-field-error-bg:          color-mix(in srgb, var(--ft-danger-500) 15%, transparent);
    --ft-form-field-error-border:      color-mix(in srgb, var(--ft-danger-500) 30%, transparent);
    --ft-form-field-label-error-color: var(--ft-danger-400);

    /* ━━━ SHADCN VARIABLE MAPPING — DARK THEME (DEFAULT) ━━━
       shadcn vars accept HSL values without hsl() wrapper: "H S% L%"
    */

    --background:           222 17% 8%;       /* #0F1117 — ft-bg-base */
    --foreground:           216 20% 95%;      /* #F0F2F5 — ft-text-primary */

    --card:                 222 22% 12%;      /* #161B26 — ft-surface-base */
    --card-foreground:      216 20% 95%;      /* #F0F2F5 */

    --popover:              222 25% 15%;      /* #1C2334 — ft-surface-raised */
    --popover-foreground:   216 20% 95%;      /* #F0F2F5 */

    --primary:              74 55% 85%;       /* #D4DE95 — ft-primary-400, olive brand */
    --primary-foreground:   228 22% 10%;      /* #141720 — dark text on olive */

    --secondary:            220 28% 19%;      /* #222B3E — ft-surface-overlay */
    --secondary-foreground: 216 20% 95%;      /* #F0F2F5 */

    --muted:                222 22% 12%;      /* #161B26 */
    --muted-foreground:     220 9% 69%;       /* #A8ADB8 — ft-text-secondary */

    --accent:               222 25% 15%;      /* #1C2334 */
    --accent-foreground:    216 20% 95%;      /* #F0F2F5 */

    --destructive:          3 76% 61%;        /* #E8564D — ft-danger-500 */
    --destructive-foreground: 216 20% 95%;    /* #F0F2F5 */

    --border:               222 22% 16%;      /* #2A3242 — ft-border-default */
    --input:                222 22% 16%;      /* #2A3242 */
    --ring:                 74 55% 85%;       /* #D4DE95 — ft-focus-ring */

    --radius: 0.25rem;                        /* ft-radius-md = 4px */

    color-scheme: dark;
  }

  .light-mode {
    /* ━━━ SEMANTIC TOKENS — LIGHT THEME ━━━ */

    --ft-bg-base:     #F2F4F8;
    --ft-bg-subtle:   #E8ECF4;
    --ft-bg-muted:    #DDE2EE;
    --ft-bg-elevated: #F8FAFB;
    --ft-bg-overlay:  rgb(12 15 25 / 28%);

    --ft-surface-base:    #FFFFFF;
    --ft-surface-raised:  #F4F6FC;
    --ft-surface-overlay: #ECF0F9;
    --ft-surface-soft:    #F9FAFE;
    --ft-surface-muted:   var(--ft-surface-overlay);

    --ft-text-primary:    #141720;
    --ft-text-secondary:  #4A5068;
    --ft-text-tertiary:   #6B748C;
    --ft-text-disabled:   #9AA3B8;
    --ft-text-inverse:    #F0F2F5;
    --ft-text-link:       var(--ft-primary-700);
    --ft-text-link-hover: var(--ft-primary-800);

    --ft-border-subtle:  #DDE1EC;
    --ft-border-default: #C6CBD9;
    --ft-border-strong:  #A8ADBE;
    --ft-border-soft:    #EAEDF5;
    --ft-border-inverse: rgb(15 17 23 / 12%);

    --ft-interactive-default:  var(--ft-primary-700);
    --ft-interactive-hover:    var(--ft-primary-800);
    --ft-interactive-active:   var(--ft-primary-900);
    --ft-interactive-disabled: #E2E6F0;

    --ft-focus-ring:        var(--ft-primary-700);
    --ft-focus-ring-offset: #FFFFFF;

    --ft-shadow-xs:    0 1px 2px rgb(15 23 42 / 5%);
    --ft-shadow-sm:    0 1px 3px rgb(15 23 42 / 8%), 0 1px 2px rgb(15 23 42 / 6%);
    --ft-shadow-md:    0 4px 6px rgb(15 23 42 / 10%), 0 2px 4px rgb(15 23 42 / 7%);
    --ft-shadow-lg:    0 10px 15px rgb(15 23 42 / 10%), 0 4px 6px rgb(15 23 42 / 7%);
    --ft-shadow-xl:    0 20px 25px rgb(15 23 42 / 12%), 0 8px 10px rgb(15 23 42 / 8%);
    --ft-shadow-2xl:   0 25px 50px rgb(15 23 42 / 18%);
    --ft-shadow-inner: inset 0 2px 4px rgb(15 23 42 / 5%);
    --ft-shadow-cta:        0 8px 20px color-mix(in srgb, var(--ft-primary-600) 22%, transparent);
    --ft-shadow-cta-hover:  0 12px 28px color-mix(in srgb, var(--ft-primary-600) 32%, transparent);
    --ft-shadow-cta-active: 0 6px 16px color-mix(in srgb, var(--ft-primary-600) 22%, transparent);

    --ft-scrollbar-track:        #E5E8F0;
    --ft-scrollbar-thumb:        #9DA8BC;
    --ft-scrollbar-thumb-hover:  #8892A8;
    --ft-scrollbar-thumb-active: #747FA0;

    --ft-status-badge-success-text:   var(--ft-success-700);
    --ft-status-badge-success-bg:     color-mix(in srgb, var(--ft-success-500) 10%, transparent);
    --ft-status-badge-success-border: color-mix(in srgb, var(--ft-success-500) 20%, transparent);
    --ft-status-badge-warning-text:   var(--ft-warning-700);
    --ft-status-badge-warning-bg:     color-mix(in srgb, var(--ft-warning-500) 10%, transparent);
    --ft-status-badge-warning-border: color-mix(in srgb, var(--ft-warning-500) 20%, transparent);
    --ft-status-badge-danger-text:    var(--ft-danger-700);
    --ft-status-badge-danger-bg:      color-mix(in srgb, var(--ft-danger-500) 10%, transparent);
    --ft-status-badge-danger-border:  color-mix(in srgb, var(--ft-danger-500) 20%, transparent);
    --ft-status-badge-info-text:      var(--ft-info-700);
    --ft-status-badge-info-bg:        color-mix(in srgb, var(--ft-info-500) 12%, transparent);
    --ft-status-badge-info-border:    color-mix(in srgb, var(--ft-info-500) 22%, transparent);
    --ft-status-badge-secondary-text:   var(--ft-gray-700);
    --ft-status-badge-secondary-bg:     color-mix(in srgb, var(--ft-gray-500) 10%, transparent);
    --ft-status-badge-secondary-border: color-mix(in srgb, var(--ft-gray-500) 20%, transparent);

    --ft-kpi-trend-up-bg:   color-mix(in srgb, var(--ft-success-500) 14%, transparent);
    --ft-kpi-trend-down-bg: color-mix(in srgb, var(--ft-danger-500) 14%, transparent);

    --ft-table-row-alt-bg:   color-mix(in srgb, var(--ft-primary-400) 6%, transparent);
    --ft-table-row-hover-bg: color-mix(in srgb, var(--ft-primary-400) 10%, transparent);

    --ft-form-field-error-text:        var(--ft-danger-700);
    --ft-form-field-error-bg:          color-mix(in srgb, var(--ft-danger-500) 10%, transparent);
    --ft-form-field-error-border:      color-mix(in srgb, var(--ft-danger-500) 20%, transparent);
    --ft-form-field-label-error-color: var(--ft-danger-700);

    /* ━━━ SHADCN VARIABLE MAPPING — LIGHT THEME ━━━ */

    --background:           220 22% 96%;      /* #F2F4F8 — ft-bg-base light */
    --foreground:           228 22% 10%;      /* #141720 — ft-text-primary light */

    --card:                 0 0% 100%;        /* #FFFFFF — ft-surface-base light */
    --card-foreground:      228 22% 10%;      /* #141720 */

    --popover:              224 50% 97%;      /* #F4F6FC — ft-surface-raised light */
    --popover-foreground:   228 22% 10%;      /* #141720 */

    --primary:              97 38% 32%;       /* #527232 — ft-primary-700, AA on white */
    --primary-foreground:   0 0% 100%;        /* #FFFFFF */

    --secondary:            225 20% 90%;      /* #DDE1EC — ft-border-subtle light */
    --secondary-foreground: 228 22% 10%;      /* #141720 */

    --muted:                224 50% 97%;      /* #F4F6FC */
    --muted-foreground:     228 16% 36%;      /* #4A5068 — ft-text-secondary light */

    --accent:               224 50% 97%;      /* #F4F6FC */
    --accent-foreground:    228 22% 10%;      /* #141720 */

    --destructive:          3 76% 50%;        /* ft-danger-700 for AA on light */
    --destructive-foreground: 0 0% 100%;      /* #FFFFFF */

    --border:               225 16% 82%;      /* #C6CBD9 — ft-border-default light */
    --input:                225 16% 82%;      /* #C6CBD9 */
    --ring:                 97 38% 32%;       /* #527232 — ft-focus-ring light */

    color-scheme: light;
  }

  /* ━━━ BASE STYLES ━━━ */

  * {
    box-sizing: border-box;
    border-color: hsl(var(--border));
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    background-color: var(--ft-bg-base);
    color: var(--ft-text-primary);
    font-family: var(--ft-font-base);
    font-size: var(--ft-text-base);
    line-height: var(--ft-leading-normal);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Scrollbars */
  ::-webkit-scrollbar {
    width: var(--ft-scrollbar-size);
    height: var(--ft-scrollbar-size);
  }
  ::-webkit-scrollbar-track { background: var(--ft-scrollbar-track); }
  ::-webkit-scrollbar-thumb {
    background: var(--ft-scrollbar-thumb);
    border-radius: var(--ft-radius-full);
  }
  ::-webkit-scrollbar-thumb:hover  { background: var(--ft-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-thumb:active { background: var(--ft-scrollbar-thumb-active); }

  /* Focus ring */
  :focus-visible {
    outline: 2px solid var(--ft-focus-ring);
    outline-offset: 2px;
  }

  /* Financial values */
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  :root {
    --ft-border-default: var(--ft-gray-200);
    --ft-text-secondary: var(--ft-gray-100);
  }
  .light-mode {
    --ft-border-default: var(--ft-gray-600);
    --ft-text-secondary: var(--ft-gray-800);
  }
}
```

---

### 7. `src/utils/cn.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### 8. `src/utils/format.ts`

```typescript
/**
 * Утилиты форматирования для FinTree
 * Locale: ru-RU
 */

const RU_NUMBER = new Intl.NumberFormat('ru-RU');
const RU_CURRENCY_BASE = (currency: string) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/** Форматирует сумму с символом валюты. Пример: "1 234,56 ₽" */
export function formatCurrency(amount: number, currencyCode = 'RUB'): string {
  try {
    return RU_CURRENCY_BASE(currencyCode).format(amount);
  } catch {
    return `${RU_NUMBER.format(amount)} ${currencyCode}`;
  }
}

/** Форматирует число без валюты. Пример: "1 234,56" */
export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Форматирует процент. Пример: "12,5%" */
export function formatPercent(value: number, fractionDigits = 1): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

/** Форматирует ISO-дату в читаемый формат. Пример: "15 янв 2025" */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate));
}

/** Форматирует ISO-дату коротко. Пример: "15.01.2025" */
export function formatDateShort(isoDate: string): string {
  return new Intl.DateTimeFormat('ru-RU').format(new Date(isoDate));
}

/** Форматирует год и месяц. Пример: "Январь 2025" */
export function formatYearMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1));
}

/** Возвращает текущий год и месяц */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Форматирует количество месяцев в читаемый текст. Пример: "2 года 3 месяца" */
export function formatMonthsToYearsAndMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${pluralizeYears(years)}`);
  if (months > 0) parts.push(`${months} ${pluralizeMonths(months)}`);
  return parts.join(' ') || '0 месяцев';
}

function pluralizeYears(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'лет';
  if (n % 10 === 1) return 'год';
  if (n % 10 >= 2 && n % 10 <= 4) return 'года';
  return 'лет';
}

function pluralizeMonths(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 14) return 'месяцев';
  if (n % 10 === 1) return 'месяц';
  if (n % 10 >= 2 && n % 10 <= 4) return 'месяца';
  return 'месяцев';
}
```

---

### 9. `src/api/index.ts` — Axios instance

```typescript
import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export type AuthRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  skipAuthRedirect?: boolean;
  _retry?: boolean;
};

/** Enhanced error with user-friendly message */
export interface ApiError extends AxiosError {
  userMessage: string;
}

const apiClient = axios.create({
  baseURL: '/api',                   // proxied by Vite to https://localhost:5001
  withCredentials: true,             // httpOnly cookie session
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post('/auth/refresh', null, {
        skipAuthRefresh: true,
        skipAuthRedirect: true,
      } as AuthRequestConfig)
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }
  return refreshRequest;
}

function getUserFriendlyErrorMessage(error: AxiosError): string {
  if (!error.response) {
    return 'Не удалось подключиться к серверу. Проверьте интернет-соединение.';
  }
  const code = (error.response.data as { code?: string } | undefined)?.code;
  switch (error.response.status) {
    case 400: return 'Некорректные данные. Проверьте введённую информацию.';
    case 401: return 'Требуется авторизация.';
    case 403:
      if (code === 'subscription_required') {
        return 'Подписка неактивна. Для изменения данных нажмите «Оплатить».';
      }
      return 'Доступ запрещён.';
    case 404: return 'Ресурс не найден.';
    case 409: return 'Операция не может быть выполнена в текущем состоянии.';
    case 500: return 'Ошибка сервера. Попробуйте позже.';
    case 503: return 'Сервис временно недоступен.';
    default:  return 'Произошла ошибка при выполнении запроса.';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = (error.config ?? {}) as AuthRequestConfig;
    const url = typeof config.url === 'string' ? config.url : '';
    const isRefreshEndpoint = url.includes('/auth/refresh');

    if (error.response?.status === 401) {
      const shouldRefresh = !config.skipAuthRefresh && !config._retry && !isRefreshEndpoint;
      if (shouldRefresh) {
        config._retry = true;
        try {
          await refreshSession();
          return apiClient(config);
        } catch {
          // refresh failed — fall through to redirect
        }
      }
      if (!config.skipAuthRedirect && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    const enhanced: ApiError = Object.assign(error, {
      userMessage: getUserFriendlyErrorMessage(error),
    });
    return Promise.reject(enhanced);
  }
);

export { apiClient };
```

---

### 10. `src/router/paths.ts`

```typescript
export const PATHS = {
  HOME:        '/',
  LOGIN:       '/login',
  REGISTER:    '/register',

  ACCOUNTS:    '/accounts',
  EXPENSES:    '/expenses',
  CATEGORIES:  '/categories',

  ANALYTICS:   '/analytics',
  GOALS:       '/goals',
  FREEDOM:     '/freedom',
  INVESTMENTS: '/investments',
  REFLECTIONS: '/reflections',
  RETRO_DETAIL: '/reflections/:month',

  PROFILE:     '/profile',
  ADMIN:       '/admin',

  TERMS:       '/terms',
  PRIVACY:     '/privacy',
  BLOG:        '/blog',
  CAREERS:     '/careers',
} as const;

export type AppPath = typeof PATHS[keyof typeof PATHS];
```

---

### 11. `src/router/index.tsx`

```tsx
import React, { Suspense } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router';
import { PATHS } from './paths';

// Lazy-loaded pages
const LandingPage            = React.lazy(() => import('@/pages/LandingPage'));
const LoginPage              = React.lazy(() => import('@/pages/LoginPage'));
const RegisterPage           = React.lazy(() => import('@/pages/RegisterPage'));
const AccountsPage           = React.lazy(() => import('@/pages/AccountsPage'));
const ExpensesPage           = React.lazy(() => import('@/pages/ExpensesPage'));
const CategoriesPage         = React.lazy(() => import('@/pages/CategoriesPage'));
const AnalyticsPage          = React.lazy(() => import('@/pages/AnalyticsPage'));
const GoalsPage              = React.lazy(() => import('@/pages/GoalsPage'));
const FreedomCalculatorPage  = React.lazy(() => import('@/pages/FreedomCalculatorPage'));
const InvestmentsPage        = React.lazy(() => import('@/pages/InvestmentsPage'));
const ReflectionsPage        = React.lazy(() => import('@/pages/ReflectionsPage'));
const RetroDetailPage        = React.lazy(() => import('@/pages/RetroDetailPage'));
const ProfilePage            = React.lazy(() => import('@/pages/ProfilePage'));
const AdminPage              = React.lazy(() => import('@/pages/AdminPage'));
const TermsPage              = React.lazy(() => import('@/pages/TermsPage'));
const PrivacyPolicyPage      = React.lazy(() => import('@/pages/PrivacyPolicyPage'));
const BlogPage               = React.lazy(() => import('@/pages/BlogPage'));
const CareersPage            = React.lazy(() => import('@/pages/CareersPage'));

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Загрузка...</div>}>
      <Outlet />
    </Suspense>
  ),
});

const indexRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.HOME,        component: () => <LandingPage /> });
const loginRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.LOGIN,       component: () => <LoginPage /> });
const registerRoute   = createRoute({ getParentRoute: () => rootRoute, path: PATHS.REGISTER,    component: () => <RegisterPage /> });
const accountsRoute   = createRoute({ getParentRoute: () => rootRoute, path: PATHS.ACCOUNTS,    component: () => <AccountsPage /> });
const expensesRoute   = createRoute({ getParentRoute: () => rootRoute, path: PATHS.EXPENSES,    component: () => <ExpensesPage /> });
const categoriesRoute = createRoute({ getParentRoute: () => rootRoute, path: PATHS.CATEGORIES,  component: () => <CategoriesPage /> });
const analyticsRoute  = createRoute({ getParentRoute: () => rootRoute, path: PATHS.ANALYTICS,   component: () => <AnalyticsPage /> });
const goalsRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.GOALS,       component: () => <GoalsPage /> });
const freedomRoute    = createRoute({ getParentRoute: () => rootRoute, path: PATHS.FREEDOM,     component: () => <FreedomCalculatorPage /> });
const investRoute     = createRoute({ getParentRoute: () => rootRoute, path: PATHS.INVESTMENTS, component: () => <InvestmentsPage /> });
const reflectRoute    = createRoute({ getParentRoute: () => rootRoute, path: PATHS.REFLECTIONS, component: () => <ReflectionsPage /> });
const retroRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.RETRO_DETAIL, component: () => <RetroDetailPage /> });
const profileRoute    = createRoute({ getParentRoute: () => rootRoute, path: PATHS.PROFILE,     component: () => <ProfilePage /> });
const adminRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.ADMIN,       component: () => <AdminPage /> });
const termsRoute      = createRoute({ getParentRoute: () => rootRoute, path: PATHS.TERMS,       component: () => <TermsPage /> });
const privacyRoute    = createRoute({ getParentRoute: () => rootRoute, path: PATHS.PRIVACY,     component: () => <PrivacyPolicyPage /> });
const blogRoute       = createRoute({ getParentRoute: () => rootRoute, path: PATHS.BLOG,        component: () => <BlogPage /> });
const careersRoute    = createRoute({ getParentRoute: () => rootRoute, path: PATHS.CAREERS,     component: () => <CareersPage /> });

const routeTree = rootRoute.addChildren([
  indexRoute, loginRoute, registerRoute,
  accountsRoute, expensesRoute, categoriesRoute,
  analyticsRoute, goalsRoute, freedomRoute, investRoute,
  reflectRoute, retroRoute,
  profileRoute, adminRoute,
  termsRoute, privacyRoute, blogRoute, careersRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

---

### 12. `src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  setAuthenticated: (userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      email: null,
      setAuthenticated: (userId, email) =>
        set({ isAuthenticated: true, userId, email }),
      clearAuth: () =>
        set({ isAuthenticated: false, userId: null, email: null }),
    }),
    { name: 'ft-auth' }
  )
);
```

---

### 13. `src/stores/userStore.ts`

```typescript
import { create } from 'zustand';
import type { CurrentUserDto } from '@/types';

interface UserState {
  user: CurrentUserDto | null;
  setUser: (user: CurrentUserDto) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

---

### 14. `src/stores/uiStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface UiState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyTheme(next);
      },
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'ft-theme', partialize: (s) => ({ theme: s.theme }) }
  )
);

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light-mode');
  } else {
    html.classList.remove('light-mode');
  }
}

// Apply saved theme on module load
const savedTheme = (JSON.parse(localStorage.getItem('ft-theme') ?? '{}') as { state?: { theme?: Theme } }).state?.theme ?? 'dark';
applyTheme(savedTheme);
```

---

### 15. `src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/router';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // 5 minutes
      gcTime:    1000 * 60 * 10,      // 10 minutes
      retry: (failureCount, error) => {
        // Do not retry on 401/403/404
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

## Constraints & Best Practices

- Компоненты: функциональные, `≤ 200 строк` — иначе декомпозировать
- Нет `any` в TypeScript — используй `unknown` и type guards
- Нет `index` как `key` в динамических списках (используй `item.id`)
- Нет `useEffect` для fetch — только TanStack Query `useQuery` / `useMutation`
- Нет дублирования серверных данных в Zustand — Zustand хранит только: `authStore` (isAuthenticated, userId, email), `userStore` (CurrentUserDto), `uiStore` (theme, sidebar state)
- Нет хардкода цветов — только CSS vars (`var(--ft-*)`) или Tailwind utility классы, замапленные на эти vars
- Нет `style={{}}` inline кроме динамических значений (например, `style={{ width: `${percent}%` }}` для прогресс-бара, или цвета в Recharts)
- `React.memo`, `useMemo`, `useCallback` — только при реальной проблеме производительности, не превентивно
- Error boundaries на уровне каждой страницы
- Все страницы lazy-loaded через `React.lazy`
- Все route paths — в `router/paths.ts`
- Все query keys — в `api/queryKeys.ts`
- Формы: React Hook Form + Zod, предпочитай uncontrolled inputs
- Chart-контейнеры: `role="img"` + `aria-label` для accessibility

---

## Testing Setup

Установи в `react-app/`:
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

`src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

Правила тестирования:
- Unit: чистые функции в `utils/`, Zod-схемы, Zustand stores (через `create` + `act`)
- Integration: компоненты с `render()` + `userEvent`, моки через `msw` (Mock Service Worker)
- E2E: не в scope этой миграции (добавить Playwright позже)
- Не тестировать implementation details — тестировать поведение видимое пользователю
- Zustand store test: `const { result } = renderHook(() => useAuthStore())` + `act(() => result.current.login(...))`
- TanStack Query test: обернуть в `QueryClientProvider` с тестовым `queryClient`

---

## Environment Config

`.env.example` в корне `react-app/`:
```
VITE_API_BASE_URL=https://localhost:5001
VITE_TELEGRAM_BOT_NAME=YourBotName
```

`.env.local` (не коммитится):
```
VITE_API_BASE_URL=https://localhost:5001
VITE_TELEGRAM_BOT_NAME=actual_bot_name
```

В `vite.config.ts` proxy:
```typescript
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL || 'https://localhost:5001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      secure: false, // для localhost с self-signed cert
    },
  },
},
```

В коде: `import.meta.env.VITE_TELEGRAM_BOT_NAME`

---

## Done When

- [ ] `react-app/` существует в корне репозитория рядом с `vue-app/`
- [ ] `npm install` и `npm run dev` выполняются без ошибок
- [ ] Vite dev server запускается и проксирует `/api` на `https://localhost:5001`
- [ ] `globals.css` подключён в `main.tsx`, тема dark работает по умолчанию
- [ ] Переключение темы через `useUiStore().toggleTheme()` добавляет/убирает `.light-mode` на `<html>`
- [ ] TanStack Router: открытие `http://localhost:5173/` рендерит `LandingPage` (пусть даже пустую)
- [ ] TanStack Query client инициализирован в `main.tsx`
- [ ] Zustand stores: `useAuthStore`, `useUserStore`, `useUiStore` импортируются без ошибок
- [ ] `apiClient` из `api/index.ts` импортируется без ошибок, базовый URL `/api`
- [ ] Все 18 файлов страниц существуют (пусть заглушки)
- [ ] TypeScript: `npm run tsc --noEmit` без ошибок
- [ ] shadcn компоненты (`Button`, `Input`, `Card` и др.) импортируются из `@/components/ui/`
