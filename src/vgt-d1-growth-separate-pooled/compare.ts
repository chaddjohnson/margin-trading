// The comparison stage (PROTOCOL.md §4–§6), in one process, after the manifest guard: the six cases and every
// comparator on D24 (development) and FULL (one continuous run 2016-01-04 → 2026-10-30, boundary 2024-12-31).
//
// - Every comparator's record is recomputed with Priority 2's frozen evaluator and must EQUAL Priority 2's sealed record
//   field for field (D24: the C24 qualification evidence centre; FULL: the validation row). A mismatch stops the stage
//   before anything is sealed: the reused figures are then verified, not assumed.
// - D24's net must equal FULL's marked net at the 2024-12-31 close for every subject (continuity, causality).
// - Causal family removal, matched trades, behavioural classes of the six cases, scaling-versus-path decompositions,
//   refusals with their virtual P&L, exposure, holdings and ledgers are written; the record is sealed once.
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Lot, PoolResult } from '../vgt-d1-growth-joint/allocator.ts';
import { chronology, frozenSelectionFile, r2 } from '../vgt-d1-growth-joint/context.ts';
import { type Door, indexOf, openFullDoor, openPrefixDoor } from '../vgt-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, episodesOf, recordOf, run } from '../vgt-d1-growth-joint/evaluate.ts';
import { drawdownEpisodes, fundingRows, holdingOf, lotRows, matchLots } from '../vgt-d1-growth-joint/post.ts';
import { describeJoint } from '../vgt-d1-growth-joint/space.ts';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { boundary, log, p2, repoRoot, researchDir, resultsDir } from './context.ts';
import { type Subject, assertManifestGuard, loadP2 } from './manifest.ts';
import { csv, logDoor, normal, rel, sealJson, sha256File } from './records.ts';

export type DoorKey = 'D24' | 'FULL';

export const comparisonFile = path.join(resultsDir, 'comparison.json');

const dateOf = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';

export const optionsOf = (
  s: Pick<Subject, 'enabled'>,
  door: DoorKey,
  enabled?: { D1: boolean; G: boolean }
): EvalOptions => ({
  ...(enabled ? { enabled } : s.enabled ? { enabled: s.enabled } : {}),
  ...(door === 'FULL' ? { boundaries: [boundary] } : {})
});

export type Run = ReturnType<typeof run>;

