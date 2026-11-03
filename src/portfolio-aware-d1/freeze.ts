// The study's two one-time freezes: the protocol (before any candidate figure) and the selection manifest (after the
// training-only stages, before any holdout/final/all figure of a candidate). Each refuses to run twice, and each is
// verified by its body hash before anything that depends on it.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import {
  frozenSelectionFile,
  jsonReplacer,
  log,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  readJson,
  writeJson
} from './context.ts';

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const sha256File = async (file: string) => sha256(await fs.readFile(file));

export const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

// `git status --porcelain` lines are "XY path"; the leading status column may be a space, so lines are not trimmed.
// (The protocol freeze record of 2026-10-24T14:54:55Z was written before this fix: its first modified path lost its
// first character, "onfig/phenotypes/COMPATIBILITY.md".)
export const gitState = () => {
  let raw = '';

  try {
    raw = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  } catch {
    raw = '';
  }

  const status = raw.split('\n').filter(Boolean);

  return {
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    head: git('rev-parse', 'HEAD'),
    modifiedTracked: status.filter((line) => !line.startsWith('??')).map((line) => line.slice(3)),
    untracked: status.filter((line) => line.startsWith('??')).map((line) => line.slice(3))
  };
};

export interface ProtocolFreeze {
  protocolSha256: string;
  contextSha256: string;
  frozenAt: string;
  git: ReturnType<typeof gitState>;
}

export const freezeProtocol = async (): Promise<ProtocolFreeze> => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once; amendments go in PROTOCOL.md §13`);
  }

  const freeze: ProtocolFreeze = {
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File('src/portfolio-aware-d1/context.ts'),
    frozenAt: nowIso(),
    git: gitState()
  };

  await writeJson(protocolFreezeFile, freeze);
  log(`protocol frozen at ${freeze.frozenAt}: sha256 ${freeze.protocolSha256}`);

  return freeze;
};

// Every stage after the freeze calls this: the protocol must be frozen; a changed file is allowed only with an
// amendment (reported, never silent).
export const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('The protocol is not frozen: run `npm run portfolio-aware-d1 -- freeze-protocol` first');
  }

  const freeze = await readJson<ProtocolFreeze>(protocolFreezeFile);
  const current = await sha256File(protocolFile);

  if (current !== freeze.protocolSha256) {
    const text = await fs.readFile(protocolFile, 'utf8');

    if (!/## 13\. Amendments\s+\n+(?!None\.)/.test(text)) {
      throw new Error(`${protocolFile} changed after its freeze without an amendment in §13`);
    }

    log(`NOTE: PROTOCOL.md amended after its freeze (${freeze.protocolSha256.slice(0, 12)} → ${current.slice(0, 12)})`);
  }

  return { freeze, current };
};

// ----- the selection manifest -----

export interface SelectionManifest {
  manifestHash: string;
  [key: string]: unknown;
}

export const hashManifestBody = (body: Record<string, unknown>) => sha256(JSON.stringify(body));

export const writeSelectionManifest = async (body: Record<string, unknown>, file: string = frozenSelectionFile) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the selection is frozen once and never rewritten`);
  }

  // The hash is of the JSON-safe body (NaN → null, ±Infinity → strings), exactly as it is written and read back.
  const safe = JSON.parse(JSON.stringify(body, jsonReplacer)) as Record<string, unknown>;
  const manifest = { ...safe, manifestHash: hashManifestBody(safe) };

  await writeJson(file, manifest);

  return manifest as SelectionManifest;
};

export const readVerifiedSelection = async (file: string = frozenSelectionFile): Promise<SelectionManifest> => {
  if (!(await fs.pathExists(file))) {
    throw new Error(`${file} does not exist: nothing after training may be read before the freeze`);
  }

  const manifest = await readJson<SelectionManifest>(file);
  const { manifestHash, ...body } = manifest;

  if (hashManifestBody(body) !== manifestHash) {
    throw new Error(`${file}: the body hash does not verify; the selection was changed after its freeze`);
  }

  return manifest;
};
