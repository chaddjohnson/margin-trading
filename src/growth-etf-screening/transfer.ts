// The informed TRANSFER lane (PROTOCOL.md §4, §7.2; brief "Screening search"): at C24 only, the same predeclared set of
// exact existing Growth vectors on EVERY eligible ETF, separately accounted. The vectors are read from their sealed
// source records (path, JSON pointer, sha256, identity), never retyped. They are transfer HYPOTHESES: their results
// never eliminate an ETF, never enter an independent lane or an earlier cutoff, and are labelled informed everywhere.
//
// Per ETF (one job on its D24 door): every vector's centre; the selection family (128) for the ≤ 3 plausible transfers
// with the highest centre net; confirmation, stresses and toggles for ≤ 2 of them (qualify.ts confirmationPicks).
import fs from 'node:fs';
import path from 'node:path';
import { type Schedule, plans, transferJobCap } from './budgets.ts';
import { cacheRoot, cutoffs, log, repoRoot, transferManifestFile } from './context.ts';
import { doorName } from './doors.ts';
import { withLab } from './lab.ts';
import { assertWithinCeiling } from './ledger.ts';
import {
  type Evidence,
  type Member,
  compactEvidence,
  confirmationPicks,
  qualifyMembers,
  rolesOf,
  summary
} from './qualify.ts';
import { isSealed, readJson, rel, sealJson, sha256File } from './records.ts';
import { type GConfig, build, canonicalG, gId, onFineGrid } from './space.ts';
import { plausible } from './fitness.ts';
import { type Env, seal, studyGuards, symbolsOf } from './stages.ts';
import { isControl } from './universe.ts';

export interface TransferSource {
  key: string;
  label: string;
  native: 'VGT' | 'GDX';
  file: string;
  pointer: string;
  identity: string;
  provenance: string;
  // known standalone figures on the native symbol (development parity before the freeze; full history at validation)
  development: { net: number; dd: number; lots: number; source: string } | null;
  full: { net: number; dd: number; lots: number | null; validation: number; source: string } | null;
}

