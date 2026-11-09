import { responsive, tokens, type ResponsiveTokens, type TokenName } from './values.ts';

const HEADER =
  '/* Generated from src/tokens/values.ts by `pnpm --filter @tosak/design tokens`. Do not edit. */';

/** A reference to one token, for inline styles and SVG attributes: `var(--color-ink)`. */
export function cssVar<Name extends TokenName>(name: Name): `var(--${Name})` {
  return `var(--${name})`;
}

/** The stylesheet that declares every token on `:root`, then each breakpoint's changes. */
export function tokensCss(
  values: Readonly<Record<string, string>> = tokens,
  overrides: readonly ResponsiveTokens[] = responsive,
): string {
  const blocks = [rootRule(values, '')];
  for (const { query, values: changed } of overrides) {
    blocks.push(`@media ${query} {\n${rootRule(changed, '  ')}\n}`);
  }
  return `${HEADER}\n\n${blocks.join('\n\n')}\n`;
}

function rootRule(values: Readonly<Record<string, string>>, indent: string): string {
  const declarations = Object.entries(values).map(
    ([name, value]) => `${indent}  --${name}: ${value};`,
  );
  return [`${indent}:root {`, ...declarations, `${indent}}`].join('\n');
}
