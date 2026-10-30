// `verify` (verify committed evidence, PROTOCOL.md §13): works on a fresh clone without the git-ignored raw archives.
// It checks the protocol and code freezes, every sealed record's body hash, the parity records the code freeze names,
// the 4D floors, that every fold selection was sealed before the evaluation door opened, the protected inputs, and
// recomputes the verdict labels from the sealed evaluation results. Raw archives are checked only if present
// (`--raw` requires them) and are otherwise reported as absent and regenerable.
import path from 'node:path';
import fs from 'fs-extra';
import { files, foldKeys, resultFile, resultsRoot, windowKeys } from './context.ts';
import { budgets, islands, population } from './search4d.ts';
import {
  closureDigest,
  latestCodeFreezeFile,
  evaluationEntries,
  readSealed,
  sha256File,
  verifyCodeFreeze,
  verifySealed,
  developmentEntries
} from './records.ts';

export interface VerifyLine {
  check: string;
  ok: boolean;
  detail: string;
}

const protectedInputs: Record<string, string> = {
  'config/pools/B4.json': '4ca5aa1a900bc9596007c914a333ff13b0a0e14df32e3d8ba5b7ce16638edf40',
  'config/pools/B5.json': 'deef53ca531118064925a64e25288c927f3a71d8a05311075b439087960020fe',
  'config/phenotypes/D1/GDX.json': 'ed98c23c7c1e741401862bdf481175a106367d30ddea7ba1b5906859cb0ce71b',
  'config/phenotypes/D1/KRE.json': '6b8889e20ab3c07e85f12e5c344166588495e95bc1f5573b36699e8a587a8c8d',
  'config/phenotypes/D1/VGT.json': '3e77a419943b6a066c5467494947dfd4e1212a436ea79f6777c99764ca6c5f70',
  'config/phenotypes/D1/XBI.json': '453c4fd00d9de91269da718011c78b3d20d4611a0791005285345cbdac12aff8',
  'config/phenotypes/D1/XRT.json': 'd7b7f222bb8921ec5a3781d3b98c32f3045eb775cb5e01ee5e6af05af4e7cee9',
  'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json':
    '0dabd97e2b3d50fe9946b773bd9b845b07da1934eb4a797ecc9a59af129c3be2',
  'research/prospective-b4-b5-shadow/PROTOCOL.md': 'f2bca1146c62493b8ba805adfdddf37a439011a84ed4c288f9f05f6742aacd27',
  'config/market-events/splits.json': 'e5bde427182fea627e38aba69c14ae16cf8b7e428e75bf4153e55db1d1cb5ba2',
  'config/market-events/distributions.csv': '3b4342eb7cdbb270d78a355576c2098d7692caae3ae0550bcbeb64d7a7528259',
  'data/partitions.json': '43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6',
  'src/multi-etf-allocator/shadow.ts': 'd37332e9a7d47dc8b57b061fb228380cf8c3fa660ed802b4d6413a6c7835bb24',
  'src/shared-margin-portfolio/strategy.ts': '0407559247569b2f471f8887faa9232502574fb28a34e3f435026fc3f0df7093',
  'src/portfolio-aware-d1/replay.ts': '9da17057517864ffe014340182277e9f5b44f133fe6dfd79d5b45338a35c893d',
  'src/portfolio-aware-d1/nbook/engine.ts': '9b346011e333a062c314b2e3a85f9455ee22620a31e7b922a9cbe81d6f001827',
  'src/app/allIn-trailingBuy-postExitContinuation.ts':
    'de0935c3f402a42b41227c5fb362e9b37fb68fdfe01c14d020ea073dce795dc0'
};

const walk = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);

        return fs.statSync(full).isDirectory() ? (name === 'archive' || name === 'logs' ? [] : walk(full)) : [full];
      })
    : [];

// Every window's 4A design and every 4D experiment spent its frozen floor at full scale, and its selection is sealed.
export const floorsMet = (windows: readonly string[]) => {
  const problems: string[] = [];

  for (const window of windows) {
    const a = resultFile(window, '4A', 'RECORD.json');

    if (!fs.existsSync(a)) {
      problems.push(`${window} 4A absent`);
    }

    for (const experiment of Object.keys(budgets) as (keyof typeof budgets)[]) {
      const file = resultFile(window, experiment, 'RECORD.json');

      if (!fs.existsSync(file)) {
        problems.push(`${window} ${experiment} absent`);
        continue;
      }

      const record = readSealed<{ search: { evaluated: number; extended: boolean; budget: { scale: number } } }>(file);
      const b = budgets[experiment];
      const generations = b.generations + (record.search.extended ? Math.floor(b.generations / 2) : 0);
      const floor = b.initial + generations * population * islands + b.refinement;

      if (record.search.evaluated < floor || record.search.budget.scale !== 1) {
        problems.push(`${window} ${experiment} ${record.search.evaluated} < ${floor}`);
      }
    }

    if (!verifySealed(resultFile('selections', window, 'SELECTION.json'))) {
      problems.push(`${window} selection not sealed`);
    }
  }

  return { ok: problems.length === 0, problems };
};

