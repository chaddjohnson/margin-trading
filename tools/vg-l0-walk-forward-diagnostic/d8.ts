// D8 bug audit checks that need no simulation (PROTOCOL.md §6): (1) price-jump scan of the VGT and GDX development
// doors (D24; consecutive-bar moves > 10%, which would flag an unadjusted split or a bad print), and the split register;
// (2) maximum-hold semantics of every maximum-hold exit of the fold primaries' slice lots (calendar days for 'cal',
// NYSE sessions for 'ses'; the exit must come at the first session whose holding time reaches the book's hold);
// (3) slice reconciliation of the sealed replays: Σ fresh lots' net + the carried lot's slice change = slice net.
import fs from 'node:fs';
import path from 'node:path';
import { r2, readRecord, repoRoot, resultsDir, sealJson } from './common.ts';

// ----- (1) price jumps -----
const jumps = Object.fromEntries(
  ['VGT', 'GDX'].map((sym) => {
    const text = fs.readFileSync(path.join(repoRoot, '.cache/vg-d1-growth-joint/doors', `${sym}-D24.csv`), 'utf8');
    let prev: number | null = null;
    let prevT = '';
    const big: { from: string; to: string; move: number }[] = [];
    let bars = 0;

    for (const line of text.split('\n')) {
      if (!line) continue;

      const p = line.split(',');
      const t = p[0]!.replaceAll('"', '');
      const c = Number(p[4]);

      bars++;
      if (prev !== null && Math.abs(c / prev - 1) > 0.1) big.push({ from: prevT, to: t, move: r2((100 * (c / prev - 1))) / 100 });
      prev = c;
      prevT = t;
    }
    return [sym, { bars, movesOver10pct: big }];
  })
);
const splits = (readRecord<{ splits: { symbol: string; effectiveDate: string; ratio: number }[] }>(
  path.join(repoRoot, 'config/market-events/splits.json')
).splits).filter((s) => s.symbol === 'VGT' || s.symbol === 'GDX');

// ----- (2) maximum-hold semantics -----
type LotRow = { book: string; kind: string; entry: string; exit: string; exitReasons: string; calendarDays: number | null; sessions: number | null; carriedIntoSlice: boolean; net: number };
type Subject = { path: string; fold: string; label: string; unit?: string; cfg: { quad: { d1: Record<string, Record<string, number>>; g: Record<string, Record<string, unknown>> } }; slice: { lots: LotRow[]; carried: { sliceChange: number }[]; sliceNet: number } };

const prim = readRecord<{ subjects: Subject[] }>(path.join(resultsDir, 'replays/primaries.json')).subjects;
const ses = readRecord<{ subjects: Subject[] }>(path.join(resultsDir, 'replays/session.json')).subjects;
const dayOf = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86400000;
const holdChecks: Record<string, unknown>[] = [];

for (const s of [...prim, ...ses]) {
  const unit = s.unit ?? 'cal';

  for (const l of s.slice.lots) {
    if (!l.exitReasons.includes('maximum hold') || l.exit === 'open') continue;

    const sym = l.book.slice(-3);
    const hold = l.book.startsWith('D1') ? s.cfg.quad.d1[sym]!.maximumHoldDays! : Number(s.cfg.quad.g[sym]!.maximumHoldDays);
    const days = dayOf(l.exit) - dayOf(l.entry);

    holdChecks.push({
      path: s.path,
      fold: s.fold,
      unit,
      book: l.book,
      entry: l.entry,
      exit: l.exit,
      hold,
      calendarDays: days,
      sessions: l.sessions,
      // calendar: the exit date is at least `hold` days after entry; sessions: at least `hold` sessions
      reached: unit === 'cal' ? days >= hold : (l.sessions ?? 0) >= hold,
      net: l.net
    });
  }
}

// ----- (3) slice reconciliation of the replays -----
const recon = [...prim, ...ses].map((s) => {
  const fresh = s.slice.lots.filter((l) => !l.carriedIntoSlice).reduce((a, l) => a + l.net, 0);
  const carried = s.slice.carried.reduce((a, c) => a + c.sliceChange, 0);

  return { path: s.path, fold: s.fold, unit: s.unit ?? 'cal', sliceNet: s.slice.sliceNet, sum: r2(fresh + carried), diff: r2(s.slice.sliceNet - fresh - carried) };
});

sealJson(
  path.join(resultsDir, 'gates', 'd8.json'),
  {
    stage: 'D8 data and semantics checks (no simulation)',
    priceJumps: jumps,
    splitsRegister: splits,
    maximumHold: { checked: holdChecks.length, notReached: holdChecks.filter((x) => !x.reached).length, exits: holdChecks },
    reconciliation: { checked: recon.length, maxAbsDiff: Math.max(...recon.map((x) => Math.abs(x.diff))), rows: recon },
    finished: new Date().toISOString()
  },
  'D8 checks'
);
console.log(JSON.stringify({ jumps: Object.fromEntries(Object.entries(jumps).map(([k, v]) => [k, v.movesOver10pct])), splits, holds: holdChecks.length, notReached: holdChecks.filter((x) => !x.reached).length, recon: Math.max(...recon.map((x) => Math.abs(x.diff))) }));
