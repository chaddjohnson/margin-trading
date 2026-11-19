// Report tables for research/optimization-process-audit (Markdown only, from the sealed records; standard 2.0.0 §7.7).
// Outside the pinned code closure (tools/). Run from the repository root:
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/optimization-process-audit/tables.ts
import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(import.meta.dirname, '../..');
const S = path.join(R, 'research', 'optimization-process-audit');
const out = path.join(S, 'results', 'tables');
const J = <T>(p: string) => JSON.parse(fs.readFileSync(path.join(S, p), 'utf8')) as T;
// biome-ignore lint: report tool reads loosely typed sealed JSON
type A = any;

const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n0 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : x.toLocaleString('en-US'));
const pc = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`);
const short = (l: string | null) => (l ? l.replace(/^C\d\d\/(indep\/)?/, '') : 'no selection');
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i === 0 || /label|policy|stratum|feature|member|choice|kind|stage|cell|subject|gate|what|window|role/i.test(h) ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n');
const write = (name: string, title: string, body: string[]) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\nGenerated from the sealed records by \`tools/optimization-process-audit/tables.ts\`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.\n\n${body.join('\n\n')}\n`);
};

const inv = J<A>('results/stage1/inventory.json');
const rep = J<A>('results/stage1/reproduction.json');
const g7 = J<A>('results/stage1/g7-recheck.json');
const mech = J<A>('results/stage1/mechanism.json');
const freeze = J<A>('results/stage2/POLICY_FREEZE.json');
const choices = J<A>('results/stage3/CHOICES.json');
const outcomes = J<A>('results/stage3/outcomes.json');
const an = J<A>('results/stage3/analysis.json');
const c24 = J<A>('results/stage4/C24_FREEZE.json');
const subjects = ['3B', '4A'];
const hist = ['C19', 'C21', 'C23'];
const sliceOf: Record<string, string> = { C19: '2020–2021', C21: '2022–2023', C23: '2024' };

// ----- funnel -----
{
  const rows: (string | number)[][] = [];
  const stage: (string | number)[][] = [];

  for (const s of subjects)
    for (const c of hist) {
      const f = inv.subjects[s].cuts[c].funnel;
      const q = inv.subjects[s].cuts[c].independentSet;

      rows.push([`${s} ${c}`, n0(f.fitted), n0(f.plausible), n0(f.feasible), n0(f.distinctLedgers.feasible), n0(f.lanes.r2), n0(f.lanes.r3), n0(f.lanes.shortlisted), n0(q.qualified)]);
      for (const [k, v] of Object.entries<A>(f.byStage))
        stage.push([`${s} ${c}`, `${k}: ${v.label}`, n0(v.n), n0(v.distinctLedgers), usd(v.net.p50), usd(v.net.max), v.topEpisodeShare.p50 ?? '—', usd(v.exBestYear.p50), usd(v.r1Robust.p50), usd(v.r1P90Dd.p50)]);
    }

  write('funnel.md', 'Archive inventory and promotion funnel (independent lanes, C19–C23)', [
    table(['Subject / cutoff', 'Fitted centres', 'Centre plausible', 'Rung-1 feasible', 'Distinct feasible ledgers', 'Rung 2', 'Rung 3', 'Shortlisted', 'Qualified (E)'], rows),
    '### Training metrics by stage (medians unless stated; training door only)',
    table(['Subject / cutoff', 'Stage', 'n', 'Distinct ledgers', 'Centre net p50', 'Centre net max', 'Top-episode share p50', 'Net without best year p50', 'Rung-1 robust p50', 'Rung-1 p90 DD p50'], stage)
  ]);
}

