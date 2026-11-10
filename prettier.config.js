/**
 * The same settings as orca-ui-v2, so the portal's apps read alike.
 *
 * @see https://prettier.io/docs/configuration
 * @type {import('prettier').Config}
 */
export default {
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  printWidth: 100,
  semi: true,
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  endOfLine: 'lf',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/index.css',
  tailwindFunctions: ['cn', 'cva'],
};
