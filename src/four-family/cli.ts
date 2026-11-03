// Command line for the four-family trailing-buy optimization. See
// research/trailing-buy-four-family-optimization/REPRODUCTION.md.
//
//   npm run four-family -- <command> [--workers N]
import path from 'node:path';
import { writeAudit } from './audit.ts';
import { generateCopies } from './copies.ts';
import { loadResearch, protocol, resultsRoot } from './context.ts';
import { runParityAudit } from './parityAudit.ts';

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const log = (message: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

export const runCli = async (args: string[]) => {
  const [command] = args;
  const workers = option(args, 'workers') ? Number(option(args, 'workers')) : undefined;

  switch (command) {
    case 'audit': {
      const audit = await writeAudit(path.join(resultsRoot, 'audit', 'data-audit.json'));

      log(`${audit.sessions} sessions ${audit.firstSession}..${audit.lastSession}, hash ${audit.dataHash}`);
      break;
    }

    case 'copies': {
      for (const copy of await generateCopies()) {
        log(`${copy.source} -> ${copy.target} (${copy.substitutions} substitutions, source ${copy.sourceHash})`);
      }

      break;
    }

    case 'parity': {
      const research = await loadResearch();
      const report = await runParityAudit({
        ds: research.ds,
        sessions: research.sessions,
        researchEnd: protocol.researchEnd,
        eligibilityIndex: protocol.eligibilityIndex,
        goldenVectorsPerFamily: Number(option(args, 'golden') ?? 30),
        outDir: path.join(resultsRoot, 'parity'),
        log
      });

      log(`Parity ${report.passed ? 'PASSED' : 'FAILED'}: ${report.cases - report.failures}/${report.cases} cases`);

      if (!report.passed) {
        process.exitCode = 1;
      }

      break;
    }

    default: {
      const { runStudyCommand } = await import('./study.ts');

      await runStudyCommand(command ?? '', args, { workers, log });
    }
  }
};
