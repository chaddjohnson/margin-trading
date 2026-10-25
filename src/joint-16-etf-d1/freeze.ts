// The study's two one-time freezes (PROTOCOL.md preamble and §10): the protocol, before any 16-ETF candidate figure,
// and the selection manifest, after the training-only stages and before any holdout/final/all figure of a nominee.
// Each refuses to run twice and is verified by its body hash before anything that depends on it. The hashing, git
// state and manifest writer are the previous study's (src/portfolio-aware-d1/freeze.ts), used with this study's files.
import fs from 'fs-extra';
import {
  type SelectionManifest,
  gitState,
  readVerifiedSelection as readManifest,
  sha256File,
  writeSelectionManifest as writeManifest
} from '../portfolio-aware-d1/freeze.ts';
import { frozenSelectionFile, log, nowIso, protocolFile, protocolFreezeFile, readJson, writeJson } from './context.ts';

export { gitState, sha256, sha256File } from '../portfolio-aware-d1/freeze.ts';
export type { SelectionManifest };

export const contextFile = 'src/joint-16-etf-d1/context.ts';

export interface ProtocolFreeze {
  protocolSha256: string;
  contextSha256: string;
  frozenAt: string;
  git: ReturnType<typeof gitState>;
}

export const freezeProtocol = async (file: string = protocolFreezeFile): Promise<ProtocolFreeze> => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the protocol is frozen once; amendments go in PROTOCOL.md §15`);
  }

  const freeze: ProtocolFreeze = {
    protocolSha256: await sha256File(protocolFile),
    contextSha256: await sha256File(contextFile),
    frozenAt: nowIso(),
    git: gitState()
  };

  await writeJson(file, freeze);
  log(`protocol frozen at ${freeze.frozenAt}: sha256 ${freeze.protocolSha256}`);

  return freeze;
};

// Every stage after the freeze calls this: the protocol must be frozen; a changed protocol or context file is allowed
// only with an amendment in §15 (reported, never silent).
export const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('The protocol is not frozen: run `npm run joint-16-etf-d1 -- freeze-protocol` first');
  }

  const freeze = await readJson<ProtocolFreeze>(protocolFreezeFile);
  const current = await sha256File(protocolFile);
  const context = await sha256File(contextFile);

  if (current !== freeze.protocolSha256 || context !== freeze.contextSha256) {
    const text = await fs.readFile(protocolFile, 'utf8');

    if (!/## 15\. Amendments\s+\n+(?!None\.)/.test(text)) {
      throw new Error(`${protocolFile} or ${contextFile} changed after the freeze without an amendment in §15`);
    }

    log(
      `NOTE: amended after the freeze (protocol ${freeze.protocolSha256.slice(0, 12)} → ${current.slice(0, 12)}, context ${freeze.contextSha256.slice(0, 12)} → ${context.slice(0, 12)})`
    );
  }

  return { freeze, current, context };
};

export const writeSelectionManifest = (body: Record<string, unknown>, file: string = frozenSelectionFile) =>
  writeManifest(body, file);

export const readVerifiedSelection = (file: string = frozenSelectionFile): Promise<SelectionManifest> =>
  readManifest(file);
