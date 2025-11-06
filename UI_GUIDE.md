# FinTree UI Design Guide
**Version:** 1.0
**Last Updated:** 2025-11-05

Этот документ описывает дизайн-систему FinTree: цвета, типографику, компоненты, отступы и best practices.

---

## 🎨 Design Tokens

### Color Palette

#### Primary (Blue — Trust & Stability)
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-primary-50` | #EFF6FF | Lightest background |
| `--ft-primary-100` | #DBEAFE | Light background |
| `--ft-primary-200` | #BFDBFE | Light accent |
| `--ft-primary-300` | #93C5FD | Medium light |
| `--ft-primary-400` | #60A5FA | Medium |
| `--ft-primary-500` | #3B82F6 | Primary medium |
| `--ft-primary-600` | #2563EB | **Primary brand color** |
| `--ft-primary-700` | #1D4ED8 | **Hover state** |
| `--ft-primary-800` | #1E40AF | Active state |
| `--ft-primary-900` | #1E3A8A | Darkest |

#### Success (Green)
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-success-500` | #22C55E | Success messages, positive trends |
| `--ft-success-600` | #16A34A | Success hover |

#### Warning (Amber)
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-warning-500` | #F59E0B | Warnings, important notes |
| `--ft-warning-600` | #D97706 | Warning hover |

#### Danger (Red)
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-danger-500` | #EF4444 | Errors, destructive actions |
| `--ft-danger-600` | #DC2626 | Error hover |

#### Neutrals (Gray)
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-gray-50` | #F9FAFB | Subtle background |
| `--ft-gray-100` | #F3F4F6 | Muted background |
| `--ft-gray-500` | #6B7280 | Tertiary text |
| `--ft-gray-700` | #374151 | Secondary text |
| `--ft-gray-950` | #0B1220 | Primary text (dark) |

---

### Semantic Colors

#### Light Theme
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-bg-base` | #FFFFFF | Main background |
| `--ft-text-primary` | `--ft-gray-950` | Headlines, body text |
| `--ft-text-secondary` | `--ft-gray-700` | Subtext, labels |
| `--ft-text-tertiary` | `--ft-gray-500` | Hints, placeholders |
| `--ft-border-subtle` | `--ft-gray-200` | Subtle borders |
| `--ft-border-default` | `--ft-gray-300` | Default borders |

#### Dark Theme
Apply `.dark-mode` class to `<html>` or `<body>`.

| Token | Value | Usage |
|-------|-------|-------|
| `--ft-bg-base` | `--ft-gray-950` | Main background |
| `--ft-text-primary` | `--ft-gray-50` | Headlines, body text |
| `--ft-text-secondary` | `--ft-gray-300` | Subtext, labels |
| `--ft-border-subtle` | `--ft-gray-800` | Subtle borders |

---

## 📐 Typography

### Font Families
| Token | Value |
|-------|-------|
| `--ft-font-base` | 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif |
| `--ft-font-mono` | 'SF Mono', 'Fira Code', 'Consolas', 'Liberation Mono', monospace |

### Font Sizes
| Token | Value (rem) | Pixels | Usage |
|-------|-------------|--------|-------|
| `--ft-text-xs` | 0.75rem | 12px | Tiny labels, badges |
| `--ft-text-sm` | 0.875rem | 14px | Small text, hints |
| `--ft-text-base` | 1rem | 16px | **Body text** |
| `--ft-text-lg` | 1.125rem | 18px | Large body, subheadings |
| `--ft-text-xl` | 1.25rem | 20px | Section headings |
| `--ft-text-2xl` | 1.5rem | 24px | Page subheadings |
| `--ft-text-3xl` | 2rem | 32px | Large headings, KPI values |
| `--ft-text-4xl` | 2.5rem | 40px | Hero headings |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-font-normal` | 400 | Body text |
| `--ft-font-medium` | 500 | Emphasized text, labels |
| `--ft-font-semibold` | 600 | Subheadings, buttons |
| `--ft-font-bold` | 700 | Headlines, important numbers |

### Line Heights
| Token | Value | Usage |
|-------|-------|-------|
| `--ft-leading-tight` | 1.25 | Headlines |
| `--ft-leading-normal` | 1.5 | Body text |
| `--ft-leading-relaxed` | 1.75 | Long-form content |

---

## 📏 Spacing Scale

**Base unit:** 4px

| Token | Value (rem) | Pixels | Usage |
|-------|-------------|--------|-------|
| `--ft-space-0` | 0 | 0px | No spacing |
| `--ft-space-1` | 0.25rem | 4px | Tiny gaps |
| `--ft-space-2` | 0.5rem | 8px | Small gaps |
| `--ft-space-3` | 0.75rem | 12px | Medium-small gaps |
| `--ft-space-4` | 1rem | 16px | **Standard gap** |
| `--ft-space-5` | 1.25rem | 20px | Medium gap |
| `--ft-space-6` | 1.5rem | 24px | Large gap |
| `--ft-space-8` | 2rem | 32px | XL gap |
| `--ft-space-10` | 2.5rem | 40px | 2XL gap |
| `--ft-space-12` | 3rem | 48px | 3XL gap |
| `--ft-space-16` | 4rem | 64px | 4XL gap |

### Usage Guidelines
- **Micro spacing (1-2):** Between icon and text, badge padding
- **Standard spacing (3-4):** Between form fields, card content
- **Section spacing (6-8):** Between sections, card padding
- **Page spacing (10-16):** Page margins, hero sections

---

## 🔲 Border Radius

| Token | Value (rem) | Pixels | Usage |
|-------|-------------|--------|-------|
| `--ft-radius-sm` | 0.375rem | 6px | Small elements |
| `--ft-radius-md` | 0.5rem | 8px | Inputs, buttons (small) |
| `--ft-radius-lg` | 0.75rem | 12px | **Inputs, buttons (default)** |
| `--ft-radius-xl` | 1rem | 16px | Cards (mobile) |
| `--ft-radius-2xl` | 1.5rem | 24px | **Cards (desktop)** |
| `--ft-radius-full` | 9999px | Full | Pills, avatars, badges |

---

## 🌑 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--ft-shadow-xs` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Subtle elevation |
| `--ft-shadow-sm` | `0 1px 3px 0 rgba(0,0,0,0.1)` | Small cards |
| `--ft-shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | **Default cards** |
| `--ft-shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | **Modal dialogs** |
| `--ft-shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Hero elements |

---

## ⚡ Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--ft-transition-fast` | 150ms cubic-bezier(0.22, 1, 0.36, 1) | Hovers, focus |
| `--ft-transition-base` | 220ms cubic-bezier(0.22, 1, 0.36, 1) | **Default animations** |
| `--ft-transition-slow` | 350ms cubic-bezier(0.22, 1, 0.36, 1) | Modals, drawers |

