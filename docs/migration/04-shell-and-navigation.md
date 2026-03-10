# Block 04 — App Shell & Common Components

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в vue-app/ за референсом. Используй только информацию из этого документа.

## Shared Context

- Репозиторий: monorepo, `react-app/` рядом с `vue-app/`
- Backend API base: `https://localhost:5001` (проксировать через Vite на `/api`)
- Auth: Bearer JWT в `Authorization` header, cookie-based сессия
- Locale: ru-RU (все UI тексты, числа, даты на русском)
- Theme: dark по умолчанию (`:root`), light через `.light-mode` на `<html>`, сохранять в localStorage
- Min touch target: 44px (`min-height: 44px; min-width: 44px`)
- Breakpoints: mobile <640px, tablet <768px, desktop ≥1024px
- Financial values: `font-variant-numeric: tabular-nums`, right-aligned в таблицах
- Каждый data-driven компонент реализует все 5 состояний: idle → loading → error (с кнопкой retry) → empty → success

## Tech Stack

- React 19, TypeScript ~5.x
- shadcn/ui (latest), Tailwind CSS v4
- TanStack Router (`useNavigate`, `Link`, `useRouterState`)
- TanStack Query v5
- Zustand v5
- Lucide React (иконки)
- Vite

## Depends On

- Block 01 — Foundation (Tailwind, shadcn, CSS vars, global styles)
- Block 02 — Types & API layer (`CurrentUserDto`)
- Block 03 — Auth & Routing (`useAuthStore`, `useUserStore`, `useUiStore`, `PATHS`, `router`)

## Goal

После этого блока:
- Все authenticated страницы рендерятся внутри `AppShell` с корректной навигацией
- На десктопе (≥1024px) — sidebar, на мобильном (<1024px) — bottom tab bar
- Публичные страницы обёрнуты в `PublicPageLayout`
- Набор переиспользуемых common-компонентов готов к использованию на feature-страницах
- Хук `useViewport` доступен для любого компонента

---

## Specs

### 1. Хук `useViewport`

**Файл:** `react-app/src/hooks/useViewport.ts`

```typescript
import { useState, useEffect } from 'react'

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const

interface ViewportState {
  isMobile: boolean    // width < 640px
  isTablet: boolean    // width < 768px (включает mobile)
  isDesktop: boolean   // width >= 1024px
  width: number
}

function getViewportState(width: number): ViewportState {
  return {
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.desktop,
    width,
  }
}

export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() =>
    getViewportState(typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.desktop)
  )

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth
      setState(getViewportState(width))
    })
    observer.observe(document.documentElement)

    // Первоначальная синхронизация
    setState(getViewportState(window.innerWidth))

    return () => observer.disconnect()
  }, [])

  return state
}
```

**Использование:**
```typescript
const { isDesktop, isMobile } = useViewport()
```

---

### 2. Layout Components

#### `react-app/src/components/layout/AppShell.tsx`

**Назначение:** корневой layout для всех protected routes. Выбирает между Sidebar (desktop) и BottomTabBar (mobile). Рендерит `<Outlet />` для дочерних маршрутов.

**Структура:**

```
AppShell
├── <a> skip-link "Перейти к основному содержимому" (screen readers)
├── <header> top nav
│   ├── hamburger (только desktop — toggle sidebar collapse)
│   ├── Logo → /analytics
│   └── ThemeToggle
├── [ReadOnlyBanner] — если subscription.isReadOnlyMode === true
├── Sidebar (только при isDesktop)
├── <main id="main-content"> <Outlet /> </main>
└── BottomTabBar (только при !isDesktop)
```

**Полный код:**

