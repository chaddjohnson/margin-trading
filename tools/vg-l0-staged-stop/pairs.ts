// Declared pair sets for the report-only CPU diagnostics (diagnose.ts), built from sealed records only:
//   pairs ablation --out <json>             each valid ablation point against its incumbent with staged OFF (base friction)
//   pairs selection --cutoff C --out <json> each ON EXP lane representative against its own all-OFF projection, and the
//                                           EXP pooled primary against the CTRL pooled primary
//   pairs decomposition --out <json>        per incumbent and finalist: incumbent OFF → incumbent + finalist's staged genes,
//                                           finalist all-OFF → finalist (the A/B/C rows)
import fs from 'node:fs';
import { benchmarks } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { type CutoffKey } from '../../src/vg-l0-staged-stop/context.ts';
import { selectionFile } from '../../src/vg-l0-staged-stop/doors.ts';
import { ablationPoints, decompositionFile, qualificationFile } from '../../src/vg-l0-staged-stop/stages.ts';
import { readSealed } from '../../src/vg-l0-staged-stop/records.ts';
import { type PCfg, withStaged } from '../../src/vg-l0-staged-stop/space.ts';
import type { Evidence } from '../../src/vg-l0-staged-stop/qualify.ts';
import type { Pair } from './diagnose.ts';

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);
const mode = args[1];
const pairs: Pair[] = [];

if (mode === 'ablation') {
  for (const p of ablationPoints()) {
    if (!p.staged || p.duplicateOf) continue;

    const inc = benchmarks().find((b) => b.key === p.incumbent)!;

    pairs.push({ label: p.label, a: inc.cfg, b: withStaged(inc.cfg, p.staged) });
  }
} else if (mode === 'selection') {
  const cut = opt('cutoff') as CutoffKey;
  const sel = readSealed<{ laneValues: { EXP: { lane: string; representative: { id: string; label: string; stagedPattern: string } | null; offProjection: { id: string } | null }[] }; pooled: Record<'CTRL' | 'EXP', { primary: { id: string; label: string } | null }> }>(selectionFile(cut));
  const ev = new Map(readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence.map((e) => [e.id, e]));
  const cfg = (id: string) => ev.get(id)!.cfg as PCfg;

  for (const v of sel.laneValues.EXP)
    if (v.representative && v.offProjection) pairs.push({ label: `${v.lane}: all-OFF projection → representative (${v.representative.stagedPattern})`, a: cfg(v.offProjection.id), b: cfg(v.representative.id) });
  if (sel.pooled.CTRL.primary && sel.pooled.EXP.primary)
    pairs.push({ label: `${cut}: CTRL pooled primary → EXP pooled primary`, a: cfg(sel.pooled.CTRL.primary.id), b: cfg(sel.pooled.EXP.primary.id) });
} else if (mode === 'decomposition') {
  const d = readSealed<{ rows: { label: string; kind: string; incumbent: string | null; finalist: string | null; id: string }[]; evidence: Evidence[] }>(decompositionFile);
  const ev = new Map(d.evidence.map((e) => [e.id, e]));
  const row = (kind: string, inc: string | null, fin: string | null) => d.rows.find((r) => r.kind === kind && r.incumbent === inc && r.finalist === fin);

  for (const fin of [...new Set(d.rows.map((r) => r.finalist).filter((x): x is string => !!x))]) {
    for (const b of benchmarks()) {
      const off = row('incumbent', b.key, null)!;
      const plus = row('incumbent + finalist staged', b.key, fin);

      if (plus) pairs.push({ label: `${b.key} OFF → ${b.key} + ${fin} staged genes`, a: ev.get(off.id)!.cfg as PCfg, b: ev.get(plus.id)!.cfg as PCfg });
    }

    const f = row('finalist', null, fin)!;
    const fo = row('finalist all OFF', null, fin)!;

    pairs.push({ label: `${fin}: all-OFF projection → finalist`, a: ev.get(fo.id)!.cfg as PCfg, b: ev.get(f.id)!.cfg as PCfg });
  }
} else throw new Error('pairs ablation | selection --cutoff C | decomposition --out <json>');

fs.writeFileSync(opt('out')!, `${JSON.stringify(pairs)}\n`);
console.log(`pairs ${mode}: ${pairs.length}`);
