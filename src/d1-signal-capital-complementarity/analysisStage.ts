// Stage 6a: the frozen rubric (PROTOCOL.md §9) applied to the sealed Level D and Level C records: flags, the ordered
// labels per ETF × baseline × view, the counting replays and the overall verdict, with k-of-n reporting.
import fs from 'fs-extra';
import { type BaselineKey, baselines, levelD, members, nowIso, resultFile, rubric, study } from './context.ts';
import { readUniverseRecord, universeSymbols } from './doors.ts';
import { refuseOverrides, requireCodeFrozen, requireProtected } from './freeze.ts';
import type { SymbolSummary } from './leveld.ts';
import { leveldFile } from './leveldStage.ts';
import { readGz, readSealed, writeRecord } from './records.ts';
import { replaysFile } from './replayStage.ts';
import { riskFile } from './riskStage.ts';
import { designerSeen } from './stages.ts';

export const analysisFile = resultFile('analysis', 'ANALYSIS.json');

// The analysis written under code freeze v (v ≥ 2: a correction amendment's rerun; earlier records are kept).
export const analysisFileOf = (version: number) =>
  version === 1 ? analysisFile : resultFile('analysis', `ANALYSIS-${version}.json`);

interface ReplayResult {
  item: {
    id: string;
    baseline: BaselineKey;
    view: string;
    fold: string;
    role: string;
    candidate: string;
    kind: string;
  };
  summary: {
    costs: { cost: string; baseline: number; scenario: number; delta: number }[];
    attribution: {
      delta: number;
      parts: Record<string, number>;
      complementShare: number | null;
      deltaWithoutLargest: number;
      largestScenarioOnlyShare: number;
      worstOwnLotInWindow: number | null;
      firstOrder: { delta: number };
      signAgreement: boolean;
      byRegime: Record<string, number>;
      candidateClasses: Record<string, number>;
    };
    risk: { scenarioMinuteDD: number; baselineMinuteDD: number };
    portfolio: {
      core: { windowedDailyPercentDrawdown: number };
      baseline: { windowedDailyPercentDrawdown: number };
      scenario: { windowedDailyPercentDrawdown: number };
    };
  };
}

export const replayFlags = (result: ReplayResult, nc?: ReplayResult) => {
  const delta = (cost: string) => result.summary.costs.find((item) => item.cost === cost)!.delta;
  const attribution = result.summary.attribution;
  const worst = attribution.worstOwnLotInWindow;
  const materialityFloor = Math.max(5000, worst !== null ? -Math.min(worst, 0) : 0);
  const allCostsPositive = ['0', '2', '5', '10'].every((cost) => delta(cost) > 0);
  const material = delta('5') >= materialityFloor;
  const ownClean = attribution.parts.candidateIdleClean ?? 0;
  const complementType = delta('5') > 0 && ownClean > 0 && ownClean / delta('5') >= rubric.complementShare;
  // Not thin (PROTOCOL.md v2.1 §9.1): neither one lot nor one G-regime carries the whole ΔV@5.
  const largestRegime = Math.max(0, ...Object.values(attribution.byRegime));
  const notThin = attribution.deltaWithoutLargest > 0 && delta('5') - largestRegime > 0;
  const beatsNc =
    !nc || result.item.role === 'NC' || delta('5') > nc.summary.costs.find((item) => item.cost === '5')!.delta;
  const C = allCostsPositive && material && complementType && notThin && beatsNc;
  const portfolio = result.summary.portfolio;
  const coreLimited = portfolio.core.windowedDailyPercentDrawdown > rubric.portfolioConditional;
  const portfolioOk = coreLimited
    ? portfolio.scenario.windowedDailyPercentDrawdown <=
      portfolio.baseline.windowedDailyPercentDrawdown + rubric.coreLimitedSlack
    : portfolio.scenario.windowedDailyPercentDrawdown <= rubric.portfolioConditional;
  const R = result.summary.risk.scenarioMinuteDD <= rubric.ddReference && portfolioOk;

  return {
    id: result.item.id,
    candidate: result.item.candidate,
    baseline: result.item.baseline,
    view: result.item.view,
    fold: result.item.fold,
    role: result.item.role,
    deltas: Object.fromEntries(result.summary.costs.map((item) => [item.cost, item.delta])),
    allCostsPositive,
    materialityFloor,
    material,
    complementShare: attribution.complementShare,
    complementType,
    notThin,
    largestRegimeShare: largestRegime,
    beatsNc,
    C,
    // Correction C1: `pool-path gain (reshuffle)` = a positive ΔV@5 failing only the complement test (PROTOCOL §9.1).
    reshuffleGain: delta('5') > 0 && allCostsPositive && material && notThin && beatsNc && !complementType,
    thinPositive: allCostsPositive && material && complementType && beatsNc && !notThin,
    coreLimited,
    portfolioPreferred: portfolio.scenario.windowedDailyPercentDrawdown <= rubric.portfolioPreferred,
    R,
    firstOrderDelta: attribution.firstOrder.delta,
    fullPathDelta: attribution.delta,
    signAgreement: attribution.signAgreement
  };
};

