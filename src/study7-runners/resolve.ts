// Alias → an existing, validated pool configuration, plus its sealed Study 7 provenance. A Study 7 rank is read from
// the sealed FROZEN_SELECTION.json (body hash verified); its research pool file is found by the books' vector IDs and
// rank label, loaded through Study 7's own research-pool loader, and its grids must equal the sealed books exactly. A
// frozen alias is loaded through the stock pools loader (or Study 5's research-pool loader) and its grids must equal
// Study 7's frozen constants. The sealed final-door figures and funded-lot ledger (final.json, final-lots.jsonl.gz,
// both hash-verified) are attached for reconciliation. Nothing here runs the engine.
import path from 'node:path';
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { type LoadedPool, loadPool } from '../pools/load.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { loadResearchPool as loadStudy5Pool } from '../study5-gdx-b5-three-etf/poolrun.ts';
import { sha256, verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { frozenGrids, gdxControls } from '../study7-stability-first-d1/context.ts';
import {
  loadResearchPool as loadStudy7Pool,
  researchPoolsDir as study7PoolsDir
} from '../study7-stability-first-d1/poolrun.ts';
import { vectorId } from '../study7-stability-first-d1/space.ts';
import { type AliasSpec, UsageError, specOf } from './aliases.ts';

export const study7Dir = 'research/study7-stability-first-d1';
export const frozenSelectionFile = path.join(study7Dir, 'FROZEN_SELECTION.json');
export const finalFile = path.join(study7Dir, 'results', 'final', 'final.json');
export const sealedEnd = '2026-10-29'; // the Study 7 final door's last session
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

export interface SealedLot {
  symbol: string;
  entry: string; // New York 'YYYY-MM-DD HH:MM'
  exit: string; // '' while open
  net: number;
  interest: number;
  costs: number;
  open: boolean;
}

export interface SealedFigures {
  source: string; // where in final.json
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  dd: number;
  ddDaily: number;
  lots: number;
  ledger: SealedLot[];
}

export interface Resolved {
  spec: AliasSpec;
  pool: LoadedPool;
  books: Books;
  vectorIds: Record<string, string>;
  configFile: string;
  sealedId: string; // the Study 7 configuration ID or the control key
  rank?: number;
  sealed?: SealedFigures;
}

let manifestCache:
  { selection: Record<string, unknown>; final: Record<string, unknown>; lots: Map<string, SealedLot[]> } | undefined;

// The sealed Study 7 manifests (read-only; body hashes and the lots file hash verified).
export const sealedManifests = async () => {
  if (manifestCache) return manifestCache;

  for (const file of [frozenSelectionFile, finalFile]) {
    if (!(await fs.pathExists(file)))
      throw new Error(
        `${file} is missing: check out the Study 7 branch (research/study7-stability-first-d1 or its descendant)`
      );
  }

  const selection = (await fs.readJson(frozenSelectionFile)) as Record<string, unknown>;
  const final = (await fs.readJson(finalFile)) as Record<string, unknown> & { lots: { file: string; sha256: string } };

  if (!verifySealed(selection)) throw new Error(`${frozenSelectionFile}: the sealed body hash does not verify`);
  if (!verifySealed(final)) throw new Error(`${finalFile}: the sealed body hash does not verify`);

  const bytes = await fs.readFile(final.lots.file);

  if (sha256(bytes) !== final.lots.sha256)
    throw new Error(`${final.lots.file}: sha256 differs from the sealed final record`);

  const lots = new Map<string, SealedLot[]>();

  for (const line of zlib.gunzipSync(bytes).toString('utf8').split('\n').filter(Boolean)) {
    const row = JSON.parse(line) as { who: string; lots: SealedLot[] };

    lots.set(row.who, row.lots);
  }

  manifestCache = { selection, final, lots };

  return manifestCache;
};

interface Ranked {
  rank: number;
  track: string;
  path: string;
  role: string;
  id: string;
  books: Books;
}

interface FinalRecordView {
  evidence: {
    books: Books;
    centre: {
      record: {
        net: number;
        realized: number;
        unrealized: number;
        interest: number;
        costs: number;
        dd: number;
        ddDaily: number;
        lots: number;
      };
    };
  };
}

const sealedOf = (view: FinalRecordView, source: string, ledger: SealedLot[] | undefined): SealedFigures => {
  const r = view.evidence.centre.record;

  if (!ledger) throw new Error(`no sealed lot ledger for ${source}`);

  return {
    source,
    net: r.net,
    realized: r.realized,
    unrealized: r.unrealized,
    interest: r.interest,
    costs: r.costs,
    dd: r.dd,
    ddDaily: r.ddDaily,
    lots: r.lots,
    ledger
  };
};

const frozenBooksOf = (key: NonNullable<AliasSpec['expectedFrozen']>): Books => {
  switch (key) {
    case 'B1':
      return { VGT: frozenGrids.VGT };
    case 'VG':
      return { VGT: frozenGrids.VGT, GDX: frozenGrids.GDX };
    case 'B5':
      return { ...frozenGrids };
    case 'G-PA':
      return { GDX: gdxControls['G-PA']!.grid };
    case 'G-NM1':
      return { GDX: gdxControls['G-NM1']!.grid };
  }
};

const booksOfPool = (pool: LoadedPool): Books =>
  Object.fromEntries(
    pool.config.books.map((book) => [
      book.symbol,
      Object.fromEntries(d1Keys.map((key) => [key, book.grid[key]])) as Grid
    ])
  );

// The research pool of a sealed rank: its books' candidate IDs equal the sealed vectors and its status names the rank.
const study7PoolOf = async (ranked: Ranked) => {
  const wanted = Object.entries(ranked.books)
    .map(([symbol, grid]) => `${symbol}:${vectorId(grid)}`)
    .sort()
    .join('+');
  const matches: string[] = [];

  for (const name of (await fs.readdir(study7PoolsDir)).filter((file) => file.endsWith('.json')).sort()) {
    const raw = (await fs.readJson(path.join(study7PoolsDir, name))) as {
      status: string;
      books: { symbol: string; candidateId: string }[];
    };
    const ids = raw.books
      .map((book) => `${book.symbol}:${book.candidateId}`)
      .sort()
      .join('+');

    if (ids === wanted && raw.status.includes(`(RANK ${ranked.rank},`)) matches.push(name.slice(0, -5));
  }

  if (matches.length !== 1) {
    throw new Error(
      `rank ${ranked.rank}: expected exactly one research pool in ${study7PoolsDir} with books ${wanted}, found ${matches.length}`
    );
  }

  return matches[0]!;
};

export const resolveAlias = async (alias: string): Promise<Resolved> => {
  const spec = specOf(alias);
  const { selection, final, lots } = await sealedManifests();
  const source = spec.source;
  let pool: LoadedPool;
  let configFile: string;
  let sealedId: string;
  let rank: number | undefined;
  let sealed: SealedFigures | undefined;

  if (source.kind === 'study7-rank') {
    const ranked = ((selection.ranked as Ranked[]) ?? []).find((row) => row.rank === source.rank);

    if (!ranked) throw new Error(`${frozenSelectionFile} has no rank ${source.rank}`);
    if (ranked.track !== source.track || ranked.role !== source.role || ranked.path !== 'L') {
      throw new Error(
        `${alias}: sealed rank ${source.rank} is ${ranked.track}/${ranked.path} ${ranked.role}, not ${source.track}/L ${source.role}`
      );
    }

    const id = await study7PoolOf(ranked);

    pool = await loadStudy7Pool(id);
    configFile = path.join(study7PoolsDir, `${id}.json`);

    if (!gridsEqual(booksOfPool(pool), ranked.books))
      throw new Error(`${configFile}: books differ from the sealed rank ${source.rank}`);

    sealedId = ranked.id;
    rank = ranked.rank;

    const nomination = (final.nominations as (Ranked & FinalRecordView)[]).find(
      (row) => row.rank === source.rank && row.id === ranked.id
    );

    if (!nomination) throw new Error(`${finalFile} has no nomination of rank ${source.rank}`);

    sealed = sealedOf(
      nomination,
      `final.json nominations[rank ${source.rank}]`,
      lots.get(`${ranked.track}/${ranked.path}/${ranked.id}`)
    );
  } else {
    if (source.kind === 'pool') {
      pool = await loadPool(source.id, source.root);
      configFile = path.join(source.root, `${source.id}.json`);
    } else {
      pool = await loadStudy5Pool(source.id);
      configFile = path.join('config/research-pools/study5-gdx-d1-b5-three-etf', `${source.id}.json`);
    }

    if (spec.expectedFrozen && !gridsEqual(booksOfPool(pool), frozenBooksOf(spec.expectedFrozen))) {
      throw new Error(`${configFile}: books differ from Study 7's frozen ${spec.expectedFrozen} constants`);
    }

    sealedId = spec.sealedControl ?? source.id;

    const control = spec.sealedControl
      ? (final.controls as Record<string, FinalRecordView>)[spec.sealedControl]
      : undefined;

    if (spec.sealedControl && !control) throw new Error(`${finalFile} has no control ${spec.sealedControl}`);

    if (control) {
      if (!gridsEqual(control.evidence.books, booksOfPool(pool)))
        throw new Error(`${configFile}: books differ from the sealed control ${spec.sealedControl}`);

      sealed = sealedOf(
        control,
        `final.json controls.${spec.sealedControl}`,
        lots.get(`control:${spec.sealedControl}`)
      );
    }
  }

  if (
    pool.config.funding.notionalPerTrade !== 100000 ||
    pool.config.funding.fundedSlots !== 1 ||
    pool.config.funding.compounding
  ) {
    throw new UsageError(`${configFile}: not the fixed $100,000 single-slot convention`);
  }

  const books = booksOfPool(pool);

  return {
    spec,
    pool,
    books,
    vectorIds: Object.fromEntries(Object.entries(books).map(([symbol, grid]) => [symbol, vectorId(grid)])),
    configFile,
    sealedId,
    ...(rank !== undefined ? { rank } : {}),
    ...(sealed ? { sealed } : {})
  };
};
