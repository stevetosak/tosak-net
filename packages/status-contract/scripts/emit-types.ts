// Writes src/status.ts from the schema. Run it after every schema change.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { statusTypes, typesUrl } from './types.ts';

await writeFile(typesUrl, await statusTypes());
console.log(`Wrote ${fileURLToPath(typesUrl)}`);
