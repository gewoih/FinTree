# CSS Co-location Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all PrimeVue wrapper component styles from the 1,656-line `prime-unstyled-shared.css` monolith into co-located `<style scoped>` blocks in each `Ui*.vue` file, then delete the monolith.

**Architecture:** Each `Ui*.vue` becomes the single source of truth for its visual contract. PT continues injecting semantic `.ui-*` class names onto PrimeVue DOM elements. All CSS targeting those classes moves into the component's own scoped style block using `:deep()`. Shared selector blocks in the monolith are split per component — duplication within scoped blocks is intentional and desired.

**Tech Stack:** Vue 3 SFC `<style scoped>`, `:deep()` pseudo-element, `--ft-*` CSS custom properties, `@layer overrides`, stylelint, vue-tsc

---

## Critical Rules for Every Task

- **Only `--ft-*` tokens** as values — no raw hex, no hardcoded px colors
- **No `!important`** — use specificity if needed
- **`:deep()`** for any PrimeVue-generated child elements
- **No `.light-mode` / `.dark-mode`** selectors — semantic tokens handle theming
- After every component task: `cd vue-app && npm run lint:style` must pass with 0 warnings

### Handling Shared Selector Blocks

`prime-unstyled-shared.css` has blocks that combine multiple components in one selector (e.g. the focus ring at line 119 targets `.ui-button`, `.ui-input`, `.ui-select`, etc. together). Strategy:

- **Extract** the relevant class(es) for the component being migrated
- **Rewrite** as a standalone rule in the component's scoped block
- **Remove** only that component's selector from the shared block, leaving the rest intact
- When the **last** component in a shared block is migrated, delete the entire shared block

---

## Task 1: Update Instructions (DESIGN.md + CLAUDE.md)

**Files:**
- Modify: `DESIGN.md` — Section 2 "Source of Truth and Style Ownership"
- Modify: `CLAUDE.md` — Global Guardrails section

### Step 1: Update DESIGN.md Section 2 ownership table

Find Section `## 2) Source of Truth and Style Ownership` in `DESIGN.md`.

Replace the "Ownership by file" block and "Rules" block with:

```markdown
Ownership by file:
- `vue-app/src/assets/design-tokens.css` — all `--ft-*` tokens. No visual rules.
- `vue-app/src/style.css` — global reset, `html`/`body`, typography base, scrollbar
- `vue-app/src/styles/theme.css` — shared layout patterns only (`.ft-card`, `.ft-section`, `.ft-stat`, etc.). Nothing PrimeVue-related.
- `vue-app/src/ui/Ui*.vue` `<style scoped>` — 100% of that wrapper's visual contract. All `:deep()` for PrimeVue internals. This is the only place PrimeVue wrapper styles live.
- `vue-app/src/styles/components/` — feature components too large for inline scoped styles (non-PrimeVue)
- `vue-app/src/styles/pages/` — page-level layout only

Rules:
- **One component, one file.** A component's styles live only in that component's file.
- When touching `UiButton`, edit `UiButton.vue` only. Never touch a shared file to fix a specific component's appearance.
- Before editing any CSS: identify every file that contains styles for the target component. If more than one file, co-locate first, then make the visual change.
- PrimeVue wrapper styles must never live in `theme.css`, `style.css`, or any shared CSS file.
```

Also replace the "SFC Style Extraction" subsection to remove the reference to `prime-unstyled-shared.css` and add:

```markdown
### CSS Verification Gate

After any CSS change:
1. Run `cd vue-app && npm run lint:style` — must pass with 0 warnings
2. Verify the component in dark mode (default) and light mode (`.light-mode` on `<html>`)
3. Verify at mobile (360px) and desktop (1280px) breakpoints
4. Do not mark a task complete without this verification
```

### Step 2: Update CLAUDE.md Global Guardrails

Add after the existing "Never commit" rule:

```markdown
- **CSS blast radius rule.** Before editing any CSS, identify every file that contains styles for the component you are changing. If that list has more than one file, co-locate all styles into the component file first, then make the visual change. Never edit a shared CSS file to fix a specific component's appearance.
```

### Step 3: Verify

```bash
cd vue-app && npm run lint:style
```

Expected: PASS, 0 warnings.

---

## Task 2: Migrate UiBadge

