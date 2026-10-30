// Phases 4A (shallow D1 discovery), 4B (frozen B5 integration, idle-only) and 4C (priority and preemption) of one
// development window (PROTOCOL.md §7.1–7.3, SEARCH_PLAN.md §3–4). Pure procedures over the runner; every listed run is
// executed and counted. All decisions use development data of the window only.
import { type Policy, policyOf } from './allocator.ts';
import { type BookSpec, gridKey, isB5Symbol, shallowBounds } from './books.ts';
import { type Grid } from './context.ts';
import { type Context, type Evaluation, type Standalone, b5Genome } from './evaluate.ts';
import type { Runner } from './pool.ts';
import { type LibraryMember, type Scored, shallowBook } from './search4d.ts';
import { type Selection, selectFrom } from './selection.ts';
import { type Genome, distance, mutateGrid, rngOf, sobolGrids } from './space.ts';

// ----- 4A -----

export interface SymbolDiscovery {
  symbol: string;
  sigma: number;
  band: { lo: number; hi: number; empty: boolean; reason: string };
  evaluated: number;
  roleFeasible: number;
  library: LibraryMember[];
  noLibraryReason: string;
  top: Standalone[]; // the 30 best by standalone net and the 30 best by idle-clean net (deduplicated)
}

export interface Discovery {
  symbols: SymbolDiscovery[];
  library: LibraryMember[];
  evaluations: Standalone[];
}

const eligibleForLibrary = (s: Standalone) => s.roleFailure === '' && s.decisions >= 4 && s.minuteDD <= 35000;

const gridOfKey = (key: string): Grid => {
  const [x, y, stop, hold, l, buffer, p, w] = key.split('.').map(Number);

  return {
    targetPercentChange: x!,
    trailingBuyPercentage: y!,
    trailingStopPercentage: stop!,
    maximumHoldDays: hold!,
    tickWindowSize: l!,
    intradayLossBuffer: buffer!,
    pullback: p!,
    continuationWindow: w!
  };
};

