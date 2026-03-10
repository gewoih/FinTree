# Block 03 — Auth & Routing

> **Для AI-агента:** Этот документ — твоё единственное задание. Не смотри в vue-app/ за референсом. Используй только информацию из этого документа.

## Shared Context

- Репозиторий: monorepo, `react-app/` рядом с `vue-app/`
- Backend API base: `https://localhost:5001` (проксировать через Vite на `/api`)
- Auth: cookie-based сессия (`withCredentials: true` на Axios). Браузер отправляет httpOnly cookie автоматически. Нет ручного `Authorization` header. Refresh через `POST /api/auth/refresh`.
- Locale: ru-RU (все UI тексты, числа, даты на русском)
- Theme: dark по умолчанию (`:root`), light через `.light-mode` на `<html>`, сохранять в localStorage
- Min touch target: 44px
- Breakpoints: mobile <640px, tablet <768px, desktop ≥1024px
- Financial values: `font-variant-numeric: tabular-nums`, right-aligned в таблицах
- Каждый data-driven компонент реализует все 5 состояний: idle → loading → error (с кнопкой retry) → empty → success

## Tech Stack

- React 19, TypeScript ~5.x
- shadcn/ui (latest), Tailwind CSS v4
- TanStack Router (file-based routing НЕ используется — только code-based)
- TanStack Query v5
- Zustand v5
- Axios, React Hook Form + Zod, Recharts, Vite

## Depends On

- Block 01 — Foundation (Vite config, Tailwind, shadcn, Axios instance, env setup)
- Block 02 — Types & API layer (`CurrentUserDto`, `LoginPayload`, `RegisterPayload`, `TelegramLoginPayload`, все API-функции: `apiClient.login()`, `apiClient.register()`, `apiClient.loginWithTelegram()`, `apiClient.logout()`, `apiClient.getCurrentUser()`, `apiClient.updateUserProfile()`)

## Goal

После этого блока:
- Zustand stores для auth, user, ui полностью работают
- TanStack Router настроен с 18 маршрутами, guards, lazy loading
- Приложение корректно редиректит: неавторизованных → `/login`, авторизованных на `/login` → `/analytics`, не-owner на `/admin` → `/profile`
- Тема инициализируется из localStorage при старте, переключается через `uiStore`
- `ensureSession()` вызывается ровно один раз при старте приложения (в корневом layout), не в каждом guard

---

## Specs

### 1. Zustand Stores

Создай директорию `react-app/src/stores/`. Каждый store — отдельный файл.

---

#### `react-app/src/stores/authStore.ts`

**Назначение:** управление состоянием аутентификации — факт сессии, loading, error. Не хранит данные пользователя (это `userStore`).

**State:**

```typescript
interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isSessionChecked: boolean
}
```

**Actions:**

```typescript
interface AuthActions {
  login(payload: LoginPayload): Promise<boolean>
  register(payload: RegisterPayload): Promise<boolean>
  loginWithTelegram(payload: TelegramLoginPayload): Promise<boolean>
  logout(): Promise<void>
  ensureSession(): Promise<boolean>
  clearError(): void
}
```

**Полный код:**