**Files:**
- Modify: `vue-app/src/ui/UiBadge.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find UiBadge styles in the monolith

```bash
grep -n "ui-badge\|\.p-badge" vue-app/src/styles/prime-unstyled-shared.css
```

Note all line numbers.

### Step 2: Read UiBadge.vue and the monolith lines

Read `vue-app/src/ui/UiBadge.vue` in full and the badge-related lines from the monolith.

### Step 3: Add `<style scoped>` to UiBadge.vue

Add a `<style scoped>` block at the end of `UiBadge.vue` containing all badge styles. Use `:deep()` for any PrimeVue-generated child elements. Example shape:

```vue
<style scoped>
.ui-badge {
  /* migrated styles */
}

:deep(.ui-badge__value) {
  /* migrated styles */
}
</style>
```

### Step 4: Remove badge lines from monolith

Delete the lines identified in Step 1 from `prime-unstyled-shared.css`. For shared selector blocks (e.g. focus ring), remove only the `.ui-badge` / `.p-badge` entries from the selector list.

### Step 5: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

Expected: PASS, 0 warnings.

---

## Task 3: Migrate UiCheckbox + UiToggleSwitch

**Files:**
- Modify: `vue-app/src/ui/UiCheckbox.vue`
- Modify: `vue-app/src/ui/UiToggleSwitch.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles in monolith

