// The cross-transfers (PROTOCOL.md §9.5; brief: "a GDX winner for this experiment is not presumed to work in C4" and
// "evaluate a small development-frozen set of GDX finalists across the two primary anchors"). The transfer set is a
// deterministic function of the sealed C24 selection (development only): per source arm, the GDX books of its
// GDX-enabled role holders, its partner candidate and its highest-net qualified GDX-enabled member. Each such GDX book
// is placed, UNCHANGED (no tuning), beside the other arms' frozen anchors and evaluated through complete pooled reruns
// with the full instrument (the same families, stresses and removals as qualification). Report-only: a transfer is never
// a member of the target arm's selectable set. A GDX book already present in the target arm (Appendix A) is not
// transferred again.
import fs from 'node:fs';
import path from 'node:path';
import { evaluationCaps } from './budgets.ts';
import { cacheRoot, log, repoRoot } from './context.ts';
import { anchorsOf } from './controls.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Member, type Roles, baselineLabelsOf, qualifyMembers, summary } from './qualify.ts';
import { isSealed, readJson, sha256File } from './records.ts';
import { type Env, cutoffs, finalCutoff, seal, selectionFile, studyGuards, transferFile } from './stages.ts';
import { type Arm, arms, build } from './space.ts';

interface Selection {
  roles: Record<string, Roles>;
  assessments: Record<Arm, { partnerCandidate: string | null }>;
  evidence: Evidence[];
}

export const transferSetOf = (sel: Selection) => {
  const out: { from: Arm; label: string; reasons: string[]; ev: Evidence }[] = [];

  for (const arm of arms) {
    const ev = (label: string | null) =>
      label ? sel.evidence.find((e) => e.arm === arm && e.label === label) : undefined;
    const add = (e: Evidence | undefined, reason: string) => {
      if (!e || !e.gdxId || !e.enabled.includes('G:GDX')) return;

      const x = out.find((o) => o.from === arm && o.ev.gdxId === e.gdxId);

      if (x) x.reasons.push(reason);
      else out.push({ from: arm, label: e.label, reasons: [reason], ev: e });
    };

    for (const [role, label] of Object.entries(sel.roles[arm]!.roles)) add(ev(label), `${arm} ${role}`);
    add(ev(sel.assessments[arm].partnerCandidate), `${arm} partner candidate`);
    add(
      sel.evidence
        .filter((e) => e.arm === arm && e.selectable && e.qualified && e.enabled.includes('G:GDX'))
        .sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))[0],
      `${arm} best qualified partner by centre net`
    );
  }

  return out;
};

export const runTransfers = async (env: Env) => {
  const fin = env.schedule === 'study' ? 'C24' : 'P18';
  const file = transferFile(env);
  const selFile = selectionFile(env, fin);

  studyGuards(env);
  if (!finalCutoff(fin) || !isSealed(selFile)) throw new Error('the final selection is not sealed');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const sel = readJson<Selection>(selFile);
  const set = transferSetOf(sel);
  const anchors = anchorsOf();
  const members: (Member & { from: Arm; sourceLabel: string })[] = [];

  for (const t of set)
    for (const to of arms) {
      if (to === t.from) continue;
      if (sel.evidence.some((e) => e.arm === to && e.gdxId === t.ev.gdxId)) continue; // already a member there

      const b = build(anchors[to], t.ev.gdx);

      members.push({
        label: `transfer ${t.label} → ${to}`,
        arm: to,
        kind: 'transfer',
        lane: 'transfer',
        origin: `transfer from ${t.from}`,
        quad: b.quad,
        enabled: b.enabled,
        options: b.options,
        gdx: b.cfg.gdx,
        selectable: false,
        from: t.from,
        sourceLabel: t.label
      });
    }

  return withLab(
    {
      job: `${env.prefix}transfers-${fin}`,
      door: cutoffs[fin]!.door,
      purpose: `${env.prefix}transfers ${fin}`,
      workers: env.workers,
      ...(env.schedule === 'pilot'
        ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}transfers-${fin}.jsonl`) }
        : { maxFresh: evaluationCaps.transfers })
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, fin, true);
      const rows = evidence.map((e, i) => {
        const m = members[i]!;
        const base = sel.evidence.find((x) => x.arm === e.arm && x.kind === 'baseline')!;
        const source = sel.evidence.find((x) => x.arm === m.from && x.label === m.sourceLabel)!;
        const sourceBase = sel.evidence.find((x) => x.arm === m.from && x.kind === 'baseline')!;

        return {
          label: e.label,
          from: m.from,
          to: e.arm,
          sourceLabel: m.sourceLabel,
          gdxId: e.gdxId,
          reasons: set.find((t) => t.from === m.from && t.label === m.sourceLabel)!.reasons,
          summary: summary(e),
          versusTargetBaseline: baselineLabelsOf(e, base),
          sourceVersusItsBaseline: baselineLabelsOf(source, sourceBase)
        };
      });
      const record = {
        stage: 'cross-transfers (report-only; complete pooled reruns, no tuning)',
        cutoff: fin,
        selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
        set: set.map((t) => ({ from: t.from, label: t.label, gdxId: t.ev.gdxId, reasons: t.reasons })),
        rows,
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, 'transfers');
      log(`transfers: ${set.length} GDX books, ${rows.length} transfers evaluated`);
      return record;
    }
  );
};
