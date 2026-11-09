// Writes src/styles/tokens.css from the token source. A test fails while the
// file and the source differ, so run this after every change to the tokens.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tokensCss } from '../src/tokens/css.ts';

const target = new URL('../src/styles/tokens.css', import.meta.url);
writeFileSync(target, tokensCss());
console.log(`Wrote ${fileURLToPath(target)}`);
