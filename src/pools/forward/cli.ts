// `npm run pools -- forward <command>`: the prospective shadow comparison of B4 and B5
// (research/prospective-b4-b5-shadow/PROTOCOL.md).
//
//   status                                   freeze, snapshots and observation count (fast; reads no market data)
//   freeze                                   write PROTOCOL_FREEZE.json once, before any post-cutoff bar exists
//   import --from DIR --snapshot ID --source "…" [--splits FILE] [--distributions FILE --distributions-through DATE]
//                                            [--confirm-move SYMBOL:DATE[,…]] (a genuine overnight move beyond ±15%)
//                                            verify and store a snapshot of post-cutoff minute bars (write-once)
//   report [--snapshot ID]                   the forward report; without a snapshot, the zero-observation statement
import { importSnapshot, listSnapshots } from './data.ts';
import { verifyProspectiveFreeze, writeProspectiveFreeze } from './freeze.ts';
import { prospective } from './protocol.ts';
import { nextStepText, runForwardReport, zeroObservationStatement } from './report.ts';

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const runForward = async (positionals: string[], args: string[]) => {
  const [command] = positionals;

  switch (command) {
    case 'status': {
      const verified = await verifyProspectiveFreeze();
      const snapshots = await listSnapshots();

      console.log(`Prospective shadow comparison ${prospective.version} (${prospective.dir}/PROTOCOL.md)`);
      console.log(
        verified.frozen
          ? `  freeze: ${verified.freeze.bodyHash.slice(0, 16)}… (${verified.freeze.frozenAt}); ${verified.failures.length === 0 ? 'verifies' : `DOES NOT VERIFY: ${verified.failures.join('; ')}`}`
          : `  freeze: none — ${verified.failures.join('; ')}`
      );
      console.log(
        `  cutoff ${prospective.cutoff}; pools ${prospective.pools.join(', ')}; challengers: none (deferred, PROTOCOL.md §7)`
      );
      console.log(`  snapshots: ${snapshots.length ? snapshots.join(', ') : 'none'}`);

      if (snapshots.length === 0) {
        console.log(`  ${zeroObservationStatement}`);
        console.log(nextStepText);
      } else {
        console.log(`  report: npm run pools -- forward report --snapshot ${snapshots.at(-1)}`);
      }

      break;
    }

    case 'freeze': {
      const sealed = await writeProspectiveFreeze();

      console.info(
        `[pools] prospective protocol frozen: ${prospective.dir}/PROTOCOL_FREEZE.json (body ${sealed.bodyHash})`
      );
      break;
    }

    case 'import': {
      const from = option(args, 'from');
      const snapshot = option(args, 'snapshot');
      const source = option(args, 'source');

      if (!from || !snapshot || !source) {
        throw new Error(
          'usage: forward import --from DIR --snapshot ID --source "…" [--splits FILE] [--distributions FILE --distributions-through YYYY-MM-DD]'
        );
      }

      const record = await importSnapshot({
        from,
        id: snapshot,
        source,
        splitsFile: option(args, 'splits'),
        distributionsFile: option(args, 'distributions'),
        distributionsThrough: option(args, 'distributions-through'),
        confirmMoves: option(args, 'confirm-move')?.split(',').filter(Boolean)
      });

      console.info(
        `[pools] snapshot ${record.id}: ${record.sessions} sessions ${record.first} → ${record.last} (record body ${record.bodyHash.slice(0, 16)}…)`
      );
      break;
    }

    case 'report': {
      const { text, out } = await runForwardReport({ snapshot: option(args, 'snapshot') });

      process.stdout.write(text);
      console.info(`[pools] → ${out}/`);
      break;
    }

    default:
      throw new Error('usage: forward status | freeze | import … | report [--snapshot ID]');
  }
};
