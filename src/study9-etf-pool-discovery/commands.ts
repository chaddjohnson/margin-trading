// Stage commands with their gates (PROTOCOL.md §3): every stage re-verifies the chain and the integrity pins, requires
// its predecessor phase (parity also requires parity.json passed: true, sealed in the parity entry) and refuses to run
// once its own phase is sealed. Completed stages never rerun. The S3 screen and high stages run as parts (one per
// family; high also part C, the comparators), each write-once, then sealed together.
import fs from 'fs-extra';
import { type Family, families, resultFile, smoke } from './context.ts';
import { incumbents } from './incumbents.ts';
import { parityFile, runParity } from './parity.ts';
import {
  acknowledgeCode,
  appendPhase,
  fileSha256,
  freezeProtocol,
  readChain,
  refusePhase,
  requireIntegrity,
  requirePhase,
  verifyChain,
  verifyDoorLog
} from './records.ts';
import { runS1Symbol, s1File } from './s1.ts';
import { runS2, s2File } from './s2.ts';
import {
  type HighPart,
  allStrata,
  highFile,
  highParts,
  midFile,
  runMidHigh,
  runNominate,
  runScreen,
  s3Dir,
  stratumFile
} from './s3.ts';

const eligible = async () => ((await fs.readJson(resultFile('s0', 'symbols.json'))) as { eligible: string[] }).eligible;

const requireParityPassed = async (where: string) => {
  await requirePhase('parity', where);

  const record = (await fs.readJson(parityFile)) as { passed?: boolean };
  const entry = (await readChain()).find((e) => e.phase === 'parity')!;

  if (record.passed !== true || entry.files[parityFile] !== (await fileSha256(parityFile))) {
    throw new Error(`${where}: parity.json is not a sealed, passed parity record`);
  }
};

const option = (args: string[], name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : undefined;
};

export const dispatch = async (command: string | undefined, args: string[]) => {
  if (smoke) throw new Error('STUDY9_SMOKE is set: the stage commands refuse smoke mode');

  switch (command) {
    case 'freeze-protocol': {
      const entry = await freezeProtocol();

      console.info(`protocol frozen: chain ${entry.hash.slice(0, 16)}`);
      break;
    }
    case 'acknowledge-code': {
      const entry = await acknowledgeCode(args[0] ?? '');

      console.info(`code-${args[0]} acknowledged: chain ${entry.hash.slice(0, 16)}`);
      break;
    }
    case 'verify-chain': {
      const chain = await verifyChain();
      const live = await requireIntegrity('verify-chain');
      const doors = await verifyDoorLog();

      console.info(
        `chain verified: ${chain.map((e) => e.phase).join(' → ')}; head ${chain.at(-1)?.hash.slice(0, 16)}; code ${live.codeDigest.slice(0, 16)}, data ${live.dataDigest.slice(0, 16)}; door log ${doors.lines} openings, all ≤ 2024-12-31 on the projection`
      );
      break;
    }
    case 'parity': {
      await requireIntegrity('parity');
      await refusePhase('parity', 'parity');

      const record = await runParity(await eligible());

      if (!record.passed) throw new Error('parity FAILED: the study stops (see results/parity/parity.json)');

      await appendPhase('parity', [parityFile]);
      break;
    }
    case 's1': {
      await requireIntegrity('s1');
      await requireParityPassed('s1');
      await refusePhase('s1', 's1');

      const symbols = args.length ? args : await eligible();

      for (const symbol of symbols) await runS1Symbol(symbol);
      break;
    }
    case 'seal-s1': {
      await requireIntegrity('seal-s1');
      await requireParityPassed('seal-s1');
      await refusePhase('s1', 'seal-s1');

      const files = (await eligible()).map(s1File);
      const missing = files.filter((f) => !fs.existsSync(f));

      if (missing.length)
        throw new Error(`seal-s1: ${missing.length} S1 jobs missing (${missing.slice(0, 5).join(', ')})`);

      await appendPhase('s1', files);
      break;
    }
    case 's2': {
      await requireIntegrity('s2');
      await requireParityPassed('s2');
      await requirePhase('s1', 's2');
      await refusePhase('s2', 's2');
      await runS2(await eligible());
      await appendPhase('s2', [s2File]);
      break;
    }
    case 's3-screen': {
      await requireIntegrity('s3-screen');
      await requireParityPassed('s3-screen');
      await requirePhase('s2', 's3-screen');
      await refusePhase('s3-screen', 's3-screen');

      const only = option(args, 'family');

      if (only && !families.includes(only as Family)) throw new Error(`--family must be one of ${families.join(' ')}`);

      await runScreen(await eligible(), only ? [only as Family] : families);
      break;
    }
    case 'seal-s3-screen': {
      await requireIntegrity('seal-s3-screen');
      await requireParityPassed('seal-s3-screen');
      await requirePhase('s2', 'seal-s3-screen');
      await refusePhase('s3-screen', 'seal-s3-screen');

      const files = allStrata().map(({ family, size }) => stratumFile(family, size));
      const missing = files.filter((f) => !fs.existsSync(f));

      if (missing.length) throw new Error(`seal-s3-screen: missing ${missing.join(', ')}`);

      await appendPhase('s3-screen', files);
      break;
    }
    case 's3-high': {
      await requireIntegrity('s3-high');
      await requireParityPassed('s3-high');
      await requirePhase('s3-screen', 's3-high');
      await refusePhase('s3-high', 's3-high');

      const part = option(args, 'part') as HighPart | undefined;

      if (!part || !highParts.includes(part)) throw new Error(`--part must be one of ${highParts.join(' ')}`);

      await runMidHigh(await eligible(), part, part === 'C' ? await incumbents() : []);
      break;
    }
    case 'seal-s3-high': {
      await requireIntegrity('seal-s3-high');
      await requireParityPassed('seal-s3-high');
      await requirePhase('s3-screen', 'seal-s3-high');
      await refusePhase('s3-high', 'seal-s3-high');

      const files = highParts.flatMap((part) => [midFile(part), highFile(part)]);
      const missing = files.filter((f) => !fs.existsSync(f));

      if (missing.length) throw new Error(`seal-s3-high: missing ${missing.join(', ')}`);

      await appendPhase('s3-high', files);
      break;
    }
    case 's3-nominate': {
      await requireIntegrity('s3-nominate');
      await requireParityPassed('s3-nominate');
      await requirePhase('s3-high', 's3-nominate');
      await refusePhase('s3-nominate', 's3-nominate');
      await runNominate();
      await appendPhase('s3-nominate', [`${s3Dir}/nominations.json`]);
      break;
    }
    case 'seal': {
      // seals report-stage files (generated tables and reports) only: `seal report-<name> <files…>` (review M9a)
      await requireIntegrity('seal');
      await requireParityPassed('seal');
      await requirePhase('s3-nominate', 'seal');

      const [phase, ...files] = args;

      if (!phase || !/^report-[a-z0-9-]+$/.test(phase) || !files.length) {
        throw new Error('usage: seal report-<name> <files…> (only report-* phases can be sealed by hand)');
      }

      await appendPhase(phase, files);
      break;
    }
    case 'chain': {
      for (const e of await readChain())
        console.info(`${e.at}  ${e.phase.padEnd(16)} ${e.hash.slice(0, 16)}  ${Object.keys(e.files).length} files`);
      break;
    }
    default:
      throw new Error(`unknown command '${command ?? ''}' (see src/study9-etf-pool-discovery/main.ts)`);
  }
};
