// Read-only summary of the sealed Stage D records for JOINT_SEARCH_AND_DIVERSITY.md: arm coverage, symbol
// concentration, promoted/assessed ledgers, the picks' memberships and how far each pick vector moved from its
// symbol's standalone phenotypes. Reads only sealed study files; writes nothing.
// Usage (repository root): node research/d1-ranked-preemption/scripts/joint_diversity.mjs
/* global console */
import { readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const root = 'research/d1-ranked-preemption';
const windows = ['fold-a', 'fold-b', 'final'];
const rankings = ['R1', 'R2'];
const B5 = ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'];
const coords = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
];

const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const jaccard = (a, b) => {
  const sa = new Set(a);
  const inter = b.filter((x) => sa.has(x)).length;
  return inter / new Set([...a, ...b]).size;
};
const money = (x) => (x < 0 ? '−$' : '$') + Math.round(Math.abs(x)).toLocaleString('en-US');
const pct = (x) => (100 * x).toFixed(1) + '%';
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// An infeasible draw scores its raw J_pool − 10⁹, so a median below −10⁸ means at least half the draws were
// infeasible; a median near −5 × 10⁸ averages one feasible and one infeasible middle draw.
const fmtJ = (x) =>
  x >= -1e8 ? money(x) : x > -0.75e9 ? 'split (half the draws infeasible)' : 'infeasible majority';

// Standalone phenotypes per window: symbol → [{role, grid}]
const phenotypesOf = (window) => {
  const out = {};
  const dir = `${root}/standalone/${window}/phenotypes`;
  for (const file of readdirSync(dir)) {
    const p = json(`${dir}/${file}`);
    (out[p.symbol] ??= []).push({ role: p.role, grid: p.grid });
  }
  return out;
};
const distance = (a, b) => coords.reduce((sum, c) => sum + Math.abs(a[c] - b[c]), 0);

const picks = {};
for (const window of windows) {
  const phen = phenotypesOf(window);
  for (const ranking of rankings) {
    const record = json(`${root}/results/joint/${window}/${ranking}/JOINT.json`);
    const rows = gunzipSync(readFileSync(`${root}/results/joint/${window}/${ranking}/archive.jsonl.gz`))
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    console.log(`\n## ${window} ${ranking} (body ${record.bodyHash.slice(0, 12)}; universe ${record.universe.length}; budget share ${record.budgetShare})`);
    console.log('| arm | evaluations | feasible | distinct memberships | symbols tried | symbols in ≥ 25% of evaluations | effective symbols | median size | best feasible J_pool |');
    console.log('|---|---:|---:|---:|---:|---|---:|---:|---:|');
    for (const arm of record.arms) {
      const armRows = rows.filter((row) => row.arm === arm.arm);
      const memberships = new Set(armRows.map((row) => row.members.join(' ')));
      const counts = arm.coverage.symbols;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const frequent = Object.entries(counts)
        .filter(([, n]) => n >= 0.25 * arm.evaluations)
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `${s} ${Math.round((100 * n) / arm.evaluations)}%`);
      const effective = 1 / Object.values(counts).reduce((acc, n) => acc + (n / total) ** 2, 0);
      const sizes = [];
      for (const [size, n] of Object.entries(arm.coverage.sizes)) for (let i = 0; i < n; i++) sizes.push(Number(size));
      const bestFeasible = Math.max(...armRows.filter((row) => row.feasible).map((row) => row.score));
      console.log(
        `| ${arm.arm}${arm.nominable ? '' : ' (exploratory)'} | ${arm.evaluations} | ${pct(arm.feasible / arm.evaluations)} | ${memberships.size} | ${Object.keys(counts).length} | ${frequent.join(', ')} | ${effective.toFixed(1)} | ${median(sizes)} | ${money(bestFeasible)} |`
      );
    }
    console.log('\nPromotion and assessment ledger (per arm: promoted 12 → kept 3 → finalist):');
    for (const arm of record.arms) {
      const promoted = arm.promoted;
      const memberships = new Set(promoted.map((p) => p.members.join(' ')));
      const pair = [];
      for (let i = 0; i < promoted.length; i++)
        for (let j = i + 1; j < promoted.length; j++) pair.push(1 - jaccard(promoted[i].members, promoted[j].members));
      console.log(
        `- ${arm.arm}: promoted ${promoted.length} (${memberships.size} distinct memberships, mean pairwise membership Jaccard distance ${(pair.reduce((a, b) => a + b, 0) / Math.max(1, pair.length)).toFixed(2)}; centre J_pool ${money(Math.min(...promoted.map((p) => p.score)))}–${money(Math.max(...promoted.map((p) => p.score)))}; promotion share DD ≤ $35k ${pct(Math.min(...promoted.map((p) => p.promotion.shareDrawdownOk)))}–${pct(Math.max(...promoted.map((p) => p.promotion.shareDrawdownOk)))}).`
      );
      for (const a of arm.assessed)
        console.log(
          `  - kept: ${a.centre.members.join(' ')} — refined by ${money(a.refinedBy)}; J_nbA ${fmtJ(a.promotion.medianScore)}; J_nbB ${fmtJ(a.assessment.medianScore)}; share DD ok ${pct(a.assessment.shareDrawdownOk)}; net p10/p50 ${money(a.assessment.netP10)}/${money(a.assessment.netP50)}; A2 share DD ok ${pct(a.amplitude2.shareDrawdownOk)}${a.centre.key === arm.finalist?.key ? ' ← finalist' : ''}`
        );
    }
    const pick = record.pick;
    const members = pick.books.map((b) => b.symbol);
    picks[`${window}/${ranking}`] = { members, arm: pick.arm };
    console.log(`\nPick D*_${ranking}: arm ${pick.arm}, ${members.length} books — ${members.join(' ')}`);
    console.log('| member | vector origin | nearest standalone phenotype | L1 distance (grid steps) |');
    console.log('|---|---|---|---:|');
    for (const book of pick.books) {
      const options = phen[book.symbol] ?? [];
      let best = { role: 'none', d: Infinity };
      for (const o of options) {
        const d = distance(book.vector.grid, o.grid);
        if (d < best.d) best = { role: o.role, d };
      }
      console.log(`| ${book.symbol} | ${book.vector.origin} | ${best.role} | ${Number.isFinite(best.d) ? best.d : '—'} |`);
    }
  }
}
console.log('\n## Membership overlap of the picks (Jaccard similarity)');
console.log('| pick | vs B5 | vs the other ranking (same window) | vs the same ranking in the previous window |');
console.log('|---|---:|---:|---:|');
for (const [i, window] of windows.entries())
  for (const ranking of rankings) {
    const p = picks[`${window}/${ranking}`].members;
    const other = picks[`${window}/${ranking === 'R1' ? 'R2' : 'R1'}`].members;
    const prev = i > 0 ? picks[`${windows[i - 1]}/${ranking}`].members : null;
    console.log(`| ${window} ${ranking} | ${jaccard(p, B5).toFixed(2)} | ${jaccard(p, other).toFixed(2)} | ${prev ? jaccard(p, prev).toFixed(2) : '—'} |`);
  }
