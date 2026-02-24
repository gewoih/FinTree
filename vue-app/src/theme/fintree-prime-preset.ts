import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import {
  datePickerScheme,
  inputNumberButtons,
  messageScheme,
  toastScheme,
  tooltipRoot,
} from './fintree-prime-component-schemes';

const primeOverridesCss = `
@layer overrides {
  .p-component { font-family: var(--ft-font-base); color: var(--ft-text-primary); }
  [role='tooltip'], .p-tooltip { pointer-events: none; position: absolute; z-index: var(--ft-z-tooltip); }
  [role='tooltip'] > .p-tooltip-arrow, [role='tooltip'] > div:first-child { display: none; }
  [role='tooltip'] > .p-tooltip-text, [role='tooltip'] > div:last-child { border: 1px solid var(--ft-border-default); }

  @media (pointer: coarse) {
    [role='tooltip'], .p-tooltip { pointer-events: auto; }
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

  .p-dialog { overflow: hidden; max-width: calc(100vw - (var(--ft-space-4) * 2)); max-height: calc(100vh - (var(--ft-space-4) * 2)); }
  .p-dialog .p-dialog-content { overflow: auto; }
  .p-dialog .p-dialog-footer { justify-content: flex-end; }

  .p-drawer-mask {
    position: fixed;
    z-index: var(--ft-z-drawer);
    inset: 0;
    background: var(--ft-bg-overlay);
    backdrop-filter: blur(2px);
  }

  .app-shell__drawer-mobile .p-drawer {
    width: 300px;
    background: linear-gradient(180deg, var(--ft-surface-raised), color-mix(in srgb, var(--ft-surface-base) 90%, var(--ft-surface-raised)));
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

  .p-inputnumber {
    overflow: hidden;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: var(--ft-control-height);
    background: var(--ft-surface-base);
    border: 1px solid var(--ft-border-default);
    border-radius: var(--ft-radius-lg);
    transition: border-color var(--ft-transition-fast), background-color var(--ft-transition-fast), box-shadow var(--ft-transition-fast);
  }

  .p-inputnumber:focus-within { outline: 3px solid var(--ft-focus-ring); outline-offset: 3px; }
  .p-inputnumber:not(.p-disabled):hover { border-color: var(--ft-border-strong); background: color-mix(in srgb, var(--ft-surface-overlay) 72%, var(--ft-surface-base)); }
  .p-inputnumber.p-invalid, .p-inputnumber[aria-invalid='true'] { border-color: var(--ft-danger-500); box-shadow: 0 0 0 1px color-mix(in srgb, var(--ft-danger-500) 18%, transparent); }

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

  .p-inputnumber-input::placeholder { color: var(--ft-text-tertiary); opacity: 1; }
  .p-inputnumber-input:disabled, .p-inputnumber.p-disabled { cursor: not-allowed; opacity: 0.6; }

  .p-inputtext, .p-select, .p-datepicker .p-datepicker-input { min-height: var(--ft-form-control-height); font-size: var(--ft-text-base); }
  .p-inputtext, .p-datepicker .p-datepicker-input { padding: var(--ft-form-control-padding-y) var(--ft-form-control-padding-x); line-height: var(--ft-leading-tight); }
  .p-select .p-select-label { display: flex; align-items: center; min-height: calc(var(--ft-form-control-height) - 2px); padding: var(--ft-form-control-padding-y) var(--ft-form-control-padding-x); line-height: var(--ft-leading-tight); }
  .p-select .p-select-dropdown, .p-datepicker .p-datepicker-dropdown { width: var(--ft-form-control-height); }

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
    transition: color var(--ft-transition-fast), background-color var(--ft-transition-fast), border-color var(--ft-transition-fast);
  }

  .p-confirmdialog .p-dialog-close-button:hover,
  .p-confirm-dialog .p-dialog-close-button:hover {
    color: var(--ft-text-primary);
    background: var(--ft-surface-overlay);
    border-color: var(--ft-border-default);
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
    transition: background-color var(--ft-transition-fast), border-color var(--ft-transition-fast), color var(--ft-transition-fast);
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

  @media (width <= 640px) {
    .p-dialog {
      width: 100vw !important;
      max-width: 100vw !important;
      max-height: 95vh;
      margin: 0;
      border-radius: var(--ft-radius-lg);
    }
    .p-dialog .p-dialog-footer { padding: var(--ft-space-3) var(--ft-space-4) var(--ft-space-4); }
  }
}
`;