```typescript
import { create } from 'zustand'
import { apiClient } from '../api/apiClient'
import { useUserStore } from './userStore'
import type { LoginPayload, RegisterPayload, TelegramLoginPayload } from '../types'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isSessionChecked: boolean
}

interface AuthActions {
  login(payload: LoginPayload): Promise<boolean>
  register(payload: RegisterPayload): Promise<boolean>
  loginWithTelegram(payload: TelegramLoginPayload): Promise<boolean>
  logout(): Promise<void>
  ensureSession(): Promise<boolean>
  clearError(): void
}

function resolveAuthErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const e = err as { response?: { data?: { error?: string; message?: string } }; userMessage?: string }
  const backend = e.response?.data?.error ?? e.response?.data?.message
  if (typeof backend === 'string' && backend.trim()) return backend
  if (typeof e.userMessage === 'string' && e.userMessage.trim()) return e.userMessage
  return fallback
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isSessionChecked: false,

  async login(payload) {
    set({ isLoading: true, error: null })
    try {
      await apiClient.login(payload)
      const ok = await useUserStore.getState().fetchCurrentUser()
      if (!ok) throw new Error('User hydration failed')
      set({ isAuthenticated: true, isSessionChecked: true })
      return true
    } catch (err) {
      set({ error: resolveAuthErrorMessage(err, 'Не удалось войти. Проверьте Email и пароль.') })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  async register(payload) {
    set({ isLoading: true, error: null })
    try {
      await apiClient.register(payload)
      const ok = await useUserStore.getState().fetchCurrentUser()
      if (!ok) throw new Error('User hydration failed')
      set({ isAuthenticated: true, isSessionChecked: true })
      return true
    } catch (err) {
      set({ error: resolveAuthErrorMessage(err, 'Не удалось зарегистрироваться. Попробуйте ещё раз.') })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  async loginWithTelegram(payload) {
    set({ isLoading: true, error: null })
    try {
      await apiClient.loginWithTelegram(payload)
      const ok = await useUserStore.getState().fetchCurrentUser()
      if (!ok) throw new Error('User hydration failed')
      set({ isAuthenticated: true, isSessionChecked: true })
      return true
    } catch (err) {
      set({ error: resolveAuthErrorMessage(err, 'Не удалось войти через Telegram.') })
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  async logout() {
    try {
      await apiClient.logout()
    } catch {
      // игнорируем ошибки logout — всё равно очищаем состояние
    } finally {
      useUserStore.getState().clearUser()
      set({ isAuthenticated: false, isSessionChecked: true, error: null })
    }
  },

  async ensureSession() {
    const { isSessionChecked, isAuthenticated } = get()
    if (isSessionChecked) return isAuthenticated

    try {
      const ok = await useUserStore.getState().fetchCurrentUser()
      set({ isAuthenticated: ok, isSessionChecked: true })
      return ok
    } catch {
      set({ isAuthenticated: false, isSessionChecked: true })
      return false
    }
  },

  clearError() {
    set({ error: null })
  },
}))
```

**Важные детали:**
- `ensureSession()` идемпотентна: если `isSessionChecked === true`, сразу возвращает текущее значение `isAuthenticated` без сетевого запроса
- После успешного `logout()` очищается и `userStore` (вызов `userStore.clearUser()`)
- `login/register/loginWithTelegram` — все три паттерна одинаковы: API call → fetchCurrentUser → set authenticated

---

#### `react-app/src/stores/userStore.ts`

**Назначение:** хранит данные текущего пользователя. Очищается при logout. Не дублирует данные из TanStack Query — это единственный источник правды для `currentUser`.

**State:**

```typescript
interface UserState {
  currentUser: CurrentUserDto | null
  isLoading: boolean
}
```

**Actions:**

```typescript
interface UserActions {
  fetchCurrentUser(): Promise<boolean>
  updateProfile(payload: UpdateUserProfilePayload): Promise<boolean>
  clearUser(): void
}
```

**Полный код:**

```typescript
import { create } from 'zustand'
import { apiClient } from '../api/apiClient'
import type { CurrentUserDto, UpdateUserProfilePayload } from '../types'

interface UserState {
  currentUser: CurrentUserDto | null
  isLoading: boolean
}

interface UserActions {
  fetchCurrentUser(): Promise<boolean>
  updateProfile(payload: UpdateUserProfilePayload): Promise<boolean>
  clearUser(): void
}

// Дедупликация параллельных вызовов fetchCurrentUser
let pendingFetch: Promise<boolean> | null = null

export const useUserStore = create<UserState & UserActions>((set, get) => ({
  currentUser: null,
  isLoading: false,

  async fetchCurrentUser() {
    if (get().currentUser) return true
    if (pendingFetch) return pendingFetch

    pendingFetch = (async () => {
      set({ isLoading: true })
      try {
        const user = await apiClient.getCurrentUser()
        set({ currentUser: user })
        return true
      } catch {
        set({ currentUser: null })
        return false
      } finally {
        set({ isLoading: false })
        pendingFetch = null
      }
    })()

    return pendingFetch
  },

  async updateProfile(payload) {
    try {
      const updated = await apiClient.updateUserProfile(payload)
      set({ currentUser: updated })
      return true
    } catch {
      return false
    }
  },

  clearUser() {
    pendingFetch = null
    set({ currentUser: null, isLoading: false })
  },
}))
```

**Computed-значения** (не хранить в store, вычислять в компонентах или через селекторы):

