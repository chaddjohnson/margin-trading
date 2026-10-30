// Part B selection (PROTOCOL.md §10.6, §10.8, §11.1–§11.2):
//   b-shortlist       the shortlist from the sealed search records (no data door), hashed before validation;
//   b-validate        the validation door (run to 2023-12-29): centre, stresses, joint N1 V1–V3, per-book N1, gates
//                     Q1–Q8, economics E1–E2, partial-improvement measures, PBO over the Track K rung-2 set;
//   freeze-selection  FROZEN_SELECTION.json: roles among the qualified candidates, every gate result, hashes.
import fs from 'fs-extra';
import { pboOf } from '../d1-robust/pbo.ts';
import { d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, frozenGrids, frozenSelectionFile, partB, protocolFile, resultFile } from './context.ts';
import { openDoor, sha256 } from './data.ts';
import { type Books, design, normalizedDistance, uniqueMask } from './designs.ts';
import { Lab, type PointRecord, ceiling, settingsWith } from './evaluate.ts';
import { ownPeriods, periodSessions } from './periods.ts';
import {
  codeDigest,
  fileSha256,
  log,
  nowIso,
  protocolSha256,
  readSealed,
  requireDiagnosticCommitted,
  writeCsv,
  writeSealed
} from './records.ts';
import { frozenB5 } from './sets.ts';

const five = [...bookOrder];
const { gates } = partB;
const shortlistFile = resultFile('partB', 'shortlist.json');
const validationFile = resultFile('partB', 'validation.json');

export interface Config {
  key: string;
  track: 'K' | 'J' | 'O-PA' | 'O-ME' | 'control';
  books: Books;
  searched: string[];
  source: string;
  control: boolean;
}

interface SearchSummary {
  id: string;
  origin: string;
  books: Books;
  searched: string[];
}

