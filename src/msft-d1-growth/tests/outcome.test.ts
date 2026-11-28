// P9-MSFT outcome determination (PROTOCOL.md §12): the validation rows join the C24 finalists by their immutable identity
// (arm, id) through src/research-outcome/identityJoin.ts and FAIL CLOSED on a missing, duplicate, cross-arm, malformed or
// conflicting record — the regression test of the P6-TSLA defect (research/tsla-d1-growth/AMENDMENTS.md D1: a mutable
// label join silently produced `validation: null`). Also: the evidence-sufficiency condition (d) ES1–ES3 at its exact
// thresholds, the classification (candidate / development-only / insufficient evidence) and order invariance.
// Synthetic fixtures only: nothing is evaluated, read from a sealed record or written.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IdentityJoinError } from '../../research-outcome/identityJoin.ts';
import type { ArmKey } from '../context.ts';
import { type Finalist, type Sufficiency, type ValidationRow, governedFinalists, outcomeOf, sufficiencyOf, sufficiencyRule } from '../outcome.ts';

// ----- fixtures -----

type Proc = { population: string; verdict: string; supported: boolean };
const procs = (supported: Partial<Record<ArmKey, boolean>> = {}): Proc[] =>
  (['D', 'G', 'C', 'J', 'S'] as const).map((a) => ({ population: a, verdict: supported[a] ? 'supported' : 'unsupported', supported: supported[a] ?? false }));

const enough: Sufficiency = { lots: 20, familyLots: { D1: 10, G: 10 }, episodes: 12, entryYears: ['2016', '2018', '2020', '2022'], topEpisodeShare: 0.3, ES1: true, ES2: true, ES3: true, pass: true, failed: [] };
const thin: Sufficiency = { ...enough, lots: 4, ES1: false, pass: false, failed: ['ES1'] };

const fin = (arm: ArmKey, id: string, label: string, roles: string[], qualified = true, sufficiency: Sufficiency = enough): Finalist => ({
  label,
  id,
  arm,
  roles,
  qualified,
  failed: qualified ? [] : ['Q3'],
  centreNet: 1000,
  centreDd: 500,
  confirmRobust: 800,
  confirmP90Dd: 600,
  selectRobust: 700,
  signature: `sig-${id}`,
  sufficiency
});
const row = (arm: ArmKey, id: string, label: string, v: [boolean, boolean, boolean], kind = 'selected'): ValidationRow => ({ label, id, arm, kind, validation: { V1: v[0], V2: v[1], V3: v[2] } });
const pre = (finalists: readonly Finalist[], procedures: Proc[] = procs()) => ({ finalists: governedFinalists(finalists, procedures), comparisons: { note: 'synthetic' } });

