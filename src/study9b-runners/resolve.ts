// Alias → an existing, validated research-pool configuration plus its sealed Phase B provenance.
// - A Phase B alias is found in the sealed FROZEN_SELECTION.json (F24 ranking, roles and shortlists; body hash
//   verified); its research pool `S9B-<TRACK>-F24-<n>` (written by `research-configs`) is loaded and its grids must
//   equal the sealed books.
// - The sealed figures come from the one-time F24 test record (results/test/F24/test.json and its lot ledger, both
//   hash-verified): the centre totals of every shortlist member; the funded-lot ledger of role holders and controls
//   (other members carry totals only, as in Study 8).
// - Study 8 aliases, its frozen subsets and the Study 7 runner aliases (frozen B1, B5, …) are resolved by the Study 8
//   runner, unchanged, and reconciled against their own sealed records.
// The sealed Phase B phase `test-F24-confirm` must exist (the local hash chain is verified). Nothing here runs the
// engine.
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import type { LoadedPool } from '../pools/load.ts';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';
import type { SealedFigures, SealedLot } from '../study7-runners/resolve.ts';
import { type Study8Resolved, resolveAlias as resolveStudy8 } from '../study8-runners/resolve.ts';
import { frozenSelectionFile, primaryFold, tracks } from '../study9-phase-b/context.ts';
import { vectorId } from '../study9-phase-b/engine.ts';
import { readSealed, requirePhase } from '../study9-phase-b/records.ts';
import { testFile } from '../study9-phase-b/test.ts';
import { type PhaseBAlias, UsageError, compareAll, parseAlias } from './aliases.ts';
import { loadResearchPool, poolIdOf, researchPoolsDir } from './configs.ts';

export const sealedEnd = '2026-10-29'; // the F24 test door's last session
export const sealedCostBps = 5;

type Books = Record<string, Grid>;

const d1Keys = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const;

const gridsEqual = (a: Books, b: Books) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((s) => b[s] && d1Keys.every((key) => a[s]![key] === b[s]![key]));

const booksOfPool = (pool: LoadedPool): Books =>
  Object.fromEntries(
    pool.config.books.map((book) => [book.symbol, Object.fromEntries(d1Keys.map((k) => [k, book.grid[k]])) as Grid])
  );

interface CentreRecord {
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  dd: number;
  ddDaily: number;
  lots: number;
}
interface Ranked {
  rank: number;
  track: string;
  role: string;
  id: string;
  books: Books;
  tier: string;
}
interface Member {
  track: string;
  id: string;
  order: number;
  pick: string;
  qualified: boolean;
  books: Books;
}
interface TestRecord {
  holders: (Ranked & { evidence: { centre: { record: CentreRecord } }; gates: { status: string; failed: string[] } })[];
  members: (Member & {
    holder: boolean;
    evidence: { centre?: { record: CentreRecord } };
    gates: { status: string; failed: string[] };
  })[];
  controls: Record<string, { books: Books; evidence: { centre: { record: CentreRecord } } }>;
  nominations: { rank: number; track: string; role: string; id: string; status: string }[];
  lots: { file: string; sha256: string };
  bodyHash: string;
}

export interface PhaseBResolved extends Omit<Study8Resolved, 'study8'> {
  study8: Study8Resolved['study8'];
  phaseB?: {
    kind: PhaseBAlias['kind'];
    track: string;
    membership: string;
    order: number;
    role?: string;
    trainingRank?: number;
    qualified: boolean;
    testStatus: string;
    testFailed: string[];
    configId: string;
    note: string;
  };
}

let manifestCache:
  | {
      selection: {
        rankedByFold: Record<string, Ranked[]>;
        testPlan: Record<string, { shortlists: Member[] }>;
        bodyHash: string;
      };
      test: TestRecord;
      lots: Map<string, SealedLot[]>;
    }
  | undefined;

