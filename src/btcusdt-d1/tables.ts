// Read-only markdown tables from the sealed records (`npm run btc-d1 -- tables <stage>`), for the study reports. Never
// writes a record; reads only files under research/btcusdt-d1/results.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { files, readSealed, stageFile } from './records.ts';
import { type D1Grid, describeGrid } from './params.ts';

const usd = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? 'n/a' : Math.round(value).toLocaleString('en-US');
const pct = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? 'n/a' : `${(value * 100).toFixed(digits)}%`;

interface ShortlistRow {
  key: string;
  origin: string;
  metrics: {
    grid: D1Grid;
    net: number;
    minutePercent: number;
    minuteDrawdown: number;
    dailyPercent: number;
    entries: number;
    wins: number;
    losses: number;
    topTwo: number;
    netExTopTwo: number;
    worst: number;
    exposureDays: number;
    windowDays: number;
    fees: number;
    impact: number;
    maxParticipation: number;
  };
  neighbours: { feasibleShare: number; medianNet: number; nets: number[]; percents: number[] };
  wide: { feasibleShare: number; medianNet: number };
  conservative: { net: number };
  worstFill: { net: number };
  gates: Record<string, boolean>;
  score: number;
}

const quantiles = (values: number[], qs: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  return qs.map((q) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))]! : NaN
  );
};