export const run4A = async (
  ctx: Context,
  runner: Runner,
  window: string,
  log: (line: string) => void,
  scale = 1
): Promise<Discovery> => {
  const symbols = ctx.spec.symbols.filter((info) => !info.shallow.empty);
  const designN = Math.max(16, Math.round(4096 * scale));
  const childN = Math.max(2, Math.round(64 * scale));
  const designs = symbols.flatMap((info) =>
    sobolGrids('4A', info.symbol, designN, shallowBounds(info.shallow)).map((grid) => ({ symbol: info.symbol, grid }))
  );

  log(`4A ${window}: ${symbols.length} symbols with a shallow band, ${designs.length} Sobol vectors`);

  const first = await runner.standalone(designs);
  const bySymbol = new Map<string, Standalone[]>();

  for (const result of first) {
    bySymbol.set(result.symbol, [...(bySymbol.get(result.symbol) ?? []), result]);
  }

  // refinement: 8 + 8 diverse seeds × 64 mutations per symbol
  const refinements: { symbol: string; grid: Grid }[] = [];

  for (const info of symbols) {
    const bounds = shallowBounds(info.shallow);
    const results = bySymbol.get(info.symbol) ?? [];
    const seen = new Set(results.map((r) => r.grid));
    const byNet = results
      .filter((r) => r.minuteDD <= 35000)
      .sort((a, b) => b.net - a.net || (a.grid < b.grid ? -1 : 1));
    const byIdle = [...results].sort((a, b) => b.idleCleanNet - a.idleCleanNet || (a.grid < b.grid ? -1 : 1));
    const seeds: Grid[] = [];
    const take = (list: Standalone[], n: number) => {
      let taken = 0;

      for (const r of list) {
        if (taken >= n) {
          break;
        }

        const grid = gridOfKey(r.grid);

        if (seeds.every((seed) => distance(seed, grid, bounds) >= 0.15)) {
          seeds.push(grid);
          taken++;
        }
      }
    };

    take(byNet, 8);
    take(byIdle, 8);

    const rng = rngOf('4A', window, info.symbol, 'refinement');

    for (const seed of seeds) {
      let made = 0;

      for (let attempt = 0; made < childN && attempt < childN * 20; attempt++) {
        const grid =
          rng.next() < 0.5 ? mutateGrid(seed, rng, bounds, 1, 3) : mutateGrid(seed, rng, bounds, 2 + rng.int(2), 2);
        const key = gridKey(grid);

        if (!seen.has(key)) {
          seen.add(key);
          refinements.push({ symbol: info.symbol, grid });
          made++;
        }
      }
    }
  }

  log(`4A ${window}: ${refinements.length} refinement vectors`);

  const second = await runner.standalone(refinements);

  for (const result of second) {
    bySymbol.get(result.symbol)!.push(result);
  }

  // the library: per symbol and X tertile, L1–L4, at normalized distance ≥ 0.15, up to 12 per symbol
  const library: LibraryMember[] = [];
  const out: SymbolDiscovery[] = [];

  for (const info of ctx.spec.symbols) {
    const results = bySymbol.get(info.symbol) ?? [];
    const members: LibraryMember[] = [];

    if (!info.shallow.empty) {
      const bounds = shallowBounds(info.shallow);
      const width = info.shallow.hi - info.shallow.lo + 1;
      const tertileOf = (x: number) => Math.min(2, Math.floor(((x - info.shallow.lo) * 3) / width));
      const eligible = results.filter(eligibleForLibrary);
      const slots: { name: string; value: (s: Standalone) => number; admit: (s: Standalone) => boolean }[] = [
        { name: 'L1', value: (s) => s.net, admit: (s) => s.net > 0 },
        { name: 'L2', value: (s) => s.idleCleanNet, admit: (s) => s.idleCleanNet > 0 },
        {
          name: 'L3',
          value: (s) => (s.idleCleanHeldDays > 0 ? s.idleCleanNet / s.idleCleanHeldDays : -Infinity),
          admit: (s) => s.idleCleanTrades >= 4 && s.idleCleanNet > 0
        },
        { name: 'L4', value: (s) => s.net - s.minuteDD, admit: (s) => s.net - s.minuteDD > 0 }
      ];

      for (let tertile = 0; tertile < 3; tertile++) {
        const inTertile = eligible.filter((s) => tertileOf(gridOfKey(s.grid).targetPercentChange) === tertile);

        for (const slot of slots) {
          const best = inTertile
            .filter(slot.admit)
            .sort((a, b) => slot.value(b) - slot.value(a) || (a.grid < b.grid ? -1 : 1))
            .find((s) => members.every((m) => distance(m.grid, gridOfKey(s.grid), bounds) >= 0.15));

          if (best && members.length < 12) {
            members.push({
              symbol: info.symbol,
              grid: gridOfKey(best.grid),
              slot: `T${tertile + 1}:${slot.name}`,
              net: best.net,
              idleCleanNet: best.idleCleanNet
            });
          }
        }
      }
    }

    library.push(...members);

    const topNet = [...results].sort((a, b) => b.net - a.net).slice(0, 30);
    const topIdle = [...results].sort((a, b) => b.idleCleanNet - a.idleCleanNet).slice(0, 30);
    const topKeys = new Set<string>();

    out.push({
      symbol: info.symbol,
      sigma: info.sigma,
      band: info.shallow,
      evaluated: results.length,
      roleFeasible: results.filter((r) => r.roleFailure === '').length,
      library: members,
      noLibraryReason: info.shallow.empty
        ? info.shallow.reason
        : members.length === 0
          ? `no role-feasible vector with ≥ 4 decisions, minute DD ≤ $35,000 and a positive L1–L4 score (${results.filter(eligibleForLibrary).length} eligible)`
          : '',
      top: [...topNet, ...topIdle].filter((r) => !topKeys.has(r.grid) && (topKeys.add(r.grid), true))
    });
  }

  log(`4A ${window}: library ${library.length} members on ${new Set(library.map((m) => m.symbol)).size} symbols`);

  return { symbols: out, library, evaluations: [...first, ...second] };
};

// ----- 4B -----

export interface IntegrationResult {
  singles: Scored[];
  greedy: { variant: 'unconstrained' | 'distinct'; rounds: Scored[] }[];
  dual: Scored[];
  gated: Scored[];
  sa: Scored;
  b5: Scored;
  all: Scored[];
  selection: Selection;
}

const genomeWith = (ctx: Context, shallow: BookSpec[], policy: Policy = policyOf('P0')): Genome => ({
  ...b5Genome(ctx.spec, policy),
  shallow
});

