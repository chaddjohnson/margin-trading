// The study's commands (`npm run d1-library-study -- <command>`); see README.md in the study folder.
import fs from 'fs-extra';
import { runAnalysis } from './analysis.ts';
import { runAnchors } from './anchors.ts';
import { archiveInventory, reconstruct } from './archive.ts';
import { runCensus } from './census.ts';
import {
  type FoldKey,
  type PoolKey,
  type SourceWindow,
  type TripleKey,
  foldKeys,
  libraryKs,
  log,
  primaryK,
  protocolFreezeFile,
  resultFile,
  study
} from './context.ts';
import { type PhaseKey, phaseKeys, runEvaluation } from './evaluation.ts';
import { amend, freezeCode, freezeProtocol, refuseOverrides } from './freeze.ts';
import { writeMatrix } from './matrix.ts';
import { runNestedSelection } from './nested.ts';
import { runSampleParity } from './sample.ts';
import { runSearch } from './search.ts';
import { runLibraries } from './selection.ts';
import { writeTables } from './tables.ts';
import {
  compareView,
  discardedView,
  foldsView,
  inventoryView,
  methodsView,
  nestedView,
  showView,
  statusView,
  verifyView
} from './views.ts';

export const usage = `npm run d1-library-study -- <command>

Read-only views (print, and write under evaluations/d1-wide-library-selection/, git-ignored):
  inventory | methods | folds | status | verify
  compare --fold <A|B|S18|S19|S20|S21|S22|T1-later|T2-later> [--pool ARCH|NEW|NEW-S|ALL] [--library-size K]
  nested
  show --symbol SYM --fold <A|B|S18|S19|S20|S22> --method <A0|A0r|A1|A2|A3|A4> [--library-size K] [--pool P]
  discarded --symbol SYM --fold <A|B>

One-time stages (write-once; each refuses to overwrite a sealed record and to open a later window early):
  archive-inventory | reconstruct --window fold-a|fold-b|final | census --window fold-a|fold-b|final | anchors
  matrix (before the freeze only) | freeze-protocol | freeze-code
  search --fold F | sample-parity --fold F | libraries --fold F   (in the calendar order of PROTOCOL.md §8.2)
  evaluate --phase <A|B-sel|B|T1-later|S18|S19|S20|S22> | nested-select --triple T1|T2 | analyze | tables
  amend --kind technical|reporting --stage S --reason "…" --review "…" --files a,b [--supersedes r1,r2 | --unaffected "why"]
Options: --workers N (default min(14, cores − 2)).
`;

