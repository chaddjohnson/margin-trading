// Descriptive drivers of the standalone neighbourhoods (Priority 5A, after stage S; read-only): per standalone book, the
// rank association (Spearman's ρ) of each active input's Latin-hypercube offset u with the draw's net and DD over the 384
// confirmation draws (u reconstructed from the frozen seeds), the breach share by u tercile, and the centre's funded
// ledger (which trades make its development net). Text and tables only.
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-growth-funding-lifecycle/standalone-drivers.ts
import fs from 'node:fs';
import path from 'node:path';
import { numericGenes, structureOf } from '../../src/growth140-vgt-stable/space.ts';
import { spearman } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { resultsDir } from '../../src/vg-growth-funding-lifecycle/context.ts';
import { standaloneUnits } from '../../src/vg-growth-funding-lifecycle/instruments.ts';
import { readJson, usd, verifySeals } from '../../src/vg-growth-funding-lifecycle/records.ts';
import { stageFiles } from '../../src/vg-growth-funding-lifecycle/stages.ts';
import { loadSubjects } from '../../src/vg-growth-funding-lifecycle/subjects.ts';

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

if (verifySeals().failed.length) throw new Error('sealed records changed');

const S: Any = readJson(stageFiles.S);
const C: Any = readJson(stageFiles.C);
const subjects = loadSubjects();
const parts: string[] = [];

for (const k of ['SG', 'S4', 'S85']) {
  const s = subjects.find((x) => x.key === k)!;
  const sym = s.enabled[0]!.slice(2) as 'GDX' | 'VGT';
  const st = structureOf(s.quad.g[sym]);
  const draws: Any[] = S.subjects[k].families.confirm.draws;
  const u = (d: Any, col: number) => standaloneUnits('confirm', d.rep)[d.row]![col]!;
  const rows = numericGenes
    .map((g, col) => ({ g, col }))
    .filter(({ g }) => g.active(st))
    .map(({ g, col }) => {
      const xs = draws.map((d) => u(d, col));
      const third = (pred: (v: number) => boolean) => {
        const sel = draws.filter((d) => pred(u(d, col)));

        return sel.length ? `${((sel.filter((d) => d.dd > 35_000).length / sel.length) * 100).toFixed(0)}%` : '—';
      };

      return {
        key: g.key,
        centre: s.quad.g[sym][g.key],
        rhoNet: spearman(xs, draws.map((d) => d.net)),
        rhoDd: spearman(xs, draws.map((d) => d.dd)),
        low: third((v) => v < -1 / 3),
        mid: third((v) => v >= -1 / 3 && v <= 1 / 3),
        high: third((v) => v > 1 / 3)
      };
    })
    .sort((a, b) => Math.max(Math.abs(b.rhoNet), Math.abs(b.rhoDd)) - Math.max(Math.abs(a.rhoNet), Math.abs(a.rhoDd)));
  const ledger: Any[] = C.centres[k].modes.L0.detail.ledger;
  const lots = draws.map((d) => d.lots).sort((a, b) => a - b);

  parts.push(
    [
      `## ${k} — ${s.label}`,
      `Draws ${draws.length}; funded lots per draw: median ${lots[Math.floor(lots.length / 2)]}, range ${lots[0]}–${lots.at(-1)} (centre ${ledger.length}).`,
      '| Input | Centre | ρ(u, net) | ρ(u, DD) | Breach share u < −⅓ | \\|u\\| ≤ ⅓ | u > ⅓ |',
      '|---|---:|---:|---:|---:|---:|---:|',
      ...rows.slice(0, 8).map((r) => `| ${r.key} | ${r.centre} | ${r.rhoNet.toFixed(3)} | ${r.rhoDd.toFixed(3)} | ${r.low} | ${r.mid} | ${r.high} |`),
      '',
      `The development centre's funded ledger (${usd(C.centres[k].modes.L0.rec.net)}):`,
      '',
      '| Entry | Source | Entry price | Exit | Reason | Net |',
      '|---|---|---:|---|---|---:|',
      ...ledger.map((l) => `| ${l.entryDate} | ${l.source} | ${l.entryRaw} | ${l.exits.at(-1)?.date ?? 'open'} | ${l.exits.at(-1)?.reason ?? '—'} | ${usd(l.net)} |`)
    ].join('\n')
  );
}

fs.writeFileSync(
  path.join(resultsDir, 'tables', 'standalone-drivers.md'),
  `# Standalone neighbourhoods: input associations and the centres' trades (descriptive)\n\nSpearman's ρ between an input's offset u and the draw's net or DD over the 384 confirmation draws of the common instrument (u from the frozen seeds), the share of draws above $35,000 DD by u tercile (top 8 inputs by |ρ|), and each centre's funded development ledger. Associations in one multivariate sample on 2016–2024, not causal effects or probabilities.\n\n${parts.join('\n\n')}\n`
);
console.log('written results/tables/standalone-drivers.md');
