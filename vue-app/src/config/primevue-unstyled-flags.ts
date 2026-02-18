const parseBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

export const primeUnstyledEnvKeys = {
  uiInputText: 'VITE_PRIME_UNSTYLED_UI_INPUT_TEXT',
  uiInputNumber: 'VITE_PRIME_UNSTYLED_UI_INPUT_NUMBER',
  uiSelect: 'VITE_PRIME_UNSTYLED_UI_SELECT',
  uiDatePicker: 'VITE_PRIME_UNSTYLED_UI_DATE_PICKER',
  uiSelectButton: 'VITE_PRIME_UNSTYLED_UI_SELECT_BUTTON',
  uiCheckbox: 'VITE_PRIME_UNSTYLED_UI_CHECKBOX',
  uiToggleSwitch: 'VITE_PRIME_UNSTYLED_UI_TOGGLE_SWITCH',
  uiDialog: 'VITE_PRIME_UNSTYLED_UI_DIALOG',
  uiMenu: 'VITE_PRIME_UNSTYLED_UI_MENU',
  uiMessage: 'VITE_PRIME_UNSTYLED_UI_MESSAGE',
  uiSkeleton: 'VITE_PRIME_UNSTYLED_UI_SKELETON',
  uiTag: 'VITE_PRIME_UNSTYLED_UI_TAG',
  uiPaginator: 'VITE_PRIME_UNSTYLED_UI_PAGINATOR',
  uiCard: 'VITE_PRIME_UNSTYLED_UI_CARD',
  uiChart: 'VITE_PRIME_UNSTYLED_UI_CHART',
  uiDrawer: 'VITE_PRIME_UNSTYLED_UI_DRAWER',
  uiToast: 'VITE_PRIME_UNSTYLED_UI_TOAST',
  uiConfirmDialog: 'VITE_PRIME_UNSTYLED_UI_CONFIRM_DIALOG',
} as const;

export type PrimeUnstyledComponent = keyof typeof primeUnstyledEnvKeys;

const globalUnstyledEnabled = parseBoolean(import.meta.env.VITE_PRIME_UNSTYLED_ENABLED, true);

const resolveEnvComponentToggle = (component: PrimeUnstyledComponent): boolean => {
  if (!globalUnstyledEnabled) return false;

  const envKey = primeUnstyledEnvKeys[component];
  const envValue = import.meta.env[envKey as keyof ImportMetaEnv] as string | boolean | undefined;

  if (envValue === undefined) {
    return true;
  }

  return parseBoolean(envValue, false);
};

export const isPrimeUnstyledEnabled = (component: PrimeUnstyledComponent): boolean =>
  resolveEnvComponentToggle(component);

export const resolvePrimeUnstyled = (
  component: PrimeUnstyledComponent,
  override?: boolean
): boolean => {
  if (override !== undefined) return override;
  return resolveEnvComponentToggle(component);
};

export const getPrimeUnstyledSnapshot = (): Record<PrimeUnstyledComponent, boolean> => ({
  uiInputText: resolveEnvComponentToggle('uiInputText'),
  uiInputNumber: resolveEnvComponentToggle('uiInputNumber'),
  uiSelect: resolveEnvComponentToggle('uiSelect'),
  uiDatePicker: resolveEnvComponentToggle('uiDatePicker'),
  uiSelectButton: resolveEnvComponentToggle('uiSelectButton'),
  uiCheckbox: resolveEnvComponentToggle('uiCheckbox'),
  uiToggleSwitch: resolveEnvComponentToggle('uiToggleSwitch'),
  uiDialog: resolveEnvComponentToggle('uiDialog'),
  uiMenu: resolveEnvComponentToggle('uiMenu'),
  uiMessage: resolveEnvComponentToggle('uiMessage'),
  uiSkeleton: resolveEnvComponentToggle('uiSkeleton'),
  uiTag: resolveEnvComponentToggle('uiTag'),
  uiPaginator: resolveEnvComponentToggle('uiPaginator'),
  uiCard: resolveEnvComponentToggle('uiCard'),
  uiChart: resolveEnvComponentToggle('uiChart'),
  uiDrawer: resolveEnvComponentToggle('uiDrawer'),
  uiToast: resolveEnvComponentToggle('uiToast'),
  uiConfirmDialog: resolveEnvComponentToggle('uiConfirmDialog'),
});