export const sealedManifests = async () => {
  if (manifestCache) return manifestCache;

  try {
    await requirePhase('test-F24-confirm');
  } catch (error) {
    throw new UsageError(
      `the Phase B one-time F24 test and its confirmation are not sealed in this checkout (${(error as Error).message})`
    );
  }

  const selection = await readSealed<NonNullable<typeof manifestCache>['selection']>(frozenSelectionFile);
  const test = await readSealed<TestRecord>(testFile(primaryFold));
  const bytes = await fs.readFile(test.lots.file);

  if (sha256(bytes) !== test.lots.sha256)
    throw new Error(`${test.lots.file}: sha256 differs from the sealed test record`);

  const lots = new Map<string, SealedLot[]>();

  for (const line of zlib.gunzipSync(bytes).toString('utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as { who: string; lots: SealedLot[] };

    lots.set(row.who, row.lots);
  }

  manifestCache = { selection, test, lots };
  return manifestCache;
};

const sealedOf = (
  record: CentreRecord,
  source: string,
  ledger: SealedLot[] | undefined
): SealedFigures & { ledgerSealed: boolean } => ({
  source,
  net: record.net,
  realized: record.realized,
  unrealized: record.unrealized,
  interest: record.interest,
  costs: record.costs,
  dd: record.dd,
  ddDaily: record.ddDaily,
  lots: record.lots,
  ledger: ledger ?? [],
  ledgerSealed: !!ledger
});

// The F24 shortlist member an alias names.
const memberOf = (parsed: PhaseBAlias, manifests: NonNullable<typeof manifestCache>) => {
  const { selection, test } = manifests;
  const shortlist = selection.testPlan[primaryFold]?.shortlists ?? [];
  const ranked = selection.rankedByFold[primaryFold] ?? [];
  const statusOf = (h: Ranked) => test.holders.find((x) => x.track === h.track && x.id === h.id)?.gates.status;
  const pick = (holder: Ranked | undefined, why: string) => {
    if (!holder) throw new UsageError(`${parsed.alias}: ${why}`);

    const member = shortlist.find((m) => m.track === holder.track && m.id === holder.id);

    if (!member) throw new Error(`${parsed.alias}: holder ${holder.id} is missing from the sealed F24 shortlist`);

    return { member, holder };
  };

  if (parsed.kind === 'nominee') {
    const top = test.nominations[0];

    return pick(
      top ? ranked.find((r) => r.rank === top.rank) : undefined,
      'the sealed F24 test made no research nomination'
    );
  }

  if (parsed.kind === 'rank')
    return pick(
      ranked.find((r) => r.rank === parsed.rank),
      `no sealed F24 training rank ${parsed.rank} (there are ${ranked.length})`
    );

  const track = (parsed as { track: string }).track;
  const inTrack = shortlist.filter((m) => m.track === track);
  const holders = ranked.filter((r) => r.track === track).sort((a, b) => a.rank - b.rank);

  if (parsed.kind === 'member') {
    const member = inTrack.find((m) => m.order === parsed.order);

    if (!member)
      throw new UsageError(`${parsed.alias}: the sealed F24 shortlist of ${track} has no member ${parsed.order}`);

    return { member, holder: ranked.find((r) => r.track === member.track && r.id === member.id) };
  }

  // best: the frozen nomination rule within the track (PROTOCOL.md §8.4) — its top-ranked F24 role holder that the
  // one-time test did not fail. A track whose holders all failed has no best candidate: the alias is refused, never
  // substituted (its failed holders stay runnable by role or rank, labelled T FAIL).
  if (parsed.kind === 'best') {
    const top = holders.find((h) => statusOf(h) !== undefined && statusOf(h) !== 'fail');

    if (top) return pick(top, '');

    throw new UsageError(
      `${parsed.alias}: no best candidate — every ${track} F24 role holder failed the one-time test (run one by role, e.g. s9b-${parsed.alias.slice(4, -5)}-profit, labelled T FAIL)`
    );
  }

  if (parsed.kind !== 'role') throw new Error('unreachable');

  const wanted = parsed.role.startsWith('extra') ? 'extra' : parsed.role;
  const nth = parsed.role === 'extra2' ? 1 : 0;

  return pick(
    holders.filter((h) => h.role === wanted)[nth],
    `the sealed F24 selection has no ${parsed.role} role holder for ${track} (the role is empty)`
  );
};

// The aliases of `compare --all`: the best candidate of every track that has one, then the four comparators.
export const compareAllAliases = async () => {
  const kept: string[] = [];

  for (const alias of compareAll) {
    const parsed = parseAlias(alias);

    if (parsed.kind === 'best') {
      try {
        memberOf(parsed, await sealedManifests());
      } catch (error) {
        if (error instanceof UsageError && /no best candidate/.test(error.message)) continue;

        throw error;
      }
    }

    kept.push(alias);
  }

  return kept;
};

export const resolveAlias = async (alias: string): Promise<PhaseBResolved> => {
  const parsed = parseAlias(alias);

  if (parsed.kind === 'study8') return (await resolveStudy8(alias)) as PhaseBResolved;

  const manifests = await sealedManifests();
  const { test, lots } = manifests;
  const { member, holder } = memberOf(parsed, manifests);
  const id = poolIdOf(member.track, member.order);
  const pool = await loadResearchPool(id);
  const configFile = path.join(researchPoolsDir, `${id}.json`);

  if (!gridsEqual(booksOfPool(pool), member.books))
    throw new Error(`${configFile}: books differ from the sealed F24 shortlist member ${member.id}`);

  const flagged = test.members.find((m) => m.track === member.track && m.id === member.id);

  if (!flagged) throw new Error(`the sealed F24 test record has no member ${member.track}/${member.id}`);

  const holderRecord = test.holders.find((h) => h.track === member.track && h.id === member.id);
  const centre = holderRecord?.evidence.centre.record ?? flagged.evidence.centre?.record;

  if (!centre) throw new Error(`the sealed F24 test record has no centre figures for ${member.track}/${member.id}`);

  const testSource = `${testFile(primaryFold)} (body ${test.bodyHash.slice(0, 12)}; lots ${path.basename(test.lots.file)})`;
  const sealed = sealedOf(
    centre,
    `${holderRecord ? 'holders' : 'members'}[${member.track}/${member.id}] of ${testSource}`,
    lots.get(`${member.track}/${primaryFold}/${member.id}`)
  );
  const status = flagged.gates.status.toUpperCase();
  const membership = tracks[member.track as keyof typeof tracks].books.join('+');
  const label = holder
    ? `F24 role holder (training rank #${holder.rank}, ${holder.role}, tier ${holder.tier}); 2025–2026 T gates ${status}${status === 'FAIL' ? ` (failed ${flagged.gates.failed.join(', ')}) — not a nomination` : ' — a research nomination (retrospective, NOT DEPLOYED)'}`
    : `F24 shortlist member ${member.order} without a role (training-qualified: ${member.qualified ? 'yes' : 'no'}; never a nominee); 2025–2026 T gates ${status}`;
  const books = member.books;

  return {
    spec: {
      alias,
      title: `Study 9 Phase B ${member.track} (${membership}) F24 shortlist member ${member.order} (${member.pick}) — ${member.id}`,
      status: 'research',
      source: { kind: 'pool', id, root: researchPoolsDir },
      note: `${label}; research only, NOT DEPLOYED`
    },
    pool,
    books,
    vectorIds: Object.fromEntries(Object.entries(books).map(([s, g]) => [s, vectorId(g)])),
    configFile,
    sealedId: member.id,
    ...(holder ? { rank: holder.rank } : {}),
    sealed,
    study8: {
      kind: 'member',
      track: member.track,
      order: member.order,
      ...(holder ? { role: holder.role, trainingRank: holder.rank } : {}),
      qualified: member.qualified,
      testStatus: flagged.gates.status,
      testFailed: flagged.gates.failed,
      note: label
    } as Study8Resolved['study8'],
    phaseB: {
      kind: parsed.kind,
      track: member.track,
      membership,
      order: member.order,
      ...(holder ? { role: holder.role, trainingRank: holder.rank } : {}),
      qualified: member.qualified,
      testStatus: flagged.gates.status,
      testFailed: flagged.gates.failed,
      configId: id,
      note: label
    }
  };
};
