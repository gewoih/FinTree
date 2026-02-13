module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-vue',
    'stylelint-config-clean-order',
  ],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    'custom-property-pattern': null,
    'selector-class-pattern': null,
    'no-descending-specificity': null,
    'no-duplicate-selectors': null,
  },
};
