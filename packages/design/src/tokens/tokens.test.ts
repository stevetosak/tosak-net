import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cssVar, tokensCss } from './css.ts';
import { responsive, tokens } from './values.ts';

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

/** The custom properties declared in a block of CSS, by name without `--`. */
function declared(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
}

function without(values: Record<string, string>, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([name]) => !names.includes(name)));
}

describe('tokens.css', () => {
  it('is what the token source emits (run `pnpm --filter @tosak/design tokens`)', () => {
    expect(read('../styles/tokens.css')).toBe(tokensCss());
  });

  it('declares each breakpoint after the root, wide to narrow', () => {
    const css = tokensCss();
    const positions = [':root {', ...responsive.map((r) => `@media ${r.query}`)].map((s) =>
      css.indexOf(s),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('a token that refers to another', () => {
  it('names a token that exists', () => {
    const values = [
      ...Object.values(tokens),
      ...responsive.flatMap((r) => Object.values(r.values)),
    ];
    const references = values.flatMap((v) => [...v.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]));
    expect(references.filter((name) => name === undefined || !(name in tokens))).toEqual([]);
  });

  it('is written with cssVar in TypeScript', () => {
    expect(cssVar('color-ink')).toBe('var(--color-ink)');
  });
});

// The accepted prototype is the visual baseline: the tokens keep its values,
// and every difference is listed here with its reason.
describe('the accepted prototype (reference/)', () => {
  const page = read('../../../../reference/page.html');
  const base = read('../../../../reference/base.css');

  // The families are self-hosted through Fontsource, whose variable fonts carry
  // "Variable" in the family name.
  const changed = ['font-display', 'font-body', 'font-readout'];
  // Set at both breakpoints, but no rule of the page reads it.
  const dropped = ['section-gap-s'];

  it('has the same tokens and keeps every value of its :root', () => {
    const root = declared(/:root \{([^}]*)\}/.exec(page)?.[1] ?? '');
    expect(Object.keys(root).length).toBeGreaterThan(60);
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(root).sort());
    const kept = without(root, changed);
    expect(without(tokens, changed)).toEqual(kept);
  });

  it('keeps the values of its two breakpoints, wide to narrow', () => {
    const media = [...base.matchAll(/@media \(max-width: (\d+)rem\) \{ :root \{([^}]*)\}/g)];
    expect(media.map(([, width]) => `(width <= ${width ?? ''}rem)`)).toEqual(
      responsive.map((r) => r.query),
    );
    expect(media.map(([, , body]) => without(declared(body ?? ''), dropped))).toEqual(
      responsive.map((r) => r.values),
    );
  });

  it('names the families the page used', () => {
    expect(tokens['font-display']).toContain('Rethink Sans');
    expect(tokens['font-body']).toContain('Rethink Sans');
    expect(tokens['font-readout']).toContain('Spline Sans Mono');
  });
});