export const selectionTables = (stage: string) => {
  const selection = readSealed<{
    label: string;
    window: { start: string; endExclusive: string };
    minTrades: number;
    evaluated: number;
    sobol: { evaluated: number; g1: number; g2: number; feasible: number };
    seeds: { key: string; net: number }[];
    refinement: { seed: string; final: string; finalNet: number; improvements: number }[];
    poolSize: number;
    distinctSchedules: number;
    shortlist: ShortlistRow[];
    eligible: string[];
    exploratoryLowDrawdown?: ShortlistRow;
    archive: { file: string; sha256: string; rows: number };
  }>(stageFile(stage, 'SELECTION.json'));
  const picks = readSealed<{ picks: { rank: number; key: string; score: number }[]; noPickReason?: string }>(
    stageFile(stage, 'PICKS.json')
  );
  const archive = zlib
    .gunzipSync(fs.readFileSync(stageFile(stage, 'archive.jsonl.gz')))
    .toString()
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          net: number;
          minutePercent: number;
          minuteDrawdown: number;
          entries: number;
          netExTopTwo: number;
          subNets: number[];
          key: string;
        }
    );
  // G1 exactly as the selection applied it (PROTOCOL.md §7.2), and the full feasibility G1 + G2 + G6.
  const g1 = (row: { net: number; minutePercent: number; minuteDrawdown: number; entries: number }) =>
    row.minutePercent <= 0.35 && row.minuteDrawdown <= 35000 && row.entries >= selection.minTrades && row.net > 0;
  const feasibleRow = (row: (typeof archive)[number]) =>
    g1(row) && row.netExTopTwo > 0 && row.subNets.filter((net) => net > 0).length >= 2;
  const lines: string[] = [];

  lines.push(`### ${selection.label}: ${selection.window.start} → ${selection.window.endExclusive} (exclusive)`);
  lines.push('');
  lines.push(
    `Evaluations ${selection.evaluated.toLocaleString('en-US')} (archive ${selection.archive.rows.toLocaleString('en-US')} distinct vectors, sha256 ${selection.archive.sha256.slice(0, 12)}…); minimum entries ${selection.minTrades}.`
  );
  lines.push(
    `Sobol ${selection.sobol.evaluated.toLocaleString('en-US')}: G1 ${selection.sobol.g1} (${pct(selection.sobol.g1 / selection.sobol.evaluated, 2)}), G1+G2 ${selection.sobol.g2}, feasible (G1+G2+G6) ${selection.sobol.feasible}. Pool (Sobol + refinement, feasible) ${selection.poolSize}, distinct schedules ${selection.distinctSchedules}; shortlist ${selection.shortlist.length}; G1–G6 eligible ${selection.eligible.length}; picks ${picks.picks.length}${picks.noPickReason ? ` (${picks.noPickReason})` : ''}.`
  );
  lines.push('');

  const all = archive;
  const feasible = all.filter(g1);
  const [n10, n50, n90] = quantiles(
    all.map((row) => row.net),
    [0.1, 0.5, 0.9]
  );
  const [d10, d50, d90] = quantiles(
    all.map((row) => row.minutePercent),
    [0.1, 0.5, 0.9]
  );

  const [u10, u50, u90] = quantiles(
    all.map((row) => row.minuteDrawdown),
    [0.1, 0.5, 0.9]
  );

  lines.push(
    `All archived vectors (Sobol + refinement): net p10/p50/p90 ${usd(n10)} / ${usd(n50)} / ${usd(n90)} USDT; minute peak-to-trough p10/p50/p90 ${pct(d10)} / ${pct(d50)} / ${pct(d90)} and ${usd(u10)} / ${usd(u50)} / ${usd(u90)} USDT; net > 0 ${pct(all.filter((row) => row.net > 0).length / all.length)}; DD ≤ 35% ${pct(all.filter((row) => row.minutePercent <= 0.35).length / all.length)}; DD ≤ 35,000 USDT ${pct(all.filter((row) => row.minuteDrawdown <= 35000).length / all.length)}; G1 ${pct(feasible.length / all.length, 2)}; feasible ${pct(all.filter(feasibleRow).length / all.length, 2)}.`
  );
  lines.push('');

  // Risk-return frontier among the G1-feasible vectors: the highest net at each drawdown bucket.
  const buckets = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35];

  lines.push(
    'Risk-return frontier (in-sample): the best net among the feasible (G1+G2+G6) vectors at each minute peak-to-trough ceiling.'
  );
  lines.push('');
  lines.push('| DD ≤ | feasible vectors | best net USDT | its DD USDT | its entries | its net minus top two |');
  lines.push('|---:|---:|---:|---:|---:|---:|');

  for (const bucket of buckets) {
    const inBucket = all.filter((row) => feasibleRow(row) && row.minutePercent <= bucket);
    const best = inBucket.sort((a, b) => b.net - a.net)[0];

    lines.push(
      `| ${pct(bucket, 0)} | ${inBucket.length} | ${usd(best?.net)} | ${usd(best?.minuteDrawdown)} | ${best?.entries ?? 'n/a'} | ${usd(best?.netExTopTwo)} |`
    );
  }

  lines.push('');
  lines.push('Refinement (equal budgets):');
  lines.push('');
  lines.push('| seed | seed net | final | final net | improvements |');
  lines.push('|---|---:|---|---:|---:|');

  for (const row of selection.refinement) {
    const seed = selection.seeds.find((entry) => entry.key === row.seed);

    lines.push(`| ${row.seed} | ${usd(seed?.net)} | ${row.final} | ${usd(row.finalNet)} | ${row.improvements} |`);
  }

  lines.push('');
  lines.push(
    '| # | key | net | mDD% | entries | W/L | net − top 2 | nbr feasible | nbr median | wide median | conservative | low-fill | G3 G4 G5 | pick |'
  );
  lines.push('|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|');

  selection.shortlist.forEach((row, index) => {
    const pick = picks.picks.find((entry) => entry.key === row.key);
    const flag = (value: boolean | undefined) => (value ? '✔' : '✖');

    lines.push(
      `| ${index + 1} | ${row.key} | ${usd(row.metrics.net)} | ${pct(row.metrics.minutePercent)} | ${row.metrics.entries} | ${row.metrics.wins}/${row.metrics.losses} | ${usd(row.metrics.netExTopTwo)} | ${pct(row.neighbours.feasibleShare, 0)} | ${usd(row.neighbours.medianNet)} | ${usd(row.wide.medianNet)} | ${usd(row.conservative.net)} | ${usd(row.worstFill.net)} | ${flag(row.gates.g3)} ${flag(row.gates.g4)} ${flag(row.gates.g5)} | ${pick ? `rank ${pick.rank}` : ''} |`
    );
  });

  lines.push('');

  for (const pick of picks.picks) {
    const row = selection.shortlist.find((entry) => entry.key === pick.key)!;

    lines.push(
      `- Rank ${pick.rank} \`${pick.key}\`: ${describeGrid(row.metrics.grid)}; selection net ${usd(row.metrics.net)} USDT, minute peak-to-trough ${pct(row.metrics.minutePercent)} (${usd(row.metrics.minuteDrawdown)} USDT), ${row.metrics.entries} entries, exposure ${pct(row.metrics.exposureDays / row.metrics.windowDays, 0)} of days, fees+impact ${usd(row.metrics.fees + row.metrics.impact)}, max participation ${pct(row.metrics.maxParticipation)}; score ${usd(pick.score)}.`
    );
  }

  if (selection.exploratoryLowDrawdown) {
    const row = selection.exploratoryLowDrawdown;

    lines.push(
      `- Exploratory low-drawdown class (≤ 25%): \`${row.key}\` net ${usd(row.metrics.net)}, ${pct(row.metrics.minutePercent)}, score ${usd(row.score)} (never a pick).`
    );
  }

  return lines.join('\n');
};

