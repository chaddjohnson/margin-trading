// The study's executable research pools (PROTOCOL.md §19): every window's procedure configurations (B_Rk, C_Rk,
// D*_Rk; the final window's exploratory incumbent-arm finalist) as loadable JSON files under
// config/research-pools/d1-ranked-preemption/<window>/, schema `ranked-preemption-pool` v1, written once from the
// sealed controls and rankings, each with its eight exact parameters per member, the frozen ranking (file, body
// hash, members' order), the P1 allocation, funding, costs, provenance and a content hash. Status `research-only`
// unless the prospective registration names it. The loader verifies the content hash and the ranking file.
import path from 'node:path';
import fs from 'fs-extra';
import type { IntParams } from '../d1-refinement/families.ts';
import { describe } from '../multi-etf-d1/space.ts';
import { type PolicyKey, allocationOf, resolvePriority } from './allocation.ts';
import {
  type RankingKey,
  type WindowKey,
  codeFreezeFile,
  log,
  nowIso,
  rankingKeys,
  readJson,
  researchPoolsRoot,
  study,
  windowKeys,
  writeJson
} from './context.ts';
import { readControls } from './controls.ts';
import type { Book } from './evaluate.ts';
import { hashBody, readSealed, sha256 } from './freeze.ts';
import { rankingFile, readRanking } from './ranking.ts';
import { parametersOf } from './standalone.ts';

export const researchPoolFile = (window: WindowKey, id: string) => path.join(researchPoolsRoot, window, `${id}.json`);

export interface ResearchPool {
  schema: 'ranked-preemption-pool';
  schemaVersion: 1;
  id: string;
  study: string;
  status: 'research-only' | 'historical-comparator' | 'prospective-candidate';
  window: WindowKey;
  configuration: string;
  label: string;
  role: string;
  books: {
    symbol: string;
    candidateId: string;
    grid: Book['vector']['grid'];
    parameters: Record<string, unknown>;
    description: string;
    gridSha256: string;
  }[];
  ranking: {
    id: string;
    window: WindowKey;
    metric: RankingKey;
    file: string;
    bodyHash: string;
    order: string[];
    scores: Record<string, number | null>;
  } | null;
  allocation: { key: PolicyKey; policy: string; thresholdDollars: number; rules: string };
  funding: { fundedSlots: 1; notionalPerTrade: number; compounding: false };
  interest: { annualRate: number; method: 'simple'; dayCount: 365 };
  costs: { bpsPerSide: number; sensitivityBps: number[]; commission: 0 };
  execution: { stopFill: 'stop'; stopSlippageBps: 0; firstEligibleDate: string; events: string };
  training: { window: WindowKey; searchEnd: string; partition: 'training' };
  provenance: Record<string, unknown>;
  evidence: { grade: string; allowedEnd: string; note: string };
  writtenAt: string;
  contentSha256: string;
}

const policyName: Record<PolicyKey, string> = {
  P0: 'shadow (frozen; no preemption)',
  P0R: 'priority-ranked ties (no preemption)',
  P1: 'priority-preemption-P1',
  'P1-B250': 'priority-preemption-P1-B250 (sensitivity)',
  'P1-B500': 'priority-preemption-P1-B500 (sensitivity)'
};

