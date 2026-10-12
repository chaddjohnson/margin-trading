"""Family F daily-OHLC diagnostic: every restricted, flat session where session low <= required level < close.

Reads the anchor runs' states CSVs (results/states/) plus the raw OHLC (engine.load) and classifies each
occurrence:

  (a) legitimately executable resting limit — the restriction and the level were frozen BEFORE the session
      (armed at an earlier session's close, no reset through the prior close) AND the level itself satisfies
      the dip condition computable before the open: level <= 0.90 * max(high[i-90 .. i-1]) (the engine's
      prev-90-session rolling high, known at the open). NOTE: the engine's actual entry signal is
      CLOSE-based (close <= 0.90 * rolling high); the close is NOT knowable intraday, so class (a) demands
      the condition hold AT THE LIMIT PRICE ITSELF, which is decidable before the open.
  (b) executable only under a close-dependent condition — the limit price itself does NOT satisfy the dip
      condition (level > 0.90 * prev-90 high), so an intraday fill at the level could not know the
      close-based 10% signal would hold; the entry is legitimate only given information from the close.
  (c) gap-through — open < level: a resting limit fills at the OPEN, not the level.
  (d) ambiguous intraday ordering — the same session's close also satisfies the engine's reset condition
      (close >= 0.95 * frozen ref high), so the intraday fill conflicts with the engine's reset-priority
      rule; OR the occurrence is on the ARMING exit session itself (the restriction arms intra-session at
      the losing exit, so no limit was resting before the open and daily bars cannot order the low vs the
      exit). Arming-session occurrences are listed with on_arming_session=True.

Precedence: arming-session (d) > reset-conflict (d) > gap-through (c) > dip-at-level (a) > (b).
`marginal_touch` flags low > level * 0.999 (fails the 0.1%-penetration sensitivity requirement).

Outputs: results/diagnostic/occurrences.csv (one row per occurrence, all datasets x thresholds),
results/diagnostic/summary.csv (counts per dataset/threshold/class), and
results/diagnostic/below_level_no_signal.csv (auxiliary: restricted flat sessions where close <= level but
the close-based 10% signal had lapsed — the engine cannot enter there either, and a resting limit WOULD
have filled; not part of the spec's low<=level<close enumeration but material for the execution model).
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

CONFIGS = {'REF_lower3': 0.03, 'lower5': 0.05, 'lower8': 0.08}
RESET_FRACTION = 0.95
DIP_FRACTION = 0.90
WINDOW = 90
SENS = 0.999


def roll_high_prev(h, window=WINDOW):
    out = np.full(len(h), np.nan)
    for i in range(1, len(h)):
        out[i] = h[max(0, i - window):i].max()
    return out


def diagnose():
    occ_rows, aux_rows = [], []
    for ds in DATASETS:
        df = load(ds)
        o, h, l, c = (df[k].to_numpy(dtype=float) for k in ['open', 'high', 'low', 'close'])
        rhp = roll_high_prev(h)
        for cfg, pct in CONFIGS.items():
            states = pd.read_csv(HERE / 'results' / 'states' / f'{ds}__{cfg}.csv')
            episode_exit_date, arming_i = None, None
            for _, r in states.iterrows():
                i = int(r['i'])
                restricted_during_session = False
                on_arming = False
                if r['prev_state'] == 'NORMAL' and r['new_state'] == 'RESTRICTED':
                    episode_exit_date, arming_i = r['date'], i
                    on_arming = True          # armed intra-session at the losing exit
                    restricted_during_session = True
                elif r['prev_state'] == 'RESTRICTED':
                    restricted_during_session = True
                    if i == arming_i:
                        continue              # second log row of the arming session (already counted as (d))
                if not restricted_during_session or bool(r['entry_executed']):
                    continue                  # entry rows (close <= level) are engine entries, not misses
                exit_price = float(r['loss_exit_price'])
                ref_high = float(r['ref_high'])
                level = exit_price * (1 - pct)
                if not np.isnan(r.get('required_level', np.nan)) and not on_arming:
                    assert abs(level - float(r['required_level'])) < 1e-9, (ds, cfg, r['date'])
                low_i, close_i, open_i = l[i], c[i], o[i]
                dip_ok_at_level = level <= DIP_FRACTION * rhp[i]
                reset_at_close = close_i >= RESET_FRACTION * ref_high
                if low_i <= level < close_i:
                    if on_arming:
                        klass = 'd_ambiguous'
                        why = 'arming exit session: level not frozen before the open'
                    elif reset_at_close:
                        klass = 'd_ambiguous'
                        why = 'close also satisfies the reset: fill vs reset-priority ordering unknown'
                    elif open_i < level:
                        klass = 'c_gap_through'
                        why = 'open below level: resting limit fills at the open'
                    elif dip_ok_at_level:
                        klass = 'a_executable'
                        why = 'level frozen pre-open and level <= 0.90 x prev-90 high'
                    else:
                        klass = 'b_close_dependent'
                        why = 'level > 0.90 x prev-90 high: 10% dip not guaranteed at the limit price'
                    occ_rows.append(dict(
                        dataset=ds, config=cfg, date=r['date'], i=i, klass=klass,
                        episode_exit_date=episode_exit_date, loss_exit_price=exit_price,
                        required_level=level, open=open_i, high=h[i], low=low_i, close=close_i,
                        prev90_high=rhp[i], dip_bound=DIP_FRACTION * rhp[i],
                        level_vs_dip_bound=level / (DIP_FRACTION * rhp[i]) - 1,
                        ref_high=ref_high, reset_level=RESET_FRACTION * ref_high,
                        signal_10pct_at_close=bool(r['signal_10pct']),
                        on_arming_session=on_arming, reset_at_close=reset_at_close,
                        gap_through=open_i < level,
                        fill_price=open_i if open_i < level else level,
                        marginal_touch=not (low_i <= level * SENS),
                        close_miss_pct=close_i / level - 1,
                        why=why))
                elif close_i <= level and not bool(r['signal_10pct']) and not on_arming:
                    aux_rows.append(dict(
                        dataset=ds, config=cfg, date=r['date'], i=i,
                        episode_exit_date=episode_exit_date, required_level=level,
                        open=open_i, low=low_i, close=close_i,
                        dip_ok_at_level=dip_ok_at_level, reset_at_close=reset_at_close,
                        note='close <= level but close-based 10% signal lapsed; engine cannot enter'))
    occ = pd.DataFrame(occ_rows)
    aux = pd.DataFrame(aux_rows)
    out = HERE / 'results' / 'diagnostic'
    out.mkdir(parents=True, exist_ok=True)
    occ.to_csv(out / 'occurrences.csv', index=False)
    aux.to_csv(out / 'below_level_no_signal.csv', index=False)
    if len(occ):
        summary = (occ.groupby(['dataset', 'config', 'klass']).size().unstack(fill_value=0)
                   .reindex(columns=['a_executable', 'b_close_dependent', 'c_gap_through', 'd_ambiguous'],
                            fill_value=0))
        summary['total'] = summary.sum(axis=1)
        summary['marginal_touches'] = occ[occ['marginal_touch']].groupby(['dataset', 'config']).size()
        summary['marginal_touches'] = summary['marginal_touches'].fillna(0).astype(int)
        summary.to_csv(out / 'summary.csv')
        print(summary.to_string())
        print('\nAuxiliary (close <= level, signal lapsed):',
              aux.groupby(['dataset', 'config']).size().to_dict() if len(aux) else 'none')
    else:
        print('No occurrences found.')
    return occ, aux


if __name__ == '__main__':
    diagnose()
