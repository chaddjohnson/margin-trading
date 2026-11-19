// The compute ledger (PROTOCOL.md §9): fresh backend simulations by kind (next-slice / full-history flagged) and
// archive hits by kind, per stage, appended to results/compute.jsonl when a stage completes. The caps are enforced
// cumulatively across stages: a stage exceeding a cap fails (an amendment matter).
import fs from 'node:fs';
import path from 'node:path';
import { budgets, resultsDir } from './context.ts';

export const computeLog = path.join(resultsDir, 'compute.jsonl');

interface Entry {
  stage: string;
  fresh: Record<string, number>;
  nextPeriod: Record<string, number>;
  hits: Record<string, number>;
  freshTotal: number;
  nextPeriodTotal: number;
  wallSeconds: number;
  finished: string;
}

export const ledger = (): Entry[] =>
  fs.existsSync(computeLog)
    ? fs
        .readFileSync(computeLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Entry)
    : [];

export const totals = () => {
  const l = ledger();

  return {
    fresh: l.reduce((a, e) => a + e.freshTotal, 0),
    nextPeriod: l.reduce((a, e) => a + e.nextPeriodTotal, 0)
  };
};

export const counter = (stage: string) => {
  const before = totals();
  const fresh: Record<string, number> = {};
  const nextPeriod: Record<string, number> = {};
  const hits: Record<string, number> = {};
  const t0 = Date.now();
  let freshTotal = 0;
  let nextTotal = 0;

  return {
    fresh(kind: string, isNextPeriod = false) {
      fresh[kind] = (fresh[kind] ?? 0) + 1;
      freshTotal++;
      if (isNextPeriod) {
        nextPeriod[kind] = (nextPeriod[kind] ?? 0) + 1;
        nextTotal++;
      }
      if (before.fresh + freshTotal > budgets.freshTotal)
        throw new Error(`the fresh-simulation cap ${budgets.freshTotal} would be exceeded (${stage})`);
      if (before.nextPeriod + nextTotal > budgets.freshNextPeriod)
        throw new Error(`the next-period cap ${budgets.freshNextPeriod} would be exceeded (${stage})`);
    },
    hits(kind: string, n: number) {
      hits[kind] = (hits[kind] ?? 0) + n;
    },
    done(): Entry {
      const e: Entry = {
        stage,
        fresh,
        nextPeriod,
        hits,
        freshTotal,
        nextPeriodTotal: nextTotal,
        wallSeconds: Math.round((Date.now() - t0) / 100) / 10,
        finished: new Date().toISOString()
      };

      fs.mkdirSync(path.dirname(computeLog), { recursive: true });
      fs.appendFileSync(computeLog, `${JSON.stringify(e)}\n`);
      return { ...e, cumulative: { fresh: before.fresh + freshTotal, nextPeriod: before.nextPeriod + nextTotal } } as Entry;
    }
  };
};

// A ledger entry for runs whose process could not record them itself (the pilot's self-killed child: its fresh runs
// are known by construction).
export const recordExternal = (stage: string, kind: string, n: number) => {
  fs.mkdirSync(path.dirname(computeLog), { recursive: true });
  fs.appendFileSync(
    computeLog,
    `${JSON.stringify({ stage, fresh: { [kind]: n }, nextPeriod: {}, hits: {}, freshTotal: n, nextPeriodTotal: 0, wallSeconds: 0, finished: new Date().toISOString() })}\n`
  );
};
