// Pre-freeze diagnostics on the development window only (sessions up to 2023-12-31). They don't take part
// in any selection: the controls (the incumbent and the deep-dip family) are scored with exactly the
// selection policy's gates and neighbourhood merit, to show where they would have ranked.
import fs from 'fs-extra';
import path from 'node:path';
import { paramsToGenome } from '../optimizer/params.ts';
import { defaultDataFile, loadSessions, researchDataset, sha256File } from './data.ts';
import { resultsRoot } from './experiment.ts';
import { minimumTrades } from './fitness.ts';
import { controls, minuteParameterSpace } from './params.ts';
import { LocalEvaluator } from './pool.ts';
import { loadExperiment } from './report.ts';
import { MinuteCandidateCache } from './search.ts';
import { baseGates, selectionDrawdown, selectionNet } from './selection.ts';

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const controlDiagnostics = async (id: string, log: (line: string) => void) => {
  const loaded = await loadExperiment(id);
  const { config, final } = loaded;
  const sessions = (await loadSessions(defaultDataFile)).filter(
    (session) => session.date <= config.protocol.researchEnd
  );
  const dataset = researchDataset(sessions, await sha256File(defaultDataFile), config.protocol.researchEnd);
  const evaluator = new LocalEvaluator();

  evaluator.register(dataset);

  const window = {
    historyStart: final.window.historyStart,
    startIndex: final.window.startIndex,
    endIndex: final.window.endIndex
  };
  const cache = new MinuteCandidateCache(
    evaluator,
    dataset.id,
    window,
    config.settings,
    minuteParameterSpace,
    config.fitness,
    final.window.years
  );
  const results = [];

  for (const control of controls) {
    const genome = paramsToGenome(minuteParameterSpace, control.params);
    const [candidate] = await cache.evaluate([genome], [{ stage: 'control' }]);
    const neighbours = await cache.neighbours(candidate!);
    const perturbed = await cache.perturbations(candidate!, config.selection.perturbations);
    const all = [candidate!, ...neighbours, ...perturbed];
    const nets = all.map((member) => selectionNet(member.metrics, config.fitness));
    const drawdowns = [candidate!, ...neighbours].map((member) => selectionDrawdown(member.metrics, config.fitness));
    const merit = quantile(nets, 0.25);
    const gates = {
      ...baseGates(candidate!.metrics, config.fitness, final.window.years, config.selection),
      neighbourhoodDrawdown: quantile(drawdowns, 0.5) <= config.fitness.drawdownLimit * config.fitness.allocation
    };
    const betterRanked = final.selection.rankedTop.filter((entry) => entry.merit > merit).length;

    results.push({
      id: control.id,
      params: control.params,
      gates,
      passesAll: Object.values(gates).every(Boolean),
      minimumTrades: minimumTrades(config.fitness, final.window.years),
      net: selectionNet(candidate!.metrics, config.fitness),
      minuteDrawdown: selectionDrawdown(candidate!.metrics, config.fitness),
      merit,
      netMedian: quantile(nets, 0.5),
      netMin: Math.min(...nets),
      neighbourNetMin: Math.min(...neighbours.map((member) => selectionNet(member.metrics, config.fitness))),
      drawdownMedian: quantile(drawdowns, 0.5),
      drawdownMax: Math.max(...drawdowns),
      feasibleShare: all.filter((member) => member.violation === 0).length / all.length,
      wouldRankAfter: betterRanked,
      rankedTopSize: final.selection.rankedTop.length
    });
    log(`${control.id}: merit $${Math.round(merit)}, passes all gates: ${Object.values(gates).every(Boolean)}`);
  }

  const file = path.join(resultsRoot(id), final.runId, 'control-diagnostics.json');

  await fs.writeFile(file, `${JSON.stringify({ window: final.window, results }, null, 1)}\n`);
  await evaluator.close();

  return results;
};
