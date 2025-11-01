# FinTree Redesign — Implementation Guide

## Quick Start

### 1. Import Design Tokens

Update [vue-app/src/main.ts](vue-app/src/main.ts) to import the new design tokens:

```typescript
import './assets/design-tokens.css'  // Add this line at the top
import './style.css'
import './styles/theme.css'
import './styles/prime-overrides.css'
import './primevue-theme.css'
// ... rest of imports
```

### 2. Global Components Registration

Create a new file `vue-app/src/components/index.ts` to register common components globally:

```typescript
import type { App } from 'vue'
import EmptyState from './common/EmptyState.vue'
import KPICard from './common/KPICard.vue'
import PageHeader from './common/PageHeader.vue'
import StatusBadge from './common/StatusBadge.vue'

// PrimeVue components
import Button from 'primevue/button'
import Card from 'primevue/card'
import Skeleton from 'primevue/skeleton'
import Menu from 'primevue/menu'
import Sidebar from 'primevue/sidebar'

export function registerComponents(app: App) {
  // Common components
  app.component('EmptyState', EmptyState)
  app.component('KPICard', KPICard)
  app.component('PageHeader', PageHeader)
  app.component('StatusBadge', StatusBadge)

  // PrimeVue components
  app.component('Button', Button)
  app.component('Card', Card)
  app.component('Skeleton', Skeleton)
  app.component('Menu', Menu)
  app.component('Sidebar', Sidebar)
}
```

Then in [vue-app/src/main.ts](vue-app/src/main.ts):

```typescript
import { registerComponents } from './components'

const app = createApp(App)

// ... other setup

registerComponents(app)  // Add this line

app.mount('#app')
```

### 3. Theme Composable

Create `vue-app/src/composables/useTheme.ts`:

```typescript
import { ref, onMounted } from 'vue'

export function useTheme() {
  const darkMode = ref(false)

  const initTheme = () => {
    const savedTheme = localStorage.getItem('fintree-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    darkMode.value = savedTheme === 'dark' || (!savedTheme && prefersDark)
    applyTheme()
  }

  const toggleTheme = () => {
    darkMode.value = !darkMode.value
    applyTheme()
    localStorage.setItem('fintree-theme', darkMode.value ? 'dark' : 'light')
  }

  const applyTheme = () => {
    document.documentElement.classList.toggle('dark-mode', darkMode.value)
  }

  onMounted(() => {
    initTheme()
  })

  return {
    darkMode,
    toggleTheme,
    initTheme
  }
}
```

---

## File Structure Overview

### New Files Created

```
vue-app/src/
├── assets/
│   └── design-tokens.css                  # ✅ NEW - Core design system tokens
│
├── components/
│   ├── common/
│   │   ├── EmptyState.vue                 # ✅ NEW - Empty state component
│   │   ├── KPICard.vue                    # ✅ NEW - Dashboard KPI cards
│   │   ├── PageHeader.vue                 # ✅ NEW - Page headers with breadcrumbs
│   │   └── StatusBadge.vue                # ✅ NEW - Status badges
│   │
│   └── layout/
│       └── AppShell.vue                   # ✅ NEW - Main app layout with sidebar
│
├── pages/
│   └── LandingPage.vue                    # ✅ NEW - Marketing landing page
│
└── composables/
    └── useTheme.ts                        # ✅ NEW - Theme management composable
```

### Modified Files

```
vue-app/src/
├── main.ts                                # Import design tokens + register components
├── App.vue                                # Wrap authenticated routes with AppShell
└── router/index.ts                        # Add LandingPage route
```

---

## Step-by-Step Implementation

### Step 1: Update Router

Update [vue-app/src/router/index.ts](vue-app/src/router/index.ts):

```typescript
import LandingPage from '@/pages/LandingPage.vue'

const router = createRouter({
  // ... existing config
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: LandingPage,
      meta: { public: true }
    },
    // ... existing routes
  ]
})
```

### Step 2: Update App.vue

