// The Study 5 command line (research/study5-gdx-d1-b5-three-etf-2026-10/RUN_COMMANDS.md). Run from the repository
// root with Node v24.21.0: npm run study5 -- <command>.
//
//   freeze-protocol              once: results/protocol_freeze.json (PROTOCOL.md sha256, time, git state)
//   parity                       engineering gates P1, P2, P4 (PROTOCOL.md §9)
//   a-search main|wf20           Study A screen + GA replicates + shortlist (search door)
//   a-validate main|wf20         Study A evidence, gates, roles (validation door)
//   track1 main|wf20             Study B Track 1 (the frozen B5 method on VGT/KRE/GDX; search door)
//   track2                       Study B Track 2a (staged coordinate + joint; search door)
//   b-validate                   Study B Track 2b (candidates, evidence, gates, roles; validation door)
//   controls                     controls C1/C2/C3/C5 on DEV and VAL
//   freeze-selection             once: FROZEN_SELECTION.json
//   final                        once (after the freeze): the final evaluation, sensitivities, audits
//   pool fixed <ID> [options]    run a research pool (config/research-pools/study5-gdx-d1-b5-three-etf/<ID>.json)
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import { protocolFile, protocolFreezeFile } from './context.ts';
import { sha256 } from './data.ts';
import { codeDigest, log, nowIso, writeSealed } from './records.ts';
import { type Fold, runSearchA, runValidateA } from './studyA.ts';

const [command, ...args] = process.argv.slice(2);

const foldArg = (): Fold => {
  const fold = args[0] ?? 'main';

  if (fold !== 'main' && fold !== 'wf20') {
    throw new Error('fold must be main or wf20');
  }

  return fold;
};

const requireProtocolFrozen = async () => {
  if (!(await fs.pathExists(protocolFreezeFile))) {
    throw new Error('the protocol is not frozen (npm run study5 -- freeze-protocol)');
  }
};

const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();

const main = async () => {
  if (process.version !== 'v24.21.0') {
    throw new Error(`Node v24.21.0 required (${process.version})`);
  }

  switch (command) {
    case 'freeze-protocol': {
      const record = await writeSealed(protocolFreezeFile, {
        stage: 'PROTOCOL_FREEZE',
        frozenAt: nowIso(),
        protocol: { file: protocolFile, sha256: sha256(await fs.readFile(protocolFile)) },
        git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
        code: await codeDigest()
      });

      log(`protocol frozen: ${JSON.stringify(record)}`);
      break;
    }
    case 'a-search':
      await requireProtocolFrozen();
      await runSearchA(foldArg());
      break;
    case 'a-validate':
      await requireProtocolFrozen();
      await runValidateA(foldArg());
      break;
    default: {
      const loaded = await import('./commands.ts');

      await loaded.run(command, args, requireProtocolFrozen);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