```typescript
import { Outlet } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useViewport } from '../../hooks/useViewport'
import { useUserStore } from '../../stores/userStore'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'
import ThemeToggle from '../common/ThemeToggle'
import { PATHS } from '../../router/paths'
import { Button } from '../ui/button'

const SIDEBAR_COLLAPSED_KEY = 'ft-sidebar-collapsed'

function ReadOnlyBanner({ onPayClick }: { onPayClick: () => void }) {
  const subscription = useUserStore(s => s.currentUser?.subscription)
  const expiresLabel = subscription?.expiresAtUtc
    ? new Date(subscription.expiresAtUtc).toLocaleDateString('ru-RU')
    : null

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30 text-sm"
    >
      <span className="text-warning-foreground">
        Режим просмотра: подписка неактивна
        {expiresLabel ? ` (истекла ${expiresLabel})` : ''}.
      </span>
      <Button size="sm" variant="outline" onClick={onPayClick}>
        Оплатить
      </Button>
    </div>
  )
}

export default function AppShell() {
  const { isDesktop } = useViewport()
  const isReadOnlyMode = useUserStore(s => s.currentUser?.subscription?.isReadOnlyMode ?? false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch { /* ignore */ }
      return next
    })
  }

  const handlePayClick = () => {
    // навигация к /profile#subscription
    window.location.hash = 'subscription'
    // или использовать navigate из TanStack Router если хэш-навигация поддерживается
  }

  return (
    <div
      className="app-shell"
      data-collapsed={!isDesktop && sidebarCollapsed ? 'true' : undefined}
    >
      {/* Skip link для accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:rounded"
      >
        Перейти к основному содержимому
      </a>

      {/* Top navigation */}
      <header className="app-shell__topnav flex items-center justify-between h-14 px-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {isDesktop && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarCollapsed ? 'Показать боковое меню' : 'Скрыть боковое меню'}
              aria-expanded={!sidebarCollapsed}
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to={PATHS.ANALYTICS} className="flex items-center gap-2 font-semibold text-primary">
            <span className="text-lg">FinTree</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Read-only banner */}
      {isReadOnlyMode && <ReadOnlyBanner onPayClick={handlePayClick} />}

      {/* Layout body */}
      <div className="app-shell__body flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {isDesktop && <Sidebar collapsed={sidebarCollapsed} />}

        {/* Main content */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
          style={{ paddingBottom: isDesktop ? 0 : 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      {!isDesktop && <BottomTabBar />}
    </div>
  )
}
```

---

#### `react-app/src/components/layout/Sidebar.tsx`

**Назначение:** десктопный sidebar с навигацией, пользователем, кнопкой logout.

**Навигация — primary items** (в указанном порядке):

| Label | Icon (Lucide) | Path |
|---|---|---|
| Главная | `BarChart2` | `/analytics` |
| Счета | `Wallet` | `/accounts` |
| Транзакции | `List` | `/transactions` |
| Инвестиции | `Briefcase` | `/investments` |
| Цели | `Target` | `/goals` |
| Свобода | `Sun` | `/freedom` |
| Рефлексии | `BookOpen` | `/reflections` |

**Secondary items:**

| Label | Icon | Path |
|---|---|---|
| Категории | `Tags` | `/categories` |
| Настройки | `Settings` | `/profile` |

**Admin item** (показывается только если `currentUser.isOwner === true`):

| Label | Icon | Path |
|---|---|---|
| Админ | `Shield` | `/admin` |

**Нижняя часть sidebar:**
- Аватар (заглушка — инициалы из email или имени)
- Email / имя пользователя
- Статус подписки: зелёная точка "Подписка активна" или серая "Режим просмотра"
- Кнопка logout

**UX-детали:**
- Активный пункт: `aria-current="page"`, подсвечен (фон `bg-primary/10`, текст `text-primary`, иконка `text-primary`)
- Inactive пункт: `text-muted-foreground`, hover → `bg-accent text-accent-foreground`
- В collapsed-режиме: показываются только иконки (без текста), tooltip при hover = label
- Transition коллапса: `transition-all duration-200`
- Sidebar width: expanded = `240px`, collapsed = `56px`
- `aria-label="Основная навигация"` на `<nav>`

**Полный код:**