const memberBook = (member: LibraryMember, window: string) =>
  shallowBook(member.symbol, member.grid, `4A:${window}:${member.slot}`);

const evalAll = async (runner: Runner, genomes: Genome[], stage: Scored['stage'] = 'initial'): Promise<Scored[]> => {
  const results = await runner.genomes(genomes, 'frozenB5');

  return genomes.map((genome, index) => ({ genome, evaluation: results[index]!, island: -1, stage }));
};

// Decision-timing overlap of two books' virtual trades (share of a's trades overlapping one of b's), from the traces.
const overlapShare = (ctx: Context, a: BookSpec, b: BookSpec) => {
  const ta = ctx.cache.get(a, ctx.settings).trades;
  const tb = ctx.cache.get(b, ctx.settings).trades;
  const span = (t: (typeof ta)[number]) => ({ from: t.decisionTime, to: t.exitIndex >= 0 ? t.exitTime : Infinity });
  const hits = ta.filter((t) => tb.some((u) => span(t).from < span(u).to && span(u).from < span(t).to)).length;

  return ta.length ? hits / ta.length : 0;
};

export const run4B = async (
  ctx: Context,
  runner: Runner,
  window: string,
  discovery: Discovery,
  log: (line: string) => void
): Promise<IntegrationResult> => {
  const byDelta = (a: Scored, b: Scored) =>
    b.evaluation.delta - a.evaluation.delta || (a.evaluation.key < b.evaluation.key ? -1 : 1);
  const [b5] = await evalAll(runner, [genomeWith(ctx, [])]);
  const members = discovery.library.map((member) => memberBook(member, window));
  const singles = await evalAll(
    runner,
    members.map((book) => genomeWith(ctx, [book]))
  );
  const ranked = [...singles].sort(byDelta);
  const top40 = ranked.slice(0, 40).map((item) => item.genome.shallow[0]!);
  const greedy: IntegrationResult['greedy'] = [];

  for (const variant of ['unconstrained', 'distinct'] as const) {
    const rounds: Scored[] = [];
    let current: BookSpec[] = top40.length > 0 ? [top40[0]!] : [];
    let currentScore = ranked[0];

    for (let round = 2; round <= 3 && current.length > 0; round++) {
      const candidates = top40.filter(
        (book) =>
          !current.some((c) => c.id === book.id) &&
          (variant === 'unconstrained' ||
            (!current.some((c) => c.symbol === book.symbol) &&
              current.every((c) => Math.max(overlapShare(ctx, book, c), overlapShare(ctx, c, book)) <= 0.25)))
      );

      if (candidates.length === 0) {
        break;
      }

      const evaluated = await evalAll(
        runner,
        candidates.map((book) => genomeWith(ctx, [...current, book]))
      );
      const best = [...evaluated].sort(byDelta)[0]!;

      rounds.push(...evaluated);

      if (currentScore && best.evaluation.delta <= currentScore.evaluation.delta) {
        break;
      }

      current = best.genome.shallow;
      currentScore = best;
    }

    greedy.push({ variant, rounds });
  }

  // dual-phenotype sets on B5 symbols
  const onB5 = ranked.filter((item) => isB5Symbol(item.genome.shallow[0]!.symbol));
  const bestPerB5Symbol = new Map<string, BookSpec>();

  for (const item of onB5) {
    const book = item.genome.shallow[0]!;

    if (!bestPerB5Symbol.has(book.symbol)) {
      bestPerB5Symbol.set(book.symbol, book);
    }
  }

  const twoBest = [...bestPerB5Symbol.values()].slice(0, 2);
  const dual = twoBest.length === 2 ? await evalAll(runner, [genomeWith(ctx, twoBest)]) : [];
  const singleDual = singles.filter((item) => [...bestPerB5Symbol.values()].includes(item.genome.shallow[0]!));

  // gates on the 10 best sets
  const sets = [...singles, ...greedy.flatMap((g) => g.rounds), ...dual].sort(byDelta).slice(0, 10);
  const gatePolicies: Policy[] = [
    policyOf('P0', { gate: 'G1' }),
    policyOf('P0', { gate: 'G1d' }),
    policyOf('P0', { gate: 'G2', lambda: 0.5 }),
    policyOf('P0', { gate: 'G2', lambda: 0.75 }),
    policyOf('P0', { gate: 'G2', lambda: 0.9 })
  ];
  const gated = await evalAll(
    runner,
    sets.flatMap((set) => gatePolicies.map((policy) => genomeWith(ctx, set.genome.shallow, policy)))
  );

  // SA: the three best library members by standalone net on distinct symbols
  const saBooks: BookSpec[] = [];

  for (const member of [...discovery.library].sort(
    (a, b) => b.net - a.net || (gridKey(a.grid) < gridKey(b.grid) ? -1 : 1)
  )) {
    if (saBooks.length < 3 && !saBooks.some((book) => book.symbol === member.symbol)) {
      saBooks.push(memberBook(member, window));
    }
  }

  const [sa] = await evalAll(runner, [genomeWith(ctx, saBooks)]);
  const all = dedupe([b5!, ...singles, ...greedy.flatMap((g) => g.rounds), ...dual, ...gated, sa!]);

  log(`4B ${window}: ${all.length} configurations (singles ${singles.length}, gated ${gated.length})`);

  const selection = await selectFrom(ctx, runner, all, 'frozenB5', `4B:${window}`);

  void singleDual;

  return { singles, greedy, dual, gated, sa: sa!, b5: b5!, all, selection };
};

