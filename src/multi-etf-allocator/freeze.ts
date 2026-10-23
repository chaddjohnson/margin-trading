// The protocol freeze (PROTOCOL.md preamble): the protocol's SHA-256, the UTC time, git HEAD and status, the config
// and input hashes, written once before the first allocator, portfolio or stress result. Those commands refuse to
// run without it, and report (not hide) a protocol edited after the freeze, which must then carry a §14 entry.
import { execFileSync } from 'node:child_process';
import fs from 'fs-extra';
import {
  configFile,
  d1Source,
  expectedHashes,
  files,
  manifestFile,
  protocol,
  protocolFile,
  protocolFreezeFile,
  securities,
  sha256File,
  writeJson
} from './context.ts';

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export interface ProtocolFreeze {
  version: string;
  frozenAt: string;
  protocolSha256: string;
  configSha256: string;
  gitHead: string;
  gitStatus: string[];
  inputs: Record<string, string>;
  note: string;
}

export const inputHashes = async () => {
  const inputs: Record<string, string> = {};

  for (const security of securities) {
    inputs[files.minute(security)] = await sha256File(files.minute(security));
  }

  inputs[files.distributions] = await sha256File(files.distributions);
  inputs[d1Source] = await sha256File(d1Source);
  inputs[manifestFile] = await sha256File(manifestFile);

  for (const symbol of ['VGT', 'XBI', 'XRT', 'KRE']) {
    inputs[`config/phenotypes/D1/${symbol}.json`] = await sha256File(`config/phenotypes/D1/${symbol}.json`);
  }

  return inputs;
};

export const freezeProtocol = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: the protocol is already frozen (amend §14 instead)`);
  }

  const inputs = await inputHashes();

  for (const security of securities) {
    if (inputs[files.minute(security)] !== expectedHashes[security]) {
      throw new Error(`${files.minute(security)} differs from the protocol's hash`);
    }
  }

  const freeze: ProtocolFreeze = {
    version: protocol.version,
    frozenAt: new Date().toISOString(),
    protocolSha256: await sha256File(protocolFile),
    configSha256: await sha256File(configFile),
    gitHead: git('rev-parse', 'HEAD'),
    gitStatus: git('status', '--porcelain').split('\n').filter(Boolean),
    inputs,
    note: 'Written before any allocator, multi-ETF portfolio or margin-stress result; only the single-symbol regression controls (PROTOCOL.md §11) had run.'
  };

  await writeJson(protocolFreezeFile, freeze);

  return freeze;
};

// The guard of the result commands: the freeze must exist; a later protocol edit is reported with the frozen hash.
export const checkProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error(
      `The protocol is not frozen: run \`npm run multi-etf-allocator -- freeze-protocol\` before any allocator result`
    );
  }

  const freeze = (await fs.readJson(protocolFreezeFile)) as ProtocolFreeze;
  const current = await sha256File(protocolFile);

  return {
    freeze,
    current,
    amended: current !== freeze.protocolSha256,
    configAmended: (await sha256File(configFile)) !== freeze.configSha256
  };
};

// The record a genuine forward test must hold fixed (FORWARD_TEST_FREEZE.json): the allocator's code, its settings,
// the protocol, the phenotypes and the D1 source, by hash, and what new data the test needs. Writing it evaluates
// nothing.
export const writeForwardFreeze = async (
  file = `${protocolFile.replace('PROTOCOL.md', '')}FORWARD_TEST_FREEZE.json`
) => {
  const codeDir = 'src/multi-etf-allocator';
  const code: Record<string, string> = {};

  for (const name of (await fs.readdir(codeDir)).filter((entry) => entry.endsWith('.ts')).sort()) {
    code[`${codeDir}/${name}`] = await sha256File(`${codeDir}/${name}`);
  }

  for (const shared of [
    'src/shared-margin-portfolio/strategy.ts',
    'src/shared-margin-portfolio/data.ts',
    'src/four-family/data.ts',
    'src/lib/session.ts',
    'src/lib/csv.ts'
  ]) {
    code[shared] = await sha256File(shared);
  }

  const record = {
    version: protocol.version,
    writtenAt: new Date().toISOString(),
    gitHead: git('rev-parse', 'HEAD'),
    status: 'FROZEN FOR A FORWARD TEST: change nothing below before the test has run once on new minute data',
    frozen: {
      protocolSha256: await sha256File(protocolFile),
      configSha256: await sha256File(configFile),
      code,
      inputs: await inputHashes()
    },
    rules: {
      allocator:
        'shadow (first executable signal wins; same-minute ties alphabetical KRE, VGT, XBI, XRT); no displacement',
      sensitivities: ['priority', 'split'],
      configurations: { main: 'all-primary (xbiP-xrtP-kreP)', lowDdSensitivity: 'all-lowDd (xbiL-xrtL-kreL)' },
      phenotypes: 'config/phenotypes/D1/{VGT,XBI,XRT,KRE}.json as hashed above; VGT primary fixed',
      portfolioSizing:
        '20% of equity at the decision; one shared pool; profits 60/40 VOOG/VGT; losses from proportional core sales',
      fixedPool: '$100,000 (split: 2 × $50,000), 11% simple interest',
      interest: '11% simple 365-day (primary); Vanguard tiers/360 as a sensitivity',
      maintenance: 'U35, U50, U60, L50, L60, G50, G60 passive; no requirement above 60%',
      eligibility: 'continuous state from 2016-01-04; first arming 2017-06-15'
    },
    forwardTest: {
      newDataNeeded:
        'Alpaca SIP raw one-minute files for VGT, XBI, XRT, KRE and VOOG covering sessions after 2025-10-16, hashed and audited before any strategy run',
      procedure:
        "Extend the files, run the audit, verify this record's hashes, then run the frozen catalogue once from 2016-01-04 with the state carried through; report only the sessions after the last session of these files as the forward window",
      notYetAvailable: 'No minute bar after 2025-10-16 exists in the repository on 2026-10-23'
    }
  };

  await writeJson(file, record);

  return record;
};