```typescript
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart2, Wallet, List, Briefcase, Target, Sun, BookOpen,
  Tags, Settings, Shield, LogOut, User,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useUserStore } from '../../stores/userStore'
import { PATHS } from '../../router/paths'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../ui/button'

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
}

const primaryNavItems: NavItem[] = [
  { label: 'Главная',       icon: BarChart2,  to: PATHS.ANALYTICS },
  { label: 'Счета',         icon: Wallet,     to: PATHS.ACCOUNTS },
  { label: 'Транзакции',    icon: List,       to: PATHS.TRANSACTIONS },
  { label: 'Инвестиции',    icon: Briefcase,  to: PATHS.INVESTMENTS },
  { label: 'Цели',          icon: Target,     to: PATHS.GOALS },
  { label: 'Свобода',       icon: Sun,        to: PATHS.FREEDOM },
  { label: 'Рефлексии',     icon: BookOpen,   to: PATHS.REFLECTIONS },
]

const secondaryNavItems: NavItem[] = [
  { label: 'Категории',     icon: Tags,       to: PATHS.CATEGORIES },
  { label: 'Настройки',     icon: Settings,   to: PATHS.PROFILE },
]

interface SidebarProps {
  collapsed: boolean
}

function NavLink({ item, collapsed, isActive }: {
  item: NavItem
  collapsed: boolean
  isActive: boolean
}) {
  return (
    <Link
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        collapsed ? 'justify-center px-2' : '',
      ].filter(Boolean).join(' ')}
    >
      <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const currentUser = useUserStore(s => s.currentUser)
  const isOwner = currentUser?.isOwner === true
  const isReadOnlyMode = currentUser?.subscription?.isReadOnlyMode ?? false

  const displayName = currentUser?.name?.trim() || currentUser?.email || 'Аккаунт'
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    await useAuthStore.getState().logout()
    navigate({ to: PATHS.LOGIN })
  }

  const isActive = (to: string) =>
    currentPath === to || currentPath.startsWith(`${to}/`)

  return (
    <aside
      className="app-shell__sidebar flex flex-col h-full bg-background border-r border-border transition-all duration-200 overflow-hidden flex-shrink-0"
      style={{ width: collapsed ? '56px' : '240px' }}
      aria-label="Боковое меню"
    >
      <div className="flex flex-col flex-1 overflow-y-auto py-3 gap-1 px-2">
        {/* Primary navigation */}
        <nav aria-label="Основная навигация" className="flex flex-col gap-0.5">
          {primaryNavItems.map(item => (
            <NavLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.to)}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="my-2 border-t border-border" role="separator" />

        {/* Secondary navigation */}
        <nav aria-label="Дополнительная навигация" className="flex flex-col gap-0.5">
          {secondaryNavItems.map(item => (
            <NavLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              isActive={isActive(item.to)}
            />
          ))}
          {isOwner && (
            <NavLink
              item={{ label: 'Админ', icon: Shield, to: PATHS.ADMIN }}
              collapsed={collapsed}
              isActive={isActive(PATHS.ADMIN)}
            />
          )}
        </nav>
      </div>

      {/* User section */}
      {!collapsed && (
        <div className="border-t border-border p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar */}
            <div
              className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
              <span className="text-xs flex items-center gap-1">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    isReadOnlyMode ? 'bg-muted-foreground' : 'bg-green-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground truncate">
                  {isReadOnlyMode ? 'Режим просмотра' : 'Подписка активна'}
                </span>
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive min-h-[44px]"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Выйти</span>
          </Button>
        </div>
      )}

      {/* Collapsed: show only logout icon */}
      {collapsed && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full text-muted-foreground hover:text-destructive min-h-[44px]"
            aria-label="Выйти"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  )
}
```

---

#### `react-app/src/components/layout/BottomTabBar.tsx`

**Назначение:** мобильная навигация (<1024px). 4 основных таба + кнопка "Ещё" с popup-меню.

**Primary tabs (в указанном порядке):**

| Label | Icon | Path |
|---|---|---|
| Главная | `BarChart2` | `/analytics` |
| Счета | `Wallet` | `/accounts` |
| Транзакции | `List` | `/transactions` |
| Инвестиции | `Briefcase` | `/investments` |

**"Ещё" меню содержит:**
- Цели (`/goals`)
- Свобода (`/freedom`)
- Рефлексии (`/reflections`)
- Профиль (`/profile`)

