// Write-once sealed records (the source study's writeSealed/readSealed, unchanged: the body hash covers the JSON-safe
// body exactly as written) with this study's environment stamp, and small file helpers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { type Sealed, readSealed, sha256File, writeSealed } from '../d1-ranked-preemption/freeze.ts';
import { study, testData, testRoot } from './context.ts';

export { readSealed, sha256File };
export type { Sealed };

export const gitHead = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

export const environment = () => ({
  node: process.version,
  nodeExpected: study.node,
  head: gitHead(),
  testMode: Boolean(testRoot || testData)
});

export const writeRecord = async (file: string, body: Record<string, unknown>) =>
  writeSealed(file, { schema: `${study.id}:${String(body.stage ?? 'record')}`, ...body, environment: environment() });

export const sha256Text = (text: string) => createHash('sha256').update(text).digest('hex');

export const sha256Json = (value: unknown) => sha256Text(JSON.stringify(value));

export const exists = (file: string) => fs.pathExists(file);
