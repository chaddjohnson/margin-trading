// Alias → an existing, validated pool configuration, plus its sealed Study 8 provenance.
// - A Study 8 alias is found in the sealed FROZEN_SELECTION.json (F24 ranking and shortlists, body hash verified). Its
//   research pool `S8-<TRACK>-F24-<n>` (written by `npm run study8 -- research-configs`) is loaded through Study 8's
//   research-pool loader, and its grids must equal the sealed books.
// - The sealed figures come from the one-time F24 test record (results/test/F24/test.json and its lot ledger, both
//   hash-verified): the centre's totals for every shortlist member; the funded-lot ledger for role holders and
//   controls (non-holder members have totals only).
// - The frozen VXR/VXRG subsets are runner configurations holding B5's books verbatim (checked against the frozen
//   grids), reconciled against the F24 test record's controls.
// - Every other frozen control and Study 7 reference is resolved by the Study 7 runner (unchanged).
// The sealed Study 8 phase `test-F24` must exist (the local hash chain is verified). Nothing here runs the engine.
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { type LoadedPool, loadPool } from '../pools/load.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';
import { type AliasSpec } from '../study7-runners/aliases.ts';
import {
  type Resolved,
  type SealedFigures,
  type SealedLot,
  resolveAlias as resolveStudy7
} from '../study7-runners/resolve.ts';
import {
  bookOrder,
  frozenGrids,
  frozenSelectionFile,
  primaryFold,
  testFile
} from '../study8-expanded-regime-d1/context.ts';
import { loadResearchPool, researchPoolsDir } from '../study8-expanded-regime-d1/poolrun.ts';
import { readSealed, requirePhase } from '../study8-expanded-regime-d1/records.ts';
import { vectorId } from '../study8-expanded-regime-d1/space.ts';
import { type Study8Alias, UsageError, parseAlias, runnerPoolsRoot } from './aliases.ts';

export type { Resolved };
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
  Object.keys(a).every((symbol) => b[symbol] && d1Keys.every((key) => a[symbol]![key] === b[symbol]![key]));

