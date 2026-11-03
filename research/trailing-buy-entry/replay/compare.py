#!/usr/bin/env python3
"""Compare the independent replay (replay/out/) with the study engine's exports (replay/engine/).

Usage: python3 -I compare.py

Trades and setups are compared row by row: dates, reasons and outcomes exactly, prices, interest and
profit within 1e-9 relative or 1e-6 absolute, counts exactly. Summaries the same way. Prints a
per-configuration PASS/FAIL table and writes replay/REPLAY_REPORT.md.
"""

import csv
import filecmp
import json
import os
import sys

REPO = '/Users/chad/development/personal/margin-trading'
HERE = os.path.join(REPO, 'research', 'trailing-buy-entry', 'replay')
ENGINE_DIR = os.path.join(HERE, 'engine')
OUT_DIR = os.path.join(HERE, 'out')
REPORT = os.path.join(HERE, 'REPLAY_REPORT.md')

REL_TOL = 1e-9
ABS_TOL = 1e-6
TRADE_NUMERIC = {'entry_price', 'exit_price', 'interest', 'profit'}
SETUP_NUMERIC = {'arm_close', 'trough', 'fill_price'}
SUMMARY_COUNTS = {'restrictions', 'lowerPriceReentries', 'recoveryResets', 'cancelledSetups'}


def within(a, b):
    diff = abs(a - b)
    return diff <= ABS_TOL or diff <= REL_TOL * max(abs(a), abs(b)), diff


def read_rows(path):
    with open(path, newline='') as handle:
        text = handle.read()
    if not text.strip():
        return None, []
    reader = csv.reader(text.splitlines())
    header = next(reader)
    return header, [row for row in reader]


def compare_table(engine_path, replay_path, numeric):
    """Returns (ok, engine_count, replay_count, max_abs_diff, first_mismatch_text)."""
    e_header, e_rows = read_rows(engine_path)
    r_header, r_rows = read_rows(replay_path)
    max_diff = 0.0
    if e_header != r_header:
        return False, len(e_rows), len(r_rows), max_diff, f'header differs: engine {e_header} vs replay {r_header}'
    first = None
    for i in range(max(len(e_rows), len(r_rows))):
        if i >= len(e_rows) or i >= len(r_rows):
            if first is None:
                side = 'replay' if i >= len(e_rows) else 'engine'
                extra = (r_rows if side == 'replay' else e_rows)[i]
                first = f'row {i + 1}: only the {side} has a row: {",".join(extra)}'
            continue
        e_row, r_row = e_rows[i], r_rows[i]
        for column, e_value, r_value in zip(e_header, e_row, r_row):
            if column in numeric and e_value != '' and r_value != '':
                ok, diff = within(float(e_value), float(r_value))
                max_diff = max(max_diff, diff)
            else:
                ok = e_value == r_value
            if not ok and first is None:
                first = (f'row {i + 1}, column {column}: engine `{e_value}` vs replay `{r_value}`\n'
                         f'  - engine: `{",".join(e_row)}`\n  - replay: `{",".join(r_row)}`')
    return first is None, len(e_rows), len(r_rows), max_diff, first


def compare_summary(engine_path, replay_path):
    with open(engine_path) as handle:
        engine = json.load(handle)
    with open(replay_path) as handle:
        replay = json.load(handle)
    max_diff = 0.0
    first = None
    for key in sorted(set(engine) | set(replay)):
        if key not in engine or key not in replay:
            first = first or f'key {key} present on one side only'
            continue
        if key in SUMMARY_COUNTS:
            ok = engine[key] == replay[key]
        else:
            ok, diff = within(float(engine[key]), float(replay[key]))
            max_diff = max(max_diff, diff)
        if not ok and first is None:
            first = f'{key}: engine {engine[key]!r} vs replay {replay[key]!r}'
    return first is None, max_diff, first, engine


def fmt_diff(value):
    return '0' if value == 0 else f'{value:.2e}'