// The record view every table reads (one subject, one door).
export const viewOf = (door: Door, key: DoorKey, x: Run, rec: Rec, boundaryDate: string = boundary) => {
  const r = x.result;
  const refused = r.funding.filter((f) => f.outcome === 'refused');
  const bookOf = (family: string) => (family === 'D1' ? x.d1 : x.g);
  const b = key === 'FULL' ? indexOf(door, boundaryDate) : null;
  const meanPrincipal = Array.from(r.principalAtClose).reduce((a, v) => a + v, 0) / door.sessions;
  const lotView = (l: Lot) => ({
    family: l.family,
    trade: l.trade.id,
    entry: dateOf(l.entryT),
    exit: l.open ? 'open' : dateOf(l.fills.at(-1)!.t),
    principal: r2(l.principal0),
    net: r2(l.net),
    unrealized: r2(l.unrealized)
  });

  return {
    record: rec,
    // unrounded totals for the reconciliation checks (the record's fields are rounded to the cent one by one)
    raw: { net: r.net, realized: r.realized, unrealized: r.unrealized, boundaryEquity: r.periods[0]?.equity ?? null },
    ddPct: Math.round((rec.dd / 100_000) * 1e6) / 1e4,
    ddDates: { peak: dateOf(rec.ddPeakT), trough: dateOf(rec.ddTroughT), recovery: dateOf(rec.ddRecoveryT) },
    exposure: {
      sessions: door.sessions,
      sessionsHeld: r.sessionsHeld,
      heldShare: Math.round((r.sessionsHeld / door.sessions) * 1e4) / 1e4,
      sessionsBoth: r.sessionsBoth,
      meanPrincipal: r2(meanPrincipal),
      peakPrincipal: r2(r.peakPrincipal),
      peakMarketValue: r2(r.peakValue),
      principalDays: { D1: rec.fam.D1.principalDays, G: rec.fam.G.principalDays }
    },
    refusals: {
      count: refused.length,
      byReason: refused.reduce<Record<string, number>>((a, f) => {
        const k = `${f.family}: ${f.reason}`;

        a[k] = (a[k] ?? 0) + 1;
        return a;
      }, {}),
      list: refused.map((f) => {
        const v = bookOf(f.family)?.trades.find((t) => t.id === f.trade);

        return {
          family: f.family,
          trade: f.trade,
          decision: dateOf(f.t),
          reason: f.reason,
          occupant: f.occupant,
          virtualNet: v ? r2(v.vNet) : null,
          inValidation: b !== null && f.s > b
        };
      })
    },
    downsized: r.funding.filter((f) => f.outcome === 'downsized').length,
    open: r.lots.filter((l) => l.open).map(lotView),
    holding: holdingOf(door, r),
    drawdownEpisodes: drawdownEpisodes(door, r),
    topEpisodes: episodesOf(r)
      .sort((a, c) => c.net - a.net)
      .slice(0, 3)
      .map((e) => ({
        first: door.ds.dates[e.first],
        last: Number.isFinite(e.last) ? door.ds.dates[e.last] : 'open',
        net: r2(e.net),
        lots: e.lots
      })),
    ...(b !== null
      ? {
          validation: {
            pnl: rec.periods[0]!.after,
            ddReset: rec.periods[0]!.dd,
            boundaryEquity: rec.periods[0]!.equity,
            crossing: r.lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map(lotView),
            entered: r.lots.filter((l) => l.entryS > b).map(lotView)
          }
        }
      : {})
  };
};

// The development / validation / full split of one subject from its D24 and FULL views.
export const windowsOf = (dev: ReturnType<typeof viewOf>, full: ReturnType<typeof viewOf>) => {
  const d = dev.record;
  const f = full.record;
  const v = full.validation!;
  const entered = v.entered;
  const closedEntered = entered.filter((l) => l.exit !== 'open');

  return {
    development: { net: d.net, realized: d.realized, unrealized: d.unrealized, dd: d.dd, ddPct: dev.ddPct },
    validation: {
      pnl: v.pnl,
      realizedChange: r2(f.realized - d.realized),
      unrealizedChange: r2(f.unrealized - d.unrealized),
      ddReset: v.ddReset,
      ddResetPct: Math.round((v.ddReset / 100_000) * 1e6) / 1e4,
      interest: r2(f.interest - d.interest),
      costs: r2(f.costs - d.costs),
      bookedD1: r2(f.fam.D1.booked - d.fam.D1.booked),
      bookedG: r2(f.fam.G.booked - d.fam.G.booked),
      lotsEntered: entered.length,
      winsEntered: closedEntered.filter((l) => l.net > 0).length,
      lossesEntered: closedEntered.filter((l) => l.net < 0).length,
      crossing: v.crossing,
      y2025: f.years['2025'] ?? 0,
      y2026: f.years['2026'] ?? 0
    },
    full: { net: f.net, realized: f.realized, unrealized: f.unrealized, dd: f.dd, ddPct: full.ddPct },
    // residuals of the unrounded totals; each must be below half a cent
    checks: {
      continuity: dev.raw.net - full.raw.boundaryEquity!, // D24 net − FULL's marked net at the 2024-12-31 close
      validationSplit:
        full.raw.realized -
        dev.raw.realized +
        (full.raw.unrealized - dev.raw.unrealized) -
        (full.raw.net - full.raw.boundaryEquity!),
      fullSplit: full.raw.realized + full.raw.unrealized - full.raw.net
    }
  };
};

