// The archive census of one source window (PROTOCOL.md §4; SOURCE_ARCHIVES_AND_SELECTION_BIAS.md), training data
// only: per ETF, the reconstructed archive's credible set, unique trade paths and bounded-diameter families; the
// source's narrow rule re-applied (A0r on ARCH) with the source's own 16 neighbourhood draws and compared with the
// sealed representative, library and J_nb values (the A0 reproduction); the NEW-SEARCH trigger statistics; the old
// penalty's impact; and the discarded-candidate audit (why each credible family never reached the old library).
import fs from 'fs-extra';
import {
  type FoldKey,
  type SourceWindow,
  folds,
  log,
  minimumTrades,
  nowIso,
  resultFile,
  rules,
  study,
  triggers
} from './context.ts';
import { archiveCandidatesFile, foldOfWindow, libraryGridsOf, readArchiveCandidates, readProfile } from './archive.ts';
import { type Candidate, byJs, byKey, byT } from './candidates.ts';
import { sourceTrainingUniverse } from './doors.ts';
import { requireCodeFrozen } from './freeze.ts';
import { Fast, eligibleYearsOf, gridKeyOf } from './fast.ts';
import { drawPlan, evaluateDraws, prepareSymbol } from './library.ts';
import { sha256File, writeRecord } from './records.ts';
import { median } from './stats.ts';

export const censusFile = (window: SourceWindow) => resultFile('archive', window, 'CENSUS.json');

const entrySessions = (c: Candidate) => (c.intervals ?? []).filter((_, index) => index % 2 === 0);

const jaccardDistance = (a: readonly number[], b: readonly number[]) => {
  const left = new Set(a);
  const right = new Set(b);
  let both = 0;

  for (const value of left) {
    if (right.has(value)) {
      both++;
    }
  }

  const union = left.size + right.size - both;

  return union === 0 ? 0 : 1 - both / union;
};