const dedupe = (items: Scored[]) => {
  const seen = new Set<string>();

  return items.filter((item) => !seen.has(item.evaluation.key) && (seen.add(item.evaluation.key), true));
};

// ----- 4C -----

export const policies4C = (): Policy[] => [
  policyOf('P0'),
  policyOf('P0M'),
  policyOf('P1'),
  policyOf('P2'),
  policyOf('P2', { replacement: 'legacy' }),
  ...[500, 1000, 2000, 3500].flatMap((budget) => [
    policyOf('P3', { budget }),
    policyOf('P3', { budget, filter: 'deep' })
  ]),
  policyOf('P4', { deadline: 0 }),
  policyOf('P4', { deadline: 1 })
];

export interface PreemptionResult {
  sets: { label: string; shallow: BookSpec[]; gate: Policy['gate']; lambda: number }[];
  runs: Scored[];
  selection: Selection;
}

export const run4C = async (
  ctx: Context,
  runner: Runner,
  window: string,
  integration: IntegrationResult,
  log: (line: string) => void
): Promise<PreemptionResult> => {
  const byDelta = (a: Scored, b: Scored) =>
    b.evaluation.delta - a.evaluation.delta || (a.evaluation.key < b.evaluation.key ? -1 : 1);
  const sets: PreemptionResult['sets'] = [];
  const pick = integration.selection.pick;

  if (pick && pick.genome.shallow.length > 0) {
    sets.push({
      label: '4B pick',
      shallow: pick.genome.shallow,
      gate: pick.genome.policy.gate,
      lambda: pick.genome.policy.lambda
    });
  }

  sets.push({ label: 'SA', shallow: integration.sa.genome.shallow, gate: 'G0', lambda: 0.75 });

  for (const [index, item] of [...integration.singles].sort(byDelta).slice(0, 10).entries()) {
    sets.push({ label: `single ${index + 1}`, shallow: item.genome.shallow, gate: 'G0', lambda: 0.75 });
  }

  const subsets = integration.greedy.flatMap((g) => g.rounds).filter((item) => item.genome.shallow.length > 1);

  for (const [index, item] of [...subsets].sort(byDelta).slice(0, 5).entries()) {
    sets.push({ label: `subset ${index + 1}`, shallow: item.genome.shallow, gate: 'G0', lambda: 0.75 });
  }

  const genomes = sets.flatMap((set) =>
    policies4C().map((policy) =>
      genomeWith(ctx, set.shallow, {
        ...policy,
        gate: set.gate,
        lambda: set.gate === 'G2' ? set.lambda : policy.lambda
      })
    )
  );
  const runs = dedupe(await evalAll(runner, genomes));

  log(`4C ${window}: ${sets.length} sets × ${policies4C().length} policies = ${runs.length} runs`);

  const selection = await selectFrom(ctx, runner, runs, 'frozenB5', `4C:${window}`);

  return { sets, runs, selection };
};

export type { Evaluation };