```typescript
// Пример использования в компоненте:
const baseCurrencyCode = useUserStore(s => s.currentUser?.baseCurrencyCode ?? null)
const isOwner = useUserStore(s => s.currentUser?.isOwner === true)
const isReadOnlyMode = useUserStore(s => s.currentUser?.subscription?.isReadOnlyMode ?? false)
const hasActiveSubscription = useUserStore(s => s.currentUser?.subscription?.isActive ?? false)
```

---

## Zustand — Selector Memoization (критично)

❌ Неправильно — создаёт новую функцию каждый рендер:
```typescript
const { currentUser, isLoading } = useUserStore(s => ({
  currentUser: s.currentUser,
  isLoading: s.isLoading,
}))
```

✅ Правильно — используй `useShallow` для объектных селекторов:
```typescript
import { useShallow } from 'zustand/react/shallow'

const { currentUser, isLoading } = useUserStore(
  useShallow(s => ({ currentUser: s.currentUser, isLoading: s.isLoading }))
)
```

✅ Правильно — примитивы не требуют useShallow:
```typescript
const isAuthenticated = useAuthStore(s => s.isAuthenticated) // OK
const theme = useUiStore(s => s.theme) // OK
```

Правило: если из store берётся более одного поля в одном вызове — всегда `useShallow`.

---

#### `react-app/src/stores/uiStore.ts`

**Назначение:** глобальное UI-состояние: тема. Persisted в localStorage.

**State & Actions:**

```typescript
interface UiState {
  theme: 'dark' | 'light'
}

interface UiActions {
  toggleTheme(): void
  setTheme(theme: 'dark' | 'light'): void
  initTheme(): void
}
```

**Полный код:**

```typescript
import { create } from 'zustand'

const STORAGE_KEY = 'ft-theme'

function applyThemeToDOM(theme: 'dark' | 'light') {
  if (theme === 'light') {
    document.documentElement.classList.add('light-mode')
  } else {
    document.documentElement.classList.remove('light-mode')
  }
}

function readThemeFromStorage(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // SSR или приватный режим
  }
  return 'dark'
}

interface UiState {
  theme: 'dark' | 'light'
}

interface UiActions {
  toggleTheme(): void
  setTheme(theme: 'dark' | 'light'): void
  initTheme(): void
}

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  theme: 'dark',

  initTheme() {
    const theme = readThemeFromStorage()
    set({ theme })
    applyThemeToDOM(theme)
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  setTheme(theme) {
    set({ theme })
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
    applyThemeToDOM(theme)
  },
}))
```

**Правила применения темы:**
- Dark mode: нет класса `.light-mode` на `<html>` — это дефолт
- Light mode: класс `.light-mode` на `document.documentElement`
- `initTheme()` вызывается ровно один раз при монтировании корневого компонента `App.tsx`
- Тема сохраняется в `localStorage` по ключу `'ft-theme'`

---

### 2. Router

#### `react-app/src/router/paths.ts`

```typescript
export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  BLOG: '/blog',
  CAREERS: '/careers',
  ANALYTICS: '/analytics',
  ACCOUNTS: '/accounts',
  TRANSACTIONS: '/transactions',
  CATEGORIES: '/categories',
  INVESTMENTS: '/investments',
  REFLECTIONS: '/reflections',
  RETRO_DETAIL: '/reflections/$month',
  FREEDOM: '/freedom',
  GOALS: '/goals',
  PROFILE: '/profile',
  ADMIN: '/admin',
} as const

export type PathValues = typeof PATHS[keyof typeof PATHS]
```

---

#### `react-app/src/router/index.ts`

Используй `@tanstack/react-router`. Все страницы lazy-loaded через `React.lazy`. Guards реализованы через `beforeLoad` в каждом route.

