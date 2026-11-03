// Freezes and guards (PROTOCOL.md §11): the protocol freeze, the code freeze, and the checks every write-once stage
// makes before it starts (protocol and code unchanged since their freezes, no test override, predecessors sealed).
import path from 'node:path';
import fs from 'fs-extra';
import {
  amendmentsFile,
  briefFile,
  codeFreezeFile,
  codeRoot,
  nowIso,
  protocolFile,
  protocolFreezeFile,
  resultFile,
  study,
  testRoot
} from './context.ts';
import { codeManifest, protectedManifest, protectedOk, readSealed, sha256File, writeRecord } from './records.ts';

export const auditFile = resultFile('audit', 'AUDIT.json');
export const parityFile = resultFile('parity', 'PARITY.json');

export const refuseOverrides = () => {
  if (testRoot) {
    throw new Error('refused: a write-once stage never runs with D1_COMPLEMENTARITY_ROOT set');
  }
};

export const requireProtocolFrozen = async () => {
  const freeze = await readSealed<{ protocol: { sha256: string }; brief: { sha256: string } } & { bodyHash: string }>(
    protocolFreezeFile
  );
  const protocol = await sha256File(protocolFile);

  if (protocol !== freeze.protocol.sha256) {
    throw new Error(`PROTOCOL.md changed since the freeze (${protocol} ≠ ${freeze.protocol.sha256}); amend instead`);
  }

  if ((await sha256File(briefFile)) !== freeze.brief.sha256) {
    throw new Error('the brief copy changed since the freeze');
  }

  return freeze;
};

type CodeFreeze = {
  manifest: { digest: string; files: Record<string, string> };
  protocolFreeze: string;
  amends?: string;
  amendment?: string;
  version?: number;
} & { bodyHash: string };

// The code-freeze chain (PROTOCOL.md §10.3): code_freeze.json, then code_freeze-2.json, … each later freeze amending
// the previous one under a logged correction amendment. Stages run under the latest; earlier records keep their own.
export const codeFreezeFileOf = (version: number) =>
  version === 1 ? codeFreezeFile : codeFreezeFile.replace(/\.json$/, `-${version}.json`);

export const codeFreezeChain = async () => {
  const chain: CodeFreeze[] = [];

  for (let version = 1; await fs.pathExists(codeFreezeFileOf(version)); version++) {
    const freeze = await readSealed<CodeFreeze>(codeFreezeFileOf(version));

    if (version > 1 && freeze.amends !== chain.at(-1)!.bodyHash) {
      throw new Error(`${codeFreezeFileOf(version)} does not amend the previous code freeze`);
    }

    chain.push(freeze);
  }

  if (chain.length === 0) {
    throw new Error(`${codeFreezeFile} does not exist`);
  }

  return chain;
};

export const requireCodeFrozen = async () => {
  const protocol = await requireProtocolFrozen();
  const chain = await codeFreezeChain();
  const freeze = chain.at(-1)!;
  const current = await codeManifest();

  if (current.digest !== freeze.manifest.digest) {
    const changed = Object.keys({ ...current.files, ...freeze.manifest.files }).filter(
      (file) => current.files[file] !== freeze.manifest.files[file]
    );

    throw new Error(`the study code changed since the code freeze: ${changed.join(', ') || 'script line'}`);
  }

  if (chain.some((item) => item.protocolFreeze !== protocol.bodyHash)) {
    throw new Error('a code freeze was made under another protocol freeze');
  }

  return { protocol, code: freeze, version: chain.length };
};

export const requireProtected = async () => {
  const manifest = await protectedManifest();

  if (!protectedOk(manifest)) {
    throw new Error(
      `protected inputs changed: ${JSON.stringify({
        tracked: manifest.trackedChangesOutsideStudy,
        untracked: manifest.untrackedOutsideStudy,
        packageJson: manifest.packageJsonOnlyStudyScript,
        prospective: manifest.prospectiveFreeze
      })}`
    );
  }

  const audit = await readSealed<
    { protected: { dataDigest: string; ignoredResearchDigest: string } } & { bodyHash: string }
  >(auditFile);

  if (audit.protected.dataDigest !== manifest.dataDigest) {
    throw new Error('a canonical data file or partitions.json changed since the audit');
  }

  if (audit.protected.ignoredResearchDigest !== manifest.ignoredResearchDigest) {
    throw new Error("a prior study's git-ignored file changed since the audit");
  }

  return manifest;
};