const booksOfPool = (pool: LoadedPool): Books =>
  Object.fromEntries(
    pool.config.books.map((book) => [
      book.symbol,
      Object.fromEntries(d1Keys.map((key) => [key, book.grid[key]])) as Grid
    ])
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
  lots: { file: string; sha256: string };
  window: { test: string };
  bodyHash: string;
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

// The sealed Study 8 manifests (read-only; chain, body hashes and the lot ledger hash verified).
export const sealedManifests = async () => {
  if (manifestCache) return manifestCache;

  try {
    await requirePhase(`test-${primaryFold}`);
  } catch (error) {
    throw new UsageError(
      `the Study 8 one-time F24 test is not sealed in this checkout (${(error as Error).message}); run from the Study 8 branch after the study`
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

export interface Study8Resolved extends Resolved {
  study8: {
    kind: Study8Alias['kind'];
    track?: string;
    order?: number;
    role?: string;
    trainingRank?: number;
    qualified?: boolean;
    testStatus?: string;
    testFailed?: string[];
    note: string;
  };
  sealed?: SealedFigures & { ledgerSealed?: boolean };
}

// The F24 shortlist member an alias names (role holder, best of track, or member n).
const memberOf = (parsed: Study8Alias, selection: NonNullable<typeof manifestCache>['selection'], test: TestRecord) => {
  const shortlist = selection.testPlan[primaryFold]?.shortlists ?? [];
  const ranked = selection.rankedByFold[primaryFold] ?? [];
  const inTrack = shortlist.filter((m) => m.track === (parsed as { track: string }).track);

  if (parsed.kind === 'member') {
    const member = inTrack.find((m) => m.order === parsed.order);

    if (!member)
      throw new UsageError(
        `${parsed.alias}: the sealed F24 shortlist of ${parsed.track} has no member ${parsed.order} (it has ${inTrack.length})`
      );

    return { member, holder: ranked.find((r) => r.track === member.track && r.id === member.id) };
  }

  const holders = ranked.filter((r) => r.track === (parsed as { track: string }).track);

  // best: the frozen nomination rule within the track — its top-ranked F24 role holder that the one-time test did not
  // fail; if every holder failed, its top-ranked holder; if it has none, its shortlist member 1
  if (parsed.kind === 'best') {
    const ordered = [...holders].sort((a, b) => a.rank - b.rank);
    const statusOf = (h: Ranked) => test.holders.find((x) => x.track === h.track && x.id === h.id)?.gates.status;
    const top = ordered.find((h) => statusOf(h) !== undefined && statusOf(h) !== 'fail') ?? ordered[0];
    const member = top ? inTrack.find((m) => m.id === top.id) : [...inTrack].sort((a, b) => a.order - b.order)[0];

    if (!member) throw new UsageError(`${parsed.alias}: the sealed F24 shortlist of this track is empty`);

    return { member, holder: top };
  }

  if (parsed.kind !== 'role') throw new Error('unreachable');

  const wanted = parsed.role.startsWith('extra') ? 'extra' : parsed.role;
  const nth = parsed.role === 'extra2' ? 1 : 0;
  const holder = holders.filter((h) => h.role === wanted)[nth];

  if (!holder)
    throw new UsageError(
      `${parsed.alias}: the sealed F24 selection has no ${parsed.role} role holder for ${parsed.track} (the role is empty: no qualified candidate)`
    );

  const member = inTrack.find((m) => m.id === holder.id);

  if (!member) throw new Error(`${parsed.alias}: role holder ${holder.id} is missing from the sealed F24 shortlist`);

  return { member, holder };
};

export const resolveAlias = async (alias: string): Promise<Study8Resolved> => {
  const parsed = parseAlias(alias);

  if (parsed.kind === 'study7') {
    const resolved = await resolveStudy7(alias);

    return {
      ...resolved,
      study8: {
        kind: 'study7',
        note: `Study 7 runner alias (reconciled against Study 7's sealed final door): ${resolved.spec.note}`
      }
    };
  }

  const { selection, test, lots } = await sealedManifests();
  const testSource = `${testFile(primaryFold)} (body ${test.bodyHash.slice(0, 12)}; lots ${path.basename(test.lots.file)})`;
  let pool: LoadedPool;
  let configFile: string;
  let spec: AliasSpec;
  let sealed: Study8Resolved['sealed'];
  let study8: Study8Resolved['study8'];
  let sealedId: string;
  let rank: number | undefined;

  if (parsed.kind === 'frozen-subset') {
    pool = await loadPool(parsed.id, runnerPoolsRoot);
    configFile = path.join(runnerPoolsRoot, `${parsed.id}.json`);

    const symbols = Object.keys(booksOfPool(pool));
    const frozen = Object.fromEntries(symbols.map((s) => [s, frozenGrids[s as keyof typeof frozenGrids]]));
    const control = test.controls[parsed.key];

    if (!gridsEqual(booksOfPool(pool), frozen)) throw new Error(`${configFile}: books differ from B5's frozen books`);
    if (!control || !gridsEqual(control.books, frozen))
      throw new Error(`the sealed F24 test record has no frozen ${parsed.key} control with these books`);

    sealed = sealedOf(
      control.evidence.centre.record,
      `controls.${parsed.key} of ${testSource}`,
      lots.get(`control:${parsed.key}`)
    );
    sealedId = parsed.key;
    spec = {
      alias,
      title: `Frozen ${parsed.key} subset — B5's books, unchanged`,
      status: 'frozen',
      source: { kind: 'pool', id: parsed.id, root: runnerPoolsRoot },
      note: 'frozen control; never re-tuned'
    };
    study8 = { kind: parsed.kind, note: 'frozen control (B5 books, unchanged)' };
  } else {
    const { member, holder } = memberOf(parsed, selection, test);
    const id = `S8-${member.track}-F24-${member.order}`;

    pool = await loadResearchPool(id);
    configFile = path.join(researchPoolsDir, `${id}.json`);

    if (!gridsEqual(booksOfPool(pool), member.books))
      throw new Error(`${configFile}: books differ from the sealed F24 shortlist member ${member.id}`);

    const flagged = test.members.find((m) => m.track === member.track && m.id === member.id);

    if (!flagged) throw new Error(`the sealed F24 test record has no member ${member.track}/${member.id}`);

    const holderRecord = test.holders.find((h) => h.track === member.track && h.id === member.id);
    const centre = holderRecord?.evidence.centre.record ?? flagged.evidence.centre?.record;

    if (!centre) throw new Error(`the sealed F24 test record has no centre figures for ${member.track}/${member.id}`);

    sealed = sealedOf(
      centre,
      `${holderRecord ? 'holders' : 'members'}[${member.track}/${member.id}] of ${testSource}`,
      lots.get(`${member.track}/${primaryFold}/${member.id}`)
    );
    sealedId = member.id;
    rank = holder?.rank;

    const status = flagged.gates.status.toUpperCase();
    const label = holder
      ? `F24 role holder (training rank #${holder.rank}, ${holder.role}, tier ${holder.tier}); 2025–2026 T gates ${status}${status === 'FAIL' ? ` (failed ${flagged.gates.failed.join(', ')})` : ''}${status === 'FAIL' ? ' — not a nomination' : ' — a research nomination (retrospective, NOT DEPLOYED)'}`
      : `F24 shortlist member ${member.order} without a role (training-qualified: ${member.qualified ? 'yes' : 'no'}; never a nominee); 2025–2026 T gates ${status}`;

    spec = {
      alias,
      title: `Study 8 ${member.track} F24 shortlist member ${member.order} (${member.pick}) — ${member.id}`,
      status: 'research',
      source: { kind: 'pool', id, root: researchPoolsDir },
      note: `${label}; research only, NOT DEPLOYED`
    };
    study8 = {
      kind: parsed.kind,
      track: member.track,
      order: member.order,
      ...(holder ? { role: holder.role, trainingRank: holder.rank } : {}),
      qualified: member.qualified,
      testStatus: flagged.gates.status,
      testFailed: flagged.gates.failed,
      note: label
    };
  }

  if (
    pool.config.funding.notionalPerTrade !== 100000 ||
    pool.config.funding.fundedSlots !== 1 ||
    pool.config.funding.compounding
  ) {
    throw new UsageError(`${configFile}: not the fixed $100,000 single-slot convention`);
  }

  const books = booksOfPool(pool);
  const ordered = (bookOrder as readonly string[]).filter((s) => s in books);

  return {
    spec,
    pool,
    books,
    vectorIds: Object.fromEntries(ordered.map((symbol) => [symbol, vectorId(books[symbol]!)])),
    configFile,
    sealedId,
    ...(rank !== undefined ? { rank } : {}),
    ...(sealed ? { sealed } : {}),
    study8
  };
};