// every arm's primary plus a role holder; arm C's primary also holds three roles (one identity, one finalist)
const slate = [
  fin('D', 'd-p', 'C24/D/broad/D.B1/R101#1 profit', ['primary D']),
  fin('D', 'd-r', 'C24/D/broad/D.B1/R102#2 robust', ['role D/robust-profit']),
  fin('G', 'g-p', 'C24/G/refine/G.h1.s1/R103#1 profit', ['primary G']),
  fin('G', 'g-r', 'C24/G/broad/G.h2.s0/R110#3 balanced', ['role G/balanced']),
  fin('C', 'c-p', 'C24/C/pair DF1×GF3', ['primary C', 'role C/robust-profit', 'role C/balanced', 'role C/lower-drawdown']),
  fin('J', 'j-p', 'C24/J/broad/J.A0.h0.s0/R104#1 profit', ['primary J']),
  fin('J', 'j-r', 'C24/J/broad/J.B1.h1.s1/R101#2 robust', ['role J/robust-profit']),
  fin('S', 's-p', 'C24/S/broad/S.C24F1.h0.s1/R101#1 profit', ['primary S']),
  fin('S', 's-r', 'C24/S/broad/S.C24F2.h2.s1/R107#3 balanced', ['role S/balanced'])
];
const slateRows = [
  row('D', 'd-p', 'C24/D/broad/D.B1/R101#1 profit', [false, true, true]),
  row('D', 'd-r', 'C24/D/broad/D.B1/R102#2 robust', [false, true, true]),
  row('G', 'g-p', 'C24/G/refine/G.h1.s1/R103#1 profit', [true, true, true]),
  row('G', 'g-r', 'C24/G/broad/G.h2.s0/R110#3 balanced', [true, true, true]),
  row('C', 'c-p', 'C24/C/pair DF1×GF3', [true, true, true]),
  row('J', 'j-p', 'C24/J/broad/J.A0.h0.s0/R104#1 profit', [false, true, true]),
  row('J', 'j-r', 'C24/J/broad/J.B1.h1.s1/R101#2 robust', [false, true, false]),
  row('S', 's-p', 'C24/S/broad/S.C24F1.h0.s1/R101#1 profit', [false, true, true]),
  row('S', 's-r', 'C24/S/broad/S.C24F2.h2.s1/R107#3 balanced', [false, false, false]),
  // rows no finalist claims: a sub-population primary and an external control
  row('G', 'gu-p', 'C24/G/broad/G.h0.s0/R105#1 profit', [false, false, false]),
  row('D', 'ctl-nl0', 'control: New L0 on MSFT (arm D)', [false, false, false], 'control')
];
const classification = (o: ReturnType<typeof outcomeOf>) =>
  Object.fromEntries(o.finalists.map((f) => [`${f.arm}|${f.id}`, { v: f.validation, c: f.c, candidate: f.candidate, developmentOnly: f.developmentOnly, insufficient: f.insufficientEvidence, label: f.candidateLabel }]));
const permute = <T>(xs: readonly T[], order: number[]) => order.map((i) => xs[i]!);
const joinFails = (fn: () => unknown, re: RegExp) =>
  assert.throws(fn, (e: Error) => {
    assert.ok(e instanceof IdentityJoinError, `expected an IdentityJoinError, got ${String(e)}`);
    assert.match(e.message, re);
    return true;
  });

// ----- the join -----