// For a sensitivity y against the primary x: matched lots whose only difference is the principal (resized) are pure
// position-size scaling (every exit rule is scale-invariant, so a resized lot has the same fills and net ∝ principal);
// every other difference (retimed, newly admitted, displaced) is a different price path.
export const scalingOf = (m: ReturnType<typeof matchLots>, x: PoolResult, y: PoolResult) => {
  const resized = m.rows.filter((r) => r.kind === 'resized');
  const proportional = resized.filter(
    (r) =>
      r.xNet !== null &&
      r.yNet !== null &&
      r.xPrincipal &&
      r.yPrincipal &&
      Math.abs(r.xNet / r.xPrincipal - r.yNet / r.yPrincipal) < 1e-6 + 1e-9 * Math.abs(r.xNet)
  ).length;
  const scaling = r2(resized.reduce((a, r) => a + r.delta, 0));

  return {
    resizedLots: resized.length,
    proportionalLots: proportional,
    scalingDelta: scaling,
    pathDelta: r2(m.delta - scaling),
    unchangedLots: m.summary.unchanged!.lots,
    alteredTrades: m.rows.filter((r) => r.kind !== 'unchanged').length,
    netX: r2(x.net),
    netY: r2(y.net)
  };
};

export const runComparison = async () => {
  requireStandardAdoption(researchDir, { repoRoot });

  const guard = assertManifestGuard();

  if (fs.existsSync(comparisonFile)) throw new Error(`${rel(comparisonFile)} is sealed: the comparison runs once`);

  const m = guard.manifest;
  const cases = m.cases as unknown as Subject[];
  const comparators = m.comparators as unknown as Subject[];
  const subjects: Subject[] = [...cases, ...comparators];
  const { selection, validation } = loadP2();
  const p2Validation = validation as unknown as { rows: { label: string; record: Rec }[] };
  const p2Evidence = selection.evidence as unknown as { label: string; centre: Rec }[];
  const doors: Record<DoorKey, Door> = {
    D24: await openPrefixDoor('D24', 'follow-up comparison (development)', true),
    FULL: await openFullDoor(
      'follow-up comparison (frozen-pair manifest guard)',
      { file: frozenSelectionFile, sha256: p2.pins['FROZEN_SELECTION.json']! },
      true
    )
  };

  logDoor('D24', 'comparison: development', { sha256: doors.D24.dataSha256, manifest: guard.sha });
  logDoor('FULL', 'comparison: development + validation, continuous', {
    sha256: doors.FULL.dataSha256,
    manifest: guard.sha
  });

  if (doors.FULL.ds.dates.at(-1) !== chronology.validationEnd) throw new Error('FULL does not end on 2026-10-30');

  const runs: Record<DoorKey, Map<string, { x: Run; rec: Rec }>> = { D24: new Map(), FULL: new Map() };
  const verification: { subject: string; door: DoorKey; source: string; equal: boolean; differs?: string[] }[] = [];

  for (const key of ['D24', 'FULL'] as const) {
    const door = doors[key];
    const ledgerDir = path.join(resultsDir, 'ledgers', key);

    fs.mkdirSync(ledgerDir, { recursive: true });
    subjects.forEach((s, i) => {
      const o = optionsOf(s, key);
      const x = run(door, s.joint, o, true, false);
      const rec = recordOf(door, s.joint, x, o);
      const tag = String(i + 1).padStart(2, '0');

      runs[key].set(s.key, { x, rec });
      fs.writeFileSync(path.join(ledgerDir, `${tag}-lots.csv`), csv(lotRows(door, x.result)));
      fs.writeFileSync(path.join(ledgerDir, `${tag}-funding.csv`), csv(fundingRows(door, x.result)));
      fs.writeFileSync(
        path.join(ledgerDir, `${tag}-daily.csv`),
        csv(
          door.ds.dates.map((date, k) => ({
            date,
            marked: r2(x.result.daily[k]!),
            principal: r2(x.result.principalAtClose[k]!),
            marketValue: r2(x.result.valueAtClose[k]!)
          }))
        )
      );

      if (s.source) {
        const label = key === 'D24' ? s.source.development : s.source.validation;
        const sealed =
          key === 'D24'
            ? p2Evidence.find((e) => e.label === label)?.centre
            : p2Validation.rows.find((r) => r.label === label)?.record;
        const mine = normal(rec) as unknown as Record<string, unknown>;
        const theirs = sealed as unknown as Record<string, unknown> | undefined;
        const differs = theirs
          ? Object.keys({ ...theirs, ...mine }).filter((k) => !isDeepStrictEqual(mine[k], theirs[k]))
          : ['(no sealed record)'];

        verification.push({
          subject: s.key,
          door: key,
          source: `${key === 'D24' ? 'results/folds/C24/selection.json evidence' : 'results/validation/validation.json rows'}: ${label}`,
          equal: differs.length === 0,
          ...(differs.length ? { differs } : {})
        });
      }

      log(`${key} ${s.key}: net ${rec.net}, DD ${rec.dd}, lots ${rec.lots}`);
    });
    fs.writeFileSync(
      path.join(ledgerDir, 'INDEX.md'),
      `# Ledger index (${key}${key === 'FULL' ? ', 2016-01-04 → 2026-10-30, continuous' : ', development 2016-01-04 → 2024-12-31'})\n\n${subjects
        .map((s, i) => `- ${String(i + 1).padStart(2, '0')}: ${s.key} (${s.role}) — ${describeJoint(s.joint)}`)
        .join('\n')}\n`
    );
  }

  const failed = verification.filter((v) => !v.equal);

  if (failed.length) {
    const file = path.join(resultsDir, 'comparison-verification-FAILED.json');

    fs.writeFileSync(file, `${JSON.stringify(verification, null, 1)}\n`);
    throw new Error(
      `${failed.length} comparator record(s) differ from Priority 2's sealed records (${rel(file)}); nothing sealed`
    );
  }

  const views = Object.fromEntries(
    subjects.map((s) => {
      const d = runs.D24.get(s.key)!;
      const f = runs.FULL.get(s.key)!;
      const dev = viewOf(doors.D24, 'D24', d.x, d.rec);
      const full = viewOf(doors.FULL, 'FULL', f.x, f.rec);

      return [
        s.key,
        {
          key: s.key,
          role: s.role,
          id: s.id,
          describe: describeJoint(s.joint),
          windows: windowsOf(dev, full),
          D24: dev,
          FULL: full
        }
      ];
    })
  );
  const broken = Object.values(views).filter((v) =>
    Object.values(v.windows.checks).some((c) => !(Math.abs(c) < 0.005))
  );

  if (broken.length) throw new Error(`window reconciliation failed for ${broken.map((v) => v.key).join(', ')}`);

  // causal family removal (both doors)
  const removalSubjects = (m.removal as { subjects: string[] }).subjects;
  const removal = Object.fromEntries(
    removalSubjects.map((name) => {
      const s = subjects.find((x) => x.key === name)!;
      const perDoor = Object.fromEntries(
        (['D24', 'FULL'] as const).map((key) => {
          const base = runs[key].get(name)!.rec;
          const one = (enabled: { D1: boolean; G: boolean }) => {
            const o = optionsOf(s, key, enabled);
            const x = run(doors[key], s.joint, o, true, false);

            return recordOf(doors[key], s.joint, x, o);
          };
          const withoutD1 = one({ D1: false, G: true });
          const withoutG = one({ D1: true, G: false });
          const v = (r: Rec) => (key === 'FULL' ? r.periods[0]!.after : null);

          return [
            key,
            {
              net: base.net,
              bookedD1: base.fam.D1.booked,
              bookedG: base.fam.G.booked,
              withoutD1: {
                net: withoutD1.net,
                dd: withoutD1.dd,
                lots: withoutD1.lots,
                signature: withoutD1.signature,
                validation: v(withoutD1)
              },
              withoutG: {
                net: withoutG.net,
                dd: withoutG.dd,
                lots: withoutG.lots,
                signature: withoutG.signature,
                validation: v(withoutG)
              },
              causalD1: r2(base.net - withoutD1.net),
              causalG: r2(base.net - withoutG.net),
              ...(key === 'FULL'
                ? {
                    validationCausalD1: r2(base.periods[0]!.after - withoutD1.periods[0]!.after),
                    validationCausalG: r2(base.periods[0]!.after - withoutG.periods[0]!.after)
                  }
                : {})
            }
          ];
        })
      );

      return [name, perDoor];
    })
  );

  // identity: removing one family from the primary pair leaves exactly the other optimized family alone
  const identities = (['D24', 'FULL'] as const).map((key) => {
    const p = removal[cases[0]!.key]![key] as {
      withoutD1: { signature: string; net: number };
      withoutG: { signature: string; net: number };
    };
    const dAlone = runs[key].get('optimized D1 alone')!.rec;
    const gAlone = runs[key].get('optimized Growth alone')!.rec;

    return {
      door: key,
      withoutGrowthEqualsOptimizedD1Alone: p.withoutG.signature === dAlone.signature && p.withoutG.net === dAlone.net,
      withoutD1EqualsOptimizedGrowthAlone: p.withoutD1.signature === gAlone.signature && p.withoutD1.net === gAlone.net
    };
  });

  if (identities.some((i) => !i.withoutD1EqualsOptimizedGrowthAlone || !i.withoutGrowthEqualsOptimizedD1Alone))
    throw new Error(`single-family identity failed: ${JSON.stringify(identities)}`);

  // matched trades: the primary pair against every declared comparison
  const mm = m.matched as { x: string; against: string[] };
  const matched = Object.fromEntries(
    (['D24', 'FULL'] as const).map((key) => [
      key,
      mm.against.map((y) => {
        const xr = runs[key].get(mm.x)!.x.result;
        const yr = runs[key].get(y)!.x.result;
        const r = matchLots(xr, yr);

        return { x: mm.x, y, ...r, scaling: scalingOf(r, xr, yr) };
      })
    ])
  );

  // behavioural classes of the six cases (canonicalization after running; nothing is dropped)
  const sig = (name: string) => {
    const d = runs.D24.get(name)!.rec;
    const f = runs.FULL.get(name)!.rec;

    return JSON.stringify([d.signature, f.signature, d.net, d.dd, f.net, f.dd, f.periods[0]!.after, f.periods[0]!.dd]);
  };
  const classes: { members: string[]; signatureD24: string; signatureFULL: string }[] = [];

  for (const c of cases) {
    const k = sig(c.key);
    const found = classes.find((x) => sig(x.members[0]!) === k);

    if (found) found.members.push(c.key);
    else
      classes.push({
        members: [c.key],
        signatureD24: runs.D24.get(c.key)!.rec.signature,
        signatureFULL: runs.FULL.get(c.key)!.rec.signature
      });
  }

  const record = {
    stage: 'comparison',
    label: m.label,
    manifestSha256: guard.sha,
    doors: {
      D24: { sessions: doors.D24.sessions, from: doors.D24.from, to: doors.D24.to, sha256: doors.D24.dataSha256 },
      FULL: {
        sessions: doors.FULL.sessions,
        from: doors.FULL.from,
        to: doors.FULL.ds.dates.at(-1),
        sha256: doors.FULL.dataSha256
      }
    },
    verification,
    identities,
    classes,
    subjects: views,
    removal,
    matched,
    ledgers: {
      D24: rel(path.join(resultsDir, 'ledgers', 'D24')),
      FULL: rel(path.join(resultsDir, 'ledgers', 'FULL')),
      index: subjects.map((s, i) => `${String(i + 1).padStart(2, '0')} ${s.key}`)
    },
    p2Sources: {
      selection: sha256File(path.join(p2.dir, 'results/folds/C24/selection.json')),
      validation: sha256File(path.join(p2.dir, 'results/validation/validation.json'))
    },
    finished: new Date().toISOString()
  };

  const sha = sealJson(comparisonFile, record, 'comparison');

  log(`comparison sealed (${sha.slice(0, 12)}…): ${classes.length} behavioural class(es) among the six cases`);
};