export const exportPools = async (window: WindowKey) => {
  const controls = await readControls(window);
  const codeFreeze = await readSealed(codeFreezeFile);
  const rankings = Object.fromEntries(
    await Promise.all(rankingKeys.map(async (key) => [key, await readRanking(window, key)] as const))
  );
  const written: string[] = [];

  for (const configuration of controls.configurations) {
    if (!(configuration.role === 'procedure' || configuration.role === 'exploratory')) {
      continue;
    }

    const id = `RP-${window}-${configuration.id}`;
    const file = researchPoolFile(window, id);

    if (await fs.pathExists(file)) {
      throw new Error(`${file} exists: research pools are written once`);
    }

    const ranking = configuration.ranking ? rankings[configuration.ranking]! : undefined;
    const members = configuration.books.map((book) => book.symbol);
    const body: Omit<ResearchPool, 'contentSha256'> = {
      schema: 'ranked-preemption-pool',
      schemaVersion: 1,
      id,
      study: study.version,
      status: 'research-only',
      window,
      configuration: configuration.id,
      label: (controls.configurations as unknown as { id: string; label: string }[]).find(
        (c) => c.id === configuration.id
      )!.label,
      role: configuration.role,
      books: configuration.books.map((book) => ({
        symbol: book.symbol,
        candidateId: book.candidateId,
        grid: book.grid,
        parameters: parametersOf(book.grid),
        description: describe(book.grid as unknown as IntParams),
        gridSha256: sha256(JSON.stringify(book.grid))
      })),
      ranking: ranking
        ? {
            id: `${window}/${configuration.ranking}`,
            window,
            metric: configuration.ranking!,
            file: rankingFile(window, configuration.ranking!),
            bodyHash: ranking.bodyHash,
            order: resolvePriority(`${window}/${configuration.ranking}`, ranking.order, members).order as string[],
            scores: Object.fromEntries(
              ranking.entries
                .filter((entry) => members.includes(entry.symbol))
                .map((entry) => [entry.symbol, entry.score])
            )
          }
        : null,
      allocation: {
        key: configuration.policy,
        policy: policyName[configuration.policy],
        thresholdDollars: allocationOf(configuration.policy, ranking ? { rankingId: 'x', order: members } : undefined)
          .policy.thresholdDollars,
        rules:
          'research/d1-ranked-preemption/PROTOCOL.md §5.3: one funded $100,000 lot; a strictly higher-priority fresh signal starts a switch when the lot’s liquidation net (both frictions, interest) ≥ the threshold at the last price; the lot is sold at its first trade at or after the decision only if the net there is still ≥ the threshold, before the replacement’s fill; same-minute decisions in priority order; own exits supersede; aborts keep the lot'
      },
      funding: { fundedSlots: 1, notionalPerTrade: study.principal, compounding: false },
      interest: { annualRate: study.rate, method: 'simple', dayCount: 365 },
      costs: { bpsPerSide: study.principalCostBps, sensitivityBps: [...study.costsBps], commission: 0 },
      execution: {
        stopFill: 'stop',
        stopSlippageBps: 0,
        firstEligibleDate: study.eligibilityDate,
        events: 'per minute: virtual exits, a pending preemption sale, virtual fills, decisions (priority order), marks'
      },
      training: { window, searchEnd: study.windows[window].searchEnd, partition: 'training' },
      provenance: {
        controls: controls.bodyHash,
        codeFreeze: codeFreeze.bodyHash,
        books: configuration.books.map((book) => `${book.symbol}:${book.candidateId}`),
        source: configuration.id.startsWith('B-')
          ? 'incumbent B5 vectors (config/pools/B5.json), unchanged'
          : configuration.id.startsWith('C-')
            ? 'standalone representatives (Stage A), unchanged'
            : 'joint search (Stage D), pool-specific copies'
      },
      evidence: {
        grade: 'E0/E1 training only',
        allowedEnd: window === 'final' ? study.trainingLastSession : study.windows[window].validationEnd!,
        note: 'never evaluated after 2023-12-29 unless FROZEN_SELECTION.json nominates it and the historical check is sealed'
      },
      writtenAt: nowIso()
    };
    const pool: ResearchPool = { ...body, contentSha256: hashBody(body as unknown as Record<string, unknown>) };

    await writeJson(file, pool);
    written.push(file);
  }

  log(`export-pools ${window}: ${written.length} research pools → ${path.join(researchPoolsRoot, window)}`);

  return written;
};

export const listResearchPools = async () => {
  const out: { id: string; window: WindowKey; file: string }[] = [];

  for (const window of windowKeys) {
    const dir = path.join(researchPoolsRoot, window);

    if (await fs.pathExists(dir)) {
      for (const name of (await fs.readdir(dir)).filter((entry) => entry.endsWith('.json')).sort()) {
        out.push({ id: name.slice(0, -5), window, file: path.join(dir, name) });
      }
    }
  }

  return out;
};

export const loadResearchPool = async (id: string) => {
  const entry = (await listResearchPools()).find((item) => item.id === id);

  if (!entry) {
    throw new Error(`no research pool ${id} (npm run ranked-preemption -- list)`);
  }

  const pool = await readJson<ResearchPool>(entry.file);
  const { contentSha256, ...body } = pool;

  if (hashBody(body as unknown as Record<string, unknown>) !== contentSha256) {
    throw new Error(`${entry.file}: the content hash does not verify; the pool was changed`);
  }

  if (pool.ranking) {
    const ranking = await readRanking(pool.ranking.window, pool.ranking.metric);

    if (ranking.bodyHash !== pool.ranking.bodyHash) {
      throw new Error(`${entry.file}: its ranking file no longer verifies`);
    }
  }

  return { pool, file: entry.file };
};

export const booksOfPool = (pool: ResearchPool): Book[] =>
  pool.books.map((book) => ({
    symbol: book.symbol,
    vector: { id: book.candidateId, grid: book.grid, origin: pool.id }
  }));

export const allocationOfPool = (pool: ResearchPool, override?: PolicyKey) => {
  const key = override ?? pool.allocation.key;

  return key === 'P0' || !pool.ranking
    ? allocationOf('P0')
    : allocationOf(key, {
        rankingId: `${pool.ranking.id}#${pool.ranking.bodyHash.slice(0, 16)}`,
        order: pool.ranking.order,
        scores: pool.ranking.scores
      });
};
