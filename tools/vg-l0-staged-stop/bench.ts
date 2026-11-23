// E5: the benchmark of the accepted binary for Priority 4 (PROTOCOL.md §6, §15) — NON-OFFICIAL (purpose benchmark), on
// the engineering door D24 before the freeze, with BENCHMARK seed keys (`BENCH/broad/<cell>/R<r>`, never the study's): 8
// full broad lanes (both cells × 2 replicates × CTRL / EXP) run concurrently in one Lab exactly as the official search
// runs its 128, the arm's own lane bound. It measures throughput and the requested evaluations per lane by arm; it
// selects nothing, and its lanes are never candidates. Timings never select anything.
//   GPU_POLICY_PURPOSE=benchmark npm run vg-l0ss-bench -- --out research/vg-l0-staged-stop/results/engineering/E5/bench.json
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { type ArmKey, armKeys, cells, cutoffKeys, cutoffs } from '../../src/vg-l0-staged-stop/context.ts';
import { broadSchedule, finishReserve, laneCaps, perMember, perSubject } from '../../src/vg-l0-staged-stop/budget.ts';
import { broadSpecOf, runLanes } from '../../src/vg-l0-staged-stop/jobs.ts';
import { arms } from '../../src/vg-l0-staged-stop/stages.ts';
import { codeDigest, headCommit } from '../../src/vg-l0-staged-stop/records.ts';
import { openToolLab, purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1]!;
const purpose = purposeOf(['benchmark']);
const reps = [9001, 9002];
const plan = cells.flatMap((c) => reps.flatMap((r) => armKeys.map((a) => ({ spec: broadSpecOf('BENCH', c, r), arm: arms[a] }))));
const bound = (a: ArmKey) => laneCaps.broad[a];
const cap = plan.reduce((s, p) => s + bound(p.arm.key), 0);
const t = await openToolLab({ door: 'D24', use: 'engineering', area: 'bench', job: `bench-${Date.now()}`, purpose });
const t0 = Date.now();
const { results } = await runLanes(t.lab, plan, broadSchedule, bound, cap, finishReserve, 'bench');
const wall = (Date.now() - t0) / 1000;

await t.close();

const requested = results.reduce((a, r) => a + r.result.requested, 0);
const rate = requested / wall;
const sessions = (d: string) => (doorSpecs as Record<string, { sessions: number }>)[d]!.sessions;
const perLane = Object.fromEntries(
  armKeys.map((a) => {
    const xs = results.filter((r) => r.arm === a).map((r) => r.result.requested);

    return [a, { lanes: xs.length, mean: xs.reduce((s, x) => s + x, 0) / xs.length, max: Math.max(...xs), min: Math.min(...xs), stops: results.filter((r) => r.arm === a).map((r) => r.result.extension.stop) }];
  })
) as Record<ArmKey, { mean: number; max: number }>;
// the forecast per cutoff: 64 lanes per arm at the measured mean (worst case: the cap), the rate scaled by door sessions
// (D24's measured rate × sessions(D24) / sessions(door)), the union qualification (≤ 3 members per lane + projections)
const forecast = Object.fromEntries(
  cutoffKeys.map((c) => {
    const door = cutoffs[c].door;
    const r = (rate * sessions('D24')) / sessions(door);
    const expected = 64 * (perLane.CTRL.mean + perLane.EXP.mean);
    const worst = 64 * (laneCaps.broad.CTRL + laneCaps.broad.EXP);
    const members = 128 * 3 * 1.5;

    return [c, { door, rate: Math.round(r), expectedSearch: Math.round(expected), worstSearch: worst, searchSeconds: Math.round(expected / r), qualifyRequested: Math.round(members * perMember()), intervalRequested: 200 * perSubject() }];
  })
);
const record = {
  kind: 'Priority 4 E5 benchmark (non-official, benchmark seeds; never candidates)',
  purpose,
  head: headCommit(),
  codeDigest: codeDigest(),
  backend: t.backendId,
  door: 'D24',
  lanes: plan.map((p) => `${p.arm.key} ${p.spec.key}`),
  requested,
  wallSeconds: Math.round(wall * 10) / 10,
  rate: Math.round(rate),
  perLane,
  forecast,
  pass: results.length === plan.length && results.every((r) => r.result.requested <= bound(r.arm)),
  finished: new Date().toISOString()
};

writeJson(out, record);
console.log(JSON.stringify({ requested, wall: record.wallSeconds, rate: record.rate, perLane: Object.fromEntries(armKeys.map((a) => [a, Math.round(perLane[a].mean)])), pass: record.pass }));