type Flags = ReturnType<typeof replayFlags>;

export const labelOf = (
  summary: SymbolSummary | undefined,
  baseline: BaselineKey,
  view: 'U' | 'P-A' | 'P-B',
  replays: readonly Flags[],
  positiveOffShock: boolean
) => {
  const qualifiers: string[] = [];
  const floor = view === 'U' ? rubric.minDecisionsU : rubric.minDecisionsP;

  if (!summary || members[baseline].includes(summary.symbol) || !summary.member || summary.decisions < floor) {
    return {
      label: 'not evaluable / insufficient',
      qualifiers:
        summary && members[baseline].includes(summary.symbol)
          ? ['member of the baseline']
          : !summary?.member
            ? ['no vector']
            : ['too few decisions']
    };
  }

  const T = summary.idleClean.count >= rubric.minClean && summary.independentIdleClean >= rubric.minIndependent;
  const E = summary.idleClean.count > 0 && summary.idleClean.net > 0;
  const breadth = summary.independentIdleCleanPositive >= rubric.minIndependent;

  if (!breadth) {
    qualifiers.push('thin');
  }

  if (!positiveOffShock) {
    qualifiers.push('shock-only');
  }

  // Correction C1: every fold replay of this ETF in this view informs its label, negative controls included (only the
  // verdict excludes NC, PROTOCOL §9.3); in-sample replays never do.
  const own = replays.filter((flags) => flags.candidate === summary.symbol && flags.role !== 'in-sample');
  const levelD = () => {
    if (summary.idleClean.count < rubric.minClean) {
      return summary.all.net > 0 && (summary.positiveNetShareCompeting ?? 0) >= rubric.competingShare
        ? 'economically interesting but mostly competing'
        : 'coincident only';
    }

    if (summary.independentIdleClean < rubric.minIndependent) {
      return 'insufficient (single idle-clean event)';
    }

    if (!E) {
      return 'asynchronously timed but uneconomic';
    }

    return 'exploratory marginal complement (Level D only)';
  };

  if (own.length > 0) {
    const folds = [...new Set(own.map((flags) => flags.fold))];
    const passing = folds.filter((fold) => own.some((flags) => flags.fold === fold && flags.C));

    if (folds.length === 1) {
      qualifiers.push('single-fold');
    }

    if (own.some((flags) => flags.C && !flags.R)) {
      qualifiers.push('risk-incompatible');
    }

    if (passing.length === folds.length) {
      return { label: 'exploratory marginal complement', qualifiers };
    }

    if (passing.length > 0) {
      return { label: 'exploratory marginal complement — regime-dependent', qualifiers };
    }

    if (own.some((flags) => flags.reshuffleGain)) {
      return { label: 'economically interesting but mostly competing (reshuffle)', qualifiers: [] };
    }

    const d = levelD();

    return {
      label:
        d === 'exploratory marginal complement (Level D only)'
          ? 'economically interesting but mostly competing (full path not counting)'
          : d,
      qualifiers: []
    };
  }

  void T;

  return {
    label: levelD(),
    qualifiers: levelD().startsWith('exploratory')
      ? qualifiers
      : qualifiers.filter((q) => q !== 'thin' && q !== 'shock-only')
  };
};

