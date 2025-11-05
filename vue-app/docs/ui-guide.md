# FinTree UI Guide

## Color Tokens
| Token | Light Mode | Dark Mode | Usage |
| --- | --- | --- | --- |
| `--ft-primary-600` | `#2563EB` | `#2563EB` | Actions, primary highlights |
| `--ft-success-500` | `#22C55E` | `#22C55E` | Positive indicators, success tags |
| `--ft-warning-500` | `#F59E0B` | `#F59E0B` | Caution banners, warning badges |
| `--ft-danger-500` | `#EF4444` | `#EF4444` | Destructive actions, error text |
| `--ft-info-500` | `#0EA5E9` | `#0EA5E9` | Informational pills, links |
| `--ft-surface-soft` | `#FFFFFF` | `#1F2937` | Card backgrounds, elevated surfaces |
| `--ft-border-soft` | `#E5E7EB` | `#374151` | Panel outlines, separators |
| `--ft-text-primary` | `#0B1220` | `#F3F4F6` | Default text |
| `--ft-text-muted` | `#6B7280` | `#94A3B8` | Secondary text, helper copy |

## Typography Scale
| Token | Size | Weight | Usage |
| --- | --- | --- | --- |
| `--ft-text-3xl` | 32px | Bold | Page hero headings |
| `--ft-text-2xl` | 28px | Bold | Section headers |
| `--ft-text-xl` | 24px | Semibold | Card titles |
| `--ft-text-lg` | 20px | Semibold | KPI numbers |
| `--ft-text-base` | 16px | Medium | Body copy |
| `--ft-text-sm` | 14px | Regular | Metadata, helper text |
| `--ft-text-xs` | 12px | Medium | Labels, tag captions |

## Spacing System
| Token | Value | Usage |
| --- | --- | --- |
| `--ft-space-1` | 4px | Tight inline gaps |
| `--ft-space-2` | 8px | Icon + label spacing |
| `--ft-space-3` | 12px | Form controls, pill padding |
| `--ft-space-4` | 16px | List item gutters |
| `--ft-space-5` | 20px | Card padding |
| `--ft-space-6` | 24px | Section blocks |
| `--ft-space-8` | 32px | Page layout rhythm |
| `--ft-space-10` | 40px | Page hero breathing room |

## Atom Components
- **AppButton** — Unified button styling with `variant`, `size`, `block`, loading state, focus ring.
- **FormField** — Accessible label, hint, error messaging with slot-exposed control attributes.
- **AppCard** — Surface wrapper enforcing padding scale, elevation, and variants.
- **FinancialHealthSummaryCard** — Analytics summary card handling loading, empty, and data-ready states.
- **EmptyState** — Standardized empty/error block with icon, title, action.

## State Patterns
| State | Components | Treatment |
| --- | --- | --- |
| Loading | `FinancialHealthSummaryCard`, Analytics charts | Skeleton placeholders via `<Skeleton>` and `chart-container--loading` |
| Empty | `TransactionList`, `AnalyticsPage` charts | High-contrast icon, explanatory copy, primary CTA when available |
| Error | Toast via `useFormModal` | Blocking warnings with actionable copy |
| Focus | All buttons, inputs | `outline: 3px solid var(--ft-focus-ring)` with offset |
| Disabled | Buttons, selects | Reduced opacity, pointer disabled, no elevation |

## Viewport Breakpoints
- Mobile: `0 – 576px` — Single-column grids, stacked actions.
- Tablet: `576 – 992px` — Two-column cards, compact filter groups.
- Desktop: `992 – 1200px` — Three-column analytics grid.
- Wide: `1200px+` — Max container width `var(--ft-container-2xl)`.
