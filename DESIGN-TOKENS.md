# Design Tokens Reference

> Full token tables and scales for the FinTree design system.
> Tokens are defined in `vue-app/src/assets/design-tokens.css` with `--ft-*` prefix.

## Typography

**Font stack**:
- Body/UI: `Inter` (var `--ft-font-base`)
- Display/Headings: `Inter` (var `--ft-font-display`)
- Monospace/code/amounts: `JetBrains Mono` (var `--ft-font-mono`)

**Type scale** (rem-based for browser accessibility scaling):
| Token | Size | Use |
|---|---|---|
| `--ft-text-xs` | 12px | Captions, badges, meta text |
| `--ft-text-sm` | 14px | Secondary text, labels, table headers |
| `--ft-text-base` | 16px | Body text, form inputs, nav items |
| `--ft-text-lg` | 18px | Card titles, section subtitles |
| `--ft-text-xl` | 20px | Section headers |
| `--ft-text-2xl` | 24px | Page titles (mobile) |
| `--ft-text-3xl` | 32px | Page titles (desktop), hero stats |
| `--ft-text-4xl` | 40px | Hero display text |

**Weight rules**:
| Token | Weight | Use |
|---|---|---|
| `--ft-font-normal` (400) | Body text, descriptions |
| `--ft-font-medium` (500) | Nav links, form labels, secondary buttons |
| `--ft-font-semibold` (600) | Card titles, table headers, active nav, kickers |
| `--ft-font-bold` (700) | Page titles, hero stats, KPI values |

**Line height**:
- `--ft-leading-tight` (1.25): Headings, display text, KPI values
- `--ft-leading-normal` (1.5): Body text, descriptions, list items
- `--ft-leading-relaxed` (1.75): Long-form text, tooltips

**Financial amounts**: Always use `font-variant-numeric: tabular-nums` for aligned columns. For large KPI numbers, use `--ft-font-mono` with `--ft-font-bold`.

**Heading hierarchy per page**:
- `h1` — Page title (one per page)
- `h2` — Section title
- `h3` — Card title, subsection
- `h4` — Rarely used (nested subsection)
- Never skip heading levels

## Spacing System

**Scale** (4px base unit):
| Token | px | Common use |
|---|---|---|
| `--ft-space-1` | 4 | Icon-to-text gap, inline badge padding |
| `--ft-space-2` | 8 | Between related items, button icon gap, tab gap |
| `--ft-space-3` | 12 | Card internal gap, nav link padding, control group gap |
| `--ft-space-4` | 16 | Card padding (sm), section internal gap, form field gap |
| `--ft-space-5` | 20 | Card padding (md), stat card padding |
| `--ft-space-6` | 24 | Card padding (lg), surface panel padding, section gap |
| `--ft-space-8` | 32 | Page-level section gap, page container gap |
| `--ft-space-10` | 40 | Hero padding |
| `--ft-space-12` | 48 | Large section separator |

**Layout tokens** (responsive via `clamp()`):
- `--ft-layout-gutter`: Page horizontal padding (`clamp(16px, 3vw, 32px)`)
- `--ft-layout-page-padding`: Page vertical padding (`clamp(24px, 4vw, 40px)`)
- `--ft-layout-section-gap`: Gap between page sections (`clamp(24px, 3vw, 36px)`)
- `--ft-layout-card-gap`: Gap between cards in grid (`clamp(16px, 2vw, 24px)`)

**Spacing rules**:
- Inside cards/panels: `--ft-space-3` to `--ft-space-6` depending on card variant
- Between cards in grid: `--ft-space-4` (mobile) to `--ft-space-6` (desktop)
- Between page sections: `--ft-space-6` (mobile) to `--ft-space-8` (desktop)
- Form field vertical gap: `--ft-space-4`
- Button group gap: `--ft-space-3`
- Never use raw pixel values — always use spacing tokens

## Color & Contrast