---

## 🧩 Component Sizes

### Inputs
| Token | Value (rem) | Pixels |
|-------|-------------|--------|
| `--ft-input-height-sm` | 2rem | 32px |
| `--ft-input-height-md` | 2.5rem | 40px |
| `--ft-input-height-lg` | 3rem | 48px |

### Buttons
| Token | Value (rem) | Pixels |
|-------|-------------|--------|
| `--ft-button-height-sm` | 2rem | 32px |
| `--ft-button-height-md` | 2.5rem | 40px |
| `--ft-button-height-lg` | 3rem | 48px |

**Минимальный touch target:** 44×44px (WCAG 2.5.5)

---

## 🎯 Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| Mobile | 0px | Default (mobile-first) |
| SM | 576px | Small tablets |
| MD | 768px | Tablets |
| LG | 992px | Small desktops |
| XL | 1200px | Large desktops |
| 2XL | 1536px | Ultra-wide screens |

### Media Query Examples
```css
/* Mobile first */
.element {
  padding: var(--ft-space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .element {
    padding: var(--ft-space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .element {
    padding: var(--ft-space-8);
  }
}
```

---

## 🧱 Atomic Components

### EmptyState
**Usage:** Показывается когда нет данных.

**Props:**
- `icon` (string, optional): PrimeIcon class (default: `pi-inbox`)
- `title` (string, required): Заголовок
- `description` (string, optional): Описание
- `actionLabel` (string, optional): Текст кнопки
- `actionIcon` (string, optional): Иконка кнопки

**Example:**
```vue
<EmptyState
  icon="pi-wallet"
  title="Нет счетов"
  description="Добавьте первый счет для начала работы"
  action-label="Добавить счет"
  @action="openModal"
/>
```

---

### KPICard
**Usage:** Карточки с ключевыми метриками.

**Props:**
- `title` (string): Название метрики
- `value` (string | number): Значение
- `icon` (string, optional): PrimeIcon class
- `trend` (number | null, optional): Процент изменения
- `trendLabel` (string, optional): Описание тренда
- `loading` (boolean): Показать скелетон
- `variant` ('default' | 'success' | 'warning' | 'danger'): Цветовая схема

**Example:**
```vue
<KPICard
  title="Общий баланс"
  :value="formatCurrency(12345, 'USD')"
  icon="pi-wallet"
  :trend="12.5"
  trend-label="по сравнению с прошлым месяцем"
  variant="success"
/>
```

---

### FormField
**Usage:** Обёртка для полей формы с лейблом, hint, error.

**Props:**
- `label` (string, optional): Лейбл поля
- `hint` (string, optional): Подсказка
- `error` (string, optional): Текст ошибки
- `required` (boolean): Обязательное поле
- `inputId` (string, optional): ID для связи label и input

**Example:**
```vue
<FormField
  label="Email"
  hint="Мы не передаём ваш email третьим лицам"
  :error="emailError"
  required
  input-id="user-email"
>
  <InputText id="user-email" v-model="email" type="email" />
</FormField>
```

---

### PageHeader
**Usage:** Заголовок страницы с breadcrumbs и actions.

**Props:**
- `title` (string): Заголовок страницы
- `subtitle` (string, optional): Подзаголовок
- `breadcrumbs` (array, optional): Хлебные крошки