export const stageAnalysis = async () => {
  refuseOverrides();

  const { protocol, code, version } = await requireCodeFrozen();
  const file = analysisFileOf(version);

  await requireProtected();

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists`);
  }

  const startedAt = nowIso();
  const leveld = await readSealed<
    { payloads: Record<string, { file: string; sha256: string }> } & { bodyHash: string }
  >(leveldFile);
  const replays = await readSealed<{ results: ReplayResult[] } & { bodyHash: string }>(replaysFile);
  const risk = await readSealed(riskFile);
  const universe = await readUniverseRecord();
  const symbols = await universeSymbols();

  // Flags of every replay (NC per cell for the beat-NC test).
  const fold = replays.results.filter((result) => result.item.kind === 'fold');
  const flags = fold.map((result) => {
    const nc = fold.find(
      (other) =>
        other.item.role === 'NC' &&
        other.item.baseline === result.item.baseline &&
        other.item.view === result.item.view &&
        other.item.fold === result.item.fold
    );

    return replayFlags(result, nc && nc !== result ? nc : undefined);
  });
  const others = replays.results.filter((result) => result.item.kind !== 'fold').map((result) => replayFlags(result));

  // Labels per view.
  const views: { view: 'U' | 'P-A' | 'P-B'; key: string }[] = [
    { view: 'U', key: 'U-T' },
    { view: 'P-A', key: 'P-A-A' },
    { view: 'P-B', key: 'P-B-B' }
  ];
  const labels: Record<string, Record<string, Record<string, unknown>>> = {};

  for (const { view, key } of views) {
    const analysis = await readGz<{ perBaseline: Record<string, { summaries: SymbolSummary[] }> }>(
      leveld.payloads[key]!.file,
      leveld.payloads[key]!.sha256
    );

    labels[view] = {};

    for (const baseline of baselines) {
      labels[view]![baseline] = {};

      const viewReplays = flags.filter(
        (item) => item.baseline === baseline && (view === 'U' ? item.view === 'U' : item.view === view)
      );

      for (const symbol of symbols) {
        const summary = analysis.perBaseline[baseline]!.summaries.find((item) => item.symbol === symbol);
        const positiveOffShock = (summary?.idleCleanPositiveOffShock ?? 0) > 0;
        const label = labelOf(summary, baseline, view, viewReplays, positiveOffShock);

        labels[view]![baseline]![symbol] = {
          ...label,
          designerSeen: designerSeen.includes(symbol),
          category: universe.symbols[symbol]!.category,
          f7: study.f7.includes(symbol),
          decisions: summary?.decisions ?? 0,
          idleClean: summary?.idleClean.count ?? 0,
          idleCleanNet: summary?.idleClean.net ?? 0,
          independentIdleClean: summary?.independentIdleClean ?? 0,
          independentIdleCleanPositive: summary?.independentIdleCleanPositive ?? 0
        };
      }
    }
  }

  // The overall verdict (PROTOCOL.md §9.3).
  const counting = flags.filter((item) => item.role !== 'NC' && item.C && item.R);
  const thinOnly = flags.filter((item) => item.role !== 'NC' && item.thinPositive && item.R);
  const byEtf = new Map<string, Flags[]>();

  for (const item of counting) {
    const key = `${item.baseline}|${item.view.startsWith('P') ? 'P' : 'U'}|${item.candidate}`;

    byEtf.set(key, [...(byEtf.get(key) ?? []), item]);
  }

  const bothFolds = [...byEtf.entries()]
    .filter(([, items]) => new Set(items.map((item) => item.fold)).size === 2)
    .map(([key]) => {
      const [baseline, view, candidate] = key.split('|') as [BaselineKey, string, string];
      const viewKey = view === 'U' ? 'U' : 'P-B';
      const label = labels[viewKey]?.[baseline]?.[candidate] as { qualifiers: string[] } | undefined;

      return {
        baseline,
        view,
        candidate,
        category: universe.symbols[candidate]!.category,
        offShock: !(label?.qualifiers ?? []).includes('shock-only')
      };
    })
    .filter((item) => item.offShock);
  let several = false;

  for (const baseline of baselines) {
    for (const view of ['U', 'P']) {
      const group = bothFolds.filter((item) => item.baseline === baseline && item.view === view);

      if (new Set(group.map((item) => item.category)).size >= 2) {
        several = true;
      }
    }
  }

  const allDesignerSeen = counting.length > 0 && counting.every((item) => designerSeen.includes(item.candidate));
  const verdict = several
    ? 'several credible exploratory complements'
    : counting.length > 0
      ? 'limited / regime-dependent exploratory complementarity'
      : thinOnly.length > 0
        ? 'inconclusive'
        : 'no demonstrated economically useful complementarity';
  const k = (test: (item: Flags) => boolean) => flags.filter(test).length;

  return writeRecord(file, {
    stage: 'analysis',
    codeFreezeVersion: version,
    supersedes: version > 1 ? analysisFileOf(version - 1) : null,
    startedAt,
    finishedAt: nowIso(),
    guard: { protocolFreeze: protocol.bodyHash, codeFreeze: code.bodyHash },
    inputs: { leveld: leveld.bodyHash, replays: replays.bodyHash, risk: (risk as { bodyHash: string }).bodyHash },
    replayFlags: flags,
    otherReplayFlags: others,
    kOfN: {
      replays: flags.length,
      allCostsPositive: k((item) => item.allCostsPositive),
      material: k((item) => item.material),
      complementType: k((item) => item.complementType),
      notThin: k((item) => item.notThin),
      C: k((item) => item.C),
      R: k((item) => item.R),
      CandR: k((item) => item.C && item.R),
      reshuffleGains: k((item) => item.reshuffleGain),
      signAgreementFirstOrderVsFullPath: k((item) => item.signAgreement),
      ncMeetingC: flags.filter((item) => item.role === 'NC' && item.C).map((item) => item.id)
    },
    counting: counting.map((item) => item.id),
    thinOnly: thinOnly.map((item) => item.id),
    bothFolds,
    verdict,
    verdictQualifiers: allDesignerSeen ? ['all counting replays designer-seen'] : [],
    labels,
    familyWindow: levelD.familyWindow
  });
};