// The predeclared set (brief: original VGT #4, VGT 08500a60, C4-refined's VGT book, the new L0 primary's VGT book and
// relevant frozen GDX examples — here 4A's frozen 4B export set, its five standalone GDX books).
export const transferSources: TransferSource[] = [
  {
    key: 'T1',
    label: 'VGT Growth #4',
    native: 'VGT',
    file: 'research/c4-gdx-growth-partner/CONTROL_MANIFEST.json',
    pointer: '/controls/4/settings/growth/VGT/effective',
    identity: '420cd989e4fa7749',
    provenance: 'browser-selected with 2016–2026 in view (informed)',
    development: {
      net: 92575.71,
      dd: 14578.1,
      lots: 11,
      source: 'research/vg-growth-funding-lifecycle/results/development/centres.json /centres/S4/modes/L0/rec'
    },
    full: {
      net: 145468.46,
      dd: 14578.1,
      lots: 13,
      validation: 52892.75,
      source: 'research/vg-growth-funding-lifecycle/results/full/full.json /subjects/S4/modes/L0/rec'
    }
  },
  {
    key: 'T2',
    label: 'VGT Growth 08500a60',
    native: 'VGT',
    file: 'research/vg-lifecycle-matched-optimization/CONTROL_MANIFEST.json',
    pointer: '/controls/3/settings/growth/VGT/effective',
    identity: '08500a60ec56cfae',
    provenance: 'growth140 C24 global/rise gate-alternative (2016–2024 selection; informed by later examination)',
    development: {
      net: 115509.15,
      dd: 19344.8,
      lots: 7,
      source: 'research/vg-growth-funding-lifecycle/results/development/centres.json /centres/S85/modes/L0/rec'
    },
    full: {
      net: 160974.09,
      dd: 19344.8,
      lots: null,
      validation: 45464.93,
      source: 'research/vg-growth-funding-lifecycle/results/full/full.json /subjects/S85/modes/L0/rec'
    }
  },
  {
    key: 'T3',
    label: 'C4-refined VGT Growth book',
    native: 'VGT',
    file: 'research/c4-gdx-growth-partner/CONTROL_MANIFEST.json',
    pointer: '/c4Refined/vgtEffective',
    identity: 'c3c1c0d56c4ee3b0',
    provenance: 'Priority 3B C24/informed-fixed#1 profit (pooled beside VG #2 D1 books; informed)',
    development: null,
    full: null
  },
  {
    key: 'T4',
    label: 'L0 primary VGT Growth book',
    native: 'VGT',
    file: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
    pointer: '/arms/L0/primary/settings/growth/VGT/effective',
    identity: '6b5f909b30cfa516',
    provenance: 'Priority 5B C24/L0/informed/R1#1 profit (pooled with D1·GDX and D1·VGT; informed)',
    development: null,
    full: null
  },
  {
    key: 'T5',
    label: '4A primary GDX (indep-rise#1 profit)',
    native: 'GDX',
    file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json',
    pointer: '/export4B/0/settings/growthGdx/effective',
    identity: '8931194df7e7030d',
    provenance: 'Priority 4A C24 independent primary (standalone GDX, 2016–2024)',
    development: {
      net: 139668.45,
      dd: 17483.62,
      lots: 11,
      source: 'research/gdx-growth-standalone/FROZEN_SELECTION.json /export4B/0'
    },
    full: {
      net: 139668.45,
      dd: 17483.62,
      lots: 11,
      validation: 0,
      source: 'research/gdx-growth-standalone/results/validation/validation.json /rows/0'
    }
  },
  {
    key: 'T6',
    label: '4A informed#2 robust GDX',
    native: 'GDX',
    file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json',
    pointer: '/export4B/1/settings/growthGdx/effective',
    identity: '73b989f585758ccb',
    provenance: 'Priority 4A C24 robust-profit (informed lane)',
    development: {
      net: 110158.59,
      dd: 18840.58,
      lots: 16,
      source: 'research/gdx-growth-standalone/FROZEN_SELECTION.json /export4B/1'
    },
    full: {
      net: 149645.63,
      dd: 18840.58,
      lots: 20,
      validation: 39487.05,
      source: 'research/gdx-growth-standalone/results/validation/validation.json /rows/1'
    }
  },
  {
    key: 'T7',
    label: 'P08 GDX (3C G robust-profit vector)',
    native: 'GDX',
    file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json',
    pointer: '/export4B/2/settings/growthGdx/effective',
    identity: '97c5f01b151f7e1c',
    provenance: 'Priority 3C partner vector (declined as a pooled addition), 4A balanced role',
    development: {
      net: 121008.75,
      dd: 18840.58,
      lots: 11,
      source: 'research/gdx-growth-standalone/FROZEN_SELECTION.json /export4B/2'
    },
    full: {
      net: 121008.75,
      dd: 18840.58,
      lots: 11,
      validation: 0,
      source: 'research/gdx-growth-standalone/results/validation/validation.json /rows/2'
    }
  },
  {
    key: 'T8',
    label: 'P09 GDX (3C G lower-drawdown vector)',
    native: 'GDX',
    file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json',
    pointer: '/export4B/3/settings/growthGdx/effective',
    identity: '64f0d3125db3228e',
    provenance: 'Priority 3C partner vector (declined as a pooled addition), 4A lower-drawdown role',
    development: {
      net: 100056.17,
      dd: 17744.39,
      lots: 15,
      source: 'research/gdx-growth-standalone/FROZEN_SELECTION.json /export4B/3'
    },
    full: {
      net: 100056.17,
      dd: 17744.39,
      lots: 15,
      validation: 0,
      source: 'research/gdx-growth-standalone/results/validation/validation.json /rows/3'
    }
  },
  {
    key: 'T9',
    label: 'Appendix A GDX',
    native: 'GDX',
    file: 'research/gdx-growth-standalone/FROZEN_SELECTION.json',
    pointer: '/export4B/4/settings/growthGdx/effective',
    identity: '07cac3329fc7a520',
    provenance: 'browser-selected with 2016–2026 in view (informed)',
    development: {
      net: 53816.5,
      dd: 17709.96,
      lots: 13,
      source: 'research/gdx-growth-standalone/FROZEN_SELECTION.json /export4B/4'
    },
    full: {
      net: 141157.37,
      dd: 17709.96,
      lots: 19,
      validation: 87340.87,
      source: 'research/gdx-growth-standalone/results/validation/validation.json /rows/4 (native target, exact)'
    }
  }
];

const pointerGet = (doc: unknown, pointer: string) =>
  pointer
    .split('/')
    .slice(1)
    .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k.replaceAll('~1', '/').replaceAll('~0', '~')], doc);

export interface TransferVector extends TransferSource {
  g: GConfig;
  fileSha256: string;
}

// The sealed transfer manifest (before any evaluation): each vector read from its source, canonicalized, its identity
// and fine-grid representability checked.
export const sealTransferManifest = () => {
  if (fs.existsSync(transferManifestFile)) throw new Error(`${rel(transferManifestFile)} exists`);

  const vectors = transferSources.map((s) => {
    const file = path.join(repoRoot, s.file);
    const raw = pointerGet(JSON.parse(fs.readFileSync(file, 'utf8')), s.pointer) as GConfig;

    if (!raw || typeof raw !== 'object') throw new Error(`${s.key}: ${s.file} ${s.pointer} holds no vector`);

    const g = canonicalG(raw);

    if (gId(g) !== s.identity) throw new Error(`${s.key}: identity ${gId(g)} ≠ ${s.identity}`);
    if (!onFineGrid(g)) throw new Error(`${s.key}: not representable on the fine grid`);
    return { ...s, g, fileSha256: sha256File(file) };
  });
  const value = {
    kind: 'growth-etf-screening transfer manifest (predeclared exact vectors; informed lane, C24 only)',
    written: new Date().toISOString(),
    rule: 'the same exact vectors on every eligible ETF at C24, unchanged; never an independent seed, never at an earlier cutoff; their results never eliminate an ETF',
    vectors
  };

  sealJson(transferManifestFile, value, 'transfer manifest');
  return value;
};

