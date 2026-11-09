/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  printWidth: 100,
  plugins: ['prettier-plugin-astro'],
  overrides: [
    { files: '*.astro', options: { parser: 'astro' } },
    // Markdown frontmatter keeps the double quotes the tosak-docs page templates write.
    { files: '*.md', options: { singleQuote: false } },
  ],
};
