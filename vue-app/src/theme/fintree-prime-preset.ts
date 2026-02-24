import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

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
        surface: {
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
        },
      },
      dark: {
        surface: {
          0: 'var(--ft-gray-950)',
          50: 'var(--ft-gray-900)',
          100: 'var(--ft-gray-800)',
          200: 'var(--ft-gray-700)',
          300: 'var(--ft-gray-600)',
          400: 'var(--ft-gray-500)',
          500: 'var(--ft-gray-400)',
          600: 'var(--ft-gray-300)',
          700: 'var(--ft-gray-200)',
          800: 'var(--ft-gray-100)',
          900: 'var(--ft-gray-50)',
          950: 'var(--ft-gray-50)',
        },
      },
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: 'var(--ft-focus-ring)',
      offset: '2px',
    },
  },
});
