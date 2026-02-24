# PrimeVue Styled Theming Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish migration to PrimeVue styled theming so component visuals are driven primarily by PrimeVue design tokens and the FinTree preset, not ad-hoc feature CSS overrides.

**Architecture:** Keep `design-tokens.css` as FinTree source-of-truth tokens, map them into PrimeVue via `definePreset`, and move component state visuals (hover/focus/active/invalid/disabled) into preset component tokens first. Reserve local `:deep(.p-...)` in feature files for layout-only cases and migrate visual overrides into wrappers or preset config.

**Tech Stack:** Vue 3, PrimeVue 4 styled mode, `@primeuix/themes` (`definePreset`), CSS Layers, ESLint, Stylelint, design-contract and API-boundary checks.

---

## PrimeVue MCP Findings (Used to Shape Plan)

1. PrimeVue Styled docs (`https://primevue.org/styled`) recommend token-first customization and treat class overrides as last resort.
2. Theme architecture is `primitive -> semantic -> component` tokens; `colorScheme` structure must match preset structure or overrides can be ignored.
3. Global config supports `theme.options.darkModeSelector` and `theme.options.cssLayer`, which this repo already uses.
4. Relevant tokenized components confirmed via MCP:
   - `inputtext`, `select`, `datepicker`, `dialog`, `paginator`, `message`, `button`
   - `selectbutton` has limited native tokens (only border radius and invalid border color), so it needs wrapper-level class contract for richer brand states.

## Current State Snapshot (As-Is)

1. Styled mode is already enabled in [`vue-app/src/main.ts`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/main.ts) with `unstyled: false`, custom preset, dark selector, and css layer order.
2. Custom preset already exists in [`vue-app/src/theme/fintree-prime-preset.ts`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/theme/fintree-prime-preset.ts).
3. There is still heavy visual use of `.p-*` selectors across feature CSS (for dialogs/forms/selectbutton/inputnumber/search controls), which prevents full theming centralization.
4. `DESIGN.md` currently prescribes wrapper-only Prime usage, but codebase currently imports many Prime components directly in `pages/` and `components/`.

## Scope

In scope:
1. Finalize styled-theming foundation.
2. Centralize Prime visual contracts (token/preset/wrapper/shared layer).
3. Remove feature-level Prime visual overrides where possible.
4. Keep layout-only local overrides where tokenization is not applicable.
5. Update design contract docs to match enforceable architecture.

Out of scope:
1. Full UI redesign.
2. Rewriting all feature components at once.
3. Introducing new design tokens unrelated to Prime theming.

---

### Task 1: Align Frontend Contract With Actual Styled Architecture

**Files:**
- Modify: [`DESIGN.md`](/Users/nranenko/Desktop/Projects/FinTree/DESIGN.md)
- Modify: [`CLAUDE.md`](/Users/nranenko/Desktop/Projects/FinTree/CLAUDE.md)
- Modify: [`docs/plans/2026-02-24-primevue-styled-migration-plan.md`](/Users/nranenko/Desktop/Projects/FinTree/docs/plans/2026-02-24-primevue-styled-migration-plan.md) (optional: mark superseded)

**Step 1: Write a failing contract check case (documentation-level)**
- Add explicit target statements in plan notes:
  - PrimeVue styled + preset is the default architecture.
  - Feature `.p-*` visual theming is disallowed; layout-only exceptions are allowed.
  - Wrapper strategy is selective (only where UX API needs stable abstraction).

**Step 2: Verify current docs fail these expectations**
- Manually compare existing `DESIGN.md` section 5 rules against real code imports and `main.ts` styled config.
- Expected: mismatch documented in notes.

**Step 3: Apply minimal doc corrections**
- Update contract wording to:
  - Permit direct Prime imports from approved list.
  - Require visual state centralization in preset/wrappers/shared layers.
  - Keep explicit prohibition on feature-level visual theming with `.p-*`.

**Step 4: Run doc-adjacent checks**
- Run: `cd vue-app && npm run lint:design-contract`
- Expected: PASS

---

### Task 2: Build a Token Coverage Matrix for High-Traffic Prime Components

**Files:**
- Create: [`docs/plans/primevue-token-coverage-matrix.md`](/Users/nranenko/Desktop/Projects/FinTree/docs/plans/primevue-token-coverage-matrix.md)
- Modify: [`vue-app/src/theme/fintree-prime-preset.ts`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/theme/fintree-prime-preset.ts)

**Step 1: Define target components**
- Include at minimum: `button`, `inputtext`, `inputnumber`, `select`, `datepicker`, `dialog`, `drawer`, `message`, `paginator`, `selectbutton`.

**Step 2: Map each component’s required states**
- For each component define desired FinTree visual states:
  - `default`, `hover`, `focus-visible`, `disabled`, `invalid`, `active/selected`.

**Step 3: Map state ownership**
- For each state, assign one owner:
  - Preset token (`semantic/components`) when token exists.
  - Shared wrapper class if token is insufficient (`selectbutton`).
  - Local layout CSS only if neither of the above is possible.

**Step 4: Expand preset safely**
- Add missing `components.*` mappings in `fintree-prime-preset.ts`.
- Preserve `colorScheme.light/dark` structural parity when overriding scheme-aware tokens.

**Step 5: Verify preset compiles and styles load**
- Run: `cd vue-app && npm run type-check`
- Run: `cd vue-app && npm run build`
- Expected: PASS

---

### Task 3: Standardize SelectButton With Theming-First Strategy