// ----- reproduction and failure attribution -----
{
  const gates: Record<string, { n: number; ok: number }> = {};

  for (const c of rep.checks) {
    gates[c.gate] ??= { n: 0, ok: 0 };
    gates[c.gate]!.n++;
    if (c.ok) gates[c.gate]!.ok++;
  }

  const att = rep.attribution.map((a: A) => [
    `${a.subject} ${a.cut}`,
    short(a.label),
    a.roles.join(', '),
    usd(a.training.net),
    `${a.training.lots} / ${a.training.episodes}`,
    pc(a.training.topEpisodeShare, 0),
    usd(a.training.selectP90Dd),
    usd(a.slice.net),
    usd(a.slice.dd),
    `${a.slice.ddPeak} → ${a.slice.ddTrough}`,
    a.slice.ddRecovery ?? 'not recovered',
    pc(a.slice.exposure, 0),
    a.slice.lots.length,
    usd(a.slice.costs),
    usd(a.slice.interest)
  ]);
  const open = rep.attribution
    .filter((a: A) => a.roles.includes('actual-profit'))
    .map((a: A) => [`${a.subject} ${a.cut}`, short(a.label), a.slice.openBetweenPeakAndTrough.join('; ')]);
  const seq = rep.sequential.map((p: A) => [p.subject, p.policy, usd(p.net), usd(p.charges), usd(p.sequentialDd), `${p.ddPeak} → ${p.ddTrough}`, p.ddRecovery ?? 'not recovered']);

  write('reproduction.md', 'Stage 1 reproduction, parity gates and failure attribution', [
    table(['Gate', 'Checks', 'Passed'], Object.entries(gates).map(([g, v]) => [g, v.n, v.ok])),
    `G7 failed only by a comparison bug (amendment A1); the sealed recheck \`g7-recheck.json\` passes ${g7.checks.filter((c: A) => c.ok).length} of ${g7.checks.length}.`,
    '### Published fold role holders on their next slice (reruns equal to the sealed fold evaluations)',
    table(['Subject / cutoff', 'Member', 'Roles', 'Training net', 'Training lots / episodes', 'Top-episode share', 'Selection p90 DD', 'Slice P&L', 'Slice DD', 'Slice DD peak → trough', 'Recovery', 'Slice exposure', 'Slice lots', 'Costs (lots)', 'Interest (lots)'], att),
    '### Positions open between the slice peak and trough (fold primaries; book, entry → exit, lot net)',
    table(['Subject / cutoff', 'Member', 'Lots'], open),
    '### Sequential paths recomputed (equal to the sealed records to the cent)',
    table(['Subject', 'Policy', 'Net', 'Switch charges', 'Sequential DD', 'Peak → trough', 'Recovery'], seq)
  ]);
}

// ----- mechanism -----
{
  const ep = mech.episodes.map((e: A) => [`${e.subject} ${e.cut}`, short(e.label), e.roles.join(', '), `${e.centreWindow.firstEntry} → ${e.centreWindow.last}`, pc(e.centreWindow.share, 0), e.draws, pc(e.overlapShare, 0), e.medianShareOfNetInCentreWindow === null ? '—' : pc(e.medianShareOfNetInCentreWindow, 0), `${e.drawsOver50pctInOneEpisode} / ${e.positiveDraws}`, usd(e.medianNet)]);
  const prim = mech.features
    .filter((f: A) => f.roles.includes('actual-profit'))
    .map((f: A) => [`${f.subject} ${f.cut}`, short(f.label), usd(f.centre.net), `${f.centre.lots} / ${f.centre.episodes}`, pc(f.centre.topEpisodeShare, 0), usd(f.select.p90Dd), usd(f.select.worst10Mean), usd(f.select.worstDd), usd(f.centre.exBestYear), usd(f.select.exBestYearMedian), usd(f.causal.netWithout), `${f.select.distinct} / ${f.select.n}`, f.select.sameAsCentre, `${f.select.clipped} / ${f.select.n}`]);
  const el = mech.eligibility4A.map((x: A) => [short(x.label), x.events.base_signal ?? 0, x.events.opportunity_armed ?? 0, x.events.opportunity_invalidated ?? 0, x.events.opportunity_decision ?? 0, x.events.continuation_signal ?? 0, x.events.fill ?? 0, Object.entries<number>(x.reasons).map(([k, v]) => `${k} ×${v}`).join('; ')]);

  write('mechanism.md', 'Stage 1 mechanism audit (training doors only)', [
    '### Do neighbourhoods reproduce the centre’s leading episode? (selection rep 1, fresh detailed reruns)',
    table(['Subject / cutoff', 'Member', 'Roles', 'Centre leading episode', 'Its share of centre net', 'Draws', 'Draws whose leading episode overlaps it', 'Median share of a draw’s net inside the window', 'Draws with > 50% in one episode / positive draws', 'Median draw net'], ep),
    '### The original fold and C24 primaries: training features (selection family = ranking draws)',
    table(['Subject / cutoff', 'Primary', 'Centre net', 'Lots / episodes', 'Top-episode share', 'Selection p90 DD', 'Selection worst-10% mean DD', 'Selection worst DD', 'Net without best year', 'Neighbourhood median net without best year', 'Causal net without leading episode', 'Distinct ledgers', 'Draws = centre ledger', 'Draws clipped'], prim),
    '### 4A eligibility: the Growth engine’s own decision log on 2016–2024 (D24)',
    table(['Member', 'Raw crossings', 'Armed', 'Invalidated', 'Decisions', 'Continuation signals', 'Fills', 'Dispositions'], el)
  ]);
}