describe('outcomeOf joins by (arm, id) and fails closed', () => {
  it('every finalist receives exactly its own V1–V3 (no validation: null path)', () => {
    const o = outcomeOf(pre(slate), slateRows);

    assert.equal(o.finalists.length, slate.length);
    for (const f of o.finalists) {
      const r = slateRows.find((x) => x.arm === f.arm && x.id === f.id)!;

      assert.deepEqual(f.validation, r.validation);
      assert.equal(f.c, r.validation.V1 && r.validation.V2 && r.validation.V3);
      assert.notEqual(f.validation, null);
    }
    assert.equal(o.unclaimedRows, 1); // the sub-population row (the control is never eligible)
  });

  it('TSLA regression: a governance step that changes a label never detaches a finalist from its record', () => {
    // the P6-TSLA defect: the governance label replaced the join key; here the governance text is separate and the join
    // is by (arm, id) — rewriting the governance label of every finalist changes no validation
    const p = pre(slate);
    const relabelled = { ...p, finalists: p.finalists.map((f) => ({ ...f, governanceLabel: `RELABELLED ${f.governanceLabel}` })) };
    const a = outcomeOf(p, slateRows);
    const b = outcomeOf(relabelled, slateRows);

    assert.deepEqual(classification(a), classification(b));
    assert.ok(b.finalists.every((f) => f.validation && typeof f.validation.V1 === 'boolean'));
  });

  it('the candidate label stays the member label; the governance label is separate text', () => {
    const p = pre(slate);

    for (const f of p.finalists) {
      assert.equal(f.label, f.candidateLabel);
      assert.notEqual(f.governanceLabel, f.label);
    }
  });

  it('reordering the finalists and the rows does not change the result', () => {
    const a = outcomeOf(pre(slate), slateRows);
    const b = outcomeOf(pre(permute(slate, [8, 3, 0, 5, 1, 7, 2, 6, 4])), permute(slateRows, [10, 2, 9, 4, 0, 8, 6, 1, 7, 3, 5]));

    assert.deepEqual(classification(a), classification(b));
    assert.deepEqual(a.developmentOnly, b.developmentOnly);
    assert.deepEqual(a.candidates, b.candidates);
  });

  it('an external control sharing a finalist identity is never joined (kind control)', () => {
    const rows = slateRows.map((r) => (r.id === 'd-p' ? { ...r, kind: 'control' } : r));

    joinFails(() => outcomeOf(pre(slate), rows), /d-p/);
  });

  it('a row without kind is ineligible, so its finalist fails closed', () => {
    const rows = slateRows.map((r) => (r.id === 'g-p' ? ({ ...r, kind: undefined } as unknown as ValidationRow) : r));

    joinFails(() => outcomeOf(pre(slate), rows), /g-p/);
  });

  it('fails closed on a missing validation row', () => joinFails(() => outcomeOf(pre(slate), slateRows.filter((r) => r.id !== 'j-r')), /j-r/));
  it('fails closed on a duplicate validation identity', () => joinFails(() => outcomeOf(pre(slate), [...slateRows, slateRows[2]!]), /duplicate/));
  it('fails closed on a cross-arm identity', () => joinFails(() => outcomeOf(pre(slate), slateRows.map((r) => (r.id === 's-p' ? { ...r, arm: 'J' as ArmKey } : r))), /s-p/));
  it('fails closed on a conflicting candidate label for the same identity', () =>
    joinFails(() => outcomeOf(pre(slate), slateRows.map((r) => (r.id === 'c-p' ? { ...r, label: 'C24/C/pair DF2×GF1' } : r))), /label conflict/));
  it('fails closed on a duplicate finalist identity', () => joinFails(() => outcomeOf(pre([...slate, slate[0]!]), slateRows), /duplicate finalist/));
  it('fails closed on malformed V1–V3 or a row without a candidate label', () => {
    joinFails(() => outcomeOf(pre(slate), slateRows.map((r) => (r.id === 'd-r' ? ({ ...r, validation: { V1: 'yes', V2: true, V3: true } } as unknown as ValidationRow) : r))), /malformed/);
    joinFails(() => outcomeOf(pre(slate), slateRows.map((r) => (r.id === 'd-r' ? { ...r, label: '' } : r))), /no candidate label/);
  });
});

// ----- the classification -----