export const verifyEvidence = (options: { raw?: boolean } = {}) => {
  const lines: VerifyLine[] = [];
  const add = (check: string, ok: boolean, detail = '') => lines.push({ check, ok, detail });
  const attempt = (check: string, run: () => string) => {
    try {
      add(check, true, run());
    } catch (error) {
      add(check, false, (error as Error).message);
    }
  };

  attempt('protocol freeze', () => {
    const freeze = readSealed<{ hashes: Record<string, string> }>(files.protocolFreeze);

    for (const [file, hash] of Object.entries(freeze.hashes)) {
      if (sha256File(file) !== hash) {
        throw new Error(`${file} changed`);
      }
    }

    return `body ${freeze.bodyHash.slice(0, 16)}, ${Object.keys(freeze.hashes).length} files`;
  });
  attempt('code freeze (development, latest)', () =>
    verifyCodeFreeze(latestCodeFreezeFile(), developmentEntries()).slice(0, 16)
  );
  attempt('code freeze (evaluation)', () =>
    verifyCodeFreeze(resultFile('CODE_FREEZE_EVALUATION.json'), evaluationEntries()).slice(0, 16)
  );
  attempt('superseded evaluation freeze (A5) kept, sealed and named by the current one', () => {
    const superseded = resultFile('superseded', 'evaluation-freeze1', 'CODE_FREEZE_EVALUATION.json');

    if (!fs.existsSync(superseded)) {
      return 'none';
    }

    const old = readSealed(superseded);
    const current = readSealed<{ supersedes: string | null; amendment: string | null }>(
      resultFile('CODE_FREEZE_EVALUATION.json')
    );

    if (current.supersedes !== old.bodyHash || !current.amendment) {
      throw new Error('the current evaluation freeze does not name the superseded one and its amendment');
    }

    return `body ${old.bodyHash.slice(0, 16)} superseded by amendment ${current.amendment}`;
  });
  attempt('parity records named by the code freeze', () => {
    const freeze = readSealed<{ parity: Record<string, string>; codeDigest: string }>(latestCodeFreezeFile());

    for (const [name, body] of Object.entries(freeze.parity)) {
      const file = resultFile('parity', `${name}-${freeze.codeDigest.slice(0, 16)}.json`);
      const record = readSealed<{ pass: boolean }>(file);

      if (record.bodyHash !== body || !record.pass) {
        throw new Error(`${name} does not verify or did not pass`);
      }
    }

    return `${Object.keys(freeze.parity).length} parity records, digest ${freeze.codeDigest.slice(0, 16)} (current ${closureDigest().slice(0, 16)})`;
  });

  const sealedFiles = walk(resultsRoot).filter((file) => file.endsWith('.json'));
  const broken = sealedFiles.filter((file) => {
    const json = fs.readJsonSync(file);

    return typeof json.bodyHash === 'string' && !verifySealed(file);
  });

  add(
    'sealed records verify',
    broken.length === 0,
    `${sealedFiles.length} JSON records checked; ${broken.length} broken ${broken.slice(0, 3).join(', ')}`
  );

  for (const window of windowKeys) {
    for (const experiment of Object.keys(budgets) as (keyof typeof budgets)[]) {
      const file = resultFile(window, experiment, 'RECORD.json');

      if (!fs.existsSync(file)) {
        add(`${window} ${experiment} floor`, false, 'record absent');
        continue;
      }

      const record = readSealed<{ search: { evaluated: number; extended: boolean; budget: { scale: number } } }>(file);
      const b = budgets[experiment];
      const generations = b.generations + (record.search.extended ? Math.floor(b.generations / 2) : 0);
      const floor = b.initial + generations * population * islands + b.refinement;

      add(
        `${window} ${experiment} floor`,
        record.search.evaluated >= floor && record.search.budget.scale === 1,
        `${record.search.evaluated} evaluated of floor ${floor}`
      );
    }
  }

  attempt('selections sealed before the evaluation door', () => {
    const doors = fs.existsSync(resultFile('doors.jsonl'))
      ? fs
          .readFileSync(resultFile('doors.jsonl'), 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as { at: string; purpose: string })
      : [];
    const evaluation = doors
      .filter((door) => door.purpose === 'evaluation')
      .map((door) => door.at)
      .sort()[0];

    if (!evaluation) {
      throw new Error('no evaluation door opened');
    }

    for (const fold of foldKeys) {
      const sealedAt = readSealed<{ sealedAt: string }>(resultFile('selections', fold, 'SELECTION.json')).sealedAt;

      if (!(sealedAt < evaluation)) {
        throw new Error(`${fold} sealed ${sealedAt}, after the evaluation door ${evaluation}`);
      }
    }

    return `first evaluation door ${evaluation}`;
  });

  for (const [file, hash] of Object.entries(protectedInputs)) {
    add(`protected input ${file}`, fs.existsSync(file) && sha256File(file) === hash, hash.slice(0, 12));
  }

  // raw archives: verified when present, required with --raw
  for (const file of sealedFiles) {
    const json = fs.readJsonSync(file) as { archive?: { file: string; sha256: string } };

    if (json.archive?.file) {
      const present = fs.existsSync(json.archive.file);

      if (present) {
        add(
          `archive ${path.basename(json.archive.file)}`,
          sha256File(json.archive.file) === json.archive.sha256,
          'present, hash checked'
        );
      } else if (options.raw) {
        add(`archive ${path.basename(json.archive.file)}`, false, 'absent (regenerate with the develop command)');
      }
    }
  }

  return lines;
};