**Semantic color roles**:
- `--ft-text-primary` on `--ft-bg-base`: Main content (WCAG AA minimum 4.5:1)
- `--ft-text-secondary` on `--ft-bg-base`: Supporting text (WCAG AA minimum 4.5:1)
- `--ft-text-tertiary`: Meta info, captions (WCAG AA minimum 3:1 for large text only)
- `--ft-text-disabled`: Disabled state (no contrast requirement, but must be visually distinct)

**Status colors** (always pair with icon or text, never color-only):
- Success: `--ft-success-500` — positive growth, income, completed actions
- Warning: `--ft-warning-500` — expiring subscriptions, approaching limits
- Danger: `--ft-danger-500` — losses, errors, destructive actions
- Info: `--ft-info-500` — neutral tips, informational tooltips

**Contrast rules**:
- Text on backgrounds: minimum 4.5:1 ratio (WCAG AA)
- Large text (≥18px bold or ≥24px): minimum 3:1 ratio
- Interactive elements borders: minimum 3:1 against adjacent colors
- Never rely on color alone for meaning — always pair with icons, text labels, or patterns
- Focus rings: 3px `--ft-focus-ring` with `outline-offset: 3px`

**Surface hierarchy** (dark theme):
```
--ft-bg-base (#0C1017)        ← page background
  --ft-bg-subtle (#111620)    ← subtle sections
    --ft-surface-base (#181F2C)   ← cards, panels
      --ft-surface-raised (#212A3C)  ← elevated cards, modals
        --ft-surface-overlay (#2A354A)  ← dropdowns, popovers
```

## Border Radius

| Token | px | Use |
|---|---|---|
| `--ft-radius-sm` | 6 | Small badges, inline tags |
| `--ft-radius-md` | 8 | Buttons (small), calendar cells, icon containers |
| `--ft-radius-lg` | 12 | Inputs, buttons, nav links, dropdowns, tabs |
| `--ft-radius-xl` | 16 | Cards, panels, modals, dialogs, table shells |
| `--ft-radius-2xl` | 24 | Hero cards, featured sections |
| `--ft-radius-full` | 9999px | Pills, avatars, circular icon buttons |

## Shadows

- `--ft-shadow-xs`: Subtle lift for inline elements
- `--ft-shadow-sm`: Default card shadow
- `--ft-shadow-md`: Primary buttons, elevated cards
- `--ft-shadow-lg`: Modals, dialogs
- `--ft-shadow-xl`/`--ft-shadow-2xl`: Hero sections, tooltips
- Shadows are stronger in dark theme (higher opacity) vs light theme

## Z-Index Scale

| Token | Value | Use |
|---|---|---|
| `--ft-z-base` | 0 | Default stacking |
| `--ft-z-above` | 1 | Within-component stacking (e.g., badge on card) |
| `--ft-z-raised` | 2 | Sticky table headers |
| `--ft-z-dropdown` | 1000 | Dropdowns, select panels |
| `--ft-z-sticky` | 1020 | Sticky top nav |
| `--ft-z-drawer` | 1030 | Side drawer (mobile nav) |
| `--ft-z-modal` | 1040 | Modal dialogs |
| `--ft-z-popover` | 1050 | Popovers, context menus |
| `--ft-z-toast` | 1060 | Toast notifications |
| `--ft-z-tooltip` | 1070 | Tooltips (always on top) |

## Motion & Transitions

- `--ft-transition-fast` (150ms): Hover states, focus rings, color changes
- `--ft-transition-base` (220ms): Panel open/close, accordion, tab switch
- `--ft-transition-slow` (350ms): Page transitions, drawer slide
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — snappy with natural decel
- Card hover: `translateY(-2px)` + shadow change
- Button hover: `translateY(-1px)` + glow shadow
- `prefers-reduced-motion: reduce` disables all animations
- No decorative animations — motion is functional only (state change indicator)
