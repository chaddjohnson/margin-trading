// The Study 4 command line (research/study4-two-tier-d1-allocator/README.md). Run from the repository root with Node
// v24.21.0: npm run study4-allocator -- <command>. Commands that read market data open exactly one Study 4 door.
import fs from 'fs-extra';
import { files, foldKeys, resultFile, studyDir, windowKeys, type WindowKey } from './context.ts';
import {
  assertNode,
  assertRealRoot,
  assertScope,
  closureDigest,
  codeFreezeFiles,
  codeHashes,
  latestCodeFreezeFile,
  nextCodeFreezeFile,
  developmentEntries,
  evaluationEntries,
  verifyCodeFreeze,
  nowIso,
  protocolFiles,
  protocolFreezeBody,
  protocolHashes,
  readSealed,
  verifySealed,
  writeSealed
} from './records.ts';

const [command, ...args] = process.argv.slice(2);
const parityNames = ['PARITY_B5', 'PARITY_SYNTHETIC_FROZEN', 'PARITY_REFERENCE_SYNTHETIC', 'PARITY_REFERENCE_F20'];

const main = async () => {
  assertNode();

  switch (command) {
    case 'freeze-protocol': {
      assertRealRoot();

      const scope = assertScope();
      const sealed = writeSealed(files.protocolFreeze, {
        stage: 'PROTOCOL_FREEZE',
        study: 'study4-two-tier-d1-shallow-deep-joint-allocator-v1',
        frozenAt: nowIso(),
        head: scope.head,
        branch: scope.branch,
        hashes: protocolHashes(),
        files: protocolFiles(),
        note: 'Written before any Study 4 outcome-bearing computation; changes after this point only through AMENDMENTS.md and results/amendments.jsonl.'
      });

      console.log(`protocol frozen: body ${sealed.bodyHash}`);
      break;
    }

    case 'parity-b5': {
      assertRealRoot();
      protocolFreezeBody();

      const { parityB5, sealParity } = await import('./parity.ts');
      const result = await parityB5();
      const sealed = sealParity('PARITY_B5', result);

      console.log(
        `parity B5: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.filter((c) => !c.pass).length} failing of ${result.checks.length}); body ${sealed.bodyHash}`
      );

      for (const check of result.checks.filter((c) => !c.pass)) {
        console.log('FAIL', JSON.stringify(check));
      }

      break;
    }

    case 'parity-synthetic': {
      assertRealRoot();
      protocolFreezeBody();

      const { paritySyntheticFrozen, sealParity } = await import('./parity.ts');
      const result = paritySyntheticFrozen();
      const sealed = sealParity('PARITY_SYNTHETIC_FROZEN', result);

      console.log(
        `parity synthetic (frozen oracles): ${result.pass ? 'PASS' : 'FAIL'} ${JSON.stringify(result.outcomes)}; body ${sealed.bodyHash}`
      );

      for (const check of result.checks.filter((c) => !c.pass).slice(0, 20)) {
        console.log('FAIL', JSON.stringify(check));
      }

      break;
    }

    case 'parity-reference': {
      assertRealRoot();
      protocolFreezeBody();

      const { parityReference } = await import('./referenceParity.ts');
      const { sealParity } = await import('./parity.ts');
      const result = await parityReference(args[0] ?? 'synthetic');
      const sealed = sealParity(`PARITY_REFERENCE_${(args[0] ?? 'synthetic').toUpperCase()}`, result);

      console.log(
        `parity reference ${args[0] ?? 'synthetic'}: ${result.pass ? 'PASS' : 'FAIL'}; body ${sealed.bodyHash}`
      );
      console.log(JSON.stringify(result.quotas));

      for (const check of result.checks.filter((c) => !c.pass).slice(0, 20)) {
        console.log('FAIL', JSON.stringify(check));
      }

      break;
    }

    case 'freeze-code': {
      assertRealRoot();

      const scope = assertScope();

      protocolFreezeBody();

      const { parityFile } = await import('./parity.ts');
      const digest = closureDigest();
      const parity: Record<string, string> = {};

      for (const name of parityNames) {
        const file = parityFile(name, digest);

        if (!fs.existsSync(file) || !readSealed<{ pass: boolean }>(file).pass) {
          throw new Error(`refused: ${name} has not passed on this code (digest ${digest.slice(0, 16)})`);
        }

        parity[name] = readSealed(file).bodyHash;
      }

      const target = nextCodeFreezeFile();
      const previous = codeFreezeFiles().at(-1);

      if (previous && !args[0]) {
        throw new Error('usage: freeze-code <amendment id> (a later code freeze must name its amendment)');
      }

      const sealed = writeSealed(target, {
        stage: 'CODE_FREEZE',
        amendment: previous ? args[0] : null,
        previousFreeze: previous ? { file: previous, body: readSealed(previous).bodyHash } : null,
        frozenAt: nowIso(),
        head: scope.head,
        protocolBody: protocolFreezeBody(),
        entries: developmentEntries(),
        codeDigest: digest,
        parity,
        hashes: codeHashes(developmentEntries()),
        node: process.version
      });

      console.log(
        `code frozen (${target}): ${Object.keys(sealed.hashes as object).length} files, body ${sealed.bodyHash}`
      );
      break;
    }

    case 'develop': {
      const window = args[0] as WindowKey;

      if (!windowKeys.includes(window)) {
        throw new Error(`usage: develop <${windowKeys.join('|')}> [workers]`);
      }

      const { runDevelopment } = await import('./develop.ts');

      await runDevelopment(window, { workers: args[1] ? Number(args[1]) : undefined });
      break;
    }

    case 'freeze-evaluation': {
      assertRealRoot();

      const scope = assertScope();
      const { codeFreezeEvaluationFile } = await import('./evaluation.ts');

      protocolFreezeBody();
      verifyCodeFreeze(latestCodeFreezeFile(), developmentEntries());

      for (const fold of foldKeys) {
        if (!verifySealed(resultFile('selections', fold, 'SELECTION.json'))) {
          throw new Error(`refused: the ${fold} selection is not sealed`);
        }
      }

      // a later evaluation freeze (after an earlier one was superseded) must name its amendment (A5)
      const superseded = resultFile('superseded', 'evaluation-freeze1', 'CODE_FREEZE_EVALUATION.json');
      const previous = fs.existsSync(superseded) ? readSealed(superseded) : null;

      if (previous && !args[0]) {
        throw new Error('usage: freeze-evaluation <amendment id> (a later evaluation freeze must name its amendment)');
      }

      const sealed = writeSealed(codeFreezeEvaluationFile(), {
        stage: 'CODE_FREEZE_EVALUATION',
        amendment: previous ? args[0] : null,
        supersedes: previous ? previous.bodyHash : null,
        frozenAt: nowIso(),
        head: scope.head,
        protocolBody: protocolFreezeBody(),
        developmentFreezeBody: readSealed(latestCodeFreezeFile()).bodyHash,
        entries: evaluationEntries(),
        hashes: codeHashes(evaluationEntries()),
        node: process.version
      });

      console.log(
        `evaluation code frozen: ${Object.keys(sealed.hashes as object).length} files, body ${sealed.bodyHash}`
      );
      break;
    }

    case 'evaluate': {
      const { runEvaluation } = await import('./evaluation.ts');

      await runEvaluation();
      break;
    }

    case 'final': {
      const { runFinal } = await import('./final.ts');
      const sealed = runFinal();

      console.log(`final: ${String(sealed.statement)}; body ${sealed.bodyHash}`);
      break;
    }

    case 'verify': {
      const { verifyEvidence } = await import('./verify.ts');
      const lines = verifyEvidence({ raw: args.includes('--raw') });

      for (const line of lines) {
        console.log(`${line.ok ? 'ok  ' : 'FAIL'} ${line.check}${line.detail ? ` — ${line.detail}` : ''}`);
      }

      const failed = lines.filter((line) => !line.ok).length;

      console.log(
        failed === 0 ? `verify: all ${lines.length} checks ok` : `verify: ${failed} of ${lines.length} checks FAILED`
      );
      process.exitCode = failed === 0 ? 0 : 1;
      break;
    }

    case 'status': {
      const show = (label: string, file: string) =>
        console.log(
          `${label.padEnd(28)} ${fs.existsSync(file) ? (verifySealed(file) ? 'sealed, verifies' : 'PRESENT BUT DOES NOT VERIFY') : 'absent'}`
        );

      show('protocol freeze', files.protocolFreeze);
      for (const file of codeFreezeFiles()) {
        show(`code freeze ${file.split('/').at(-1)}`, file);
      }

      const { parityFile } = await import('./parity.ts');

      for (const name of parityNames) {
        show(`${name} (this code)`, parityFile(name));
      }

      for (const window of windowKeys) {
        for (const stage of ['SPEC', '4A', '4B', '4C', '4D-A', '4D-A0P', '4D-B', '4D-B0', '4D-C', '4D-C0']) {
          show(`${window} ${stage}`, resultFile(window, stage, 'RECORD.json'));
        }
      }

      for (const fold of foldKeys) {
        show(`${fold} SELECTION`, resultFile('selections', fold, 'SELECTION.json'));
      }

      show('H SELECTION', resultFile('selections', 'H', 'SELECTION.json'));
      break;
    }

    default:
      console.log(
        `commands: freeze-protocol | parity-b5 | parity-synthetic | parity-reference [synthetic|f20] | freeze-code | develop <window> [workers] | status   (study: ${studyDir})`
      );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
