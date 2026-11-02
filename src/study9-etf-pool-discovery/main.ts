// The Study 9 command line (research/study9-etf-pool-discovery/RUN_COMMANDS.md). Run from the repository root with
// Node v24.21.0: npm run study9 -- <command> [args].
//
//   s0-audit                       S0 data and universe audit of the refreshed files (no strategy, no P&L)
//   s0-project                     once: the read-only training projection (bytes through 2024-12-31)
//   pilot                          pre-freeze throughput pilot (counts and timings only; no economic output)
//   freeze-protocol                once: seal PROTOCOL.md, the review, the code and the data pins (chain "protocol")
//   parity                         engineering and leakage gates (chain "parity")
//   s1 [SYM…] | s2 | s3-screen [--family F] | s3-high --part F|C | s3-nominate   the training-only stages
//   seal-s1 | seal-s3-screen | seal-s3-high   seal a stage run in parts
//   seal report-<name> <files…>    seal report-stage files (tables: scripts/build_tables.py)
//   verify-chain | chain           re-verify the chain, the door log and the pins | list the chain
import { runAudit, runProjection } from './s0.ts';

const [command, ...args] = process.argv.slice(2);

const main = async () => {
  if (process.version !== 'v24.21.0') throw new Error(`Node v24.21.0 required (${process.version})`);

  // the pre-freeze commands refuse once the protocol is frozen (review m12)
  if (['s0-audit', 's0-project', 'pilot'].includes(command ?? '')) {
    if (
      (await import('fs-extra')).default.existsSync('research/study9-etf-pool-discovery/results/protocol_freeze.json')
    ) {
      throw new Error(`${command} is a pre-freeze command; the protocol is frozen`);
    }
  }

  switch (command) {
    case 's0-audit': {
      await runAudit();
      break;
    }
    case 's0-project': {
      const audit = (await import('fs-extra')).default.readJsonSync(
        'research/study9-etf-pool-discovery/results/s0/symbols.json'
      ) as { eligible: string[] };

      await runProjection(audit.eligible);
      break;
    }
    case 'pilot': {
      const { runPilot } = await import('./pilot.ts');
      const audit = (await import('fs-extra')).default.readJsonSync(
        'research/study9-etf-pool-discovery/results/s0/symbols.json'
      ) as { eligible: string[] };

      await runPilot(audit.eligible);
      break;
    }
    default: {
      const { dispatch } = await import('./commands.ts');

      await dispatch(command, args);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
