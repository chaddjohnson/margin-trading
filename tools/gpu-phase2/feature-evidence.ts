// gpu-phase2: renders the parity evidence per capability (Markdown tables for GPU_PHASE2_FEATURE_MATRIX.md) from a
// campaign summary: candidates exercising each capability bit, exit reasons and entry kinds by book type, Growth
// structures covered (of 8,640), doors/windows and option sets. Read-only.
//   node --experimental-transform-types tools/gpu-phase2/feature-evidence.ts research/gpu-phase2/results/parity/final/SUMMARY.json
import fs from 'node:fs';
import { FEATURE } from '../../src/gpu-backend/layout.ts';

const s = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8'));
const t = s.totals;
const fmt = (n: number) => n.toLocaleString('en-US');
const out: string[] = [];

out.push(`Campaign: ${t.runs} runs, ${fmt(t.subjects)} candidates, ${fmt(t.identical)} identical, ${fmt(t.mismatches)} mismatches; ${fmt(t.randomGenomes)} seeded random genomes; ${t.growthStructuresCovered} of 8,640 Growth structures; ${fmt(t.trades)} virtual trades, ${fmt(t.lots)} funded lots, ${fmt(t.fundingRecords)} funding records, ${fmt(t.partialFills)} partial fills.`);
out.push('', '| Capability bit | Candidates exercising it |', '|---|---:|');
for (const k of Object.keys(FEATURE)) {
  const n = t.features[k] ?? 0;

  if (n || BigInt(FEATURE[k as keyof typeof FEATURE]) < 1n << 36n) out.push(`| \`${k}\` | ${n ? fmt(n) : '—'} |`);
}
out.push('', '| Exit reason (book type) | Fills |', '|---|---:|');
for (const [k, v] of Object.entries(t.exitReasons as Record<string, number>).sort()) out.push(`| ${k.replace('G::', 'Growth: ').replace('D1:', 'D1: ')} | ${fmt(v)} |`);
out.push('', '| Entry kind (book type) | Trades |', '|---|---:|');
for (const [k, v] of Object.entries(t.entryKinds as Record<string, number>).sort()) out.push(`| ${k.replace('G::', 'Growth: ').replace('D1:', 'D1: ')} | ${fmt(v)} |`);
out.push('', `Doors and windows: ${t.doors.join(', ')}.`, '', `Option sets: ${t.optionSets.join(', ')}.`);
console.log(out.join('\n'));
