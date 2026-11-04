import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Dataset } from '../shared/demo-schema/types.ts';

export const FIXTURE_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'demo-dataset.v1.json');

export function readFixtureText(): string {
  return readFileSync(FIXTURE_PATH, 'utf8');
}

export function readFixture(): Dataset {
  return JSON.parse(readFixtureText()) as Dataset;
}

/** A deep copy that tests may mutate. */
export function clone<T>(x: T): T {
  return structuredClone(x);
}
