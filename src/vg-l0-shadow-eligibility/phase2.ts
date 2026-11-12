// The fixed-parameter shadow-eligibility comparison (PROTOCOL.md §9.0; the brief's Phase 2): New L0's frozen phenotype
// under all eight toggle combinations, no re-optimization, on the development door D24 only (FULL stays closed until the
// frozen selection). Diagnostic only: it never removes a combination from any search (every search's screen gives all
// combinations equal coverage regardless of this record), and it runs after the protocol freeze, so nothing in it can
// shape a frozen choice.
//
// Per combination: the complete chronological shared-capital replay (detail): net, maximum minute DD, annual P&L and
// reset DD, trade count and win rate, gross, costs and interest, capital utilization, per-strategy attribution (fresh vs
// delayed lots), the shadow ledger (episodes generated, persisted to a release, recovered by a delayed entry, waiting
// durations, losses to competing entries), the recovered entries' P&L and worst excursion, the decisions displaced by
// delayed lots, and the funded-lot DIFFERENCE against all-OFF (lots lost and lots added, matched by book and entry time:
// the actual displacement, never a sum of standalone shadow profits); the qualification instrument (selection 2 × 128,
// fresh confirmation 3 × 128 with the C24 draws, the stresses, the causal removals) and the gates Q1–Q6; the 2³
// factorial decomposition of each metric; the comparison labels against all-OFF (Dev, Risk; no chronological test).
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, log, r2, repoRoot } from './context.ts';
import { controlOf, nl0Key, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { allSh, offSh, shLabel } from './evaluate.ts';
import { withLab } from './lab.ts';
import { comparisonLabel, factorial } from './labels.ts';
import { type Member, labelsVs, qualifyMembers, summary } from './qualify.ts';
import { csvOf, detailOf } from './report.ts';
import { sealJson } from './records.ts';
import { type Env, cutoffs, seal, studyGuards } from './stages.ts';
import { simulationCaps } from './budgets.ts';

export const phase2File = (env: Env) => path.join(env.outDir, 'phase2', 'fixed-parameter.json');

export const runPhase2 = async (env: Env) => {
  const file = phase2File(env);
  const cut = cutoffs.C24!;

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const members: Member[] = allSh.map((sh) => {
    const c = controlOf(nl0Key(sh));

    return {
      label: `control: ${c.key}`,
      lane: 'phase2',
      kind: 'control',
      track: null,
      step: null,
      replicate: null,
      sub: null,
      cfg: c.cfg,
      options: optionsOfControl(c),
      selectable: false,
      control: c.key
    };
  });
  const job = `${env.prefix}phase2`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}phase 2 (fixed-parameter comparison, D24)`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? simulationCaps.phase2 : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, 'C24');
      const door = await openStudyDoor(cut.door, `${env.prefix}phase 2 detail runs (in-process)`);
      const details = Object.fromEntries(
        allSh.map((sh) => [sh, detailOf(door, controlOf(nl0Key(sh)).cfg, optionsOfControl(controlOf('NL0')))])
      );
      const off = details[offSh]!;
      const key = (l: { book: string; entry: string }) => `${l.book}@${l.entry}`;
      const offKeys = new Map(off.lots.map((l) => [key(l), l]));
      const ledgerDir = path.join(path.dirname(file), 'ledgers');
      const rows = allSh.map((sh) => {
        const d = details[sh]!;
        const ev = evidence.find((e) => e.control === nl0Key(sh))!;
        const keys = new Map(d.lots.map((l) => [key(l), l]));
        const lost = off.lots.filter((l) => !keys.has(key(l)));
        const added = d.lots.filter((l) => !offKeys.has(key(l)));
        const delayed = d.lots.filter((l) => l.kind === 'delayed');
        const s = d.rec.shadow;

        if (env.schedule === 'study') {
          fs.mkdirSync(path.join(ledgerDir, sh), { recursive: true });
          sealJson(path.join(ledgerDir, sh, 'lots.json'), d.lots, `phase2 ledger ${sh} lots`);
          sealJson(path.join(ledgerDir, sh, 'episodes.json'), d.episodes, `phase2 ledger ${sh} episodes`);
          fs.writeFileSync(path.join(ledgerDir, sh, 'lots.csv'), csvOf(d.lots));
          fs.writeFileSync(path.join(ledgerDir, sh, 'episodes.csv'), csvOf(d.episodes));
        }

        return {
          sh,
          label: shLabel(sh),
          net: d.rec.net,
          dd: d.rec.dd,
          years: d.years,
          trades: d.trades,
          utilization: d.utilization,
          attribution: d.attribution,
          shadow: s,
          episodes: {
            generated: s?.episodes ?? 0,
            persistedToRelease: s?.persisted ?? 0,
            expiredWhileOccupied: s?.expiredOccupied ?? 0,
            recovered: s?.recovered ?? 0,
            lostToFresh: s?.lostToFresh ?? 0,
            lostToShadow: s?.lostToShadow ?? 0,
            ownOccupant: s?.ownOccupant ?? 0
          },
          recovered: {
            lots: delayed.length,
            net: r2(delayed.reduce((a, l) => a + l.net, 0)),
            wins: delayed.filter((l) => !l.open && l.net > 0).length,
            worstNet: delayed.length ? Math.min(...delayed.map((l) => l.net)) : 0,
            worstExcursion: delayed.length ? Math.min(...delayed.map((l) => l.mae)) : 0,
            waitSessions: delayed.map((l) => d.episodes[l.episode!]!.waitSessions),
            byYear: Object.fromEntries(Object.entries(d.years).map(([y, v]) => [y, v.recovered]))
          },
          displacedDecisions: s
            ? { count: s.displaced, hypotheticalNet: s.displacedHypNet }
            : { count: 0, hypotheticalNet: 0 },
          versusOff: {
            dNet: r2(d.rec.net - off.rec.net),
            dDd: r2(d.rec.dd - off.rec.dd),
            lost: {
              lots: lost.length,
              net: r2(lost.reduce((a, l) => a + l.net, 0)),
              list: lost.map((l) => `${l.book} ${l.entry} ${l.net}`)
            },
            added: {
              lots: added.length,
              net: r2(added.reduce((a, l) => a + l.net, 0)),
              delayed: added.filter((l) => l.kind === 'delayed').length
            },
            byYear: Object.fromEntries(Object.entries(d.years).map(([y, v]) => [y, r2(v.net - off.years[y]!.net)]))
          },
          evidence: summary(ev),
          gates: ev.gates,
          qualified: ev.qualified,
          labelVsOff: comparisonLabel(
            { net: ev.centre.net, dd: ev.centre.dd, confirmP10: ev.confirm.p10, confirmP90Dd: ev.confirm.p90Dd },
            (() => {
              const a = evidence.find((e) => e.control === 'NL0')!;

              return { net: a.centre.net, dd: a.centre.dd, confirmP10: a.confirm.p10, confirmP90Dd: a.confirm.p90Dd };
            })()
          ),
          versusOffConfirm: labelsVs(
            ev,
            evidence.find((e) => e.control === 'NL0')!
          )
        };
      });
      const metric = (f: (r: (typeof rows)[number]) => number) =>
        factorial(Object.fromEntries(rows.map((r) => [r.sh, f(r)])));
      const record = {
        stage: 'phase 2: fixed-parameter comparison',
        door: cut.door,
        window: '2016-01-04 → 2024-12-31 (development only)',
        schedule: env.schedule,
        rows,
        factorial: {
          net: metric((r) => r.net),
          dd: metric((r) => r.dd),
          confirmP10: metric((r) => r.evidence.confirmP10),
          confirmP90Dd: metric((r) => r.evidence.confirmP90Dd)
        },
        best: {
          byNet: [...rows].sort((a, b) => b.net - a.net)[0]!.sh,
          byDd: [...rows].sort((a, b) => a.dd - b.dd)[0]!.sh,
          qualified: rows.filter((r) => r.qualified).map((r) => r.sh)
        },
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        note: 'diagnostic: no combination is removed from any search by this record (PROTOCOL.md §9.0)',
        finished: new Date().toISOString()
      };

      seal(env, file, record, 'phase 2 fixed-parameter comparison');
      log(`phase 2: ${rows.map((r) => `${r.sh} ${r.net}/${r.dd}`).join('; ')}`);
      return record;
    }
  );
};