export const option = (args: readonly string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const requireNode = () => {
  if (process.version !== study.node) {
    throw new Error(`Node ${study.node} is required (got ${process.version})`);
  }
};

const foldOption = (args: readonly string[]) => {
  const fold = option(args, 'fold') as FoldKey | undefined;

  if (!fold || !foldKeys.includes(fold)) {
    throw new Error(`--fold ${foldKeys.join('|')} required`);
  }

  return fold;
};

const windowOption = (args: readonly string[]) => {
  const window = option(args, 'window') as SourceWindow | undefined;

  if (window !== 'fold-a' && window !== 'fold-b' && window !== 'final') {
    throw new Error('--window fold-a|fold-b|final required');
  }

  return window;
};

export const runCli = async (args: string[]) => {
  const [command] = args;
  const workers = option(args, 'workers') ? Number(option(args, 'workers')) : undefined;
  const sealed = (label: string, record: { bodyHash: string }) =>
    log(`${label}: sealed ${record.bodyHash.slice(0, 12)}`);

  requireNode();

  switch (command) {
    case 'inventory':
      return inventoryView();
    case 'methods':
      return methodsView();
    case 'folds':
      return foldsView();
    case 'status':
      return statusView();
    case 'verify':
      return verifyView();
    case 'compare': {
      const k = option(args, 'library-size');

      return compareView(option(args, 'fold') ?? 'A', option(args, 'pool'), k ? Number(k) : undefined);
    }
    case 'nested':
      return nestedView();
    case 'show': {
      const symbol = option(args, 'symbol');
      const method = option(args, 'method') ?? 'A2';

      if (!symbol) {
        throw new Error('show --symbol SYM required');
      }

      return showView(
        symbol,
        foldOption(args),
        method,
        Number(option(args, 'library-size') ?? primaryK),
        (option(args, 'pool') ?? 'ARCH') as PoolKey
      );
    }
    case 'discarded': {
      const symbol = option(args, 'symbol');

      if (!symbol) {
        throw new Error('discarded --symbol SYM required');
      }

      return discardedView(symbol, foldOption(args));
    }
    case 'archive-inventory': {
      const file = resultFile('archive', 'INVENTORY.json');

      if (await fs.pathExists(file)) {
        throw new Error(`${file} exists: the inventory is written once`);
      }

      refuseOverrides();

      const inventory = await archiveInventory();

      await fs.outputJson(file, inventory, { spaces: 1 });
      log(`archive inventory → ${file}`);
      return;
    }
    case 'reconstruct':
      return sealed(`reconstruct ${option(args, 'window')}`, await reconstruct(windowOption(args), { workers }));
    case 'census':
      return sealed(`census ${option(args, 'window')}`, await runCensus(windowOption(args), { workers }));
    case 'anchors':
      return sealed('anchors', await runAnchors({ workers }));
    case 'matrix':
      if (await fs.pathExists(protocolFreezeFile)) {
        throw new Error('EXPERIMENT_MATRIX.json is bound by the protocol freeze and is never rewritten');
      }

      await writeMatrix();
      log('EXPERIMENT_MATRIX.json written');
      return;
    case 'freeze-protocol':
      return sealed('protocol freeze', await freezeProtocol());
    case 'search':
      return sealed(`search ${option(args, 'fold')}`, await runSearch(foldOption(args), { workers }));
    case 'sample-parity':
      return sealed(`sample parity ${option(args, 'fold')}`, await runSampleParity(foldOption(args)));
    case 'libraries':
      return sealed(`libraries ${option(args, 'fold')}`, await runLibraries(foldOption(args), { workers }));
    case 'freeze-code':
      return sealed('code freeze', await freezeCode());
    case 'evaluate': {
      const phase = option(args, 'phase') as PhaseKey | undefined;

      if (!phase || !phaseKeys.includes(phase)) {
        throw new Error(`--phase ${phaseKeys.join('|')} required`);
      }

      return sealed(`evaluation ${phase}`, await runEvaluation(phase, { workers }));
    }
    case 'nested-select': {
      const triple = option(args, 'triple') as TripleKey | undefined;

      if (triple !== 'T1' && triple !== 'T2') {
        throw new Error('--triple T1|T2 required');
      }

      return sealed(`nested selection ${triple}`, await runNestedSelection(triple));
    }
    case 'analyze':
      return sealed('analysis', await runAnalysis());
    case 'tables': {
      const written = await writeTables();

      log(`tables: ${written.join(', ')}`);
      return;
    }
    case 'amend': {
      const kind = option(args, 'kind') as 'technical' | 'reporting' | undefined;
      const files = (option(args, 'files') ?? '').split(',').filter(Boolean);

      if ((kind !== 'technical' && kind !== 'reporting') || files.length === 0) {
        throw new Error('amend --kind technical|reporting --stage S --reason "…" --review "…" --files a,b');
      }

      const amendment = await amend({
        kind,
        stage: option(args, 'stage') ?? 'unspecified',
        reason: option(args, 'reason') ?? '',
        review: option(args, 'review') ?? '',
        files,
        supersedes: (option(args, 'supersedes') ?? '').split(',').filter(Boolean),
        unaffected: option(args, 'unaffected')
      });

      log(`amendment ${amendment.index} recorded (${amendment.hash.slice(0, 12)})`);
      return;
    }
    default:
      console.info(usage);

      if (command) {
        throw new Error(`unknown command ${command}`);
      }

      void libraryKs;
  }
};