**Slots:**
- `#actions`: Кнопки действий

**Example:**
```vue
<PageHeader
  title="Счета"
  subtitle="Управляйте всеми счетами"
  :breadcrumbs="[
    { label: 'Главная', to: '/dashboard' },
    { label: 'Счета' }
  ]"
>
  <template #actions>
    <Button label="Добавить" icon="pi pi-plus" @click="add" />
  </template>
</PageHeader>
```

---

## 🎨 Utility Classes

### Layout
```css
.page {
  /* Стандартная обёртка страницы */
  width: 100%;
  max-width: var(--ft-container-2xl);
  margin: 0 auto;
  padding: clamp(var(--ft-space-6), 4vw, var(--ft-space-10))
           clamp(var(--ft-space-4), 4vw, var(--ft-space-8));
}

.ft-card {
  /* Карточка */
  background: var(--ft-surface-soft);
  border: 1px solid var(--ft-border-soft);
  border-radius: var(--ft-radius-card);
  box-shadow: var(--ft-shadow-card);
  padding: clamp(var(--ft-space-5), 2vw, var(--ft-space-6));
}

.ft-glass {
  /* Стеклянный эффект */
  background: var(--ft-glass);
  border: 1px solid var(--ft-glass-border);
  backdrop-filter: blur(18px);
}
```

### Accessibility
```css
.sr-only {
  /* Screen reader only */
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## ✅ Best Practices

### Accessibility
1. **Всегда используйте semantic HTML:** `<button>`, `<nav>`, `<article>`, `<header>`
2. **Добавляйте ARIA-атрибуты:**
   - `role="dialog"` и `aria-modal="true"` для модальных окон
   - `aria-label` для кнопок только с иконками
   - `aria-hidden="true"` для декоративных иконок
   - `aria-live="polite"` для динамического контента
3. **Минимальный размер touch targets:** 44×44px
4. **Контраст текста:** Минимум WCAG AA (4.5:1 для обычного текста)
5. **Focus states:** Всегда видимы (`:focus-visible`)

### Responsive Design
1. **Mobile-first approach:** Начинайте с мобильной версии
2. **Используйте clamp() для fluid typography:**
   ```css
   font-size: clamp(1rem, 2vw, 1.5rem);
   ```
3. **Grid вместо фиксированных ширин:**
   ```css
   grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
   ```

### Performance
1. **Lazy load routes:**
   ```ts
   const HomePage = () => import('./pages/HomePage.vue')
   ```
2. **Используйте `<Suspense>` для async components**
3. **Debounce user input** (поиск, фильтры)

### CSS
1. **Используйте токены везде, избегайте magic numbers:**
   ```css
   /* ❌ Bad */
   padding: 0.625rem 1.125rem;

   /* ✅ Good */
   padding: var(--ft-space-2) var(--ft-space-3);
   ```

2. **Минимизируйте `!important`:** Используйте specificity или CSS layers

3. **Группируйте dark mode:**
   ```css
   .dark-mode {
     .component {
       color: var(--ft-text-primary);
     }
   }
   ```

### Vue 3
1. **Всегда используйте `<script setup>`**
2. **НЕ destructure props (теряется реактивность):**
   ```ts
   // ❌ Bad
   const { value } = props

   // ✅ Good
   props.value // или toRefs(props)
   ```
3. **Типизируйте emits:**
   ```ts
   const emit = defineEmits<{
     'update:modelValue': [value: string]
   }>()
   ```

---

## 🎨 Дизайн-паттерны

### Карточки с данными
```vue
<article class="ft-card">
  <header class="card-header">
    <h3>{{ title }}</h3>
    <StatusBadge :label="status" />
  </header>

  <dl class="card-meta">
    <div class="meta-row">
      <dt>Label</dt>
      <dd>{{ value }}</dd>
    </div>
  </dl>

  <footer class="card-actions">
    <Button label="Action" text />
  </footer>
</article>
```

### Формы
```vue
<form @submit.prevent="handleSubmit">
  <FormField
    label="Email"
    required
    :error="errors.email"
  >
    <InputText v-model="email" type="email" />
  </FormField>

  <div class="form-actions">
    <Button label="Отмена" severity="secondary" outlined />
    <Button label="Сохранить" type="submit" :loading="loading" />
  </div>
</form>
```

---

## 📦 Чеклист для нового компонента

- [ ] Используется `<script setup lang="ts">`
- [ ] Props типизированы через `defineProps<T>()`
- [ ] Emits типизированы через `defineEmits<T>()`
- [ ] Не используется destructuring props
- [ ] Все интерактивные элементы имеют `min-width/height: 44px`
- [ ] Декоративные иконки помечены `aria-hidden="true"`
- [ ] Кнопки с иконками имеют `aria-label`
- [ ] Используются дизайн-токены вместо magic numbers
- [ ] Нет `!important` в стилях
- [ ] Responsive design (mobile-first)
- [ ] Loading/Empty/Error states
- [ ] Dark mode support

---

**Автор:** Claude Code
**Версия:** 1.0
**Дата:** 2025-11-05
