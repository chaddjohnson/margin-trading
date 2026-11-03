// The study's commands (`npm run standalone-opportunity-audit -- <command>`); see README.md in the study folder.
import { analyze, writeNeighbourhoodVectors } from './analysis.ts';
import { writeCatalogsAndDesigns } from './catalogs.ts';
import { batchStatus, benchmark, requireBaseParity, runBatch } from './batch.ts';
import { writeCensus } from './census.ts';
import { option, requireNode24 } from './context.ts';
import { amend, freezeProtocol, requireFrozen, verifyFreeze } from './freeze.ts';
import { runParity } from './parity.ts';
import { render } from './render.ts';
import { writeShortlist } from './shortlist.ts';
import { verify } from './verify.ts';
import { compareView, fixedView, listView, showView } from './views.ts';

export const usage = `npm run standalone-opportunity-audit -- <command>

Read-only views (outputs under evaluations/standalone-opportunity-audit/, git-ignored):
  list           the shortlisted research phenotypes, the control and the benchmarks
  show <ID>      one phenotype's source and (after analyze) its flags and standing
  fixed <ID> [--end YYYY-MM-DD] [--cost-bps N] [--portfolio]
                 one phenotype's run and funded-trade ledger. ID = VGT-primary | a shortlist id (e.g.
                 GDX:representative) | source:<fold-a|fold-b|final>:<SYMBOL>[:<role>] | a research JSON path.
                 Research phenotypes are refused after their cutoff (final: 2023-12-29; folds: their validation end);
                 VGT-primary defaults to 2023-12-29 and may run to 2026-10-13
  compare        the same-window comparison table from results/analysis.json

Study commands:

  inventory      the read-only census of the 61 × 3 stored standalone records → results/inventory/
  parity         the preregistered parity sample, the sealed same-window controls, the full-history anchors and
                 the causality check → results/parity/PARITY.json (exit 1 on any mismatch)
  shortlist [--force]
                 the predeclared rule on the stored census → SHORTLIST.json (written once; --force only before
                 the protocol freeze, which binds the file)
  catalog        the price-only episode catalogs and the perturbation designs (before the freeze only)
  benchmark [--workers N] [--repeats N]
                 outcome-blind timings of incumbent runs (before the freeze only)
  freeze         PROTOCOL_FREEZE.json (once, after the methodology review)
  amend --stage S --reason "…" --review "…" --files a,b
                 record an amendment (technical or reporting only) with the new hashes of the files it changes
  verify         the freeze, the unchanged read-only inputs, the source records, the stored runs and the analysis
                 identities (read-only; exit 1 on any failure)
  run [--family base|incumbent|cost|oat|joint|fold] [--workers N] [--local]
                 every frozen run not yet stored (resumable; refuses unless the freeze verifies)
  status         stored versus specified runs per family
  analyze        results/analysis.json + deterministic CSV ledgers under results/tables/ (refuses unless the freeze
                 verifies)
  report [NAME.md …]
                 the Markdown reports from templates/ (all, or the named ones)
`;

export const runCli = async (args: string[]) => {
  const [command] = args;

  requireNode24();

  switch (command) {
    case 'list':
      await listView();
      return;
    case 'show':
      await showView(args[1] ?? '');
      return;
    case 'fixed':
      await fixedView(args[1] ?? '', {
        end: option(args, 'end'),
        costBps: option(args, 'cost-bps') ? Number(option(args, 'cost-bps')) : undefined,
        portfolio: args.includes('--portfolio')
      });
      return;
    case 'compare':
      await compareView();
      return;
    case 'inventory':
      await writeCensus();
      return;
    case 'parity':
      await runParity();
      return;
    case 'shortlist':
      await writeShortlist({ force: args.includes('--force') });
      return;
    case 'catalog':
      await writeCatalogsAndDesigns();
      return;
    case 'benchmark':
      await benchmark({
        workers: option(args, 'workers') ? Number(option(args, 'workers')) : undefined,
        repeats: option(args, 'repeats') ? Number(option(args, 'repeats')) : undefined
      });
      return;
    case 'analyze': {
      await requireFrozen();
      await requireBaseParity();

      await analyze();
      await writeNeighbourhoodVectors();
      return;
    }
    case 'report':
      await render(args.slice(1).length > 0 ? args.slice(1) : undefined);
      return;
    case 'verify':
      await verify();
      return;
    case 'amend': {
      const files = (option(args, 'files') ?? '').split(',').filter(Boolean);

      if (!option(args, 'stage') || !option(args, 'reason') || !option(args, 'review') || files.length === 0) {
        throw new Error('amend needs --stage, --reason, --review and --files');
      }

      await amend({
        stage: option(args, 'stage')!,
        reason: option(args, 'reason')!,
        review: option(args, 'review')!,
        files
      });
      return;
    }
    case 'freeze':
      await freezeProtocol();
      return;
    case 'run':
      await runBatch({
        families: option(args, 'family') ? [option(args, 'family') as never] : undefined,
        workers: option(args, 'workers') ? Number(option(args, 'workers')) : undefined,
        local: args.includes('--local')
      });
      return;
    case 'status': {
      const { problems } = await verifyFreeze();

      if (problems.length > 0) {
        throw new Error(problems.join('\n'));
      }

      await batchStatus();
      return;
    }
    default:
      console.log(usage);
      if (command && command !== 'help') {
        throw new Error(`unknown command ${command}`);
      }
  }
};