export const runCensus = async (window: SourceWindow, options: { workers?: number } = {}) => {
  const guard = await requireCodeFrozen();
  const target = censusFile(window);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: the census of ${window} is written once`);
  }

  const fold: FoldKey | null = foldOfWindow(window) ?? null;
  const startedAt = nowIso();
  const candidates = await readArchiveCandidates(window);
  const { loaded, door } = await sourceTrainingUniverse(window);
  const fast = await Fast.create(loaded, options.workers);
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const minTrades = minimumTrades(eligibleYearsOf(loaded));
  const bySymbol = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    (bySymbol.get(candidate.symbol) ?? bySymbol.set(candidate.symbol, []).get(candidate.symbol)!).push(candidate);
  }

  const prepared = symbols.map((symbol) => prepareSymbol(loaded, symbol, bySymbol.get(symbol) ?? []));
  // draws for A0r's checked set only (the census needs no other draws)
  const plans = prepared.map((p) => {
    const plan = drawPlan(
      fast,
      { drawStage: `standalone:${window}` },
      { ...p, libs: { A1: [], A1n: [], A2: [], A3: [] } }
    );

    return { symbol: p.symbol, plan };
  });
  const { results, evaluated } = await evaluateDraws(fast, plans);

  await fast.close();

  const rows: any[] = [];

  for (const [index, p] of prepared.entries()) {
    const symbol = p.symbol;
    const plan = plans[index]!.plan;
    const profile = await readProfile(window, symbol);
    const sealedLibrary = await libraryGridsOf(profile);
    const jnbOf = (c: Candidate) => {
      const list = (plan.get(c.key) ?? []).filter((item) => item.cls === 'N1' && item.index < rules.draws);

      return median(list.map((item) => results.get(`${symbol}|${gridKeyOf(item.grid)}`)!.js));
    };
    const checked = p.a0rChecked.map((c) => ({ c, jnb: jnbOf(c) }));
    const rep = checked.length
      ? [...checked].sort((a, b) => b.jnb - a.jnb || b.c.js - a.c.js || byKey(a.c, b.c))[0]!.c
      : p.all.filter((c) => c.trades >= 1).sort(byJs)[0];
    const credibleRep = checked.length > 0;
    const library: Candidate[] = credibleRep && rep ? [rep] : [];
    const top32 = [...p.credible].sort(byJs).slice(0, rules.narrowLibraryPool);
    const nearDuplicates: string[] = [];

    if (credibleRep && rep) {
      for (const c of top32) {
        if (c.key === rep.key) {
          continue;
        }

        const distinct = library.every(
          (chosen) => jaccardDistance(entrySessions(chosen), entrySessions(c)) >= rules.narrowJaccard
        );

        if (!distinct) {
          nearDuplicates.push(c.key);
        } else if (library.length < rules.narrowLibraryMax) {
          library.push(c);
        }
      }
    }

    // reproduction against the sealed profile
    const sealedRepKey = profile.representative ? gridKeyOf(profile.representative.grid as never) : null;
    const sealedChecked = new Map(profile.neighbourhoodChecked.map((entry) => [entry.grid, entry.median]));
    const jnbMatches = checked.every((entry) => {
      const stored = sealedChecked.get(entry.c.key);

      return stored !== undefined && Math.abs(stored - entry.jnb) < 1e-6;
    });
    const reproduction = {
      representative: (rep?.key ?? null) === sealedRepKey,
      library:
        JSON.stringify(library.map((c) => c.key)) ===
        JSON.stringify(
          sealedLibrary.filter((entry) => entry.role !== 'ranking-representative').map((entry) => entry.key)
        ),
      checkedSet: checked.length === profile.neighbourhoodChecked.length && jnbMatches,
      evaluated: p.all.length === profile.evaluated,
      credible: p.credible.length === profile.credibleVectors
    };

    // families, triggers, old-penalty impact, discarded audit (all training-only)
    const familyOfKey = (key: string) => p.familyIndex.get(key)!;
    const libraryFamilies = new Set(library.map((c) => familyOfKey(c.key)));
    const familyBestT = p.families.map((family) => family.members.map((m) => p.credible[m]!).sort(byT)[0]!).sort(byT);
    const familyBestJs = new Map(
      p.families.map((family) => [family.id, family.members.map((m) => p.credible[m]!).sort(byJs)[0]!])
    );
    const top32Keys = new Set(top32.map((c) => c.key));
    const checkedKeys = new Set(p.a0rChecked.map((c) => c.key));
    // crowding (the earlier, confounded measure, kept and relabelled): a top-4-by-T family with no member in the J_s
    // top 32; the best-trade term itself is measured by the J′ counterfactual (library.ts penaltyDisplaced)
    const topT = familyBestT.slice(0, rules.narrowLibraryMax);
    const crowdedOut = topT.filter((c) => {
      const family = familyOfKey(c.key);
      const anyTop32 = p.families[family]!.members.some((m) => top32Keys.has(p.credible[m]!.key));

      return !libraryFamilies.has(family) && !anyTop32;
    });
    const repT = rep && credibleRep ? familyBestT.findIndex((c) => familyOfKey(c.key) === familyOfKey(rep.key)) : -1;
    const positive = p.all.filter((c) => c.net > 0);
    const discarded = {
      nonPositiveNet: p.all.filter((c) => c.net <= 0).length,
      excessDrawdown: positive.filter((c) => c.dd > study.ddCeiling && c.trades >= minTrades).length,
      lowTradeCount: positive.filter((c) => c.trades < minTrades && c.dd <= study.ddCeiling).length,
      lowTradesAndDrawdown: positive.filter((c) => c.trades < minTrades && c.dd > study.ddCeiling).length,
      credibleOutsideTop32: p.credible.filter((c) => !top32Keys.has(c.key)).length,
      credibleFamiliesOutsideTop32: p.families.filter((family) =>
        family.members.every((m) => !top32Keys.has(p.credible[m]!.key))
      ).length,
      top32NearDuplicates: nearDuplicates.length,
      top32DistinctBeyondCap: top32.filter(
        (c) => !library.some((chosen) => chosen.key === c.key) && !nearDuplicates.includes(c.key) && c.key !== rep?.key
      ).length,
      crowdedOutTopTFamilies: crowdedOut.length,
      bestTradePenaltyDisplacedFamilies: p.penaltyDisplaced.length,
      bestTradePenaltyDisplaced: p.penaltyDisplaced.map((entry) => {
        const c = p.credible.find((candidate) => candidate.key === entry.key)!;

        return {
          key: c.key,
          jPrime: entry.jPrime,
          js: c.js,
          t: c.t,
          net: c.net,
          best: c.best,
          dd: c.dd,
          trades: c.trades,
          familyBestJs: familyBestJs.get(entry.family)!.js
        };
      }),
      drawdownTermOnly: p.credible.filter((c) => c.dd > study.ddPenaltyFrom).length
    };

    rows.push({
      symbol,
      evaluated: p.all.length,
      sobol: p.all.filter((c) => c.stage === 'sobol').length,
      local: p.all.filter((c) => c.stage === 'local').length,
      credible: p.credible.length,
      credibleLocal: p.credible.filter((c) => c.stage === 'local').length,
      uniqueSignatures: new Set(p.credible.map((c) => c.signature)).size,
      families: p.families.length,
      familiesWithSobolSupport: p.families.filter((family) =>
        family.members.some((m) => p.credible[m]!.stage === 'sobol')
      ).length,
      largestFamily: Math.max(0, ...p.families.map((family) => family.members.length)),
      largestFamilyShareOfTop32: (() => {
        const counts = new Map<number, number>();

        for (const c of top32) {
          counts.set(familyOfKey(c.key), (counts.get(familyOfKey(c.key)) ?? 0) + 1);
        }

        return top32.length ? Math.max(...counts.values()) / top32.length : null;
      })(),
      sealed: {
        status: profile.status,
        representative: sealedRepKey,
        library: sealedLibrary.map((entry) => ({ role: entry.role, key: entry.key })),
        libraryFamilies: libraryFamilies.size
      },
      a0r: {
        representative: rep?.key ?? null,
        credibleRepresentative: credibleRep,
        library: library.map((c) => c.key),
        checked: checked.map((entry) => ({ key: entry.c.key, js: entry.c.js, jnb: entry.jnb })),
        survivor: Boolean(credibleRep && rep && checked.find((e) => e.c.key === rep.key)!.jnb > 0 && rep.js > 0)
      },
      reproduction,
      oldPenalty: {
        representativeFamilyRankByT: repT >= 0 ? repT + 1 : null,
        tBestFamilyIsRepresentativeFamily: rep && credibleRep ? repT === 0 : null,
        familiesWithHigherTThanRepresentativeFamily: repT >= 0 ? repT : null,
        representative:
          rep && credibleRep
            ? { net: rep.net, best: rep.best, js: rep.js, t: rep.t, dd: rep.dd, trades: rep.trades }
            : null,
        tBest: familyBestT[0]
          ? {
              key: familyBestT[0].key,
              net: familyBestT[0].net,
              best: familyBestT[0].best,
              js: familyBestT[0].js,
              t: familyBestT[0].t,
              dd: familyBestT[0].dd,
              trades: familyBestT[0].trades,
              inCheckedSet: checkedKeys.has(familyBestT[0].key)
            }
          : null
      },
      discarded,
      triggers: {
        fewFamilies: p.families.length < triggers.minFamilies,
        dominance:
          top32.length > 0 &&
          (() => {
            const counts = new Map<number, number>();

            for (const c of top32) {
              counts.set(familyOfKey(c.key), (counts.get(familyOfKey(c.key)) ?? 0) + 1);
            }

            return Math.max(...counts.values()) / top32.length >= triggers.dominanceShare;
          })()
      }
    });
  }

  const share = (predicate: (row: (typeof rows)[number]) => boolean) => rows.filter(predicate).length / rows.length;

  return writeRecord(target, {
    stage: 'archive-census',
    window,
    fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door,
    candidates: { file: archiveCandidatesFile(window), sha256: await sha256File(archiveCandidatesFile(window)) },
    drawEvaluations: evaluated,
    minTrades,
    summary: {
      symbols: rows.length,
      reproduced: {
        representative: rows.filter((r) => r.reproduction.representative).length,
        library: rows.filter((r) => r.reproduction.library).length,
        checkedSet: rows.filter((r) => r.reproduction.checkedSet).length,
        evaluated: rows.filter((r) => r.reproduction.evaluated).length,
        credible: rows.filter((r) => r.reproduction.credible).length
      },
      triggerFewFamiliesShare: share((r) => r.triggers.fewFamilies),
      triggerDominanceShare: share((r) => r.triggers.dominance),
      medianFamilies: median(rows.map((r) => r.families)),
      etfsWithAtLeast: Object.fromEntries([8, 16, 32, 64].map((k) => [k, rows.filter((r) => r.families >= k).length])),
      bestTradePenaltyDisplacedEtfs: rows.filter((r) => r.discarded.bestTradePenaltyDisplacedFamilies > 0).length,
      crowdedOutEtfs: rows.filter((r) => r.discarded.crowdedOutTopTFamilies > 0).length,
      tBestIsRepresentativeFamily: rows.filter((r) => r.oldPenalty.tBestFamilyIsRepresentativeFamily === true).length
    },
    rows
  });
};
