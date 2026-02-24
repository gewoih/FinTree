import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
const primeOverridesCss = `
@layer overrides {
  .p-component {
    font-family: var(--ft-font-base);
    color: var(--ft-text-primary);
  }
  [role='tooltip'],
  .p-tooltip {
    pointer-events: none;
    position: absolute;
    z-index: var(--ft-z-tooltip);
    max-width: min(320px, calc(100vw - (var(--ft-space-4) * 2)));
  }
  [role='tooltip'] > [data-pc-section='arrow'],
  [role='tooltip'] > .p-tooltip-arrow,
  [role='tooltip'] > div:first-child {
    display: none;
  }
  [role='tooltip'] > [data-pc-section='text'],
  [role='tooltip'] > .p-tooltip-text,
  [role='tooltip'] > div:last-child {
    padding: var(--ft-space-2) var(--ft-space-3);
    font-size: var(--ft-text-sm);
    line-height: var(--ft-leading-normal);
    color: var(--ft-text-primary);
    background: var(--ft-surface-raised);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-md);
    box-shadow: var(--ft-shadow-md);
  }
  .p-dialog-mask {
    position: fixed;
    z-index: var(--ft-z-modal);
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--ft-space-4);
    background: var(--ft-bg-overlay);
    backdrop-filter: blur(2px);
  }
  .p-dialog {
    overflow: hidden;
    max-width: calc(100vw - (var(--ft-space-4) * 2));
    max-height: calc(100vh - (var(--ft-space-4) * 2));
    color: var(--ft-text-primary);
    background: var(--ft-surface-raised);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    box-shadow: var(--ft-shadow-lg);
  }
  .p-dialog .p-dialog-content {
    overflow: auto;
    background: var(--ft-surface-raised);
  }
  .p-dialog .p-dialog-footer {
    display: flex;
    gap: var(--ft-space-2);
    justify-content: flex-end;
  }
  .p-drawer-mask {
    position: fixed;
    z-index: var(--ft-z-drawer);
    inset: 0;
    background: var(--ft-bg-overlay);
    backdrop-filter: blur(2px);
  }
  .p-drawer {
    color: var(--ft-text-primary);
    background: var(--ft-surface-raised);
    border-inline-end: 1px solid var(--ft-border-default);
    box-shadow: var(--ft-shadow-lg);
  }
  .p-drawer .p-drawer-content {
    padding: 0;
  }
  .app-shell__drawer-mobile .p-drawer {
    width: 300px;
    background: linear-gradient(
      180deg,
      var(--ft-surface-raised),
      color-mix(in srgb, var(--ft-surface-base) 90%, var(--ft-surface-raised))
    );
    border-right: 1px solid var(--ft-border-default);
    box-shadow: var(--ft-effect-side-rail-shadow);
  }
  .app-shell__drawer-mobile .p-drawer-header {
    padding: var(--ft-space-6) var(--ft-space-5) var(--ft-space-4);
    border-bottom: 1px solid var(--ft-border-subtle);
  }
  .app-shell__drawer-mobile .p-drawer-content {
    display: flex;
    flex-direction: column;
    padding: var(--ft-space-4) var(--ft-space-5);
  }
  .p-inputtext {
    overflow: hidden;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--ft-control-height);
    padding: 0 var(--ft-space-4);
    font-size: var(--ft-text-base);
    line-height: var(--ft-leading-tight);
    color: var(--ft-text-primary);
    background: var(--ft-surface-base);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    transition:
      border-color var(--ft-transition-fast),
      background-color var(--ft-transition-fast),
      box-shadow var(--ft-transition-fast);
  }
  .p-inputtext:focus-visible {
    outline: 3px solid var(--ft-focus-ring);
    outline-offset: 3px;
  }
  .p-inputtext::placeholder {
    color: var(--ft-text-tertiary);
    opacity: 1;
  }
  .p-inputtext:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .p-inputtext.p-invalid,
  .p-inputtext[aria-invalid='true'] {
    border-color: var(--ft-danger-500);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
  }
  .p-inputnumber {
    overflow: hidden;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--ft-control-height);
    font-size: var(--ft-text-base);
    color: var(--ft-text-primary);
    background: var(--ft-surface-base);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    transition:
      border-color var(--ft-transition-fast),
      background-color var(--ft-transition-fast),
      box-shadow var(--ft-transition-fast);
  }
  .p-inputnumber:focus-within {
    outline: 3px solid var(--ft-focus-ring);
    outline-offset: 3px;
  }
  .p-inputnumber:not(.p-disabled):hover {
    background: color-mix(in srgb, var(--ft-surface-overlay) 72%, var(--ft-surface-base));
    border-color: var(--ft-border-strong);
  }
  .p-inputnumber.p-invalid,
  .p-inputnumber[aria-invalid='true'] {
    border-color: var(--ft-danger-500);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent);
  }
  .p-inputnumber-input {
    width: 100%;
    min-height: calc(var(--ft-control-height) - 2px);
    padding: 0 var(--ft-space-4);
    font-size: var(--ft-text-base);
    line-height: var(--ft-leading-tight);
    color: var(--ft-text-primary);
    font-variant-numeric: tabular-nums;
    background: transparent;
    border: 0;
    border-radius: 0;
    outline: 0;
  }
  .p-inputnumber-input::placeholder {
    color: var(--ft-text-tertiary);
    opacity: 1;
  }
  .p-inputnumber-input:disabled,
  .p-inputnumber.p-disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .p-inputtextarea {
    align-items: center;
    width: 100%;
    min-height: var(--ft-control-height);
    padding: var(--ft-space-3) var(--ft-space-4);
    font-size: var(--ft-text-base);
    line-height: var(--ft-leading-normal);
    color: var(--ft-text-primary);
    background: var(--ft-surface-base);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    transition:
      border-color var(--ft-transition-fast),
      background-color var(--ft-transition-fast),
      box-shadow var(--ft-transition-fast);
  }
  .p-inputtextarea::placeholder {
    color: var(--ft-text-tertiary);
    opacity: 1;
  }
  .p-toast {
    z-index: var(--ft-z-toast);
    display: grid;
    gap: var(--ft-space-2);
    width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
    min-width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
  }
  .p-toast-message {
    color: var(--ft-text-primary);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ft-surface-overlay) 92%, transparent) 0%,
      var(--ft-surface-raised) 100%
    );
    border: 1px solid color-mix(in srgb, var(--ft-border-default) 88%, var(--ft-border-strong));
    border-radius: var(--ft-radius-lg);
    box-shadow:
      0 18px 32px color-mix(in srgb, var(--ft-bg-base) 60%, transparent),
      0 2px 8px color-mix(in srgb, var(--ft-bg-base) 32%, transparent);
  }
  .p-toast .p-toast-message {
    overflow: hidden;
    padding: var(--ft-space-3);
    border-inline-start: 3px solid var(--ft-border-default);
  }
  .p-toast .p-toast-message.p-toast-message-success {
    border-inline-start-color: var(--ft-success-500);
  }
  .p-toast .p-toast-message.p-toast-message-info {
    border-inline-start-color: var(--ft-info-500);
  }
  .p-toast .p-toast-message.p-toast-message-warn {
    border-inline-start-color: var(--ft-warning-500);
  }
  .p-toast .p-toast-message.p-toast-message-error {
    border-inline-start-color: var(--ft-danger-500);
  }
  .p-toast .p-toast-message-content {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--ft-space-2);
    align-items: flex-start;
  }
  .p-toast .p-toast-message-icon {
    margin-top: 0.125rem;
    font-size: var(--ft-text-base);
    color: var(--ft-text-secondary);
  }
  .p-toast .p-toast-message-text {
    display: grid;
    gap: var(--ft-space-1);
    min-width: 0;
  }
  .p-toast .p-toast-summary {
    font-size: var(--ft-text-base);
    font-weight: var(--ft-font-semibold);
    line-height: var(--ft-leading-tight);
  }
  .p-toast .p-toast-detail {
    margin: 0;
    font-size: var(--ft-text-sm);
    line-height: var(--ft-leading-normal);
    color: var(--ft-text-secondary);
  }
  .p-toast .p-toast-button-container {
    align-self: flex-start;
  }
  .p-toast .p-toast-close-button {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: var(--ft-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--ft-radius-md);
    transition:
      color var(--ft-transition-fast),
      background-color var(--ft-transition-fast),
      border-color var(--ft-transition-fast);
  }
  .p-toast .p-toast-close-button:hover {
    color: var(--ft-text-primary);
    background: var(--ft-surface-overlay);
    border-color: var(--ft-border-default);
  }
  .p-toast .p-toast-close-icon {
    width: 1rem;
    height: 1rem;
  }
  .p-confirmdialog,
  .p-confirm-dialog {
    overflow: hidden;
    width: min(420px, calc(100vw - (var(--ft-space-4) * 2)));
    max-width: calc(100vw - (var(--ft-space-4) * 2));
    max-height: calc(100vh - (var(--ft-space-4) * 2));
    color: var(--ft-text-primary);
    background: var(--ft-surface-raised);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    box-shadow: var(--ft-shadow-lg);
  }
  .p-confirmdialog .p-dialog-header,
  .p-confirm-dialog .p-dialog-header {
    display: flex;
    gap: var(--ft-space-2);
    align-items: center;
    justify-content: space-between;
    padding: var(--ft-space-4) var(--ft-space-5);
    border-bottom: 1px solid var(--ft-border-soft);
  }
  .p-confirmdialog .p-dialog-title,
  .p-confirm-dialog .p-dialog-title {
    font-size: var(--ft-text-base);
    font-weight: var(--ft-font-semibold);
    color: var(--ft-heading);
  }
  .p-confirmdialog .p-dialog-close-button,
  .p-confirm-dialog .p-dialog-close-button {
    cursor: pointer;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: var(--ft-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--ft-radius-md);
    transition:
      color var(--ft-transition-fast),
      background-color var(--ft-transition-fast),
      border-color var(--ft-transition-fast);
  }
  .p-confirmdialog .p-dialog-close-button:hover,
  .p-confirm-dialog .p-dialog-close-button:hover {
    color: var(--ft-text-primary);
    background: var(--ft-surface-overlay);
    border-color: var(--ft-border-default);
  }
  .p-confirmdialog .p-dialog-content,
  .p-confirm-dialog .p-dialog-content {
    overflow: auto;
    display: flex;
    gap: var(--ft-space-3);
    align-items: flex-start;
    padding: var(--ft-space-5);
    background: var(--ft-surface-raised);
  }
  .p-confirmdialog .p-confirmdialog-icon,
  .p-confirm-dialog .p-confirm-dialog-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    font-size: var(--ft-text-lg);
    color: var(--ft-text-secondary);
  }
  .p-confirmdialog .p-confirmdialog-message,
  .p-confirm-dialog .p-confirm-dialog-message {
    font-size: var(--ft-text-sm);
    line-height: var(--ft-leading-normal);
    color: var(--ft-text-secondary);
  }
  .p-confirmdialog .p-dialog-footer,
  .p-confirm-dialog .p-dialog-footer {
    display: flex;
    gap: var(--ft-space-2);
    justify-content: flex-end;
    padding: var(--ft-space-3) var(--ft-space-5) var(--ft-space-4);
    border-top: 1px solid var(--ft-border-soft);
  }
  .p-confirmdialog .p-dialog-footer .p-button,
  .p-confirm-dialog .p-dialog-footer .p-button {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: var(--ft-control-height);
    padding: 0 var(--ft-space-4);
    font-size: var(--ft-text-base);
    font-weight: var(--ft-font-medium);
    border: 1px solid transparent;
    border-radius: var(--ft-radius-lg);
    transition:
      background-color var(--ft-transition-fast),
      border-color var(--ft-transition-fast),
      color var(--ft-transition-fast);
  }
  .p-confirmdialog .p-confirmdialog-reject-button,
  .p-confirm-dialog .p-confirm-dialog-reject {
    color: var(--ft-text-primary);
    background: var(--ft-surface-overlay);
    border-color: var(--ft-border-default);
  }
  .p-confirmdialog .p-confirmdialog-reject-button:hover:not(:disabled),
  .p-confirm-dialog .p-confirm-dialog-reject:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ft-surface-overlay) 80%, var(--ft-surface-raised));
    border-color: var(--ft-border-strong);
  }
  .p-confirmdialog .p-confirmdialog-accept-button,
  .p-confirm-dialog .p-confirm-dialog-accept {
    color: var(--ft-text-inverse);
    background: var(--ft-danger-500);
    border-color: var(--ft-danger-500);
  }
  .p-confirmdialog .p-confirmdialog-accept-button:hover:not(:disabled),
  .p-confirm-dialog .p-confirm-dialog-accept:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ft-danger-500) 85%, black);
    border-color: color-mix(in srgb, var(--ft-danger-500) 85%, black);
  }
  .p-confirmdialog .p-dialog-footer .p-button:disabled,
  .p-confirm-dialog .p-dialog-footer .p-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .txn-list__footer .p-paginator {
    padding: var(--ft-space-2);
    background: transparent;
    border: none;
  }
  @media (width <= 640px) {
    .p-dialog {
      width: 100vw !important;
      max-width: 100vw !important;
      max-height: 95vh;
      margin: 0;
      border-radius: var(--ft-radius-lg);
    }
    .p-dialog .p-dialog-footer {
      padding: var(--ft-space-3) var(--ft-space-4) var(--ft-space-4);
    }
  }
}
`;
const surfaceScale = {
  0: 'var(--ft-gray-50)',
  50: 'var(--ft-gray-50)',
  100: 'var(--ft-gray-100)',
  200: 'var(--ft-gray-200)',
  300: 'var(--ft-gray-300)',
  400: 'var(--ft-gray-400)',
  500: 'var(--ft-gray-500)',
  600: 'var(--ft-gray-600)',
  700: 'var(--ft-gray-700)',
  800: 'var(--ft-gray-800)',
  900: 'var(--ft-gray-900)',
  950: 'var(--ft-gray-950)',
};
export const FinTreePrimePreset = definePreset(Aura, {
  primitive: {
    zinc: {
      50: 'var(--ft-gray-50)',
      100: 'var(--ft-gray-100)',
      200: 'var(--ft-gray-200)',
      300: 'var(--ft-gray-300)',
      400: 'var(--ft-gray-400)',
      500: 'var(--ft-gray-500)',
      600: 'var(--ft-gray-600)',
      700: 'var(--ft-gray-700)',
      800: 'var(--ft-gray-800)',
      900: 'var(--ft-gray-900)',
      950: 'var(--ft-gray-950)',
    },
  },
  semantic: {
    primary: {
      50: 'var(--ft-primary-50)',
      100: 'var(--ft-primary-100)',
      200: 'var(--ft-primary-200)',
      300: 'var(--ft-primary-300)',
      400: 'var(--ft-primary-400)',
      500: 'var(--ft-primary-500)',
      600: 'var(--ft-primary-600)',
      700: 'var(--ft-primary-700)',
      800: 'var(--ft-primary-800)',
      900: 'var(--ft-primary-900)',
      950: 'var(--ft-primary-950)',
    },
    colorScheme: {
      light: {
        surface: surfaceScale,
      },
      dark: {
        surface: surfaceScale,
      },
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: 'var(--ft-focus-ring)',
      offset: '2px',
    },
  },
  css: primeOverridesCss,
});
