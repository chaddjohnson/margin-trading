// Chronology guards (PROTOCOL.md §12 parity (d), §9 evaluate guards), Stage 1b's on the Stage 1c engine: prefix
// invariance of every signal and exit / re-entry array, the poisoned-future test, executable-path prefix identity,
// and branch-coverage counters (with the protection rules' branches). They return counts and field names only.
import type { Dataset } from '../four-family/data.ts';
import { poisonAfter, truncate } from './data.ts';
import { Engine } from './engine.ts';
import type { Policy, RunOptions, RunResult, ScheduleItem } from './types.ts';

const arraysOf = (engine: Engine, policy: Policy) => {
  const rt = engine.runtime(policy);
  const sig = rt.sig as Record<string, unknown>;
  const out: Record<string, ArrayLike<number>> = {};

  for (const name of ['state', 'trigger', 'out', 'level']) {
    if (sig[name]) {
      out[`signal.${name}`] = sig[name] as ArrayLike<number>;
    }
  }

  for (const name of ['trendLow', 'damageLow', 'sma200', 'atr', 'floorOut', 'rfl', 'er30', 'a30', 'max10'] as const) {
    if (rt[name]) {
      out[name] = rt[name]!;
    }
  }

  return out;
};

const same = (a: number, b: number) => Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b));

// Every array computed on the prefix 0..b equals the full-data array on 0..b.
export const prefixInvariance = (ds: Dataset, b: number, policies: Policy[]) => {
  const full = new Engine(ds);
  const prefix = new Engine(truncate(ds, b));
  let arrays = 0;
  let differences = 0;
  const fields = new Set<string>();

  for (const policy of policies) {
    const a = arraysOf(full, policy);
    const p = arraysOf(prefix, policy);

    for (const [name, values] of Object.entries(a)) {
      const other = p[name];

      arrays++;

      if (!other) {
        differences++;
        fields.add(name);
        continue;
      }

      for (let s = 0; s <= b; s++) {
        if (!same(values[s]!, other[s]!)) {
          differences++;
          fields.add(name);
          break;
        }
      }
    }
  }

  return { boundary: ds.dates[b], policies: policies.length, arrays, differences, fields: [...fields] };
};

// The trade path (entry session/bar, exit session/bar) and the daily marks through b.
const prefixOf = (run: RunResult, b: number, firstIndex: number) => ({
  trades: run.trades
    .filter((t) => t.entryIndex <= b)
    .map((t) =>
      [
        t.entryIndex,
        t.entryBar,
        t.exitIndex >= 0 && t.exitIndex <= b ? t.exitIndex : -1,
        t.exitIndex >= 0 && t.exitIndex <= b ? t.exitBar : -1
      ].join(':')
    )
    .join('|'),
  marks: (run.daily ?? []).slice(0, b - firstIndex + 1).map((r) => r.mark)
});

const comparePrefix = (a: ReturnType<typeof prefixOf>, b: ReturnType<typeof prefixOf>) => {
  let differences = a.trades === b.trades ? 0 : 1;

  if (a.marks.length !== b.marks.length) {
    differences++;
  } else {
    a.marks.forEach((m, i) => {
      if (!same(m, b.marks[i]!) && Math.abs(m - b.marks[i]!) > 1e-9) {
        differences++;
      }
    });
  }

  return differences;
};

// Prices after b perturbed: decisions, fills and marks through b are unchanged.
export const poisonedFuture = (
  ds: Dataset,
  b: number,
  runs: { schedule: Policy | ScheduleItem[]; options: RunOptions }[],
  seed: number
) => {
  const clean = new Engine(ds);
  const poisoned = new Engine(poisonAfter(ds, b, seed));
  let differences = 0;

  for (const r of runs) {
    const options = { ...r.options, recordDaily: true };
    const a = prefixOf(clean.run(r.schedule, options), b, options.firstDecisionIndex);
    const p = prefixOf(poisoned.run(r.schedule, options), b, options.firstDecisionIndex);

    differences += comparePrefix(a, p);
  }

  return { boundary: ds.dates[b], runs: runs.length, differences };
};

// A run on the data truncated at b gives the same path and marks through b as the full run.
export const truncatedRunPrefix = (
  ds: Dataset,
  b: number,
  runs: { schedule: Policy | ScheduleItem[]; options: RunOptions }[]
) => {
  const full = new Engine(ds);
  const prefix = new Engine(truncate(ds, b));
  let differences = 0;

  for (const r of runs) {
    const options = { ...r.options, recordDaily: true };
    const schedule = Array.isArray(r.schedule) ? r.schedule.filter((item) => item.index <= b) : r.schedule;
    const a = prefixOf(full.run(r.schedule, options), b, options.firstDecisionIndex);
    const p = prefixOf(
      prefix.run(schedule, { ...options, endIndex: b, windows: (options.windows ?? []).filter((w) => w < b) }),
      b,
      options.firstDecisionIndex
    );

    // the truncated run liquidates at b: compare trades closed by b and the marks before b's close
    a.marks = a.marks.slice(0, -1);
    p.marks = p.marks.slice(0, -1);
    differences += comparePrefix(a, p);
  }

  return { boundary: ds.dates[b], runs: runs.length, differences };
};

// Branch-coverage counters over a set of runs.
export const coverage = (results: RunResult[], into: Record<string, number> = {}) => {
  const add = (key: string) => {
    into[key] = (into[key] ?? 0) + 1;
  };

  for (const run of results) {
    for (const t of run.trades) {
      add(`kind:${t.kind}`);
      add(`rule:${t.rule}`);
      add(`exit:${t.exitReason}`);

      if (t.stopComponent) {
        add(`stop:${t.stopComponent}`);
      }

      if (t.gapFlag) {
        add(`gap:${t.gapFlag}`);
      }

      if (t.exitReason === 'stop' && t.exitBar === t.entryBar && t.exitIndex === t.entryIndex) {
        add('fill-bar stop');
      }

      for (const trim of t.trims) {
        add(trim.repaid < trim.proceeds ? 'trim: loan to zero' : 'trim: partial repayment');
      }

      if (t.kind === 'conversion') {
        add(t.friction > 0 ? 'S3: buy branch' : 'S3: sell branch');
      }

      if (t.releaseEntry) {
        add('release entry');
      }

      if (Number.isFinite(t.cLevel)) {
        add('C armed entry');
      }

      if (t.cFillBelow) {
        add('C fill below');
      }
    }

    if (run.aCancelled > 0) {
      add('A cancelled');
    }

    if (run.aDue > 0) {
      add('A due');
    }

    if (run.bBlocks > 0) {
      add('B block');
    }

    if (run.cBlocks > 0) {
      add('C block');
    }

    if (run.bcBoth > 0) {
      add('B+C block');
    }

    const continued = new Map<string, number>();

    for (const tr of run.transitions) {
      add(`transition:${tr.kind}`);

      if (tr.kind === 'continue-old') {
        const from = tr.detail.split(' -> ')[0]!;

        continued.set(from, (continued.get(from) ?? 0) + 1);
      }
    }

    if ([...continued.values()].some((n) => n >= 2)) {
      add('S2 across two boundaries');
    }
  }

  return into;
};