```typescript
import React, { Suspense } from 'react'
import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
  Outlet,
} from '@tanstack/react-router'
import { PATHS } from './paths'
import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'
import { useUiStore } from '../stores/uiStore'

// ─── Lazy page imports ────────────────────────────────────────────────────────
const LandingPage            = React.lazy(() => import('../pages/LandingPage'))
const LoginPage              = React.lazy(() => import('../pages/LoginPage'))
const RegisterPage           = React.lazy(() => import('../pages/RegisterPage'))
const PrivacyPolicyPage      = React.lazy(() => import('../pages/PrivacyPolicyPage'))
const TermsPage              = React.lazy(() => import('../pages/TermsPage'))
const BlogPage               = React.lazy(() => import('../pages/BlogPage'))
const CareersPage            = React.lazy(() => import('../pages/CareersPage'))

const AnalyticsPage          = React.lazy(() => import('../pages/AnalyticsPage'))
const AccountsPage           = React.lazy(() => import('../pages/AccountsPage'))
const TransactionsPage       = React.lazy(() => import('../pages/TransactionsPage'))
const CategoriesPage         = React.lazy(() => import('../pages/CategoriesPage'))
const InvestmentsPage        = React.lazy(() => import('../pages/InvestmentsPage'))
const ReflectionsPage        = React.lazy(() => import('../pages/ReflectionsPage'))
const RetroDetailPage        = React.lazy(() => import('../pages/RetroDetailPage'))
const FreedomCalculatorPage  = React.lazy(() => import('../pages/FreedomCalculatorPage'))
const GoalsPage              = React.lazy(() => import('../pages/GoalsPage'))
const ProfilePage            = React.lazy(() => import('../pages/ProfilePage'))
const AdminPage              = React.lazy(() => import('../pages/AdminPage'))

// ─── Layouts ──────────────────────────────────────────────────────────────────
// AppShell и PublicPageLayout импортируются напрямую (не lazy) — они часть shell
import AppShell from '../components/layout/AppShell'
import PublicPageLayout from '../components/layout/PublicPageLayout'

// ─── Fallback для Suspense ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}
      aria-label="Загрузка страницы"
      aria-live="polite"
    >
      {/* Используй shadcn Skeleton или спиннер */}
      <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return function SuspenseWrapper() {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    )
  }
}

// ─── Root route ───────────────────────────────────────────────────────────────
// Корневой route — инициализирует сессию и тему ОДИН раз
const rootRoute = createRootRoute({
  async beforeLoad() {
    // Инициализация темы
    useUiStore.getState().initTheme()
    // Проверка сессии — идемпотентна, кешируется в store
    await useAuthStore.getState().ensureSession()
  },
  component: () => <Outlet />,
})

// ─── Public layout route ──────────────────────────────────────────────────────
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'public-layout',
  component: PublicPageLayout,
})

// ─── Protected layout route ───────────────────────────────────────────────────
const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected-layout',
  beforeLoad() {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: PATHS.LOGIN })
    }
  },
  component: AppShell,
})

// ─── Public routes ────────────────────────────────────────────────────────────
const landingRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.HOME,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS })
    }
  },
  component: withSuspense(LandingPage),
})

const loginRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.LOGIN,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS })
    }
  },
  component: withSuspense(LoginPage),
})

const registerRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.REGISTER,
  beforeLoad() {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: PATHS.ANALYTICS })
    }
  },
  component: withSuspense(RegisterPage),
})

const privacyRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.PRIVACY,
  component: withSuspense(PrivacyPolicyPage),
})

const termsRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.TERMS,
  component: withSuspense(TermsPage),
})

const blogRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.BLOG,
  component: withSuspense(BlogPage),
})

const careersRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: PATHS.CAREERS,
  component: withSuspense(CareersPage),
})

// ─── Protected routes ─────────────────────────────────────────────────────────
const analyticsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.ANALYTICS,
  component: withSuspense(AnalyticsPage),
})

const accountsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.ACCOUNTS,
  component: withSuspense(AccountsPage),
})

const transactionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.TRANSACTIONS,
  component: withSuspense(TransactionsPage),
})

const categoriesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.CATEGORIES,
  component: withSuspense(CategoriesPage),
})

const investmentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.INVESTMENTS,
  component: withSuspense(InvestmentsPage),
})

const reflectionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.REFLECTIONS,
  component: withSuspense(ReflectionsPage),
})

const retroDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  // TanStack Router использует $param нотацию
  path: '/reflections/$month',
  component: withSuspense(RetroDetailPage),
})

const freedomRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.FREEDOM,
  component: withSuspense(FreedomCalculatorPage),
})

const goalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.GOALS,
  component: withSuspense(GoalsPage),
})

const profileRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.PROFILE,
  component: withSuspense(ProfilePage),
})

// ─── Owner-only route ─────────────────────────────────────────────────────────
const adminRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: PATHS.ADMIN,
  beforeLoad() {
    // protectedLayoutRoute уже проверил isAuthenticated
    const isOwner = useUserStore.getState().currentUser?.isOwner === true
    if (!isOwner) {
      throw redirect({ to: PATHS.PROFILE })
    }
  },
  component: withSuspense(AdminPage),
})

// ─── Route tree ───────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([
    landingRoute,
    loginRoute,
    registerRoute,
    privacyRoute,
    termsRoute,
    blogRoute,
    careersRoute,
  ]),
  protectedLayoutRoute.addChildren([
    analyticsRoute,
    accountsRoute,
    transactionsRoute,
    categoriesRoute,
    investmentsRoute,
    reflectionsRoute,
    retroDetailRoute,
    freedomRoute,
    goalsRoute,
    profileRoute,
    adminRoute,
  ]),
])

// ─── Router instance ──────────────────────────────────────────────────────────
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

// TypeScript: регистрация типов роутера
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

---

### 3. Точка входа приложения

`react-app/src/main.tsx` должен выглядеть примерно так:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

---

### 4. Работа с параметрами маршрута

На странице `RetroDetailPage` параметр `month` доступен через:

```typescript
import { useParams } from '@tanstack/react-router'

