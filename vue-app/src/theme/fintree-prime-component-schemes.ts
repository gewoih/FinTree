const makeMessageTone = (borderColor: string, color: string) => ({
  background: `color-mix(in srgb, ${borderColor} 14%, transparent)`,
  borderColor: `color-mix(in srgb, ${borderColor} 38%, var(--ft-border-default))`,
  color,
  closeButton: {
    hoverBackground: `color-mix(in srgb, ${borderColor} 18%, transparent)`,
    focusRing: { color: borderColor, shadow: 'none' },
  },
  outlined: {
    color,
    borderColor: `color-mix(in srgb, ${borderColor} 42%, var(--ft-border-default))`,
  },
  simple: { color },
});

export const messageScheme = {
  info: makeMessageTone('var(--ft-info-500)', 'var(--ft-info-400)'),
  success: makeMessageTone('var(--ft-success-500)', 'var(--ft-success-400)'),
  warn: makeMessageTone('var(--ft-warning-500)', 'var(--ft-warning-400)'),
  error: makeMessageTone('var(--ft-danger-500)', 'var(--ft-danger-400)'),
  secondary: makeMessageTone('var(--ft-gray-500)', 'var(--ft-gray-300)'),
  contrast: makeMessageTone('var(--ft-border-default)', 'var(--ft-text-primary)'),
};

export const tooltipRoot = {
  root: {
    background: 'var(--ft-surface-raised)',
    color: 'var(--ft-text-primary)',
  },
};

export const inputNumberButtons = {
  button: {
    background: 'transparent',
    hoverBackground: 'var(--ft-surface-overlay)',
    activeBackground: 'var(--ft-surface-overlay)',
    borderColor: 'var(--ft-border-default)',
    hoverBorderColor: 'var(--ft-border-strong)',
    activeBorderColor: 'var(--ft-border-strong)',
    color: 'var(--ft-text-secondary)',
    hoverColor: 'var(--ft-text-primary)',
    activeColor: 'var(--ft-text-primary)',
  },
};

const toastShadow =
  '0 18px 32px color-mix(in srgb, var(--ft-bg-base) 60%, transparent), 0 2px 8px color-mix(in srgb, var(--ft-bg-base) 32%, transparent)';
const toastBackground =
  'linear-gradient(180deg, color-mix(in srgb, var(--ft-surface-overlay) 92%, transparent) 0%, var(--ft-surface-raised) 100%)';

const makeToastTone = (borderColor: string) => ({
  background: toastBackground,
  borderColor,
  color: 'var(--ft-text-primary)',
  detailColor: 'var(--ft-text-secondary)',
  shadow: toastShadow,
  closeButton: {
    hoverBackground: 'var(--ft-surface-overlay)',
    focusRing: { color: borderColor, shadow: 'none' },
  },
});

export const toastScheme = {
  root: { blur: '2px' },
  info: makeToastTone('var(--ft-info-500)'),
  success: makeToastTone('var(--ft-success-500)'),
  warn: makeToastTone('var(--ft-warning-500)'),
  error: makeToastTone('var(--ft-danger-500)'),
};

export const datePickerScheme = {
  panel: {
    background: 'var(--ft-surface-raised)',
    borderColor: 'var(--ft-border-default)',
    color: 'var(--ft-text-primary)',
    borderRadius: 'var(--ft-radius-lg)',
    shadow: 'var(--ft-shadow-lg)',
    padding: 'var(--ft-space-3)',
  },
  header: {
    background: 'transparent',
    borderColor: 'var(--ft-border-subtle)',
    color: 'var(--ft-text-primary)',
    padding: 'var(--ft-space-2) var(--ft-space-2) var(--ft-space-3)',
  },
  date: {
    hoverBackground: 'var(--ft-surface-overlay)',
    selectedBackground: 'color-mix(in srgb, var(--ft-primary-500) 24%, transparent)',
    rangeSelectedBackground: 'color-mix(in srgb, var(--ft-primary-500) 18%, transparent)',
    color: 'var(--ft-text-primary)',
    hoverColor: 'var(--ft-text-primary)',
    selectedColor: 'var(--ft-text-primary)',
    rangeSelectedColor: 'var(--ft-text-primary)',
    width: '2.25rem',
    height: '2.25rem',
    borderRadius: 'var(--ft-radius-md)',
    focusRing: {
      width: '3px',
      style: 'solid',
      color: 'var(--ft-focus-ring)',
      offset: '3px',
      shadow: 'none',
    },
  },
  today: {
    background: 'color-mix(in srgb, var(--ft-primary-500) 14%, transparent)',
    color: 'var(--ft-text-primary)',
  },
  weekDay: { color: 'var(--ft-text-secondary)', fontWeight: 'var(--ft-font-semibold)' },
};