describe('the determination (a)–(d)', () => {
  it('no chronological support: primaries passing V1–V3 are development-only; role holders and failing primaries are not', () => {
    const o = outcomeOf(pre(slate), slateRows);

    assert.deepEqual(o.candidates, []);
    assert.deepEqual(
      o.developmentOnly.map((x) => `${x.arm}|${x.id}`),
      ['G|g-p', 'C|c-p']
    );
    assert.match(o.outcome, /^NO QUALIFYING MSFT CANDIDATE/);
  });

  it('a chronologically supported, sufficient primary passing V1–V3 is a candidate', () => {
    const o = outcomeOf(pre(slate, procs({ G: true })), slateRows);

    assert.deepEqual(o.candidates, [{ arm: 'G', label: 'C24/G/refine/G.h1.s1/R103#1 profit', id: 'g-p', sufficient: true }]);
    assert.match(o.outcome, /^MSFT RESEARCH CANDIDATE\(S\) FOR THE USER'S REVIEW/);
  });

  it('(d) binds: a supported primary passing V1–V3 with insufficient evidence is no candidate', () => {
    const s2 = slate.map((f) => (f.id === 'g-p' ? { ...f, sufficiency: thin } : f));
    const o = outcomeOf(pre(s2, procs({ G: true })), slateRows);

    assert.deepEqual(o.candidates, []);
    assert.deepEqual(o.insufficientEvidence.map((x) => x.id), ['g-p']);
    assert.match(o.outcome, /^NO QUALIFYING MSFT CANDIDATE.*insufficient evidence/);
    assert.match(pre(s2, procs({ G: true })).finalists.find((f) => f.id === 'g-p')!.governanceLabel, /INSUFFICIENT EVIDENCE \(fails ES1\)/);
  });

  it('a supported primary failing V1 is no candidate; an unqualified primary is never development-only', () => {
    const s2 = slate.map((f) => (f.id === 'c-p' ? { ...f, qualified: false, failed: ['Q3'] } : f));
    const o = outcomeOf(pre(s2, procs({ D: true })), slateRows);

    assert.deepEqual(o.candidates, []);
    assert.ok(!o.developmentOnly.some((x) => x.id === 'c-p'));
  });
});

// ----- evidence sufficiency ES1–ES3 at the exact thresholds -----

describe('sufficiencyOf (ES1–ES3)', () => {
  const lots = (years: string[], n: number) => Array.from({ length: n }, (_v, i) => ({ entry: `${years[i % years.length]}-03-01` }));
  const ev = (arm: ArmKey, o: { lots: number; d1?: number; g?: number; episodes: number; share: number; years: string[] }) =>
    ({
      arm,
      centre: { lots: o.lots, fam: { D1: { lots: o.d1 ?? (arm === 'G' ? 0 : o.lots) }, G: { lots: o.g ?? (arm === 'D' ? 0 : o.lots) } }, episodes: o.episodes, topEpisodeShare: o.share },
      risk: { rows: lots(o.years, o.lots) }
    }) as unknown as Parameters<typeof sufficiencyOf>[0];
  const y4 = ['2016', '2018', '2020', '2022'];

  it('the frozen thresholds', () => assert.deepEqual({ ...sufficiencyRule }, { minLots: 10, minFamilyLots: 3, minEpisodes: 5, minYears: 4, maxTopEpisodeShare: 0.5 }));
  it('passes exactly at the thresholds', () => assert.equal(sufficiencyOf(ev('D', { lots: 10, episodes: 5, share: 0.5, years: y4 })).pass, true));
  it('ES1: 9 lots fail', () => assert.deepEqual(sufficiencyOf(ev('D', { lots: 9, episodes: 5, share: 0.5, years: y4 })).failed, ['ES1']));
  it('ES1: a combined arm needs 3 lots of each family', () => {
    assert.deepEqual(sufficiencyOf(ev('J', { lots: 12, d1: 10, g: 2, episodes: 6, share: 0.4, years: y4 })).failed, ['ES1']);
    assert.equal(sufficiencyOf(ev('J', { lots: 12, d1: 9, g: 3, episodes: 6, share: 0.4, years: y4 })).pass, true);
    assert.equal(sufficiencyOf(ev('G', { lots: 12, episodes: 6, share: 0.4, years: y4 })).pass, true); // standalone: one family
  });
  it('ES2: 4 episodes or 3 entry years fail', () => {
    assert.deepEqual(sufficiencyOf(ev('D', { lots: 10, episodes: 4, share: 0.5, years: y4 })).failed, ['ES2']);
    assert.deepEqual(sufficiencyOf(ev('D', { lots: 10, episodes: 5, share: 0.5, years: ['2016', '2017', '2018'] })).failed, ['ES2']);
  });
  it('ES3: a top-episode share above 50 % or undefined fails', () => {
    assert.deepEqual(sufficiencyOf(ev('D', { lots: 10, episodes: 5, share: 0.5001, years: y4 })).failed, ['ES3']);
    assert.deepEqual(sufficiencyOf(ev('D', { lots: 10, episodes: 5, share: NaN, years: y4 })).failed, ['ES3']);
  });
});
