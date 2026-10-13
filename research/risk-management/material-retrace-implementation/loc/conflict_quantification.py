"""Same-session eligibility conflict between the LOC limit and the retracement reset (question 6).

Reads the PRODUCTION run outputs results/ts/<case>/states.csv (one row per restricted session, written by
src/app/allIn.ts) and the price files, and quantifies, for every restricted session i on which an LOC
could have been submitted (flat at the session start, previous session restricted):

  entry_level_i     = min(0.90 * H90prev_i, 0.97 * lossExit)      (knowable before the close)
  reset_level_prev  = episodeLow_{i-1} + 0.38 * (refHigh - episodeLow_{i-1})   (knowable before the close;
                      the reset_level logged on the PREVIOUS restricted row, whose episode_low already
                      includes that session's close)
  cap_binding       = reset_level_prev <= entry_level_i   -> the LOC limit must be capped just below the
                      reset level, otherwise a close in [reset_level_prev, entry_level_i] would fill the LOC
                      while the production rule resets instead of buying.
  conflict_band_hit = cap_binding and reset_level_prev <= close <= entry_level_i  (an uncapped LOC fills wrongly)

Derivation of reset_level_prev: production tests close >= episodeLow_i + 0.38 (H - episodeLow_i) with
episodeLow_i including today's close. If today's close is a new episode low, episodeLow_i = close and the
reset level is close + 0.38 (H - close) > close, so no reset; otherwise episodeLow_i = episodeLow_{i-1}.
Hence reset at i  <=>  close_i >= reset_level_prev, which is knowable before the close.

Outputs: results/conflict_sessions.csv (every restricted session with the quantities above) and
results/conflict_summary.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
TS = HERE.parent / 'results' / 'ts'
RESULTS = HERE / 'results'

CASES = {
    'VGT_2016_2026': ('data/VGT/VGT-2016-2026.csv', None),
    'VGT_2016_2025': ('data/VGT/VGT-2016-2026.csv', '2025-12-31'),
    'VGT_2005_2015': ('data/VGT/VGT-2004-2015.csv', None),
    'QQQ_1999_2015': ('data/QQQ/QQQ-1999-2015.csv', None),
    'QQQ_2016_2026': ('data/QQQ/QQQ-2016-2026.csv', None),
}
WINDOW, TARGET, LOWER, RETRACE = 90, 0.10, 0.03, 0.38


def prices(file, end):
    df = pd.read_csv(REPO / file, sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    df['date'] = pd.to_datetime(df['date'])
    if end:
        df = df[df['date'] <= end]
    df = df.reset_index(drop=True)
    h = df['high'].to_numpy(dtype=float)
    h90 = np.full(len(df), np.nan)
    for i in range(1, len(df)):
        h90[i] = h[max(0, i - WINDOW):i].max()
    df['h90prev'] = h90
    return df


def main():
    RESULTS.mkdir(parents=True, exist_ok=True)
    rows = []
    summary = {}
    for case, (file, end) in CASES.items():
        px = prices(file, end)
        st = pd.read_csv(TS / case / 'states.csv')
        st = st.sort_values('index').reset_index(drop=True)
        # episodes: a losing_exit row starts one; the following rows with prev_state RESTRICTED belong to it
        # until a row whose new_state is NORMAL (lower_price_reentry / recovery_reset) or the data ends.
        episode_id = None
        prev_reset = np.nan
        n_restricted_sessions = 0
        n_cap = 0
        n_band = 0
        for _, r in st.iterrows():
            if r['reason'] == 'losing_exit':
                episode_id = int(r['index'])
                prev_reset = float(r['reset_level'])  # episode low = exit-session close
                continue
            if r['prev_state'] != 'RESTRICTED' or episode_id is None:
                continue
            i = int(r['index'])
            if i == episode_id:
                # states.csv also writes an end-of-session row for the exit session itself; the strategy
                # held a position at that session's start, so no LOC would have been submitted.
                prev_reset = float(r['reset_level'])
                continue
            # the sessions after the exit session on which the strategy is flat: every restricted row except
            # the exit row itself (the production loop never opens on an exit session)
            h90 = float(px.loc[i, 'h90prev'])
            close = float(r['close'])
            assert abs(close - float(px.loc[i, 'close'])) < 1e-9, (case, i)
            lower_level = float(r['lower_level'])
            entry_level = min((1 - TARGET) * h90, lower_level)
            cap_binding = prev_reset <= entry_level
            band_hit = cap_binding and (prev_reset <= close <= entry_level)
            n_restricted_sessions += 1
            n_cap += int(cap_binding)
            n_band += int(band_hit)
            rows.append(dict(case=case, episode_exit_index=episode_id, index=i, date=r['date'], reason=r['reason'],
                             close=close, h90prev=h90, signal_level=(1 - TARGET) * h90, lower_level=lower_level,
                             entry_level=entry_level, reset_level_prev=prev_reset, cap_binding=cap_binding,
                             capped_limit_vs_entry_level=(prev_reset / entry_level - 1) if cap_binding else np.nan,
                             close_in_conflict_band=band_hit, entry_executed=bool(r['entry_executed']),
                             close_vs_reset_prev=close / prev_reset - 1, close_vs_entry_level=close / entry_level - 1,
                             production_reset=(r['reason'] == 'recovery_reset')))
            # next session's knowable reset level = this row's logged reset level (episode low incl. this close)
            prev_reset = float(r['reset_level'])
            if r['new_state'] == 'NORMAL':
                episode_id = None
        sub = pd.DataFrame([x for x in rows if x['case'] == case])
        entries = sub[sub['entry_executed']]
        resets = sub[sub['production_reset']]
        summary[case] = dict(
            restricted_flat_sessions=n_restricted_sessions,
            cap_binding_sessions=n_cap,
            cap_binding_share=(n_cap / n_restricted_sessions) if n_restricted_sessions else None,
            uncapped_loc_wrong_fill_sessions=n_band,
            production_resets=int(len(resets)),
            resets_with_close_at_or_below_entry_level=int((resets['close'] <= resets['entry_level']).sum()),
            restricted_entries=int(len(entries)),
            restricted_entries_with_cap_binding=int(entries['cap_binding'].sum()),
            restricted_entries_min_margin_below_reset_prev=float(entries['close_vs_reset_prev'].min()) if len(entries) else None,
            restricted_entries_max_margin_below_reset_prev=float(entries['close_vs_reset_prev'].max()) if len(entries) else None,
            restricted_entries_in_conflict_band=int(entries['close_in_conflict_band'].sum()),
        )
    out = pd.DataFrame(rows)
    out.to_csv(RESULTS / 'conflict_sessions.csv', index=False)
    with open(RESULTS / 'conflict_summary.json', 'w') as f:
        json.dump(summary, f, indent=1)
    print(json.dumps(summary, indent=1))
    pd.set_option('display.width', 250)
    cols = ['case', 'index', 'date', 'reason', 'close', 'entry_level', 'reset_level_prev', 'cap_binding',
            'close_in_conflict_band', 'entry_executed', 'close_vs_reset_prev']
    print('\nSessions where an UNCAPPED LOC would have filled although production resets (close in band):')
    print(out[out['close_in_conflict_band']][cols].to_string(index=False))
    print('\nRestricted entries (close vs the knowable reset level):')
    print(out[out['entry_executed']][cols].to_string(index=False))


if __name__ == '__main__':
    main()
