// Turns the schema into the TypeScript types the site reads. The emit script
// writes the result to src/status.ts, and a test compares the two, so the
// committed types never drift from the schema.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile, type JSONSchema } from 'json-schema-to-typescript';
import prettier from 'prettier';

export const schemaUrl = new URL('../schema/status.schema.json', import.meta.url);
export const typesUrl = new URL('../src/status.ts', import.meta.url);

const banner = [
  '// Generated from schema/status.schema.json by `pnpm types`. Do not edit it by',
  '// hand: a test fails while this file and the schema differ.',
].join('\n');

export async function statusTypes(): Promise<string> {
  const schema = JSON.parse(await readFile(schemaUrl, 'utf8')) as JSONSchema;
  const code = await compile(schema, 'StatusSnapshot', {
    bannerComment: banner,
    format: false,
    additionalProperties: false,
    unreachableDefinitions: false,
  });
  const filepath = fileURLToPath(typesUrl);
  const config = await prettier.resolveConfig(filepath);
  return prettier.format(code, { ...config, filepath });
}
