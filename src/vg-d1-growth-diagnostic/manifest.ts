// The frozen diagnostic manifest (DIAGNOSTIC_MANIFEST.json: the subjects, stages, counts, selection rules, probe
// design and the questions of the FULL replay) and the protocol freeze (results/protocol-freeze.json), both written
// once, before any substantive stage.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { canonical, doorSpecs } from '../vg-d1-growth-joint/context.ts';
import {
  STUDY,
  boundary,
  ceilings,
  episodeGap,
  freezeFile,
  manifestFile,
  p3,
  researchDir,
  resources
} from './context.ts';
import { readJson, rel, sealJson, sha256File } from './records.ts';
import { archivePins, checkP3, diagnosticDigest, probeDesign, replaySets, studyFiles } from './stages.ts';
import { loadSubjects } from './subjects.ts';

export const buildManifest = () => {
  const subjects = loadSubjects();
  const adoption = readJson<{ standard: { version: string; sha256: string } }>(
    path.join(researchDir, 'STANDARD_ADOPTION.json')
  );
  const replays = replaySets.all.length * 384 + replaySets.tail.length * 39;
  const probes =
    19 * probeDesign.P1.us.length +
    19 * probeDesign.P2.us.length +
    8 * probeDesign.P3.us.length +
    probeDesign.P4.us.length ** 2;

  return {
    study: STUDY,
    kind: 'DIAGNOSTIC MANIFEST — frozen before any substantive stage; never edited (changes go to AMENDMENTS.md)',
    standard: adoption.standard,
    brief: {
      file: 'research/vg-d1-growth-diagnostic/brief/BRIEF.md',
      sha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md'))
    },
    priority3: {
      study: `research/${p3.study}`,
      evaluationDigest: p3.evaluationDigest,
      closureDigest: p3.closureDigest,
      records: p3.records,
      archives: p3.archives
    },
    subjects: subjects.map((s) => ({
      key: s.key,
      label: s.label,
      group: s.group,
      id: s.id,
      enabled: s.enabled,
      source: s.source,
      full: s.full
    })),
    counts: {
      subjects: subjects.length,
      growthPairShortlist: subjects.filter((s) => /^G\d\d$/.test(s.key)).length,
      independentFinalists: subjects.filter((s) => /^I\d\d$/.test(s.key)).length,
      fullSubjects: subjects.filter((s) => s.full).map((s) => s.key)
    },
    stages: {
      R: {
        door: 'D24',
        what: 'every subject reproduced to its sealed centre record (field for field), plus VG #2 native (Study 8: $260,223.13 / $17,280.74 / 36 lots / 14 refusals); funnels, pool time, refusal timelines (every refused decision, the gate check of every Growth crossing inside an idle overlap), drawdown episodes',
        development: subjects.length + 1
      },
      S: {
        what: "Priority 3's C24 gpair (4 lanes), indep (4 lanes) and informed (1 lane) archives, read-only: screen regenerated and matched, stage counts verified against the sealed search records, participation class of every centre at every stage, failed criteria, ranks, promotion reasons, Appendix A's Growth·GDX structure, the whole archived volume by class",
        development: 0
      },
      N: {
        what: 'the confirmation (3 × 128), small, wide and scope families of A, B, C, D, IP, XP, SP, GP4, GP085 reconstructed and checked against the sealed statistics; the report-only tail statistics; per-input association; replays',
        replays: { every_confirmation_draw: replaySets.all, worst_ceil_10pct_draws: replaySets.tail },
        development: replays + replaySets.all.length + replaySets.tail.length
      },
      P: { design: probeDesign, planned: probes, development: probes + 2, probes },
      F: {
        door: 'FULL (2016-01-04 → 2026-10-30, under the frozen selection guard of Priority 3)',
        subjects: subjects.filter((s) => s.full).map((s) => s.key),
        plusNative: 'VG #2 native (the known $334,911.93 / $21,303.61)',
        full: subjects.filter((s) => s.full).length + 1,
        questions: [
          "Q-F1: in 2025-01-02 → 2026-10-30, at which stage did each subject's Growth·GDX participation stop or occur (signals, filters/eligibility, capital competition, virtual-state waiting)?",
          'Q-F2: which refusals, occupants and idle overlaps occurred after the boundary?',
          "Q-F3: which components booked each subject's validation P&L, and which lots crossed the boundary?",
          'Q-F4: does every subject reproduce its sealed FULL record exactly?'
        ],
        boundary,
        rule: 'retrospective explanation only: nothing is selected, ranked, tuned or relabelled from this window'
      }
    },
    planned: {
      development: subjects.length + 1 + replays + 5 + probes + 2,
      full: subjects.filter((s) => s.full).length + 1,
      probes
    },
    ceilings,
    definitions: {
      episodeGap,
      idleOverlap:
        "a session close inside a refused virtual trade's own hold (decision → final virtual exit) at which no funded lot is open and no order is reserved",
      worst10Mean: 'the mean of the ⌈0.1 × n⌉ largest drawdowns of the family (standard 1.1.0 §0.3)',
      p90Interval:
        'distribution-free 95% interval of the 0.9 quantile: order statistics at ranks ⌊n·0.9 − 1.96·√(n·0.9·0.1)⌋ and ⌈n·0.9 + 1.96·√(…)⌉ + 1',
      breachInterval: 'Wilson 95% interval of the breach share'
    }
  };
};

export const writeManifest = () => {
  if (fs.existsSync(manifestFile)) throw new Error(`${rel(manifestFile)} exists: the manifest is written once`);
  return sealJson(manifestFile, buildManifest(), 'diagnostic manifest');
};

export const freeze = () => {
  const p = checkP3();

  return sealJson(
    freezeFile,
    {
      kind: `${STUDY} protocol freeze`,
      frozenAt: new Date().toISOString(),
      gitHead: execSync('git rev-parse HEAD', { cwd: path.resolve(researchDir, '../..') })
        .toString()
        .trim(),
      protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
      amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
      briefSha256: sha256File(path.join(researchDir, 'brief', 'BRIEF.md')),
      adoptionSha256: sha256File(path.join(researchDir, 'STANDARD_ADOPTION.json')),
      manifestSha256: sha256File(manifestFile),
      diagnosticDigest: diagnosticDigest(),
      studyFiles: studyFiles(),
      priority3: p,
      archives: archivePins(),
      canonicalData: canonical,
      doors: { D24: doorSpecs.D24 },
      ceilings,
      resources
    },
    'protocol freeze'
  );
};