Wrap authenticated routes with AppShell in [vue-app/src/App.vue](vue-app/src/App.vue):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'

const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
</script>

<template>
  <Toast position="top-right" />
  <ConfirmDialog />

  <AppShell v-if="!isPublicRoute">
    <router-view />
  </AppShell>

  <router-view v-else />
</template>
```

### Step 3: Update Existing Pages

#### HomePage.vue (Dashboard)

Replace the existing [vue-app/src/pages/HomePage.vue](vue-app/src/pages/HomePage.vue) header with:

```vue
<template>
  <div class="dashboard">
    <PageHeader
      title="Dashboard"
      subtitle="Overview of your finances"
    >
      <template #actions>
        <Button
          label="Add Transaction"
          icon="pi pi-plus"
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <!-- KPI Cards -->
    <div class="dashboard__kpis">
      <KPICard
        title="Total Balance"
        :value="formatCurrency(totalBalance)"
        icon="pi-wallet"
        :trend="5.2"
        trend-label="vs last month"
        variant="success"
      />

      <KPICard
        title="Monthly Expenses"
        :value="formatCurrency(monthlyExpenses)"
        icon="pi-chart-line"
        :trend="-12.8"
        trend-label="vs last month"
        variant="success"
      />

      <KPICard
        title="Active Accounts"
        :value="accountCount"
        icon="pi-credit-card"
      />
    </div>

    <!-- Existing content -->
  </div>
</template>

<style scoped>
.dashboard__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--ft-space-6);
  margin-bottom: var(--ft-space-8);
}
</style>
```

#### ExpensesPage.vue (Transactions)

Add EmptyState when no transactions:

```vue
<template>
  <div class="transactions">
    <PageHeader
      title="Transactions"
      subtitle="All your expenses and income"
    >
      <template #actions>
        <Button
          label="Add Transaction"
          icon="pi pi-plus"
          @click="openTransactionDialog"
        />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!loading && transactions.length === 0"
      icon="pi-receipt"
      title="No transactions yet"
      description="Start tracking your spending to see insights and analytics"
      action-label="Add Your First Transaction"
      @action="openTransactionDialog"
    />

    <!-- Existing transaction list -->
  </div>
</template>
```

#### AccountsPage.vue

Add EmptyState:

```vue
<EmptyState
  v-if="!loading && accounts.length === 0"
  icon="pi-wallet"
  title="No accounts connected"
  description="Add a bank account or cash wallet to start tracking your finances"
  action-label="Add Account"
  @action="openAccountDialog"
/>
```

#### CategoriesPage.vue

Add EmptyState:

```vue
<EmptyState
  v-if="!loading && categories.length === 0"
  icon="pi-tags"
  title="No categories created"
  description="Organize your spending with custom categories"
  action-label="Create Category"
  @action="openCategoryDialog"
/>
```

---

## PrimeVue Theme Configuration (Advanced)

For full design system integration, create a custom theme preset in [vue-app/src/theme/preset.ts](vue-app/src/theme/preset.ts):

```typescript
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

export const FinTreePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
      950: '#172554'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}'
        }
      },
      dark: {
        primary: {
          color: '{primary.500}',
          contrastColor: '{surface.950}',
          hoverColor: '{primary.400}',
          activeColor: '{primary.300}'
        },
        surface: {
          0: '#0B1220',
          50: '#111827',
          100: '#1F2937',
          200: '#374151',
          300: '#4B5563',
          400: '#6B7280',
          500: '#9CA3AF',
          600: '#D1D5DB',
          700: '#E5E7EB',
          800: '#F3F4F6',
          900: '#F9FAFB',
          950: '#FFFFFF'
        }
      }
    }
  }
})
```

Then update [vue-app/src/main.ts](vue-app/src/main.ts):

```typescript
import { FinTreePreset } from './theme/preset'