const zincScale = {
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

const surfaceScale = { 0: 'var(--ft-gray-50)', ...zincScale };

const primaryScale = { 50: 'var(--ft-primary-50)', 100: 'var(--ft-primary-100)', 200: 'var(--ft-primary-200)', 300: 'var(--ft-primary-300)', 400: 'var(--ft-primary-400)', 500: 'var(--ft-primary-500)', 600: 'var(--ft-primary-600)', 700: 'var(--ft-primary-700)', 800: 'var(--ft-primary-800)', 900: 'var(--ft-primary-900)', 950: 'var(--ft-primary-950)' };

const focusRing = { width: '3px', style: 'solid', color: 'var(--ft-focus-ring)', offset: '3px', shadow: 'none' };

const formFocusRing = { width: 'var(--ft-form-focus-ring-width)', style: 'solid', color: 'var(--ft-focus-ring)', offset: 'var(--ft-form-focus-ring-offset)', shadow: 'none' };

const formField = {
  background: 'var(--ft-surface-base)',
  disabledBackground: 'var(--ft-interactive-disabled)',
  filledBackground: 'var(--ft-surface-overlay)',
  filledHoverBackground: 'var(--ft-surface-overlay)',
  filledFocusBackground: 'var(--ft-surface-overlay)',
  borderColor: 'var(--ft-border-default)',
  hoverBorderColor: 'var(--ft-border-strong)',
  focusBorderColor: 'var(--ft-interactive-default)',
  invalidBorderColor: 'var(--ft-danger-500)',
  color: 'var(--ft-text-primary)',
  disabledColor: 'var(--ft-text-disabled)',
  placeholderColor: 'var(--ft-text-tertiary)',
  invalidPlaceholderColor: 'var(--ft-danger-500)',
  floatLabelColor: 'var(--ft-text-tertiary)',
  floatLabelFocusColor: 'var(--ft-text-secondary)',
  floatLabelActiveColor: 'var(--ft-text-tertiary)',
  floatLabelInvalidColor: 'var(--ft-danger-500)',
  iconColor: 'var(--ft-text-secondary)',
  shadow: 'none',
  paddingX: 'var(--ft-form-control-padding-x)',
  paddingY: 'var(--ft-form-control-padding-y)',
  borderRadius: 'var(--ft-radius-lg)',
  focusRing: formFocusRing,
  transitionDuration: 'var(--ft-transition-fast)',
  sm: { fontSize: 'var(--ft-text-sm)', paddingX: 'var(--ft-space-3)', paddingY: 'var(--ft-form-control-padding-y)' },
  lg: { fontSize: 'var(--ft-text-base)', paddingX: 'var(--ft-space-6)', paddingY: 'var(--ft-form-control-padding-y)' },
};

const sharedColorScheme = {
  primary: {
    color: 'var(--ft-interactive-default)',
    contrastColor: 'var(--ft-text-inverse)',
    hoverColor: 'var(--ft-interactive-hover)',
    activeColor: 'var(--ft-interactive-active)',
  },
  highlight: {
    background: 'color-mix(in srgb, var(--ft-primary-500) 18%, transparent)',
    focusBackground: 'color-mix(in srgb, var(--ft-primary-500) 28%, transparent)',
    color: 'var(--ft-text-primary)',
    focusColor: 'var(--ft-text-primary)',
  },
  mask: { background: 'var(--ft-bg-overlay)', color: 'var(--ft-text-primary)' },
  formField,
  text: {
    color: 'var(--ft-text-primary)',
    hoverColor: 'var(--ft-text-primary)',
    mutedColor: 'var(--ft-text-secondary)',
    hoverMutedColor: 'var(--ft-text-primary)',
  },
  content: {
    background: 'var(--ft-surface-raised)',
    hoverBackground: 'var(--ft-surface-overlay)',
    borderColor: 'var(--ft-border-default)',
    color: 'var(--ft-text-primary)',
    hoverColor: 'var(--ft-text-primary)',
  },
  overlay: {
    select: { background: 'var(--ft-surface-raised)', borderColor: 'var(--ft-border-default)', color: 'var(--ft-text-primary)' },
    popover: { background: 'var(--ft-surface-raised)', borderColor: 'var(--ft-border-default)', color: 'var(--ft-text-primary)' },
    modal: { background: 'var(--ft-surface-raised)', borderColor: 'var(--ft-border-default)', color: 'var(--ft-text-primary)' },
  },
  list: {
    option: {
      focusBackground: 'var(--ft-surface-overlay)',
      selectedBackground: 'color-mix(in srgb, var(--ft-primary-500) 18%, transparent)',
      selectedFocusBackground: 'color-mix(in srgb, var(--ft-primary-500) 26%, transparent)',
      color: 'var(--ft-text-primary)',
      focusColor: 'var(--ft-text-primary)',
      selectedColor: 'var(--ft-text-primary)',
      selectedFocusColor: 'var(--ft-text-primary)',
      icon: { color: 'var(--ft-text-secondary)', focusColor: 'var(--ft-text-primary)' },
    },
    optionGroup: { background: 'transparent', color: 'var(--ft-text-secondary)' },
  },
  navigation: {
    item: {
      focusBackground: 'var(--ft-surface-overlay)',
      activeBackground: 'var(--ft-surface-overlay)',
      color: 'var(--ft-text-primary)',
      focusColor: 'var(--ft-text-primary)',
      activeColor: 'var(--ft-text-primary)',
      icon: { color: 'var(--ft-text-secondary)', focusColor: 'var(--ft-text-primary)', activeColor: 'var(--ft-text-primary)' },
    },
    submenuLabel: { background: 'transparent', color: 'var(--ft-text-secondary)' },
    submenuIcon: { color: 'var(--ft-text-secondary)', focusColor: 'var(--ft-text-primary)', activeColor: 'var(--ft-text-primary)' },
  },
};
const semanticScheme = { surface: surfaceScale, ...sharedColorScheme };
export const FinTreePrimePreset = definePreset(Aura, {
  primitive: { zinc: zincScale },
  semantic: {
    primary: primaryScale,
    colorScheme: { light: semanticScheme, dark: semanticScheme },
    focusRing,
  },
  components: {
    button: {
      root: {
        borderRadius: 'var(--ft-radius-lg)',
        roundedBorderRadius: 'var(--ft-radius-full)',
        gap: 'var(--ft-space-2)',
        paddingX: 'var(--ft-space-4)',
        paddingY: '0',
        iconOnlyWidth: 'var(--ft-button-height-sm)',
        sm: { fontSize: 'var(--ft-text-sm)', paddingX: 'var(--ft-space-3)', paddingY: '0', iconOnlyWidth: 'var(--ft-button-height-sm)' },
        lg: { fontSize: 'var(--ft-text-base)', paddingX: 'var(--ft-space-6)', paddingY: '0', iconOnlyWidth: 'var(--ft-button-height-lg)' },
        label: { fontWeight: 'var(--ft-font-semibold)' },
        focusRing,
        transitionDuration: 'var(--ft-transition-fast)',
      },
    },
    inputtext: {
      root: {
        background: 'var(--ft-surface-base)',
        borderColor: 'var(--ft-border-default)',
        hoverBorderColor: 'var(--ft-border-strong)',
        focusBorderColor: 'var(--ft-interactive-default)',
        invalidBorderColor: 'var(--ft-danger-500)',
        color: 'var(--ft-text-primary)',
        disabledColor: 'var(--ft-text-disabled)',
        placeholderColor: 'var(--ft-text-tertiary)',
        paddingX: 'var(--ft-form-control-padding-x)',
        paddingY: 'var(--ft-form-control-padding-y)',
        borderRadius: 'var(--ft-radius-lg)',
        focusRing: formFocusRing,
        transitionDuration: 'var(--ft-transition-fast)',
      },
    },
    select: {
      root: {
        background: 'var(--ft-surface-base)',
        borderColor: 'var(--ft-border-default)',
        hoverBorderColor: 'var(--ft-border-strong)',
        focusBorderColor: 'var(--ft-interactive-default)',
        invalidBorderColor: 'var(--ft-danger-500)',
        color: 'var(--ft-text-primary)',
        disabledColor: 'var(--ft-text-disabled)',
        placeholderColor: 'var(--ft-text-tertiary)',
        paddingX: 'var(--ft-form-control-padding-x)',
        paddingY: 'var(--ft-form-control-padding-y)',
        borderRadius: 'var(--ft-radius-lg)',
        focusRing: formFocusRing,
        transitionDuration: 'var(--ft-transition-fast)',
      },
      dropdown: {
        width: 'var(--ft-form-control-height)',
        color: 'var(--ft-text-secondary)',
      },
      overlay: {
        background: 'var(--ft-surface-raised)',
        borderColor: 'var(--ft-border-default)',
        borderRadius: 'var(--ft-radius-lg)',
        color: 'var(--ft-text-primary)',
        shadow: 'var(--ft-shadow-lg)',
      },
      option: {
        focusBackground: 'var(--ft-surface-overlay)',
        selectedBackground: 'color-mix(in srgb, var(--ft-primary-500) 18%, transparent)',
        selectedFocusBackground: 'color-mix(in srgb, var(--ft-primary-500) 26%, transparent)',
        color: 'var(--ft-text-primary)',
        focusColor: 'var(--ft-text-primary)',
        selectedColor: 'var(--ft-text-primary)',
        selectedFocusColor: 'var(--ft-text-primary)',
        borderRadius: 'var(--ft-radius-md)',
      },
    },
    datepicker: {
      root: { transitionDuration: 'var(--ft-transition-fast)' },
      dropdown: {
        width: 'var(--ft-form-control-height)',
        borderColor: 'var(--ft-border-default)',
        hoverBorderColor: 'var(--ft-border-strong)',
        activeBorderColor: 'var(--ft-interactive-default)',
        borderRadius: 'var(--ft-radius-lg)',
        focusRing: formFocusRing,
        background: 'var(--ft-surface-base)',
        hoverBackground: 'var(--ft-surface-overlay)',
        activeBackground: 'var(--ft-surface-overlay)',
        color: 'var(--ft-text-secondary)',
        hoverColor: 'var(--ft-text-primary)',
        activeColor: 'var(--ft-text-primary)',
      },
      inputIcon: { color: 'var(--ft-text-secondary)' },
      colorScheme: { light: datePickerScheme, dark: datePickerScheme },
    },
    tooltip: {
      root: {
        maxWidth: 'min(20rem, calc(100vw - (var(--ft-space-4) * 2)))',
        gutter: 'var(--ft-space-2)',
        shadow: 'var(--ft-shadow-md)',
        padding: 'var(--ft-space-2) var(--ft-space-3)',
        borderRadius: 'var(--ft-radius-md)',
      },
      colorScheme: { light: tooltipRoot, dark: tooltipRoot },
    },
    dialog: {
      root: {
        background: 'var(--ft-surface-raised)',
        borderColor: 'var(--ft-border-default)',
        color: 'var(--ft-text-primary)',
        borderRadius: 'var(--ft-radius-lg)',
        shadow: 'var(--ft-shadow-lg)',
      },
      header: { padding: 'var(--ft-space-4) var(--ft-space-5)', gap: 'var(--ft-space-2)' },
      title: { fontSize: 'var(--ft-text-base)', fontWeight: 'var(--ft-font-semibold)' },
      content: { padding: '0 var(--ft-space-5) var(--ft-space-5) var(--ft-space-5)' },
      footer: { padding: 'var(--ft-space-3) var(--ft-space-5) var(--ft-space-4)', gap: 'var(--ft-space-2)' },
    },
    drawer: {
      root: {
        background: 'var(--ft-surface-raised)',
        borderColor: 'var(--ft-border-default)',
        color: 'var(--ft-text-primary)',
        shadow: 'var(--ft-shadow-lg)',
      },
      header: { padding: 'var(--ft-space-4) var(--ft-space-5) var(--ft-space-4)' },
      title: { fontSize: 'var(--ft-text-lg)', fontWeight: 'var(--ft-font-semibold)' },
      content: { padding: '0' },
      footer: { padding: 'var(--ft-space-4) var(--ft-space-5)' },
    },
    inputnumber: {
      root: { transitionDuration: 'var(--ft-transition-fast)' },
      button: { width: 'var(--ft-control-height)', borderRadius: '0', verticalPadding: '0' },
      colorScheme: { light: inputNumberButtons, dark: inputNumberButtons },
    },
    paginator: {
      root: {
        padding: 'var(--ft-space-2)',
        gap: 'var(--ft-space-1)',
        borderRadius: 'var(--ft-radius-md)',
        background: 'transparent',
        color: 'var(--ft-text-secondary)',
        transitionDuration: 'var(--ft-transition-fast)',
      },
      navButton: {
        background: 'transparent',
        hoverBackground: 'var(--ft-surface-overlay)',
        selectedBackground: 'color-mix(in srgb, var(--ft-primary-500) 18%, transparent)',
        color: 'var(--ft-text-secondary)',
        hoverColor: 'var(--ft-text-primary)',
        selectedColor: 'var(--ft-text-primary)',
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: 'var(--ft-radius-full)',
        focusRing,
      },
      currentPageReport: { color: 'var(--ft-text-secondary)' },
      jumpToPageInput: { maxWidth: 'var(--ft-container-xs)' },
    },
    message: {
      root: {
        borderRadius: 'var(--ft-radius-lg)',
        borderWidth: '1px',
        transitionDuration: 'var(--ft-transition-fast)',
      },
      content: { padding: 'var(--ft-space-3)', gap: 'var(--ft-space-2)' },
      text: { fontSize: 'var(--ft-text-sm)', fontWeight: 'var(--ft-font-medium)' },
      icon: { size: 'var(--ft-text-base)' },
      closeButton: { width: '2rem', height: '2rem', borderRadius: 'var(--ft-radius-md)', focusRing },
      closeIcon: { size: '1rem' },
      colorScheme: { light: messageScheme, dark: messageScheme },
    },
    selectbutton: {
      root: {
        borderRadius: 'var(--ft-radius-lg)',
        invalidBorderColor: 'var(--ft-danger-500)',
      },
    },
    toast: {
      root: {
        width: 'min(26.25rem, calc(100vw - (var(--ft-space-4) * 2)))',
        borderRadius: 'var(--ft-radius-lg)',
        borderWidth: '1px',
        transitionDuration: 'var(--ft-transition-fast)',
      },
      icon: { size: 'var(--ft-text-base)' },
      content: { padding: 'var(--ft-space-3)', gap: 'var(--ft-space-2)' },
      text: { gap: 'var(--ft-space-1)' },
      summary: { fontWeight: 'var(--ft-font-semibold)', fontSize: 'var(--ft-text-base)' },
      detail: { fontWeight: 'var(--ft-font-normal)', fontSize: 'var(--ft-text-sm)' },
      closeButton: { width: '2rem', height: '2rem', borderRadius: 'var(--ft-radius-md)', focusRing },
      closeIcon: { size: '1rem' },
      colorScheme: { light: toastScheme, dark: toastScheme },
    },
    confirmdialog: {
      icon: { size: 'var(--ft-text-lg)', color: 'var(--ft-text-secondary)' },
      content: { gap: 'var(--ft-space-3)' },
    },
  },
  css: primeOverridesCss,
});
