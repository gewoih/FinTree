module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
    'stylelint-config-clean-order',
  ],
  plugins: ['stylelint-order'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    'color-function-notation': 'modern',
    'alpha-value-notation': 'percentage',
    'selector-class-pattern': [
      '^[a-z0-9\\-]+$',
      {
        message: 'Классы должны использовать kebab-case и не содержать специальных символов',
      },
    ],
    'order/properties-alphabetical-order': null,
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
};