// ----- choices, slices, sequential and decisions -----
{
  const feat = (s: string, c: string, label: string | null) => mech.features.find((f: A) => f.subject === s && f.cut === c && f.label === label);
  const rows: (string | number)[][] = [];

  for (const s of subjects)
    for (const c of ['C19', 'C21', 'C23', 'C24'])
      for (const p of ['P0', 'P1', 'P2', 'P3']) {
        const label = c === 'C24' ? c24.subjects[s].primaryUniverse.choices[p].label : choices.subjects[s][c].choices[p].label;
        const f = feat(s, c, label);
        const rej = c === 'C24' ? null : choices.subjects[s][c].choices[p].rejectedAttractive.length;

        rows.push([`${s} ${c}`, p, short(label), usd(f?.centre.net), usd(f?.select.worst10Mean), usd(f?.select.exBestYearMedian), usd(f?.causal.netWithout), pc(f?.centre.topEpisodeShare, 0), rej ?? '—']);
      }

  write('choices.md', 'Frozen policy choices (training-only features; sealed before any non-published next-period outcome)', [
    freeze.policies.map((p: A) => `- **${p.key}** (${p.family}) — ${p.name}: ${p.formula}.`).join('\n'),
    table(['Subject / cutoff', 'Policy', 'Choice', 'Centre net', 'Selection worst-10% mean DD', 'Nbhd median net without best year', 'Causal net without leading episode', 'Top-episode share', 'Higher-net E members rejected'], rows)
  ]);

  const sl = an.slices.map((x: A) => [`${x.subject} ${x.cut} (${sliceOf[x.cut]})`, x.policy, short(x.label), usd(x.sliceNet), usd(x.sliceDd), usd(x.deltaVsP0), x.newLots, x.sliceSessionsHeld, x.sameAsP0 ? 'yes' : 'no', `${x.rejectedAttractive.n} / ${x.rejectedAttractive.acceptable} / ${x.rejectedAttractive.betterThanChoice}`, usd(x.rejectedAttractive.bestSliceNet)]);
  const seq: (string | number)[][] = [];

  for (const [name, per] of Object.entries<A>(an.paths))
    for (const s of subjects) {
      const p = per[s];

      seq.push([s, name, ...p.parts.map((x: A) => `${usd(x.sliceNet)} / ${usd(x.sliceDd)}`), usd(p.charges), usd(p.net), usd(p.sequentialDd), `${p.ddPeak} → ${p.ddTrough}`, p.ddRecovery ?? 'not recovered', p.withinCeiling ? 'yes' : 'no']);
    }

  const dec: (string | number)[][] = [];

  for (const [k, d] of Object.entries<A>(an.decisions))
    for (const s of subjects) {
      const v = d.verdicts[s];

      dec.push([k, s, v.M1 ? 'pass' : 'fail', v.M2 ? 'pass' : 'fail', v.M3 ? 'pass' : 'fail', v.M4 ? 'pass' : 'fail', v.slicesNotWorse, v.newBreaches.join(', ') || '—', d.classification]);
    }

  write('sequential.md', 'Realizable policy test: slices, sequential paths (2020–2024) and the frozen decision rule', [
    '### Slice outcomes of each policy’s choice',
    table(['Subject / cutoff (slice)', 'Policy', 'Choice', 'Slice P&L', 'Slice DD', 'Δ vs P0', 'New lots in slice', 'Sessions held in slice', 'Same as P0', 'Rejected higher-net members: n / acceptable / better than the choice', 'Best rejected slice P&L'], sl),
    '### Sequential paths (switch charges included; roles are contextual controls, already published)',
    table(['Subject', 'Policy', '2020–2021 P&L / DD', '2022–2023 P&L / DD', '2024 P&L / DD', 'Charges', 'Sequential net', 'Sequential DD', 'Peak → trough', 'Recovery', 'DD ≤ $35,000'], seq),
    '### Frozen decision rule (M1 sequential DD ≤ $35,000; M2 net > max(P0, $0); M3 ≥ 2 of 3 slices ≥ P0 and no new slice breach; M4 ≥ 2 invested slices)',
    table(['Policy', 'Subject', 'M1', 'M2', 'M3', 'M4', 'Slices ≥ P0', 'New slice breaches', 'Classification'], dec),
    `**Futility (PROTOCOL.md §7.6):** ${an.futile ? 'no experimental policy merits further confirmation, so FULL was not opened.' : 'at least one policy merits confirmation.'}`
  ]);
}

