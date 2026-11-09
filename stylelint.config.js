/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-css-modules'],
  plugins: ['stylelint-value-no-unknown-custom-properties'],
  ignoreFiles: ['reference/**', '**/dist/**', '**/node_modules/**', '**/.astro/**'],
  rules: {
    // A var() must name a token or a property declared in the same file.
    'csstools/value-no-unknown-custom-properties': [
      true,
      { importFrom: ['packages/design/src/styles/tokens.css'] },
    ],
    // OKLCH stays in plain numbers (lightness 0 to 1, hue without a unit): the
    // form colour tools print and the prototype uses, so values compare as is.
    'lightness-notation': null,
    'hue-degree-notation': null,
    // The bundler resolves a package name in a string import, as in JavaScript.
    'import-notation': 'string',
  },
};