export const freezeProtocol = async () => {
  refuseOverrides();

  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is frozen once`);
  }

  const audit = await readSealed(auditFile);

  return writeRecord(protocolFreezeFile, {
    stage: 'protocol-freeze',
    study: study.id,
    frozenAt: nowIso(),
    protocol: { file: protocolFile, sha256: await sha256File(protocolFile) },
    brief: { file: briefFile, sha256: await sha256File(briefFile) },
    audit: { file: auditFile, bodyHash: audit.bodyHash },
    reviews: [
      'reviews/METHODOLOGY_REVIEW_1.md',
      'reviews/METHODOLOGY_REVIEW_1_DISPOSITIONS.md',
      'reviews/METHODOLOGY_REVIEW_2.md',
      'reviews/METHODOLOGY_REVIEW_2_DISPOSITIONS.md'
    ],
    note: 'frozen before any Study 2 result-bearing output; the code freeze follows Stage 2'
  });
};

export const freezeCode = async () => {
  refuseOverrides();

  const protocol = await requireProtocolFrozen();
  const parity = await readSealed<{ allPass: boolean } & { bodyHash: string }>(parityFile);

  if (!parity.allPass) {
    throw new Error('parity did not pass; the code is not frozen');
  }

  const manifest = await codeManifest();

  if (Object.keys(manifest.files).some((file) => /scratch/.test(file))) {
    throw new Error('a scratch file is still in the study code');
  }

  // Evidence that the parity record still describes the frozen code: the study files parity.ts imports (transitively)
  // and the study files modified after the parity run started; the two lists must not intersect.
  const closure = new Set<string>();
  const stack = [`${codeRoot}/parity.ts`];

  while (stack.length > 0) {
    const file = stack.pop()!;

    if (closure.has(file)) {
      continue;
    }

    closure.add(file);

    for (const match of (await fs.readFile(file, 'utf8')).matchAll(/from '(\.[^']+)'/g)) {
      const target = path.normalize(path.join(path.dirname(file), match[1]!));

      if (target.startsWith(codeRoot)) {
        stack.push(target);
      }
    }
  }

  const started = Date.parse((parity as unknown as { startedAt: string }).startedAt);
  const modifiedAfterParity: string[] = [];

  for (const file of Object.keys(manifest.files)) {
    if ((await fs.stat(file)).mtimeMs > started) {
      modifiedAfterParity.push(file);
    }
  }

  const overlap = modifiedAfterParity.filter((file) => closure.has(file));

  if (overlap.length > 0) {
    throw new Error(`files parity depends on changed after the parity run: ${overlap.join(', ')}; rerun parity`);
  }

  return writeRecord(codeFreezeFile, {
    stage: 'code-freeze',
    frozenAt: nowIso(),
    protocolFreeze: protocol.bodyHash,
    parity: parity.bodyHash,
    parityImportClosure: [...closure].sort(),
    modifiedAfterParity: modifiedAfterParity.sort(),
    manifest
  });
};

// A correction amendment's code freeze (PROTOCOL.md §10.3): the amendment must be logged first; no file in parity's
// import closure may change (else parity must be rerun under a new record).
export const freezeCodeCorrection = async (amendment: string) => {
  refuseOverrides();

  const protocol = await requireProtocolFrozen();
  const chain = await codeFreezeChain();
  const previous = chain.at(-1)!;
  const log = (await fs.pathExists(amendmentsFile))
    ? (await fs.readFile(amendmentsFile, 'utf8')).split('\n').filter(Boolean)
    : [];
  const entry = log
    .map((line) => JSON.parse(line) as { id: string; kind: string })
    .find((item) => item.id === amendment);

  if (!entry || entry.kind !== 'correction') {
    throw new Error(`no logged correction amendment ${amendment} in ${amendmentsFile}`);
  }

  const manifest = await codeManifest();
  const changed = Object.keys({ ...manifest.files, ...previous.manifest.files }).filter(
    (file) => manifest.files[file] !== previous.manifest.files[file]
  );
  const closure = (chain[0] as unknown as { parityImportClosure: string[] }).parityImportClosure;
  const overlap = changed.filter((file) => closure.includes(file));

  if (overlap.length > 0) {
    throw new Error(`the correction changes files parity depends on (${overlap.join(', ')}); rerun parity first`);
  }

  return writeRecord(codeFreezeFileOf(chain.length + 1), {
    stage: 'code-freeze',
    version: chain.length + 1,
    frozenAt: nowIso(),
    protocolFreeze: protocol.bodyHash,
    amends: previous.bodyHash,
    amendment,
    changedFiles: changed.sort(),
    parityImportClosureUnchanged: true,
    manifest
  });
};