// ----- hindsight -----
{
  const rows: (string | number)[][] = [];
  const acc: (string | number)[][] = [];

  for (const h of an.hindsight) {
    for (const b of h.byStratum) rows.push([`${h.subject} ${h.cut} (${sliceOf[h.cut]})`, b.stratum, b.n, `${b.acceptable} (${pc(b.acceptableShare, 0)}) [${b.acceptableWilson ? b.acceptableWilson.map((x: number) => pc(x, 0)).join(', ') : '—'}]`, `${b.better} [${b.betterWilson ? b.betterWilson.map((x: number) => pc(x, 0)).join(', ') : '—'}]`, usd(b.medianSliceNet)]);
    acc.push([`${h.subject} ${h.cut}`, `${h.acceptable} / ${h.cohort}`, `${h.better}`, usd(h.p0SliceNet), h.acceptableShortlisted.map((x: A) => `${short(x.label)} ${usd(x.sliceNet)} (rank ${x.profitRankInE ?? 'not qualified'})`).join('; ') || '—']);
  }

  const feats = an.hindsight[0].cohortAssociation.map((x: A) => x.feature);
  const assoc = feats.map((k: string) => {
    const vals = an.hindsight.map((h: A) => h.cohortAssociation.find((x: A) => x.feature === k));
    const sp = vals.map((v: A) => v.spearmanWithSliceNet);
    const pos = sp.filter((x: number) => x > 0).length;

    return [k, ...vals.map((v: A) => `${v.spearmanWithSliceNet ?? '—'} / ${v.aucAcceptable ?? '—'}`), `${pos} + / ${sp.length - pos} −`];
  });
  const efeats = an.hindsight[0].eligibleAssociation.map((x: A) => x.feature);
  const eassoc = efeats.map((k: string) => {
    const vals = an.hindsight.map((h: A) => h.eligibleAssociation.find((x: A) => x.feature === k));
    const sp = vals.map((v: A) => v.spearmanWithSliceNet);
    const pos = sp.filter((x: number) => x > 0).length;

    return [k, ...vals.map((v: A) => `${v.spearmanWithSliceNet ?? '—'} (n ${v.n})`), `${pos} + / ${sp.length - pos} −`];
  });
  const heads = an.hindsight.map((h: A) => `${h.subject} ${h.cut}`);

  write('hindsight.md', 'Hindsight availability diagnostic (oracle description of the frozen cohorts; never a selectable strategy)', [
    'Acceptable = slice P&L > $0 and slice reset DD ≤ $35,000. Better = acceptable and slice P&L above P0’s choice. Wilson 95% intervals in brackets. Strata: S shortlisted (qualification set), R3 rung 3, R2 rung 2, F rung-1 feasible, P rung-1 infeasible, U centre implausible.',
    table(['Subject / cutoff (slice)', 'Stratum', 'n', 'Acceptable', 'Better than P0', 'Median slice P&L'], rows),
    '### Where the acceptable shortlisted members stood (training profit rank within the qualified set E)',
    table(['Subject / cutoff', 'Acceptable / cohort', 'Better than P0', 'P0 slice P&L', 'Acceptable shortlisted members (slice P&L, training rank in E)'], acc),
    '### Q2: training features available for every cohort member vs the next-slice outcome (Spearman with slice P&L / AUC for “acceptable”)',
    table(['Feature', ...heads, 'Spearman signs'], assoc),
    '### Within E (qualified members): policy features vs slice P&L (Spearman)',
    table(['Feature', ...heads, 'Spearman signs'], eassoc)
  ]);
}

