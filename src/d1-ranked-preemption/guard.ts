// The guards every outcome stage runs first (PROTOCOL.md §17): the sealed protocol freeze verifies and every file it
// binds is unchanged; the sealed code freeze verifies and the current code manifest equals it, or equals the code
// digest of the latest verified amendment; the prospective B4/B5 freeze is untouched.
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { codeFreezeFile, prospectiveFreezeFile, protocolFreezeFile, study } from './context.ts';
import { codeManifest, readAmendments, readSealed, sha256File } from './freeze.ts';

export interface ProtocolFreeze {
  [key: string]: unknown;
  bodyHash: string;
  frozenAt: string;
  files: Record<string, string>;
  prospectiveBodyHash: string;
}

export interface CodeFreeze {
  [key: string]: unknown;
  bodyHash: string;
  frozenAt: string;
  code: { files: number; digest: string; hashes: Record<string, string> };
}

// The run environment (PROTOCOL.md §17): the pinned Node version; the test-only path overrides honoured only inside
// the operating system's temporary directory (tests/pipeline.test.ts), never for the study's own tree.
export const assertEnvironment = () => {
  if (process.version !== study.node) {
    throw new Error(`Node ${process.version} is not the study's ${study.node} (.node-version)`);
  }

  const root = process.env.RANKED_PREEMPTION_ROOT;
  const data = process.env.RANKED_PREEMPTION_DATA;

  if (data && !root) {
    throw new Error('RANKED_PREEMPTION_DATA is honoured only with RANKED_PREEMPTION_ROOT (tests)');
  }

  if (root) {
    const temporary = [os.tmpdir(), fs.realpathSync(os.tmpdir())];
    const inside = (target: string) => temporary.some((dir) => path.resolve(target).startsWith(`${dir}${path.sep}`));

    if (!inside(root) || (data && !inside(data))) {
      throw new Error('the RANKED_PREEMPTION_* overrides must point inside the temporary directory (tests only)');
    }
  }

  return { node: process.version, testMode: Boolean(root) };
};

export const verifyProtocolFreeze = async () => {
  assertEnvironment();

  const freeze = await readSealed<ProtocolFreeze>(protocolFreezeFile);
  const failures: string[] = [];

  for (const [file, expected] of Object.entries(freeze.files)) {
    if (!(await fs.pathExists(file)) || (await sha256File(file)) !== expected) {
      failures.push(`${file} changed after the protocol freeze`);
    }
  }

  const prospective = await readSealed(prospectiveFreezeFile);

  if (prospective.bodyHash !== freeze.prospectiveBodyHash) {
    failures.push('the prospective B4/B5 freeze changed');
  }

  if (failures.length > 0) {
    throw new Error(`The protocol freeze does not hold: ${failures.join('; ')}`);
  }

  return freeze;
};

export const currentCodeDigest = async () => (await codeManifest()).digest;

export const verifyCodeFreeze = async () => {
  const freeze = await readSealed<CodeFreeze>(codeFreezeFile);
  const amendments = await readAmendments();
  const allowed = new Set([freeze.code.digest, ...amendments.map((amendment) => amendment.codeDigest)]);
  const latest = amendments.at(-1)?.codeDigest ?? freeze.code.digest;
  const digest = await currentCodeDigest();

  if (digest !== latest) {
    throw new Error(
      `The code manifest ${digest.slice(0, 12)} differs from the code freeze / latest amendment ${latest.slice(0, 12)}${allowed.has(digest) ? ' (an earlier amended state)' : ''}`
    );
  }

  return { freeze, digest, amendments: amendments.length };
};

export const requireFrozen = async () => {
  const environment = assertEnvironment();
  const protocol = await verifyProtocolFreeze();
  const code = await verifyCodeFreeze();

  return { protocolBody: protocol.bodyHash, codeBody: code.freeze.bodyHash, codeDigest: code.digest, ...environment };
};
