/** @type {import('prettier').Config} */
module.exports = {
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  bracketSameLine: false,
  endOfLine: 'lf',
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  overrides: [
    {
      files: ['packages/core/**/*.{ts,cts,mts}'],
      options: {
        printWidth: 100,
        trailingComma: 'none'
      }
    },
    {
      files: ['*.json', '*.jsonc'],
      options: {
        tabWidth: 2
      }
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        proseWrap: 'preserve'
      }
    }
  ]
}