interface Evidence {
  rank?: number;
  role?: string;
  key: string;
  grid: D1Grid;
  principal: {
    net: number;
    returnOnCap: number;
    minutePercent: number;
    minuteDrawdown: number;
    dailyPercent: number;
    dailyDrawdown: number;
    entries: number;
    exits: number;
    wins: number;
    losses: number;
    worst: number;
    best: number;
    fees: number;
    impact: number;
    carriedIn: boolean;
    openAtEnd: boolean;
    exposureDays: number;
    windowDays: number;
    startEquity: number;
  };
  costs: { scenario: string; net: number; minutePercent: number }[];
  stopLevel: { net: number };
  worstFill: { net: number };
  flatStart: { net: number; minutePercent: number; entries: number };
  attribution: { year: string; net: number; minutePercent: number; entries: number }[];
  neighbours: { medianNet: number; positiveShare: number; minNet: number; maxNet: number };
}

export const evidenceTables = (file: string) => {
  const record = readSealed<{ evidence: Evidence[]; descriptive?: Evidence[]; gate?: Record<string, unknown> }>(file);
  const rows = [...record.evidence, ...(record.descriptive ?? [])];
  const lines: string[] = [];

  lines.push(
    '| pick | key | net USDT | return | mDD% | mDD USDT | dDD% | entries | W/L | worst | costs | carried in | open at end | exposure |'
  );
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---|---:|');

  for (const row of rows) {
    const p = row.principal;

    lines.push(
      `| ${row.rank ? `rank ${row.rank}` : row.role!.split(' ')[0]} | ${row.key} | ${usd(p.net)} | ${pct(p.returnOnCap)} | ${pct(p.minutePercent)} | ${usd(p.minuteDrawdown)} | ${pct(p.dailyPercent)} | ${p.entries} | ${p.wins}/${p.losses} | ${usd(p.worst)} | ${usd(p.fees + p.impact)} | ${p.carriedIn ? 'yes' : 'no'} | ${p.openAtEnd ? 'yes' : 'no'} | ${pct(p.exposureDays / p.windowDays, 0)} |`
    );
  }

  lines.push('');
  lines.push(
    `| pick | ${rows[0]?.costs.map((cost) => cost.scenario.replace('fee', 'f').replace('-impact', '/i')).join(' | ')} | stop-level | low-fill | flat start |`
  );
  lines.push(`|---|${rows[0]?.costs.map(() => '---:').join('|')}|---:|---:|---:|`);

  for (const row of rows) {
    lines.push(
      `| ${row.rank ? `rank ${row.rank}` : row.role!.split(' ')[0]} | ${row.costs.map((cost) => usd(cost.net)).join(' | ')} | ${usd(row.stopLevel.net)} | ${usd(row.worstFill.net)} | ${usd(row.flatStart.net)} (${row.flatStart.entries}) |`
    );
  }

  lines.push('');
  lines.push('| pick | calendar-year attribution (net USDT / entries) | neighbours: median net, share > 0, range |');
  lines.push('|---|---|---|');

  for (const row of rows) {
    lines.push(
      `| ${row.rank ? `rank ${row.rank}` : row.role!.split(' ')[0]} | ${row.attribution.map((year) => `${year.year}: ${usd(year.net)} / ${year.entries}`).join('; ')} | ${usd(row.neighbours.medianNet)}, ${pct(row.neighbours.positiveShare, 0)}, ${usd(row.neighbours.minNet)} … ${usd(row.neighbours.maxNet)} |`
    );
  }

  if (record.gate) {
    lines.push('');
    lines.push(`Gate: ${JSON.stringify(record.gate)}`);
  }

  return lines.join('\n');
};

export const tablesFor = (what: string) => {
  switch (what) {
    case 'fold-a':
    case 'fold-b':
      return [
        selectionTables(`folds/${what}`),
        '',
        `#### ${what} validation`,
        '',
        evidenceTables(stageFile(`folds/${what}`, 'VALIDATION.json'))
      ].join('\n');
    case 'final':
      return [
        selectionTables('final'),
        ...(fs.existsSync(stageFile('final', 'HOLDOUT.json'))
          ? ['', '#### holdout', '', evidenceTables(stageFile('final', 'HOLDOUT.json'))]
          : [])
      ].join('\n');
    case 'gate':
      return JSON.stringify(readSealed(files.gate), null, 2);
    default:
      throw new Error('usage: tables <fold-a|fold-b|final|gate>');
  }
};
