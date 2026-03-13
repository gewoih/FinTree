# DESIGN.md

Frontend UI/UX specification for FinTree.
Goal: consistent, predictable, accessible frontend behavior without design regressions when edited by humans or AI agents.

---

## 1) Scope and Authority

- This file is authoritative for frontend UI/UX behavior across all frontend implementations.
- It owns: UI/UX behavior, visual system rules, accessibility and responsive requirements, localization UX rules, and the frontend Definition of Done.
- It does not define backend architecture or implementation details.
- It does not prescribe a specific frontend framework or component library.
- If this file conflicts with `CLAUDE.md` on frontend topics, this file takes precedence.

---

## 2) Design Tokens

All visual values (colors, spacing, radius, shadows, fonts, transitions) must come from the design token system, not hardcoded values.

Token prefix: `--ft-*`

Rules:
- Never use raw hex, rgb, or hsl values in feature-level styles.
- Never use arbitrary fallback colors like `var(--token, #xxxxxx)`.
- Add new visual values to the token system before using them in feature styles.
- The token system is the single source of truth for the visual language.
- Do not use feature-level arbitrary visual literals such as `rounded-[...]`, `text-[...]`, `clamp(...)`, or ad hoc inline gradients when a tokenized value is intended.
- When chart/category colors must be deterministic, resolve them from the global token palette in the frontend instead of trusting backend-provided decorative colors.

When integrating with a component library (e.g. shadcn, MUI, Ant Design), map `--ft-*` tokens to the library's semantic variables in a single mapping layer. Do not maintain two parallel token sets.

---

## 3) Theming

- Dark theme is the default.
- Light theme is activated via the `.light-mode` class on `<html>`.
- Theme preference is persisted in `localStorage`.
- Theme class is applied before app mount to prevent flash of unstyled content.

Rules:
- Feature-level styles must not hard-code dark or light mode values — use semantic tokens that change with theme.
- Do not use `.dark-mode` or `.light-mode` selectors inside feature components.
- All interactive states (hover, focus, disabled, active) must respect both themes via semantic tokens.

---

## 4) Style Ownership

Rules:
- **One component, one file.** A component's styles live only in that component's file.
- Before editing any style: identify every place styles are defined for that component. If styles are spread across multiple files, co-locate them first, then make the change.
- Shared layout patterns (cards, sections, stat blocks) belong in shared style utilities, not in feature components.
- Visual state theming (hover, focus, disabled) is centralized in the design system layer, not per-component ad hoc.
- Do not introduce feature-local visual tokens or pseudo-tokens inside a page/component. If existing global tokens are insufficient, extend the global token system first.

CSS verification after any style change:
1. Verify the component in dark mode (default) and light mode (`.light-mode` on `<html>`)
2. Verify at mobile (360px) and desktop (1280px) breakpoints
3. Verify no horizontal overflow at 360px, 768px, and desktop widths
4. Do not mark a task complete without this verification

---

## 5) Accessibility Standards (Measurable)

Keyboard and focus:
- All interactive controls must be reachable and operable by keyboard.
- No keyboard trap is allowed.
- Visible `:focus-visible` is mandatory.
- Focus indicator contrast against adjacent colors must be at least `3:1`.

Touch and pointer targets:
- Minimum touch target for actionable controls is `44×44` CSS px.

Contrast:
- Normal text: at least `4.5:1` (WCAG 2.2 AA)
- Large text (≥24px regular or ≥18.66px bold): at least `3:1`
- Non-text UI components and focus indicators: at least `3:1` against adjacent colors

Semantics and assistive tech:
- Icon-only actions must have an accessible name (`aria-label` or equivalent).
- Form errors must be programmatically associated with fields (e.g. `aria-describedby`).
- Validation and async status messages must be announced via `aria-live`:
  - `polite` for non-blocking updates
  - `assertive` for blocking/critical errors
- Meaning must not be conveyed by color alone.

Motion accessibility:
- Respect `prefers-reduced-motion: reduce` by disabling or minimizing non-essential motion.

---

## 6) Responsive Contract

- Supported viewport floor is `360px`.
- Core breakpoints:
  - `640px` (small/mobile transition)
  - `768px` (tablet)
  - `1024px` (desktop)

Rules:
- New/changed layouts must not introduce horizontal page overflow at `360px`, `768px`, and desktop widths (`≥1280px`).
- Dense data UI (tables, charts) must remain usable on mobile via responsive reflow or explicit scroll containers.

---

## 7) Forms and Validation UX

- Form controls must expose a clear validation API with error state and message.
- Label, hint, error, and focus behavior must be visually consistent across all screens.
- Validation errors must be shown inline, associated with the specific field.
- Destructive actions require explicit user confirmation (confirmation dialog).
- Form submission must show a loading state while in progress.

---

## 8) Data-State UX Contract

Every data-driven screen must explicitly handle all 5 states:
- `idle` — before first fetch or precondition not met
- `loading` — fetch in progress (show skeleton, not spinner where possible)
- `error` — fetch failed, with a retry action
- `empty` — fetch succeeded but no data exists
- `success` — data available, render content

Rules:
- Avoid hidden intermediate states.
- Avoid side effects inside derived/computed values.
- Avoid duplicate or redundant requests.
- When revalidating in the background, keep last known good data visible unless data is no longer valid.

---

## 9) Content and Localization

Default:
- End-user UI copy is Russian.
- Financial terms include clear hints or tooltips in plain Russian when needed.
- Date, number, and currency formatting uses `ru-RU` locale.

Scoped English exceptions allowed:
- Brand and product names
- Financial tickers, codes, and currency codes (`AAPL`, `ETF`, `USD`, `EUR`)
- Legally mandated terms or third-party proper nouns
- Standardized acronyms that are materially clearer in established form (`PIN`, `IBAN`)

Exception rules:
- The surrounding sentence remains Russian.
- On first use of a non-obvious English term, provide a brief Russian hint or tooltip.
- Avoid mixed-language phrasing when a clear Russian equivalent exists.

---

## 10) Visual and Motion Patterns

Typography:
- UI font: Inter
- Sizes and weights must come from tokens.
- Financial amounts: `font-variant-numeric: tabular-nums`, right-aligned in tables.

Surfaces:
- Cards and panels use semantic surface, border, and shadow tokens.
- Avoid random mixing of glass or gradient treatments across adjacent sections.
- Page-level or card-level gradients are prohibited unless they are explicitly defined as reusable design-system surfaces.

Motion:
- Use transition tokens.
- Keep animations short and functional.
- Non-essential UI transitions: `120ms` to `300ms` range.

Charts:
- Do not hardcode color arrays in feature components — use design token values.
- Do not consume backend chart/decorative colors directly in feature rendering without passing through a frontend token/palette resolver.
- Chart containers must have `role="img"` and `aria-label`.
- Use `ResponsiveContainer` (or equivalent) for adaptive sizing.