app.use(PrimeVue, {
  theme: {
    preset: FinTreePreset,
    options: {
      darkModeSelector: '.dark-mode',
      cssLayer: {
        name: 'primevue',
        order: 'reset, primevue'
      }
    }
  }
})
```

---

## CSS Migration Strategy

### Phase 1: Import New Tokens (Immediate)
1. Import `design-tokens.css` in main.ts
2. Both old and new tokens coexist
3. Start using new tokens in new components

### Phase 2: Update Existing Components (Gradual)
Replace old custom properties with new semantic tokens:

| Old Token | New Token |
|-----------|-----------|
| `--ft-primary` (#6366f1) | `--ft-primary-600` (#2563EB) |
| `--ft-text-primary` | `var(--ft-text-primary)` (now semantic, changes with theme) |
| `--ft-glass` | Keep for glassmorphism (compatible) |
| `--ft-radius-2xl` | Same (1.5rem) |

### Phase 3: Remove Legacy Tokens (Final)
Once all components use new tokens, remove old definitions from [vue-app/src/style.css](vue-app/src/style.css).

---

## Component Usage Examples

### KPICard

```vue
<KPICard
  title="Total Revenue"
  :value="formatCurrency(1234567)"
  icon="pi-dollar"
  :trend="8.5"
  trend-label="vs last month"
  variant="success"
  :loading="isLoading"
/>
```

**Props:**
- `title` (string, required) - Card title
- `value` (string | number, required) - Main value to display
- `icon` (string, optional) - PrimeIcon class (e.g., 'pi-wallet')
- `trend` (number, optional) - Percentage trend (+/-)
- `trendLabel` (string, optional) - Label for trend (e.g., "vs last month")
- `loading` (boolean, default: false) - Show skeleton loader
- `variant` ('default' | 'success' | 'warning' | 'danger', default: 'default')

### EmptyState

```vue
<EmptyState
  icon="pi-inbox"
  title="No items found"
  description="Create your first item to get started"
  action-label="Create Item"
  action-icon="pi-plus"
  @action="handleCreate"
/>
```

**Props:**
- `icon` (string, default: 'pi-inbox') - PrimeIcon class
- `title` (string, required) - Empty state headline
- `description` (string, optional) - Supporting text
- `actionLabel` (string, optional) - CTA button text
- `actionIcon` (string, default: 'pi-plus') - CTA button icon

**Events:**
- `@action` - Fired when CTA button is clicked

### PageHeader

```vue
<PageHeader
  title="Settings"
  subtitle="Manage your account preferences"
  :breadcrumbs="[
    { label: 'Home', to: '/home' },
    { label: 'Settings', to: '/settings' },
    { label: 'Profile' }
  ]"
>
  <template #actions>
    <Button label="Save" icon="pi pi-check" />
    <Button label="Cancel" severity="secondary" outlined />
  </template>
</PageHeader>
```

**Props:**
- `title` (string, required) - Page title
- `subtitle` (string, optional) - Page description
- `breadcrumbs` (Array, optional) - Breadcrumb items with `label` and optional `to`

**Slots:**
- `actions` - Action buttons displayed on the right (or below on mobile)

### StatusBadge

```vue
<StatusBadge
  label="Active"
  severity="success"
  icon="pi-check"
  size="md"
/>

<StatusBadge
  label="2FA Enabled"
  severity="info"
  :dot="true"
/>
```

**Props:**
- `label` (string, required) - Badge text
- `severity` ('success' | 'warning' | 'danger' | 'info' | 'secondary', default: 'secondary')
- `icon` (string, optional) - PrimeIcon class
- `size` ('sm' | 'md' | 'lg', default: 'md')
- `dot` (boolean, default: false) - Show colored dot instead of icon

---

## Utility CSS Classes

Use these utility classes from `design-tokens.css`:

```vue
<!-- Screen reader only -->
<span class="sr-only">Hidden from visual users</span>

<!-- Focus visible for keyboard navigation -->
<button class="focus-visible">Keyboard accessible</button>
```

---

## Responsive Breakpoints

```css
/* Mobile first, then: */

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## Dark Mode Implementation

### Automatic Detection

The `useTheme` composable automatically detects user's system preference on first visit.

### Manual Toggle

