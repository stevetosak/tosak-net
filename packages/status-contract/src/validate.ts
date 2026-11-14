// One validator for the contract, so every consumer checks a snapshot the
// same way: draft 2020-12, strict schema rules, and the formats enforced.
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import schema from '../schema/status.schema.json' with { type: 'json' };
import type { StatusSnapshot } from './status.ts';

export type StatusValidator = ((value: unknown) => value is StatusSnapshot) & {
  errors?: ErrorObject[] | null;
};

export function createStatusValidator(): StatusValidator {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats.default(ajv);
  return ajv.compile<StatusSnapshot>(schema);
}
