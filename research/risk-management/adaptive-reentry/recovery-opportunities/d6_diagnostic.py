"""D6 diagnostic (no new strategy): classify the failure mechanism of EVERY baseline winner that the
fixed 3% / 5% / 8% rules missed (matching classification 'no entry'), from this family's own anchor
runs (REF_lower3, lower5, lower8). Writes D6_FAILURE_MECHANISMS.csv (one row per dataset x anchor x
missed baseline winner) and prints the counts per mechanism per threshold.

Mechanism definitions (primary classification by the documented precedence 1-6; every underlying
fact is also kept as its own column so no information is lost to the precedence):
1. variant_holding      - the variant held (or exited) another position at the baseline entry session
                          (reason_at_entry 'holding'/'exited'); the restriction machinery never saw it.
2. small_loss_trigger   - the episode blocking the entry was armed by a trivial net loss
                          (|loss| < $1,000), i.e. the restriction arguably should not have existed.
3. reached_intraday_only- within the restricted part of the opportunity window, some session's raw LOW
                          reached the required level but no CLOSE did (low <= level < close) - an
                          execution-convention miss (Family F territory).
4. signal_lapsed        - the episode resolved by recovery reset ON OR BEFORE the baseline winner's
                          last held session, but no 10% signal remained afterwards inside the span
                          (guaranteed by 'no entry'), so freedom came after the signal had lapsed.
5. reset_too_late       - the episode resolved by recovery reset only AFTER the baseline winner's
                          span had ended (or never resolved by reset in time).
6. never_reached_level  - residual: price never came back to the level in time; the episode resolved
                          later by a lower-price re-entry in a later span, or ran to the end of data.

The restricted opportunity window for price facts is sessions (exit_i, min(resolution_i, span_end)]
where span_end is the baseline winner's last held session. The 10% signal is recomputed exactly per
the engine convention (close >= 10% below the previous 90 sessions' highest high).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'common'))
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))

from engine import DATASETS, load  # noqa: E402

ANCHORS = {'REF_lower3': 0.03, 'lower5': 0.05, 'lower8': 0.08}
RES = HERE / 'results'
SMALL_LOSS = 1000.0


def main():
    rows = []
    for ds in DATASETS:
        df = load(ds)
        dates = df['date'].dt.date.astype(str).to_numpy()
        idx_of = {d: i for i, d in enumerate(dates)}
        low = df['low'].to_numpy(float)
        close = df['close'].to_numpy(float)
        high = df['high'].to_numpy(float)
        n = len(df)
        sig = np.zeros(n, bool)
        for i in range(1, n):
            rh = high[max(0, i - 90):i].max()
            sig[i] = 1 - close[i] / rh >= 0.10
        for name, t in ANCHORS.items():
            match = pd.read_csv(RES / 'matching' / f'{ds}__{name}.csv')
            ev = pd.read_csv(RES / 'events' / f'{ds}__{name}.csv')
            missed = match[(match['b_profit'] > 0) & (match['classification'] == 'no entry')]
            for _, r in missed.iterrows():
                be_i = idx_of[r['b_entry_date']]
                span_end = idx_of[r['b_last_held_date']]
                rec = dict(dataset=ds, anchor=name, threshold=t,
                           b_entry_date=r['b_entry_date'], b_exit_date=r['b_exit_date'],
                           b_profit=round(float(r['b_profit'])), reason_at_entry=r['reason_at_entry'],
                           v_overlapping_trades=r['v_overlapping_trades'] if isinstance(r['v_overlapping_trades'], str) else '')
                if r['reason_at_entry'] != 'blocked':
                    rec.update(mechanism='variant_holding', flag_small_loss=False, flag_intraday=False,
                               flag_signal_lapsed=False, flag_reset_too_late=False)
                    rows.append(rec)
                    continue
                # episode active at the baseline entry session
                cand = ev[(ev['exit_date'] <= r['b_entry_date'])
                          & ((ev['resolution_date'].fillna('') >= r['b_entry_date'])
                             | (ev['resolution_date'].fillna('') == ''))]
                assert len(cand), (ds, name, r['b_entry_date'], 'blocked but no covering episode')
                e = cand.iloc[-1]
                exit_i = idx_of[e['exit_date']]
                level = float(e['loss_exit_price']) * (1 - t)
                res_date = e['resolution_date'] if isinstance(e['resolution_date'], str) and e['resolution_date'] else None
                res_i = idx_of[res_date] if res_date else n - 1
                w0, w1 = exit_i + 1, min(res_i, span_end)
                win = np.arange(w0, w1 + 1)
                # sanity: no signal-session close at/below the level before resolution
                pre = win[win < res_i] if res_date else win
                assert not np.any(sig[pre] & (close[pre] <= level)), (ds, name, e['exit_date'], 'missed fill?')
                touch = win[low[win] <= level]
                is_reset = e['resolution'] == 'recovery_reset'
                reset_in_span = bool(is_reset and res_i <= span_end)
                reset_late = bool(is_reset and res_i > span_end)
                small = abs(float(e['loss'])) < SMALL_LOSS
                intraday = bool(len(touch))
                if small:
                    mech = 'small_loss_trigger'
                elif intraday:
                    mech = 'reached_intraday_only'
                elif reset_in_span:
                    mech = 'signal_lapsed'
                elif reset_late:
                    mech = 'reset_too_late'
                else:
                    mech = 'never_reached_level'
                rec.update(
                    mechanism=mech, flag_small_loss=small, flag_intraday=intraday,
                    flag_signal_lapsed=reset_in_span, flag_reset_too_late=reset_late,
                    episode_exit_date=e['exit_date'], episode_loss=round(float(e['loss'])),
                    loss_exit_price=round(float(e['loss_exit_price']), 4), required_level=round(level, 4),
                    episode_resolution=e['resolution'], resolution_date=res_date or 'unresolved',
                    min_close_in_window=round(float(close[win].min()), 4),
                    min_close_gap_pct=round((close[win].min() / level - 1) * 100, 2),
                    n_intraday_touches=int(len(touch)),
                    first_touch_date=dates[touch[0]] if len(touch) else '',
                    deepest_low_vs_level_pct=round((low[win].min() / level - 1) * 100, 2),
                    touch_with_signal=bool(np.any(sig[touch])) if len(touch) else False,
                    signal_at_resolution=bool(sig[res_i]) if res_date else None)
                rows.append(rec)
    out = pd.DataFrame(rows)
    out.to_csv(HERE / 'D6_FAILURE_MECHANISMS.csv', index=False)
    print(f'{len(out)} missed baseline winners -> D6_FAILURE_MECHANISMS.csv\n')
    for val, label in [('b_profit', 'baseline P&L ($) of missed winners'), (None, 'counts')]:
        print(f'== {label} per mechanism per threshold (all datasets) ==')
        if val is None:
            piv = out.pivot_table(index='mechanism', columns='anchor', aggfunc='size', fill_value=0)
        else:
            piv = out.pivot_table(index='mechanism', columns='anchor', values=val, aggfunc='sum', fill_value=0)
        print(piv.to_string(), '\n')
    print('== counts per mechanism per threshold per dataset ==')
    print(out.pivot_table(index=['dataset', 'mechanism'], columns='anchor', aggfunc='size', fill_value=0).to_string())


if __name__ == '__main__':
    main()