**UX-детали:**
- `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `z-index: 1000`
- `padding-bottom: env(safe-area-inset-bottom, 0)` — поддержка iPhone notch
- Высота: 64px (без safe area)
- Активный таб: иконка + текст `text-primary`, тонкая полоска сверху (2px `bg-primary`)
- Неактивный: `text-muted-foreground`, hover → `text-foreground` + `bg-accent/50`
- Active press: `scale(0.96)` transition
- "Ещё" кнопка подсвечивается если текущий маршрут — один из пунктов меню
- Popup меню "Ещё": `position: absolute`, `bottom: 100% + 8px`, `right: 8px`, min-width 168px, `bg-popover`, `border`, `rounded-lg`, `shadow-md`
- Закрытие popup: клик вне элемента (`useEffect` + `mousedown` listener) или смена маршрута
- Каждый элемент таба: `min-height: 44px`, flex column, icon + label

```typescript
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { BarChart2, Wallet, List, Briefcase, Ellipsis, Target, Sun, BookOpen, User } from 'lucide-react'
import { PATHS } from '../../router/paths'

interface TabItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
}

const primaryTabs: TabItem[] = [
  { label: 'Главная',    icon: BarChart2,  to: PATHS.ANALYTICS },
  { label: 'Счета',      icon: Wallet,     to: PATHS.ACCOUNTS },
  { label: 'Транзакции', icon: List,       to: PATHS.TRANSACTIONS },
  { label: 'Инвестиции', icon: Briefcase,  to: PATHS.INVESTMENTS },
]

const moreMenuItems: TabItem[] = [
  { label: 'Цели',       icon: Target,     to: PATHS.GOALS },
  { label: 'Свобода',    icon: Sun,        to: PATHS.FREEDOM },
  { label: 'Рефлексии',  icon: BookOpen,   to: PATHS.REFLECTIONS },
  { label: 'Профиль',    icon: User,       to: PATHS.PROFILE },
]

