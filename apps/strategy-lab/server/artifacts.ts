// Run artifacts: immutable files under <stateDir>/runs/<R-xxxxxx>/, referenced by the database. Written atomically
// (temporary file, fsync, rename, fsync of the directory), so a crash never leaves a half-written file under the final
// name. `manifest.json` records every file's sha256; readers verify the events file against the database's hash.

import { createHash, randomBytes } from 'node:crypto';
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { type LabEvent, compareEvents } from '../shared/contract.ts';

export const RUN_ID_PATTERN = /^R-\d{6,12}$/;

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export function atomicWrite(file: string, data: string) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${randomBytes(6).toString('hex')}`;
  const fd = openSync(tmp, 'wx', 0o644);
  try {
    writeSync(fd, data);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, file);
  } catch (e) {
    unlinkSync(tmp);
    throw e;
  }
  const dfd = openSync(dirname(file), 'r');
  try {
    fsyncSync(dfd);
  } finally {
    closeSync(dfd);
  }
}

/** The directory of a run's artifacts, relative to the state dir. The id is server-generated and pattern-checked. */
export function runDirName(publicId: string): string {
  if (!RUN_ID_PATTERN.test(publicId)) throw new Error(`invalid run id ${publicId}`);
  return join('runs', publicId);
}

export interface EventsFile {
  contractVersion: 2;
  runId: string;
  events: LabEvent[];
}

export function writeEvents(dir: string, runId: string, events: LabEvent[]): string {
  const sorted = [...events].sort(compareEvents);
  const text = `${JSON.stringify({ contractVersion: 2, runId, events: sorted } satisfies EventsFile)}\n`;
  atomicWrite(join(dir, 'events.json'), text);
  return sha256(text);
}

/** Reads a run's events and verifies them against the hash recorded in the database. */
export function readEvents(dir: string, expectedSha256: string | null): EventsFile {
  const text = readFileSync(join(dir, 'events.json'), 'utf8');
  if (expectedSha256 && sha256(text) !== expectedSha256)
    throw new Error(`events.json of ${dir} does not match its recorded sha256 (modified after the run?)`);
  return JSON.parse(text) as EventsFile;
}

export function writeManifest(dir: string, files: string[]) {
  const entries = Object.fromEntries(files.map((f) => [f, sha256(readFileSync(join(dir, f)))]));
  atomicWrite(join(dir, 'manifest.json'), `${JSON.stringify({ sha256: entries }, null, 2)}\n`);
}