function RetroDetailPage() {
  const { month } = useParams({ from: '/reflections/$month' })
  // month — строка вида '2025-11'
}
```

---

### 5. Программная навигация

```typescript
import { useNavigate } from '@tanstack/react-router'
import { PATHS } from '../router/paths'

function SomeComponent() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await useAuthStore.getState().logout()
    navigate({ to: PATHS.LOGIN })
  }
}
```

---

### 6. Document title

TanStack Router поддерживает `head` в каждом route. Задавай title через компонент или в `loader`:

```typescript
// В каждой странице используй хук или статический title
// Формат: "FinTree · <Название страницы>"
// Пример:
useEffect(() => {
  document.title = 'FinTree · Аналитика'
}, [])
```

Либо используй `@tanstack/react-router`'s `meta` если поддерживается в выбранной версии.

---

### 7. Scroll behavior

TanStack Router: `scrollRestoration: true` в конфиге роутера восстанавливает позицию скролла. При навигации к новой странице — скролл в начало автоматически.

---

## Constraints & Best Practices

- Компоненты: функциональные, ≤200 строк — иначе декомпозировать
- Нет `any` в TypeScript
- Нет `index` как `key` в динамических списках
- Нет `useEffect` для fetch — только TanStack Query `useQuery`/`useMutation`
- Нет дублирования серверных данных в Zustand (исключение: `currentUser` в `userStore` — источник правды для auth guard)
- Нет хардкода цветов — только shadcn CSS vars или Tailwind utility
- Нет `style={{}}` inline (кроме динамических значений для Recharts)
- `React.memo`, `useMemo`, `useCallback` — только при реальной проблеме производительности
- Error boundaries на уровне каждой страницы
- Все страницы lazy-loaded через `React.lazy` + `Suspense`
- Все route paths — через константы из `PATHS`, никогда не хардкодить строки
- `ensureSession()` вызывается ровно один раз в `beforeLoad` корневого route
- Guards через `beforeLoad` + `throw redirect(...)` — не через условный рендеринг
- `uiStore.initTheme()` вызывается ровно один раз в `beforeLoad` корневого route

## Done When

- [ ] `react-app/src/stores/authStore.ts` создан, типизирован, экспортируется `useAuthStore`
- [ ] `react-app/src/stores/userStore.ts` создан, типизирован, экспортируется `useUserStore`
- [ ] `react-app/src/stores/uiStore.ts` создан, типизирован, экспортируется `useUiStore`; тема применяется на `<html>` и сохраняется в localStorage
- [ ] `react-app/src/router/paths.ts` создан с константой `PATHS` и всеми 18 маршрутами
- [ ] `react-app/src/router/index.ts` создан; роутер экспортируется как `router`
- [ ] 18 маршрутов зарегистрированы (7 публичных + 10 protected + 1 owner-only)
- [ ] Все страницы lazy-loaded
- [ ] `/admin` редиректит на `/profile` если `currentUser.isOwner !== true`
- [ ] `/login` и `/register` редиректят на `/analytics` если уже авторизован
- [ ] `/` (landing) редиректит на `/analytics` если авторизован
- [ ] Неавторизованный доступ к protected routes редиректит на `/login`
- [ ] `ensureSession()` вызывается ровно один раз в `beforeLoad` корневого route
- [ ] TypeScript компилируется без ошибок, нет `any`
- [ ] `main.tsx` подключает `RouterProvider` и `QueryClientProvider`