export default function BottomTabBar() {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const isActive = (to: string) =>
    currentPath === to || currentPath.startsWith(`${to}/`)

  const isMoreActive = moreMenuItems.some(item => isActive(item.to))

  // Закрывать popup при клике вне
  useEffect(() => {
    if (!isMoreOpen) return
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isMoreOpen])

  // Закрывать popup при смене маршрута
  useEffect(() => {
    setIsMoreOpen(false)
  }, [currentPath])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-background border-t border-border"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Основная навигация"
    >
      {primaryTabs.map(tab => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={isActive(tab.to) ? 'page' : undefined}
          className={[
            'relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px]',
            'text-xs font-medium transition-colors select-none active:scale-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            isActive(tab.to) ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {/* Активная полоска сверху */}
          {isActive(tab.to) && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-0.5 bg-primary rounded-b"
              aria-hidden="true"
            />
          )}
          <tab.icon className="h-5 w-5" aria-hidden="true" />
          <span className="truncate max-w-full text-[11px] tracking-tight">{tab.label}</span>
        </Link>
      ))}

      {/* "Ещё" */}
      <div ref={moreRef} className="relative flex flex-1">
        <button
          type="button"
          aria-current={isMoreActive ? 'page' : undefined}
          aria-expanded={isMoreOpen}
          aria-haspopup="true"
          aria-controls="mobile-more-menu"
          onClick={() => setIsMoreOpen(prev => !prev)}
          className={[
            'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] w-full',
            'text-xs font-medium transition-colors select-none active:scale-95',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            'bg-transparent border-0 cursor-pointer',
            isMoreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {isMoreActive && (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2/5 h-0.5 bg-primary rounded-b"
              aria-hidden="true"
            />
          )}
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] tracking-tight">Ещё</span>
        </button>

        {/* Popup меню */}
        {isMoreOpen && (
          <nav
            id="mobile-more-menu"
            className="absolute bottom-[calc(100%+8px)] right-2 z-50 flex flex-col gap-1 min-w-[168px] p-2 bg-popover border border-border rounded-lg shadow-md"
            aria-label="Дополнительная навигация"
          >
            {moreMenuItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                onClick={() => setIsMoreOpen(false)}
                className={[
                  'flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-md text-sm font-medium',
                  'transition-colors',
                  isActive(item.to)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </nav>
  )
}
```

---

#### `react-app/src/components/layout/PublicPageLayout.tsx`

**Назначение:** обёртка для всех публичных страниц (landing, login, register, privacy, terms, blog, careers).

**Структура:**
```
PublicPageLayout
├── <header> — логотип FinTree → / + ThemeToggle
├── <main> <Outlet />
└── <footer> — ссылки: Политика, Условия, Блог, Карьера
```

```typescript
import { Link, Outlet } from '@tanstack/react-router'
import ThemeToggle from '../common/ThemeToggle'
import { PATHS } from '../../router/paths'

export default function PublicPageLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={PATHS.HOME} className="font-semibold text-lg text-primary">
            FinTree
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
          <Link to={PATHS.PRIVACY} className="hover:text-foreground transition-colors">Политика конфиденциальности</Link>
          <Link to={PATHS.TERMS} className="hover:text-foreground transition-colors">Условия использования</Link>
          <Link to={PATHS.BLOG} className="hover:text-foreground transition-colors">Блог</Link>
          <Link to={PATHS.CAREERS} className="hover:text-foreground transition-colors">Карьера</Link>
        </div>
        <div className="text-center mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} FinTree
        </div>
      </footer>
    </div>
  )
}
```

---

### 3. Common Components

Все common-компоненты в `react-app/src/components/common/`.

---

#### `FormField.tsx`

**Назначение:** обёртка для form inputs. Рендерит: label → input (children) → hint/error.

**Interface:**

```typescript
interface FormFieldProps {
  label?: string
  hint?: string
  error?: string | null
  required?: boolean
  labelSrOnly?: boolean
  // Для связи label↔input через htmlFor / id
  // children получают fieldProps через render prop ИЛИ просто обёртка
  children: React.ReactNode
  // Stable ID — если не передан, генерируется автоматически
  id?: string
  className?: string
}
```

**Accessibility rules:**
- `<label htmlFor={fieldId}>` → input должен иметь `id={fieldId}`
- Если есть `error`: input получает `aria-invalid="true"`, `aria-describedby={errorId}`
- Если есть `hint` и нет `error`: input получает `aria-describedby={hintId}`
- `required` → `<span aria-label="обязательное поле">*</span>` рядом с label
- Error отображается с `role="alert"` и `aria-live="polite"`
- При `error` label становится `text-destructive`
- При `:focus-within` label становится `text-foreground` (transition)

**Генерация stable ID:**

```typescript
import { useId } from 'react'
// React 18+ предоставляет useId() для SSR-совместимых стабильных ID
```

**Полный код:**

```typescript
import { useId } from 'react'
import { cn } from '../../lib/utils'

interface FormFieldProps {
  label?: string
  hint?: string
  error?: string | null
  required?: boolean
  labelSrOnly?: boolean
  id?: string
  className?: string
  children: React.ReactNode
}

export function FormField({
  label,
  hint,
  error,
  required,
  labelSrOnly,
  id: externalId,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const fieldId = externalId ?? generatedId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  const hasError = Boolean(error)
  const hasHint = Boolean(hint) && !hasError

  return (
    <div className={cn('flex flex-col gap-1.5', hasError && 'form-field--error', className)}>
      {label && (
        <div className={cn('flex items-center gap-1.5', labelSrOnly && 'sr-only')}>
          <label
            htmlFor={fieldId}
            className={cn(
              'text-sm font-semibold transition-colors',
              hasError ? 'text-destructive' : 'text-muted-foreground',
              // focus-within обрабатывается через CSS или JS
            )}
          >
            {label}
            {required && (
              <span
                className="ml-0.5 font-bold text-destructive"
                aria-label="обязательное поле"
              >
                *
              </span>
            )}
          </label>
          {hasHint && (
            <span
              id={hintId}
              className="text-xs text-muted-foreground"
              role="note"
            >
              {hint}
            </span>
          )}
        </div>
      )}

      {/*
        children — это React Hook Form Controller или прямой input.
        Родительский компонент отвечает за передачу id={fieldId},
        aria-describedby={hasError ? errorId : hasHint ? hintId : undefined},
        aria-invalid={hasError ? 'true' : undefined}
        в input через props.
        Передаём эти attrs через Context или документируем контракт.
      */}
      <div className="w-full">
        {children}
      </div>

      {hasError && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-md"
        >
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  )
}
```

**Примечание по контракту:** input внутри `FormField` должен получать `id`, `aria-describedby` и `aria-invalid` от родителя. Документируй это в JSDoc. Можно передавать через `React.cloneElement` или Context — на усмотрение агента, но вариант с явной передачей через props проще и предпочтительнее.

---

#### `EmptyState.tsx`

**Назначение:** заглушка для пустых списков/состояний.

```typescript
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] px-8 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div
          className="flex items-center justify-center w-20 h-20 mb-8 rounded-xl border border-border bg-muted/30"
          aria-hidden="true"
        >
          <span className="text-4xl text-muted-foreground">{icon}</span>
        </div>
      )}
      <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="max-w-[420px] mb-8 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="min-w-[180px]">
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

**UX-детали:**
- Иконка — передаётся как `React.ReactNode` (Lucide icon или emoji)
- `role="status"` — скринридер объявит содержимое
- Минимальная высота 400px центрирует контент вертикально в пустой области

---

#### `KPICard.tsx`

**Назначение:** карточка с ключевым показателем (сумма, процент, количество). Используется на странице аналитики.

```typescript
interface TrendInfo {
  value: number           // процентное значение (>0 = up, <0 = down, 0 = neutral)
  direction: 'up' | 'down' | 'neutral'
  label?: string          // текст после тренда, напр. "vs прошлый месяц"
}

interface KPICardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: TrendInfo | null
  loading?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}
```

**Правила отображения тренда:**
- `up` → стрелка вверх `↑`, цвет `text-green-500`, фон `bg-green-500/10`
- `down` → стрелка вниз `↓`, цвет `text-red-500`, фон `bg-red-500/10`
- `neutral` → `—`, цвет `text-muted-foreground`, фон `bg-muted/30`
- Отображать `Math.abs(value)%`

**Variant accent (левая граница):**
- `success` → `border-l-4 border-l-green-500`
- `warning` → `border-l-4 border-l-yellow-500`
- `danger` → `border-l-4 border-l-red-500`
- `default` → нет дополнительной границы

```typescript
import { cn } from '../../lib/utils'
import { Skeleton } from '../ui/skeleton'

export function KPICard({ label, value, icon, trend, loading, variant = 'default', className }: KPICardProps) {
  const trendConfig = trend
    ? {
        icon: trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—',
        colorClass:
          trend.direction === 'up' ? 'text-green-500 bg-green-500/10' :
          trend.direction === 'down' ? 'text-red-500 bg-red-500/10' :
          'text-muted-foreground bg-muted/30',
      }
    : null

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 rounded-lg border border-border bg-card',
        variant === 'success' && 'border-l-4 border-l-green-500',
        variant === 'warning' && 'border-l-4 border-l-yellow-500',
        variant === 'danger' && 'border-l-4 border-l-red-500',
        className
      )}
    >
      {/* Header: label + icon */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground" aria-hidden="true">{icon}</span>}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-9 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ) : (
        <>
          {/* Value */}
          <div
            className="text-3xl font-bold leading-tight text-foreground"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {value}
          </div>

          {/* Trend */}
          {trend && trendConfig && (
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold',
                  trendConfig.colorClass
                )}
              >
                <span aria-hidden="true">{trendConfig.icon}</span>
                <span>{Math.abs(trend.value)}%</span>
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

---

#### `PageHeader.tsx`

**Назначение:** стандартный заголовок страницы с опциональными действиями.

```typescript
interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
```

---

#### `StatusBadge.tsx`

**Назначение:** цветной бейдж статуса.

```typescript
interface StatusBadgeProps {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  className?: string
}

const variantClasses: Record<StatusBadgeProps['variant'], string> = {
  success: 'bg-green-500/10 text-green-600 border-green-500/30',
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  danger:  'bg-red-500/10 text-red-600 border-red-500/30',
  info:    'bg-blue-500/10 text-blue-600 border-blue-500/30',
  neutral: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ label, variant, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {label}
    </span>
  )
}
```

---

#### `ConfirmDialog.tsx`

**Назначение:** диалог подтверждения действия. Используется для удаления, выхода из аккаунта и других деструктивных операций.

```typescript
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string    // default: "Подтвердить"
  cancelLabel?: string     // default: "Отмена"
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  isLoading?: boolean
}
```

**UX-детали:**
- Реализован через shadcn `Dialog` (`AlertDialog` предпочтительнее для подтверждений)
- `variant='destructive'` → кнопка подтверждения `variant="destructive"` (красная)
- При `isLoading=true` кнопка подтверждения заблокирована, показывает spinner
- Закрытие через Escape, клик на overlay, или кнопку "Отмена"
- Focus trap внутри диалога (shadcn обеспечивает автоматически)
- При открытии фокус на кнопку подтверждения (для destructive) или на cancel

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { cn } from '../../lib/utils'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {confirmLabel}
              </span>
            ) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

#### `DataStateWrapper.tsx`

**Назначение:** универсальная обёртка для data-driven компонентов. Рендерит правильный UI в зависимости от состояния запроса.

```typescript
type DataState = 'idle' | 'loading' | 'error' | 'empty' | 'success'