```bash
grep -n "ui-checkbox\|ui-toggle-switch\|\.p-checkbox\|\.p-toggleswitch" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read both component files

Read `UiCheckbox.vue` and `UiToggleSwitch.vue` in full.

### Step 3: Add `<style scoped>` to UiCheckbox.vue

Extract all `.ui-checkbox__*` and `.p-checkbox*` selectors. Rewrite as scoped styles with `:deep()` for child elements.

Pay attention to the focus ring block (around line 131-133 in monolith):
```css
/* In UiCheckbox.vue scoped — extract from shared focus block */
.ui-checkbox__root:has(.ui-checkbox__input:focus-visible) .ui-checkbox__box {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
```

### Step 4: Add `<style scoped>` to UiToggleSwitch.vue

Extract all `.ui-toggle-switch__*` and `.p-toggleswitch*` selectors. Same approach for focus ring.

### Step 5: Remove from monolith

Remove all checkbox and toggle-switch selectors from the monolith. For shared blocks, remove only those entries.

### Step 6: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 4: Migrate UiSkeleton + UiMessage

**Files:**
- Modify: `vue-app/src/ui/UiSkeleton.vue`
- Modify: `vue-app/src/ui/UiMessage.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-skeleton\|ui-message\|\.p-skeleton\|\.p-message" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read component files, migrate, remove from monolith

Same process as Task 3. Add `<style scoped>` to each, migrate styles, remove from monolith.

### Step 3: Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 5: Migrate UiSection

**Files:**
- Modify: `vue-app/src/ui/UiSection.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-section" vue-app/src/styles/prime-unstyled-shared.css
```

If no results: UiSection has no styles in the monolith — skip to verify.

### Step 2: Read and migrate if styles found

Same process as previous tasks.

### Step 3: Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 6: Migrate UiButton

**Files:**
- Modify: `vue-app/src/ui/UiButton.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find UiButton styles in monolith

```bash
grep -n "ui-button\|\.p-button" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiButton.vue in full

Note: UiButton.vue already has a `<style scoped>` block. The migrated styles from the monolith must be **merged** into it, not added as a second style block.

### Step 3: Merge styles

Carefully merge the monolith's `.p-button` and `.ui-button` rules into the existing `<style scoped>` block in `UiButton.vue`. The existing scoped styles take precedence on conflicts — resolve by keeping the more specific/complete rule.

Focus ring (from shared block around line 119-120):
```css
/* Extract from shared focus ring block into UiButton.vue */
.ui-button:focus-visible {
  outline: 3px solid var(--ft-focus-ring);
  outline-offset: 3px;
}
```

### Step 4: Remove from monolith

Remove all `.p-button` and `.ui-button` selectors. Remove `.ui-button` entry from the shared focus ring block.

### Step 5: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 7: Migrate UiInputText

**Files:**
- Modify: `vue-app/src/ui/UiInputText.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find UiInputText styles

```bash
grep -n "ui-input\b\|\.p-inputtext" vue-app/src/styles/prime-unstyled-shared.css
```

Note: `.ui-input` appears in shared blocks alongside `.ui-input-number__root`, `.ui-select__root`, `.ui-date-picker__root`. Extract only the `.ui-input` / `.p-inputtext` portions.

### Step 2: Read UiInputText.vue in full

### Step 3: Add/merge `<style scoped>`

Create a self-contained style block covering:
- Base field appearance (background, border, height, padding, font)
- Focus ring (extracted from shared block)
- Placeholder color
- Disabled state
- Invalid state (`.ui-field--invalid`)
- Hover state

### Step 4: Remove `.ui-input` / `.p-inputtext` from shared blocks in monolith

For each shared block (e.g. focus ring, field base, disabled, placeholder, invalid), remove the `.ui-input` / `.p-inputtext` entries. Leave other components' entries in those blocks.

### Step 5: Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 8: Migrate UiInputNumber

**Files:**
- Modify: `vue-app/src/ui/UiInputNumber.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-input-number\|\.p-inputnumber" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiInputNumber.vue in full

### Step 3: Add/merge `<style scoped>`

Extract all `.ui-input-number__*` and `.p-inputnumber*` rules. Include the shared states (focus, disabled, invalid, placeholder) extracted from their combined blocks.

### Step 4: Remove from monolith

### Step 5: Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 9: Migrate UiSelect + UiSelectButton

**Files:**
- Modify: `vue-app/src/ui/UiSelect.vue`
- Modify: `vue-app/src/ui/UiSelectButton.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-select\|\.p-select\b" vue-app/src/styles/prime-unstyled-shared.css
grep -n "ui-select-button\|ui-select-overlay\|\.p-selectbutton" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read both component files

### Step 3: Migrate UiSelect

UiSelect is the largest — it includes the root trigger, overlay panel, header/filter, list, options, empty state. All go into `<style scoped>` in `UiSelect.vue`. The overlay panel (`.ui-select-overlay`) is a teleported element — use `:global(.ui-select-overlay)` or ensure the class is applied at the root level where scoping won't block it.

> **Note on teleported overlays:** PrimeVue renders Select overlays outside the component DOM tree. Scoped styles cannot reach teleported elements. Use `:global(.ui-select-overlay)` wrapped in the scoped block, or switch to a `<style>` (unscoped) block for overlay-only rules with a very specific class name.

### Step 4: Migrate UiSelectButton

Extract `.ui-select-button__*` and `.p-selectbutton*` rules.

### Step 5: Remove from monolith

### Step 6: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 10: Migrate UiDatePicker

**Files:**
- Modify: `vue-app/src/ui/UiDatePicker.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-date-picker\|\.p-datepicker" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiDatePicker.vue in full

### Step 3: Migrate

DatePicker has: root trigger, overlay panel (teleported), calendar header, month/year navigation, day grid, today indicator, selected state, other-month opacity. All go into `UiDatePicker.vue`.

Same teleported overlay caveat as UiSelect — use `:global(.ui-date-picker-overlay)` for overlay panel rules.

### Step 4: Clean up shared form-field blocks in monolith

After migrating UiInputText, UiInputNumber, UiSelect, and UiDatePicker — check each shared selector block (focus ring, field base, disabled, placeholder, invalid, hover). If a block's selector list is now empty or contains only `.p-*` fallbacks with no `.ui-*` entries remaining, delete the entire block.

```bash
grep -n "ui-input\b\|ui-input-number\|ui-select\b\|ui-date-picker" vue-app/src/styles/prime-unstyled-shared.css
```

Expected: 0 results.

### Step 5: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 11: Migrate UiMenu

**Files:**
- Modify: `vue-app/src/ui/UiMenu.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-menu\|\.p-menu\b" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiMenu.vue

### Step 3: Migrate

Menu is an overlay (teleported). Use `:global(.ui-menu__root)` for the overlay panel. Items, separators, labels all go as scoped or global with specific class names.

### Step 4: Remove from monolith + Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 12: Migrate UiToastHost + UiPaginator

**Files:**
- Modify: `vue-app/src/ui/UiToastHost.vue`
- Modify: `vue-app/src/ui/UiPaginator.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-toast\|ui-paginator\|\.p-toast\|\.p-paginator" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read both component files

### Step 3: Migrate Toast

Toast messages are rendered as a fixed overlay. Use `:global(.ui-toast__*)` for the container and message elements since they're rendered outside the component tree.

### Step 4: Migrate Paginator

Paginator is inline — standard `<style scoped>` with `:deep()` works.

### Step 5: Remove from monolith + Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 13: Migrate UiCard

**Files:**
- Modify: `vue-app/src/ui/UiCard.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-card\|\.p-card\b" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiCard.vue

UiCard.vue already has a `<style scoped>` block — merge, don't duplicate.

### Step 3: Migrate + Remove from monolith + Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 14: Migrate UiDialog + UiConfirmDialogHost

**Files:**
- Modify: `vue-app/src/ui/UiDialog.vue`
- Modify: `vue-app/src/ui/UiConfirmDialogHost.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-dialog\|ui-confirm-dialog\|\.p-dialog\b" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read both component files

### Step 3: Migrate Dialog

Dialog uses a mask (`.ui-dialog__mask`) and the dialog root. The mask and dialog root are teleported — use `:global(.ui-dialog__mask)` and `:global(.ui-dialog__root)` for those.

Responsive rules (mobile max-height, full-width) also go into the dialog's styles.

### Step 4: Migrate ConfirmDialogHost

Extract `.ui-confirm-dialog__*` rules. Keep the confirm dialog's visual contract fully in `UiConfirmDialogHost.vue`.

### Step 5: Remove from monolith

Check: the overlay/mask block at the very top of the monolith (lines 10-33) covers both Dialog and Drawer. Remove Dialog entries, leave Drawer entries. When Drawer is migrated in the next task, delete the remainder of that block.

### Step 6: Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 15: Migrate UiDrawer

**Files:**
- Modify: `vue-app/src/ui/UiDrawer.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-drawer\|\.p-drawer\b" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiDrawer.vue

### Step 3: Migrate

Mask and drawer root are teleported — use `:global()`. After migrating, the shared mask block from lines 10-33 should now be empty of all entries. Delete the entire block.

### Step 4: Remove from monolith + Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 16: Migrate UiDataTable

**Files:**
- Modify: `vue-app/src/ui/UiDataTable.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-datatable\|ui-data-table\|\.p-datatable" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiDataTable.vue

### Step 3: Migrate

DataTable is the most complex — sticky header, striped rows, hover state, sort icons, paginator integration. All go into `UiDataTable.vue <style scoped>`. The table itself is not teleported — standard `:deep()` works throughout.

### Step 4: Remove from monolith + Verify

```bash
cd vue-app && npm run lint:style
cd vue-app && npm run type-check
```

---

## Task 17: Migrate UiChart

**Files:**
- Modify: `vue-app/src/ui/UiChart.vue`
- Modify: `vue-app/src/styles/prime-unstyled-shared.css`

### Step 1: Find styles

```bash
grep -n "ui-chart\|\.p-chart" vue-app/src/styles/prime-unstyled-shared.css
```

### Step 2: Read UiChart.vue, migrate, remove from monolith

### Step 3: Verify

```bash
cd vue-app && npm run lint:style
```

---

## Task 18: Delete the Monolith

**Files:**
- Delete: `vue-app/src/styles/prime-unstyled-shared.css`
- Modify: `vue-app/src/main.ts`

### Step 1: Confirm monolith is empty (or only has the layer wrapper)

```bash
cat vue-app/src/styles/prime-unstyled-shared.css
```

Expected: only `@layer overrides { }` wrapper with no rules inside, or completely empty.

If any rules remain: identify which component they belong to and complete that component's migration before proceeding.

### Step 2: Remove the import from main.ts

Find and delete this line in `vue-app/src/main.ts`:

```typescript
import './styles/prime-unstyled-shared.css';
```

### Step 3: Delete the file

```bash
rm vue-app/src/styles/prime-unstyled-shared.css
```

### Step 4: Run full verification suite

```bash
cd vue-app && npm run type-check
cd vue-app && npm run lint
cd vue-app && npm run lint:style
cd vue-app && npm run lint:design-contract
cd vue-app && npm run lint:prime-imports
cd vue-app && npm run lint:api-boundaries
cd vue-app && npm run build
```

Expected: all pass, 0 warnings, build succeeds.

---

## Completion Checklist

- [ ] `prime-unstyled-shared.css` deleted
- [ ] Import removed from `main.ts`
- [ ] Every `Ui*.vue` has a self-contained `<style scoped>` (or `:global` for teleported overlays)
- [ ] DESIGN.md Section 2 updated with new ownership model + CSS verification gate
- [ ] CLAUDE.md updated with blast radius rule
- [ ] All lint + type-check + build checks pass
- [ ] Visually verified: dark + light mode, mobile (360px) + desktop (1280px)