METHOD = """\
## Method

- `replay.py` is a standard-library-only Python 3 implementation written from
  `research/trailing-buy-entry/STATE_MACHINE.md` and `src/app/allin-original.ts` only. Nothing under
  `src/trailing-buy/` (the study engine) was read.
- It loads the whole data file (Unix-second session times from `calendar.timegm` of the date), computes
  reference highs over the `L` sessions before `t` and Wilder's ATR from absolute index 0 of the file, and
  trades from the first row on or after `startDate` through the last row on or before `endDate`. Absolute
  index 0 is skipped as in the original (only relevant to the `walk-*` fixtures).
- Each session runs block A (next-open fill), B (flat: episode low, recovery reset first, then
  legacy / arm / trough / trigger / variant B / max-wait) or C (the original's exits, in its order), then D
  (mark to market, peak from $0) and E (the original's restriction resolution). Percent settings are
  `n / 1000`, `K = n / 10`; interest, profit, stop, lower level, reset level and the drawdown signal use the
  same floating-point expression order as `allin-original.ts`.
- Numbers are written with a JavaScript `Number#toString` emulation, so files can be compared byte for byte.
- `compare.py` compares `out/` with `engine/`: trades and setups row by row (dates, reasons, outcomes and
  flags exactly; prices, interest and profit within 1e-9 relative or 1e-6 absolute), summaries within the
  same tolerance (counts exactly). It also records whether each file is byte-identical.
- Reproduce: `python3 -I research/trailing-buy-entry/replay/replay.py && python3 -I research/trailing-buy-entry/replay/compare.py`.
"""

READINGS = """\
## Spec readings and ambiguities

1. **Max-wait expiry timing** (`STATE_MACHINE.md` B.6: "**max-wait expiry** after *M* sessions
   (`t − armSession ≥ M`). After an expiry, eligibility resumes and a later close can arm a fresh setup.").
   The text does not say whether session `armSession + M` is still evaluated (trough update / trigger) before
   the setup expires, or whether the setup expires at the start of that session.
   *Implemented:* session `t` is evaluated first; an unfilled setup expires at the end of the first session
   with `t − armSession ≥ M` (so the setup gets `M` sessions to fill), and no new setup arms on the expiry
   session ("a later close"). This matches the engine exactly. The alternative reading
   (`replay.py --maxwait-before-eval`) leaves every trade and the summary unchanged in `fixedY30_maxWait10`
   but changes one setup row: the 2022-11-14 setup's recorded trough would be 40.9146 (2022-11-21) instead of
   the engine's 40.5647 (2022-11-29), the close of session `armSession + 10`. So the engine evaluates
   session `armSession + M` before expiring. All three expiry sessions (2018-11-27, 2022-04-27, 2022-11-29)
   had an active 10% signal and neither implementation re-armed on them; both re-armed on the next session,
   so the "no same-session re-arm" reading is exercised and agrees.
2. **Initial stop of a next-open fill** (A: "this session's high and low count as post-entry"). The spec
   does not state the post-entry high before the fill session's own high is applied. *Implemented:*
   `postEntryHigh = stop basis = fill (open) price`, then the fill session's high raises it, as at a close
   fill. Because every bar has `high ≥ open` (checked: no OHLC inconsistencies in any data file), this equals
   `high × (1 − stop)` and cannot change results here.
3. **Frozen reference high for legacy next-open entries.** Legacy mode has no arming session.
   *Implemented:* the reference high of the decision session (the entry signal's), for both `frozenHigh`
   values, consistent with `entryReferenceHigh = recentHigh` in the original.
4. **`frozenHigh: 'fill'`** is the decision session's reference high (B.7: "alternative `fill` = `refHigh`
   of the decision session"), not the next-open fill session's. In `fixedY30_fillHigh` the option is
   exercised once (decision 2022-09-09: activation high 48.5264 vs decision high 47.7709, followed by a
   material-loss exit on 2022-09-26), but that restriction resolved by a lower-price re-entry on 2022-10-03
   before the reset level mattered, so both implementations produce output identical to `fixedY30_close`.
   The option's effect is therefore not independently confirmed by a differing result in this replay set.
5. **Episode low updates.** B.1 extends the episode low on every flat restricted session, while the
   original only does so on signal sessions before the entry test; E then extends it unconditionally. Since
   `min` is idempotent and both use the same close, the reset level at the B.2 test equals the original's.
   *Implemented:* as written in the spec.
6. **`order_invalid_open`** is implemented but never occurs (every open is positive).
"""