interface DataStateWrapperProps {
  state: DataState
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: {
    label: string
    onClick: () => void
  }
  loadingRows?: number       // количество skeleton-строк при loading, default: 3
  children: React.ReactNode  // рендерится только при state='success'
  className?: string
}
```

**Поведение каждого состояния:**

- `idle` — рендерит `null` (ничего)
- `loading` — `loadingRows` штук shadcn `<Skeleton>` (h-12, w-full, gap-2)
- `error` — сообщение об ошибке в `bg-destructive/10` + кнопка "Повторить" если передан `onRetry`
- `empty` — компонент `<EmptyState>` с переданными `emptyTitle`, `emptyDescription`, `emptyAction`
- `success` — рендерит `children`

```typescript
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'
import { AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

export function DataStateWrapper({
  state,
  error,
  onRetry,
  emptyTitle = 'Нет данных',
  emptyDescription,
  emptyAction,
  loadingRows = 3,
  children,
  className,
}: DataStateWrapperProps) {
  if (state === 'idle') return null

  if (state === 'loading') {
    return (
      <div className={cn('flex flex-col gap-2', className)} aria-busy="true" aria-label="Загрузка">
        {Array.from({ length: loadingRows }, (_, i) => (
          <Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-4 p-6 rounded-lg border border-destructive/30 bg-destructive/10 text-center',
          className
        )}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-foreground">Не удалось загрузить данные</p>
          {error && <p className="text-sm text-muted-foreground">{error}</p>}
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        )}
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    )
  }

  // state === 'success'
  return <>{children}</>
}
```

**Паттерн использования с TanStack Query:**

```typescript
function AccountsList() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiClient.getAccounts(),
  })

  const state: DataState =
    isLoading ? 'loading' :
    isError ? 'error' :
    !data?.length ? 'empty' :
    'success'

  return (
    <DataStateWrapper
      state={state}
      error={error?.message}
      onRetry={refetch}
      emptyTitle="Счета не найдены"
      emptyDescription="Добавьте первый счёт для начала работы"
      emptyAction={{ label: 'Добавить счёт', onClick: handleCreate }}
    >
      {data?.map(account => (
        <AccountCard key={account.id} account={account} />
      ))}
    </DataStateWrapper>
  )
}
```

---

#### `ThemeToggle.tsx`

**Назначение:** кнопка переключения темы. Sun icon = светлая тема активна (нажать → dark). Moon icon = тёмная активна (нажать → light).

```typescript
import { Sun, Moon } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'
import { Button } from '../ui/button'