export const runShortlist = async () => {
  const configs: Config[] = [];
  const records: Record<string, string> = {};
  const read = async <T>(file: string) => {
    const record = await readSealed<T & { bodyHash: string }>(file);

    records[file] = record.bodyHash;
    return record;
  };
  const k = await read<{ shortlist: SearchSummary[] }>(resultFile('partB', 'trackK', 'trackK-main.json'));

  k.shortlist.forEach((candidate, index) =>
    configs.push({
      key: `K${index + 1}`,
      track: 'K',
      books: candidate.books,
      searched: candidate.searched,
      source: `Track K main shortlist #${index + 1} (${candidate.id}, ${candidate.origin})`,
      control: false
    })
  );

  const j = await read<{ triggered: boolean; shortlist?: SearchSummary[] }>(
    resultFile('partB', 'trackJ', 'trackJ.json')
  );

  (j.triggered ? (j.shortlist ?? []) : []).forEach((candidate, index) =>
    configs.push({
      key: `J${index + 1}`,
      track: 'J',
      books: candidate.books,
      searched: candidate.searched,
      source: `Track J shortlist #${index + 1} (${candidate.id}, ${candidate.origin})`,
      control: false
    })
  );

  const pa = await read<{ configurations: { key: string; books: Books; vector: { id: string }; status: string }[] }>(
    resultFile('partB', 'trackO', 'o-pa.json')
  );

  for (const configuration of pa.configurations) {
    configs.push({
      key: configuration.key,
      track: 'O-PA',
      books: { ...frozenB5(), ...configuration.books },
      searched: ['KRE'],
      source: `Track O-PA ${configuration.vector.id} (${configuration.status})`,
      control: false
    });
  }

  const me = await read<{ run: boolean; configurations?: { key: string; id: string; books: Books }[] }>(
    resultFile('partB', 'trackO', 'o-me.json')
  );

  for (const configuration of me.run ? (me.configurations ?? []) : []) {
    configs.push({
      key: configuration.key,
      track: 'O-ME',
      books: configuration.books,
      searched: ['KRE'],
      source: `Track O-ME ${configuration.id}`,
      control: false
    });
  }

  // A configuration identical to frozen B5 or to an earlier one is kept once (the earlier key).
  const seen = new Map<string, string>();
  const unique: Config[] = [];
  const merged: { key: string; sameAs: string }[] = [];

  for (const config of configs) {
    const key = JSON.stringify(five.map((symbol) => config.books[symbol]));

    if (key === JSON.stringify(five.map((symbol) => frozenGrids[symbol]))) {
      merged.push({ key: config.key, sameAs: 'C5 (frozen B5)' });
    } else if (seen.has(key)) {
      merged.push({ key: config.key, sameAs: seen.get(key)! });
    } else {
      seen.set(key, config.key);
      unique.push(config);
    }
  }

  const controls: Config[] = [
    { key: 'C5', track: 'control', books: frozenB5(), searched: [], source: 'frozen B5', control: true },
    {
      key: 'C5-noKRE',
      track: 'control',
      books: Object.fromEntries(five.filter((s) => s !== 'KRE').map((s) => [s, { ...frozenGrids[s] }])),
      searched: [],
      source: 'frozen B5 without the KRE book (diagnostic reference; never a candidate)',
      control: true
    }
  ];
  const record = await writeSealed(shortlistFile, {
    stage: 'shortlist',
    at: nowIso(),
    records,
    candidates: unique,
    merged,
    controls
  });

  log(
    `shortlist: ${unique.map((c) => c.key).join(', ')} (+ ${merged.length} merged); ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};

// ----- validation -----

const scoreOf = (dev: number[], val: number[], yDev: number, yVal: number) =>
  0.5 * ((0.5 * quantile(dev, 0.5) + 0.5 * quantile(dev, 0.1)) / yDev) +
  0.5 * ((0.5 * quantile(val, 0.5) + 0.5 * quantile(val, 0.1)) / yVal);

const nbhdStats = (records: PointRecord[], unique: boolean[], yDev: number, yVal: number) => {
  const kept = records.filter((_record, index) => unique[index]);
  const dd = kept.map((record) => record.dd);
  const dev = kept.map((record) => record.periods.DEV ?? NaN);
  const val = kept.map((record) => record.periods.VAL ?? NaN);

  return {
    n: records.length,
    unique: kept.length,
    share: dd.filter((value) => value < ceiling).length / Math.max(1, dd.length),
    p90: quantile(dd, 0.9),
    ddMedian: quantile(dd, 0.5),
    netMedian: quantile(
      kept.map((record) => record.net),
      0.5
    ),
    netP10: quantile(
      kept.map((record) => record.net),
      0.1
    ),
    devMedian: quantile(dev, 0.5),
    devP10: quantile(dev, 0.1),
    valMedian: quantile(val, 0.5),
    valP10: quantile(val, 0.1),
    score: scoreOf(dev, val, yDev, yVal),
    positive: kept.filter((record) => record.net > 0).length / Math.max(1, kept.length)
  };
};

export type Evidence = Awaited<ReturnType<typeof evidenceOf>>;

const evidenceOf = (lab: Lab, config: Config, yDev: number, yVal: number) => {
  const symbols = five.filter((symbol) => symbol in config.books);
  const result = lab.replay(config.books);
  const metrics = lab.metricsOf(result);
  const centre = lab.point(config.books);
  const periods = ownPeriods(lab, result);
  const years = Object.fromEntries(Object.entries(periods).filter(([key]) => /^\d{4}$/.test(key)));
  const stresses = Object.fromEntries(
    partB.stresses.map((stress) => {
      const { key, ...rest } = stress;
      const point = lab.point(config.books, settingsWith(rest));

      return [key, { net: point.net, dd: point.dd }];
    })
  );
  const joint = Array.from({ length: partB.selection.reps }, (_value, index) => {
    const rep = index + 1;
    const points = design({
      centre: config.books,
      perturb: symbols,
      n: partB.selection.n,
      labels: ['B', 'select', rep],
      mode: 'clip',
      scale: 1
    });
    const unique = uniqueMask(points, config.books);
    const records = points.map((point) => lab.point(point.books));

    return { rep, ...nbhdStats(records, unique, yDev, yVal) };
  });
  const perBook = Object.fromEntries(
    symbols.map((symbol) => {
      const points = design({
        centre: config.books,
        perturb: [symbol],
        n: partB.selection.bookN,
        labels: ['B', 'select-book', symbol, 1],
        mode: 'clip',
        scale: 1
      });
      const unique = uniqueMask(points, config.books);
      const records = points.map((point) => lab.point(point.books));

      return [symbol, nbhdStats(records, unique, yDev, yVal)];
    })
  );

  return { config, centre, periods, years, halfYears: metrics.periods, stresses, joint, perBook };
};

const gateOf = (evidence: Evidence, c5: Evidence) => {
  const { centre, periods, years, stresses, joint, perBook, config } = evidence;
  const v1 = joint[0]!;
  const devVal = centre.net;
  const largestYear = Math.max(0, ...Object.values(years));
  const c5Kre = c5.centre.kreLots;
  const booksFunded = five.filter((symbol) => (c5.centre.bySymbol[symbol]?.lots ?? 0) > 0);
  const q = {
    Q1: centre.dd < ceiling,
    Q2: v1.share >= gates.share && v1.p90 < ceiling,
    Q3: (periods.VAL ?? 0) > 0 && v1.valMedian > 0,
    Q4: devVal - largestYear > 0 && largestYear <= gates.largestYearShare * devVal,
    Q5:
      centre.lots >= gates.lotsShare * c5.centre.lots &&
      centre.occupancy >= gates.occupancyShare * c5.centre.occupancy &&
      centre.kreLots >= Math.max(1, 0.5 * c5Kre) &&
      booksFunded.every((symbol) => (centre.bySymbol[symbol]?.lots ?? 0) >= 1),
    Q6: centre.bestLot <= gates.largestLotShare * devVal,
    Q7: Object.values(stresses).every((stress) => stress.net > 0 && stress.dd < ceiling),
    Q8:
      v1.devMedian >= gates.jointMedianShare * (periods.DEV ?? 0) &&
      config.searched.every(
        (symbol) => (perBook[symbol]?.devMedian ?? -Infinity) >= gates.bookMedianShare * (periods.DEV ?? 0)
      )
  };
  const e = {
    E1: v1.score >= gates.e1 * c5.joint[0]!.score,
    E2: devVal >= gates.e2 * c5.centre.net
  };
  const qualified = Object.values(q).every(Boolean) && Object.values(e).every(Boolean);
  const partial = {
    shareGain: v1.share - c5.joint[0]!.share,
    p90Gain: c5.joint[0]!.p90 - v1.p90,
    improves: v1.share - c5.joint[0]!.share >= gates.partialSharePoints || c5.joint[0]!.p90 - v1.p90 >= gates.partialP90
  };

  return {
    q,
    e,
    qualified,
    partial,
    marginal: v1.share < gates.marginalShare || joint.some((rep) => !(rep.share >= gates.share && rep.p90 < ceiling))
  };
};

export const runValidate = async () => {
  const started = Date.now();

  await requireDiagnosticCommitted();

  const shortlist = await readSealed<{ bodyHash: string; candidates: Config[]; controls: Config[] }>(shortlistFile);
  const door = await openDoor('validation', five, 'Part B validation (shortlist + controls)');
  const lab = new Lab(door);
  const yDev = periodSessions(lab, 'DEV') / 252;
  const yVal = periodSessions(lab, 'VAL') / 252;
  const all = [...shortlist.controls, ...shortlist.candidates];
  const evidence: Evidence[] = [];

  for (const config of all) {
    evidence.push(evidenceOf(lab, config, yDev, yVal));
    log(
      `validate ${config.key}: centre ${evidence.at(-1)!.centre.net} / ${evidence.at(-1)!.centre.dd}; V1 share ${evidence.at(-1)!.joint[0]!.share.toFixed(3)} (${lab.runs} runs)`
    );
  }

  const c5 = evidence.find((item) => item.config.key === 'C5')!;
  const rows = evidence.map((item) => ({ key: item.config.key, ...gateOf(item, c5) }));

  // PBO over the Track K main rung-2 set (64 vectors): centre half-year attributions over DEV + VAL.
  const trackK = await readSealed<{
    rungs: { k: number; entered: string[] }[];
    pool: { id: string }[];
    shortlist: unknown[];
  }>(resultFile('partB', 'trackK', 'trackK-main.json'));
  const screenRows = (await fs.readFile(resultFile('partB', 'trackK', 'main', 'screen.csv'), 'utf8'))
    .trim()
    .split('\n');
  const header = screenRows[0]!.split(',');
  const paramsOfId = new Map(
    screenRows.slice(1).map((line) => {
      const cells = line.split(',');

      return [cells[header.indexOf('id')]!, cells[header.indexOf('params')]!];
    })
  );
  const rung2 = trackK.rungs.find((rung) => rung.k === 2)!.entered;
  const halves = Object.keys(c5.halfYears).filter((key) => /^\d{4}H[12]$/.test(key) && key < '2024');
  const matrix = rung2.map((id) => {
    const params = paramsOfId.get(id)!.split(':')[1]!.split('/').map(Number);
    const kre = Object.fromEntries(d1Keys.map((key, index) => [key, params[index]!]));
    const metrics = lab.metricsOf(lab.replay({ ...frozenB5(), KRE: kre as Books[string] }));

    return halves.map((key) => metrics.periods[key] ?? 0);
  });
  const pbo = pboOf(matrix, Math.min(8, halves.length - (halves.length % 2)));
  const kEvidence = evidence.filter((item) => item.config.track === 'K');
  const decay = {
    yDev,
    yVal,
    shortlistDevPerYearMedian: quantile(
      kEvidence.map((item) => (item.periods.DEV ?? 0) / yDev),
      0.5
    ),
    shortlistValPerYearMedian: quantile(
      kEvidence.map((item) => (item.periods.VAL ?? 0) / yVal),
      0.5
    ),
    c5DevPerYear: (c5.periods.DEV ?? 0) / yDev,
    c5ValPerYear: (c5.periods.VAL ?? 0) / yVal
  };
  const table = evidence.map((item) => {
    const gate = rows.find((row) => row.key === item.config.key)!;

    return {
      key: item.config.key,
      track: item.config.track,
      kre: d1Keys.map((key) => item.config.books.KRE?.[key] ?? '').join('/'),
      net: item.centre.net,
      dd: item.centre.dd,
      DEV: Math.round(item.periods.DEV ?? 0),
      VAL: Math.round(item.periods.VAL ?? 0),
      lots: item.centre.lots,
      kreLots: item.centre.kreLots,
      v1Share: item.joint[0]!.share,
      v1P90: Math.round(item.joint[0]!.p90),
      v2Share: item.joint[1]!.share,
      v3Share: item.joint[2]!.share,
      score: Math.round(item.joint[0]!.score),
      ...gate.q,
      ...gate.e,
      qualified: gate.qualified,
      partial: gate.partial.improves
    };
  });
  const file = await writeCsv(resultFile('partB', 'validation.csv'), table);
  const record = await writeSealed(validationFile, {
    stage: 'validation',
    at: nowIso(),
    door: door.study6Key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex] },
    shortlist: { file: shortlistFile, bodyHash: shortlist.bodyHash },
    annualization: { yDev, yVal },
    evidence,
    gates: rows,
    pbo: { ...pbo, configs: matrix.length, halves, blocks: Math.min(8, halves.length - (halves.length % 2)) },
    decay,
    file,
    runs: lab.runs,
    seconds: (Date.now() - started) / 1000
  });

  log(
    `validation: qualified ${
      rows
        .filter((row) => row.qualified && !all.find((c) => c.key === row.key)!.control)
        .map((row) => row.key)
        .join(', ') || 'none'
    }; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};

// ----- freeze -----

export const runFreezeSelection = async () => {
  await requireDiagnosticCommitted();

  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`${frozenSelectionFile} exists (write-once)`);
  }

  const validation = await readSealed<{
    bodyHash: string;
    evidence: Evidence[];
    gates: ReturnType<typeof gateOf>[] & { key: string }[];
  }>(validationFile);
  const gateRows = validation.gates as unknown as ({ key: string } & ReturnType<typeof gateOf>)[];
  const candidates = validation.evidence.filter((item) => !item.config.control);
  const qualified = candidates.filter((item) => gateRows.find((row) => row.key === item.config.key)!.qualified);
  const roles: { role: string; key: string }[] = [];
  const far = (item: Evidence) =>
    roles.every(
      (role) =>
        normalizedDistance(
          item.config.books,
          validation.evidence.find((other) => other.config.key === role.key)!.config.books,
          five
        ) >= partB.search.distinct
    );
  const pick = (role: string, order: (a: Evidence, b: Evidence) => number) => {
    const ranked = [...qualified].filter((item) => !roles.some((taken) => taken.key === item.config.key)).sort(order);
    const choice = ranked.find(far);

    if (choice) {
      roles.push({ role, key: choice.config.key });
    }
  };

  pick('most robust', (a, b) => b.joint[0]!.share - a.joint[0]!.share || a.joint[0]!.p90 - b.joint[0]!.p90);
  pick('strongest profit retention', (a, b) => b.joint[0]!.score - a.joint[0]!.score);
  pick('best balanced', (a, b) => b.joint[0]!.score / b.joint[0]!.p90 - a.joint[0]!.score / a.joint[0]!.p90);

  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    frozenAt: nowIso(),
    protocol: { file: protocolFile, sha256: await protocolSha256() },
    validation: { file: validationFile, bodyHash: validation.bodyHash, fileSha256: await fileSha256(validationFile) },
    shortlist: candidates.map((item) => ({
      key: item.config.key,
      track: item.config.track,
      books: item.config.books,
      searched: item.config.searched,
      source: item.config.source,
      gates: gateRows.find((row) => row.key === item.config.key)
    })),
    controls: validation.evidence
      .filter((item) => item.config.control)
      .map((item) => ({
        key: item.config.key,
        books: item.config.books,
        gates: gateRows.find((row) => row.key === item.config.key)
      })),
    qualified: qualified.map((item) => item.config.key),
    roles,
    data: Object.fromEntries(
      await Promise.all(
        five.map(async (symbol) => [symbol, sha256(await fs.readFile(`data/${symbol}/data.csv`))] as const)
      )
    ),
    code: await codeDigest()
  });

  log(
    `selection frozen: qualified ${qualified.map((item) => item.config.key).join(', ') || 'none'}; roles ${JSON.stringify(roles)}; ${record.file} ${record.bodyHash.slice(0, 12)}`
  );
};