export const transferVectors = (): TransferVector[] => {
  if (!isSealed(transferManifestFile)) throw new Error('the transfer manifest is not sealed');
  return readJson<{ vectors: TransferVector[] }>(transferManifestFile).vectors;
};

export const transferFile = (env: Env, sym: string) => path.join(env.outDir, 'transfer', `${sym}.json`);

export const runTransferJob = async (sym: string, env: Env, cutKey = 'C24') => {
  const cut = cutoffs[cutKey]!;
  const file = transferFile(env, sym);
  const vectors = transferVectors();
  const s: Schedule = env.planKey ?? env.schedule;
  const cap = transferJobCap(s, vectors.length);

  studyGuards(env);
  if (fs.existsSync(file)) return readJson(file);
  if (!symbolsOf(env).includes(sym)) throw new Error(`${sym} is not in this run's eligible universe`);
  assertWithinCeiling(cap, `the transfer job ${sym}`);

  const job = `${env.prefix}transfer-${cutKey}-${sym}`;

  return withLab(
    {
      job,
      door: doorName(sym, cut.door),
      purpose: `${env.prefix}transfer ${cutKey} ${sym}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: cap
    },
    async (lab) => {
      const members: Member[] = vectors.map((v) => ({
        label: `${cutKey}/${sym}/transfer ${v.key} ${v.label}`,
        sym,
        kind: 'transfer',
        lane: 'transfer',
        origin: v.key,
        pick: v.key,
        g: v.g
      }));
      const centres = await lab.evalMany(
        members.map((m) => {
          const b = build(m.g);
          return { quad: b.quad, options: b.options };
        }),
        'transfer:centre'
      );
      const order = members
        .map((m, i) => ({ m, r: centres[i]! }))
        .filter((x) => plausible(x.r))
        .sort((a, b) => b.r.net - a.r.net || (a.m.label < b.m.label ? -1 : 1))
        .slice(0, plans[s].transfer.selectPerEtf);
      const fid = plans[s].fidelity;
      const sel = await qualifyMembers(
        lab,
        order.map((x) => ({ m: x.m, confirm: false })),
        cutKey,
        fid
      );
      const picks = confirmationPicks(sel, plans[s].transfer.confirmPerEtf);
      const conf = await qualifyMembers(
        lab,
        picks.map((e) => ({ m: members.find((m) => m.label === e.label)!, confirm: true })),
        cutKey,
        fid
      );
      const evidence: Evidence[] = sel.map((e) => conf.find((c) => c.label === e.label) ?? e);
      const record = {
        stage: 'transfer',
        cutoff: cutKey,
        sym,
        control: isControl(sym),
        door: cut.door,
        schedule: env.schedule,
        centres: members.map((m, i) => ({
          key: m.origin,
          label: m.label,
          id: gId(m.g!),
          net: centres[i]!.net,
          dd: centres[i]!.dd,
          lots: centres[i]!.lots,
          wins: centres[i]!.wins,
          losses: centres[i]!.losses,
          episodes: centres[i]!.episodes,
          topEpisodeShare: centres[i]!.topEpisodeShare,
          plausible: plausible(centres[i]!)
        })),
        selected: order.map((x) => x.m.label),
        confirmationPicks: picks.map((e) => e.label),
        roles: rolesOf(`${sym} ${cutKey} transfer lane (informed)`, evidence),
        summary: evidence.map(summary),
        evidence: evidence.map(compactEvidence),
        manifest: { file: rel(transferManifestFile), sha256: sha256File(transferManifestFile) },
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `transfer ${sym}`);
      log(`transfer ${sym}: ${order.length} plausible centres selected, ${record.roles.qualified} qualified`);
      return record;
    }
  );
};

export const runTransfers = async (env: Env, concurrency: number) => {
  studyGuards(env);

  const queue = symbolsOf(env).filter((s) => !fs.existsSync(transferFile(env, s)));
  let failure: unknown = null;

  const worker = async () => {
    for (;;) {
      if (failure) return;

      const sym = queue.shift();

      if (!sym) return;
      try {
        await runTransferJob(sym, env, env.schedule === 'study' ? 'C24' : 'P18');
      } catch (error) {
        failure ??= error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  if (failure) throw failure;
};