```vue
<script setup>
import { useTheme } from '@/composables/useTheme'

const { darkMode, toggleTheme } = useTheme()
</script>

<template>
  <Button
    :icon="darkMode ? 'pi pi-sun' : 'pi pi-moon'"
    @click="toggleTheme"
  />
</template>
```

### Component-Level Dark Mode Styles

```vue
<style scoped>
.my-component {
  background: var(--ft-surface-base);
  color: var(--ft-text-primary);
}

/* Optional: Override for dark mode specifically */
.dark-mode .my-component {
  border-color: rgba(255, 255, 255, 0.1);
}
</style>
```

The semantic tokens (`--ft-text-primary`, `--ft-surface-base`, etc.) **automatically switch** when `.dark-mode` is applied to `<html>`, so component-level overrides are rarely needed.

---

## Performance Checklist

- [x] Lazy load routes with `component: () => import('./pages/...')`
- [ ] Implement virtual scrolling for transactions table (1000+ rows)
- [ ] Debounce search/filter inputs (300ms)
- [ ] Lazy load Chart.js on Analytics page
- [ ] Use Skeleton loaders instead of spinners
- [ ] Optimize images: WebP format, lazy loading
- [ ] Add Service Worker for offline support

---

## Accessibility Checklist

- [x] All colors meet WCAG AAA contrast (7:1)
- [x] Focus states have 3:1 contrast
- [x] Touch targets ≥ 44px
- [x] ARIA labels on icon-only buttons
- [x] Keyboard navigation (Tab, Enter, Esc)
- [ ] Screen reader testing
- [ ] Form error announcements
- [ ] Skip to main content link
- [ ] Table captions and scope attributes
- [ ] Chart accessible data tables

---

## Testing Checklist

### Visual Regression
- [ ] Test all pages in light mode
- [ ] Test all pages in dark mode
- [ ] Test on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1440px)

### Component Testing
- [ ] EmptyState shows/hides based on data
- [ ] KPICard displays trends correctly
- [ ] PageHeader breadcrumbs navigate
- [ ] StatusBadge severities render correctly

### Integration Testing
- [ ] AppShell sidebar toggles on mobile
- [ ] Dark mode persists after refresh
- [ ] Navigation highlights active route
- [ ] Logout clears auth state

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

---

## Migration Timeline

### Week 1: Foundation
- ✅ Design tokens created
- ✅ Common components built
- ✅ AppShell layout created
- ✅ Landing page built
- [ ] Import tokens in main.ts
- [ ] Register global components

### Week 2: Page Updates
- [ ] Update HomePage with KPICard
- [ ] Add EmptyStates to all list views
- [ ] Update ExpensesPage with PageHeader
- [ ] Update AccountsPage
- [ ] Update CategoriesPage

### Week 3: Advanced Features
- [ ] Build new Analytics page with charts
- [ ] Build Settings page (Profile, Security, Preferences)
- [ ] Add onboarding tour (Shepherd.js)
- [ ] Implement budgets feature

### Week 4: Polish & Optimization
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Mobile optimization
- [ ] Production deployment

---

## Support & Resources

- **Design System Documentation**: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- **PrimeVue Docs**: https://primevue.org
- **Design Tokens**: [vue-app/src/assets/design-tokens.css](vue-app/src/assets/design-tokens.css)
- **Component Examples**: See page implementations above

---

## Next Steps

1. **Immediate (Today)**:
   - Import `design-tokens.css` in main.ts
   - Register common components globally
   - Test Landing page at `http://localhost:5173/`

2. **This Week**:
   - Wrap App.vue with AppShell
   - Update HomePage with new KPICard components
   - Add EmptyState to all list pages

3. **This Month**:
   - Build Settings page
   - Implement Analytics redesign
   - Add onboarding tour
   - Launch dark mode toggle

4. **Next Quarter**:
   - Budget tracking feature
   - Bank integrations (Plaid)
   - Mobile app (PWA)
   - Multi-language support (i18n)

---

**Questions?** Review [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for design rationale and token reference.