// ----- C24 -----
{
  const rows: (string | number)[][] = [];

  for (const s of subjects)
    for (const u of ['primaryUniverse', 'secondaryUniverse'])
      for (const [p, ch] of Object.entries<A>(c24.subjects[s][u].choices))
        rows.push([s, u === 'primaryUniverse' ? `E(s, C24) (${c24.subjects[s][u].size})` : `final set, informed (${c24.subjects[s][u].size})`, p, short(ch.label), ch.knownOutcome ? usd(ch.knownOutcome.validationPnl) : 'not evaluated (futility stop)', ch.knownOutcome ? usd(ch.knownOutcome.resetDd) : '—', ch.knownOutcome ? usd(ch.knownOutcome.wholeDd) : '—', ch.knownOutcome ? ch.knownOutcome.source : '—']);

  write('c24.md', 'C24 choices (frozen before any new 2025–2026 evaluation) and already-published outcomes', [
    `Futility verdict: **${c24.futile ? 'stop — FULL not opened' : 'not futile'}** (${c24.futilityRule}). Outcomes below are the subjects’ own sealed validation figures where a choice coincides with a published member (previously examined history).`,
    table(['Subject', 'Universe', 'Policy', 'Choice', 'Published validation P&L', 'Reset validation DD', 'Whole-run DD', 'Source'], rows)
  ]);
}

// ----- compute -----
{
  const lines = fs
    .readFileSync(path.join(S, 'results', 'compute.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  const rows = lines.map((e: A) => [e.stage, n0(e.freshTotal), n0(e.nextPeriodTotal), Object.entries<number>(e.fresh).map(([k, v]) => `${k} ${n0(v)}`).join('; ') || '—', Object.entries<number>(e.hits).map(([k, v]) => `${k} ${n0(v)}`).join('; ') || '—', e.wallSeconds]);
  const fresh = lines.reduce((a: number, e: A) => a + e.freshTotal, 0);
  const next = lines.reduce((a: number, e: A) => a + e.nextPeriodTotal, 0);

  write('compute.md', 'Compute ledger (fresh backend simulations and archive hits)', [
    table(['Stage', 'Fresh', 'Next-period fresh', 'Fresh by kind', 'Archive hits', 'Wall s'], rows),
    `**Totals:** ${n0(fresh)} fresh simulations of the 100,000 cap; ${n0(next)} next-slice / full-history of the 800 cap; 0 new search proposals. The Stage 1 archive scans read 3,635,233 archived records (sum of the scan logs) and are archive hits, never fresh simulations.`
  ]);
}

console.log(`tables written to ${path.relative(R, out)}`);