**Files:**
- Modify: [`vue-app/src/style.css`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/style.css)
- Modify: [`vue-app/src/components/CategoryManager.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/CategoryManager.vue)
- Modify: [`vue-app/src/components/CategoryFormModal.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/CategoryFormModal.vue)
- Modify: [`vue-app/src/components/TransactionForm.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionForm.vue)
- Modify: [`vue-app/src/styles/components/transaction-form.css`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/components/transaction-form.css)

**Step 1: Define shared SelectButton visual contract**
- Introduce one shared class (for example `ft-select-button`) with token-driven inactive/active/hover/focus/border/radius/typography states.
- Keep class under component/shared layer and keep values token-only (`--ft-*`).

**Step 2: Apply shared class to all SelectButton usage**
- `CategoryManager`, `CategoryFormModal`, `TransactionForm`.

**Step 3: Keep semantic transaction colors via variant variables**
- Add modifier class in `TransactionForm` to keep expense/income semantic active states.
- Do not duplicate full SelectButton styling per feature.

**Step 4: Remove duplicated visual overrides**
- Delete feature-local SelectButton color/border overrides that are now covered by shared class.

**Step 5: Validate**
- Run: `cd vue-app && npm run lint:style:fix`
- Run: `cd vue-app && npm run lint:style`
- Expected: PASS with zero warnings.

---

### Task 4: Migrate Form and Overlay Visual Overrides Into Preset/Wrappers

**Files:**
- Modify: [`vue-app/src/theme/fintree-prime-preset.ts`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/theme/fintree-prime-preset.ts)
- Modify: [`vue-app/src/styles/components/transaction-form.css`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/components/transaction-form.css)
- Modify: [`vue-app/src/styles/components/transfer-form-modal.css`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/components/transfer-form-modal.css)
- Modify: [`vue-app/src/components/AccountFormModal.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/AccountFormModal.vue)
- Modify: [`vue-app/src/components/common/ListToolbar.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/common/ListToolbar.vue)
- Modify: [`vue-app/src/components/TransactionFilters.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionFilters.vue)

**Step 1: Identify visual-vs-layout `.p-*` rules**
- Visual rules to migrate: border/color/background/shadow/focus.
- Layout-only rules to keep: width/height/grid/overflow positioning.

**Step 2: Move visual ownership up**
- Add/update relevant component tokens in preset for `dialog`, `inputnumber`, `select`, `datepicker`, `message`, `paginator`.
- Keep layout-only selectors local.

**Step 3: Normalize focus treatment**
- Ensure focus ring values are token-driven and consistent with accessibility requirements (visible and contrast >= 3:1).

**Step 4: Remove conflicting feature-level visual rules**
- Remove rules that fight preset outputs and cause state divergence.

**Step 5: Validate**
- Run: `cd vue-app && npm run lint`
- Run: `cd vue-app && npm run lint:style`
- Run: `cd vue-app && npm run lint:api-boundaries`
- Expected: PASS

---

### Task 5: Introduce Thin Wrappers Only Where They Add UX/API Value

**Files:**
- Create/Modify (as needed):
  - [`vue-app/src/ui/UiInputText.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiInputText.vue)
  - [`vue-app/src/ui/UiSelect.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiSelect.vue)
  - [`vue-app/src/ui/UiDatePicker.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiDatePicker.vue)
  - [`vue-app/src/ui/UiInputNumber.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiInputNumber.vue)
  - [`vue-app/src/ui/UiSelectButton.vue`](/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/ui/UiSelectButton.vue) (optional)
- Modify call sites incrementally in feature components.

**Step 1: Define minimal wrapper API**
- Keep wrappers thin: pass-through props + stable `invalid/error` API and class hooks.
- Avoid duplicating PrimeVue behavior.

**Step 2: Migrate highest-risk forms first**
- Start with transaction/account/category flows.

**Step 3: Enforce visual ownership**
- Wrapper-level classes can express local component contracts where preset tokens are insufficient.

**Step 4: Keep migration incremental**
- Do not convert entire app in one PR/task; prioritize components with current style debt.

**Step 5: Validate**
- Run: `cd vue-app && npm run type-check`
- Expected: PASS

---

### Task 6: Verification and Manual QA Gate

**Files:**
- No code changes required; verification artifact can be captured in PR/task notes.

**Step 1: Run canonical frontend checks**
- Run:
  - `cd vue-app && npm run type-check`
  - `cd vue-app && npm run lint`
  - `cd vue-app && npm run lint:style`
  - `cd vue-app && npm run lint:design-contract`
  - `cd vue-app && npm run lint:api-boundaries`
  - `cd vue-app && npm run build`
- Expected: all PASS.

**Step 2: Manual responsive checks**
- Verify changed UI at `360px`, `768px`, and desktop (`>=1280px`).
- Confirm no horizontal overflow and no broken overlays.

**Step 3: Manual accessibility checks**
- Keyboard tab flow and visible focus on key pages.
- Confirm error states remain visible and associated with fields.

**Step 4: Manual theme checks**
- Validate dark and light mode render parity for updated components.

---

## Risk Register and Mitigations

1. Risk: Preset overrides silently ignored due to wrong `colorScheme` structure.
   - Mitigation: always mirror source token structure when overriding scheme-dependent tokens.
2. Risk: CSS specificity conflicts from legacy feature selectors.
   - Mitigation: migrate visual selectors first; keep layer order `reset, tokens, base, components, primevue, overrides`.
3. Risk: Large diff from broad wrapper migration.
   - Mitigation: migrate in slices by flow (transactions -> categories -> analytics filters), verify per slice.
4. Risk: Regression in SelectButton semantics.
   - Mitigation: shared base class + explicit semantic modifier for transaction type states.

## Milestone Sequencing

1. Contract alignment + token coverage matrix.
2. SelectButton standardization (quick visual consistency win).
3. Form and overlay visual migration to preset/wrappers.
4. Optional wrapper additions for form controls.
5. Full verification gate and stabilization.