export default function ThemeToggle() {
  const theme = useUiStore(s => s.theme)
  const toggleTheme = useUiStore(s => s.toggleTheme)

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
      onClick={toggleTheme}
      className="min-h-[44px] min-w-[44px]"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  )
}
```

---

### 4. Структура файлов этого блока

```
react-app/src/
├── hooks/
│   └── useViewport.ts
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomTabBar.tsx
│   │   └── PublicPageLayout.tsx
│   └── common/
│       ├── FormField.tsx
│       ├── EmptyState.tsx
│       ├── KPICard.tsx
│       ├── PageHeader.tsx
│       ├── StatusBadge.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataStateWrapper.tsx
│       └── ThemeToggle.tsx
```

---

### 5. CSS-переменные и токены

Вместо хардкода цветов всегда используй Tailwind utilities которые маппятся на shadcn CSS vars:

| Значение | Tailwind класс | CSS var |
|---|---|---|
| Основной фон | `bg-background` | `--background` |
| Карточки | `bg-card` | `--card` |
| Raised поверхность | `bg-muted` | `--muted` |
| Основной текст | `text-foreground` | `--foreground` |
| Вторичный текст | `text-muted-foreground` | `--muted-foreground` |
| Акцент/бренд | `text-primary`, `bg-primary` | `--primary` |
| Граница | `border-border` | `--border` |
| Danger/destructive | `text-destructive`, `bg-destructive` | `--destructive` |
| Popover | `bg-popover` | `--popover` |

Tabular numbers для финансовых значений: `style={{ fontVariantNumeric: 'tabular-nums' }}` — допустимый inline style для этого конкретного случая.

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках — используй стабильный ID (напр. `item.to` для nav, `account.id` для данных)
- Нет `useEffect` для fetch — только TanStack Query
- Нет дублирования серверных данных в Zustand
- Нет хардкода цветов — только shadcn vars или Tailwind utility
- Нет `style={{}}` inline кроме `fontVariantNumeric` и динамических значений для Recharts
- `React.memo` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы (не на уровне common-компонентов)
- Минимальный интерактивный touch target: 44px (`min-h-[44px] min-w-[44px]`)
- `aria-current="page"` на активных nav-ссылках
- `aria-label` на icon-only кнопках
- `role="alert"` на error messages
- `role="status"` на EmptyState и loading indicators
- Sidebar collapse state сохраняется в `localStorage` по ключу `'ft-sidebar-collapsed'`

## Done When

- [ ] `react-app/src/hooks/useViewport.ts` создан, экспортирует `useViewport()` с `{ isMobile, isTablet, isDesktop, width }`
- [ ] `AppShell.tsx` рендерит Sidebar при `isDesktop`, BottomTabBar при `!isDesktop`
- [ ] `Sidebar.tsx` — все 7 primary + 2 secondary nav items; Admin показывается только owner; активный пункт подсвечен; logout работает
- [ ] Sidebar collapse сохраняется в localStorage и переживает перезагрузку
- [ ] `BottomTabBar.tsx` — 4 таба + "Ещё" popup; popup закрывается при клике вне и смене маршрута; safe-area-inset-bottom применён
- [ ] `PublicPageLayout.tsx` — header с логотипом + ThemeToggle, footer с 4 ссылками
- [ ] `FormField.tsx` — label, error, hint, required, a11y attrs корректны
- [ ] `EmptyState.tsx` — icon, title, description, action кнопка
- [ ] `KPICard.tsx` — tabular-nums, trend (up/down/neutral), loading skeleton, variant border
- [ ] `PageHeader.tsx` — title, subtitle, actions slot
- [ ] `StatusBadge.tsx` — все 5 вариантов
- [ ] `ConfirmDialog.tsx` — default/destructive variant, isLoading state
- [ ] `DataStateWrapper.tsx` — все 5 состояний работают; skeleton key не использует index
- [ ] `ThemeToggle.tsx` — переключает тему, меняет иконку, aria-label актуален
- [ ] TypeScript компилируется без ошибок, нет `any`
- [ ] Нет хардкода цветов ни в одном из файлов блока