def main():
    with open(os.path.join(ENGINE_DIR, 'manifest.json')) as handle:
        manifest = json.load(handle)

    rows = []
    mismatches = []
    for config in manifest:
        cid = config['id']
        files = {kind: (os.path.join(ENGINE_DIR, f'{cid}_{kind}'), os.path.join(OUT_DIR, f'{cid}_{kind}'))
                 for kind in ('trades.csv', 'setups.csv', 'summary.json')}
        missing = [p for pair in files.values() for p in pair if not os.path.exists(p)]
        if missing:
            rows.append((cid, '-', '-', '-', '-', '-', 'no', 'FAIL'))
            mismatches.append((cid, f'missing files: {missing}'))
            continue
        t_ok, t_e, t_r, t_diff, t_first = compare_table(*files['trades.csv'], TRADE_NUMERIC)
        s_ok, s_e, s_r, s_diff, s_first = compare_table(*files['setups.csv'], SETUP_NUMERIC)
        m_ok, m_diff, m_first, engine_summary = compare_summary(*files['summary.json'])
        identical = all(filecmp.cmp(e, r, shallow=False) for e, r in files.values())
        ok = t_ok and s_ok and m_ok
        rows.append((cid, f'{t_e}/{t_r}', f'{s_e}/{s_r}', fmt_diff(t_diff), fmt_diff(s_diff), fmt_diff(m_diff),
                     'yes' if identical else 'no', 'PASS' if ok else 'FAIL',
                     engine_summary.get('netProfit'), engine_summary.get('maximumDrawdown')))
        for label, first in (('trades', t_first), ('setups', s_first), ('summary', m_first)):
            if first:
                mismatches.append((cid, f'{label}: {first}'))

    passed = sum(1 for r in rows if r[7] == 'PASS')
    header = ('config', 'trades e/r', 'setups e/r', 'max |Δ| trades', 'max |Δ| setups', 'max |Δ| summary',
              'byte-identical', 'result')
    widths = [max(len(str(r[i])) for r in rows + [header]) for i in range(len(header))]
    print('  '.join(h.ljust(w) for h, w in zip(header, widths)))
    for r in rows:
        print('  '.join(str(v).ljust(w) for v, w in zip(r[:8], widths)))
    print(f'\n{passed}/{len(rows)} PASS')
    for cid, text in mismatches:
        print(f'MISMATCH {cid}: {text}')

    lines = ['# Independent replay of the trailing-buy entry study', '',
             f'**Result: {passed}/{len(rows)} configurations PASS**'
             + (', every exported file byte-identical.' if all(r[6] == 'yes' for r in rows) else '.'), '',
             METHOD, '## Results', '',
             'Counts are engine/replay. Max |Δ| is the largest absolute difference over the numeric fields '
             '(prices, interest, profit; summary money fields).', '',
             '| config | trades | setups | max abs diff trades | max abs diff setups | max abs diff summary '
             '| net profit (engine) | max drawdown (engine) | byte-identical | result |',
             '|---|---|---|---|---|---|---|---|---|---|']
    for r in rows:
        net = f'{r[8]:,.2f}' if isinstance(r[8], (int, float)) else '-'
        mdd = f'{r[9]:,.2f}' if isinstance(r[9], (int, float)) else '-'
        lines.append(f'| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {net} | {mdd} | {r[6]} | {r[7]} |')
    lines += ['', '## Mismatches', '']
    if mismatches:
        for cid, text in mismatches:
            lines.append(f'- **{cid}** {text}')
    else:
        lines.append('None. No engine-side discrepancy against `STATE_MACHINE.md` or `allin-original.ts` was '
                     'found in these configurations.')
    lines += ['', READINGS]
    with open(REPORT, 'w') as handle:
        handle.write('\n'.join(lines))
    print(f'Wrote {REPORT}')
    return 0 if passed == len(rows) else 1


if __name__ == '__main__':
    sys.exit(main())
