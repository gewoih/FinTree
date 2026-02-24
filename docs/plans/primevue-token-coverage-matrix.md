# PrimeVue Token Coverage Matrix

Reference scope for styled theming migration in FinTree.

## Ownership Model

1. Preset first: `vue-app/src/theme/fintree-prime-preset.ts`
2. Wrapper/shared contract second: `vue-app/src/ui/*`, `vue-app/src/style.css`
3. Feature CSS last resort: layout-only `.p-*` selectors (no visual state theming)

## Matrix

| Component | Default | Hover | Focus | Disabled | Invalid | Active/Selected | Owner |
|---|---|---|---|---|---|---|---|
| `button` | tokenized | tokenized | tokenized | tokenized | n/a | tokenized | Preset + `UiButton` API |
| `inputtext` | tokenized | tokenized | tokenized | tokenized | tokenized | n/a | Preset |
| `inputnumber` | tokenized | tokenized | tokenized | tokenized | tokenized | n/a | Preset (semantic + overrides layer) |
| `select` | tokenized | tokenized | tokenized | tokenized | tokenized | tokenized | Preset |
| `datepicker` | tokenized | tokenized | tokenized | tokenized | via host input tokens | tokenized | Preset |
| `dialog` | tokenized | n/a | tokenized (controls) | n/a | n/a | n/a | Preset + minimal layout overrides |
| `drawer` | tokenized | n/a | tokenized (controls) | n/a | n/a | n/a | Preset + app-shell layout overrides |
| `message` | tokenized | tokenized | tokenized | n/a | n/a | severity states tokenized | Preset |
| `paginator` | tokenized | tokenized | tokenized | tokenized | n/a | tokenized | Preset |
| `selectbutton` | tokenized (limited native) | shared class | shared class | shared class | tokenized + shared class | shared class (+ semantic variant in transaction form) | Shared contract + preset |

## Notes from PrimeVue MCP

1. Styled mode recommends design-token customization over class overrides.
2. Keep `colorScheme` structure consistent with preset source when overriding scheme-aware tokens.
3. `selectbutton` has minimal built-in tokens (`border.radius`, `invalid.border.color`), so richer state styling is expected at wrapper/shared-contract layer.
