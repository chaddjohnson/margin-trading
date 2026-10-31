// The Study 7 command line (research/study7-stability-first-d1/RUN_COMMANDS.md). Run from the repository root with
// Node v24.21.0: npm run study7 -- <command> [args].
//
//   pilot                       pre-freeze pilot on training data ≤ 2021-12-31 (timing, memory, precision)
//   freeze-protocol             once: results/protocol_freeze.json (PROTOCOL.md sha256, time, git state, code digest)
//   parity                      engineering gates (parity, no-lookahead, cache invalidation, determinism)
//   phase-a <pool> <window>     Phase A frozen-configuration diagnostics (B1 VG VXR VXRG B5; WDEV W23 W29)
//   phase-a-freeze              seal results/phaseA/baseline_manifest.json (then commit before Phase B)
//   search <track> <fold>       Phase B optimizer for one track (G VG VXR VXRG V) and outer fold (F19 F20 M L)
//   …                           validation, selection freeze, final: see RUN_COMMANDS.md
import fs from 'fs-extra';
import { protocolFile, protocolFreezeFile } from './context.ts';
import { sha256 } from './data.ts';
import { runPilot } from './pilot.ts';
import { codeDigest, git, log, nowIso, setLogTag, writeSealed } from './records.ts';

const [command, ...args] = process.argv.slice(2);

const main = async () => {
  if (process.version !== 'v24.21.0') {
    throw new Error(`Node v24.21.0 required (${process.version})`);
  }

  setLogTag(`study7 ${[command ?? '', ...args.filter((a) => !a.startsWith('/') && !a.startsWith('--')).slice(0, 3)].join(' ')}`);

  switch (command) {
    case 'pilot': {
      if (await fs.pathExists(protocolFreezeFile)) {
        throw new Error('the pilot is a pre-freeze stage; the protocol is already frozen');
      }

      await runPilot();
      break;
    }
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
    default: {
      const { dispatch } = await import('./commands.ts');

      await dispatch(command ?? '', args);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
