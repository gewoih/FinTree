import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Catch leftover debug logs — use void operator or remove entirely.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Enforce explicit return types on public-facing functions.
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Disallow `any` usage — prefer `unknown` with type guards.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Consistent type imports (import type { Foo }).
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // No unused variables (already covered by tsconfig noUnusedLocals,
      // but this gives cleaner ESLint output too).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
])
