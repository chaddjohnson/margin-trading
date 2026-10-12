"""Verification for experiment 1 (sma_sizing). Run after run.py. Writes results/verification.json.

1. A_baseline reproduces baseline/results/summary.json exactly (metrics and matched_control, compared as parsed
   JSON with ==), and its trades/daily CSVs are byte-identical to the baseline's.
2. SMA200 values logged by config B equal an independent pandas rolling(200) computation on the raw file, and the
   logged regime/size follows from them.
3. Config B has the same trade sequence as the baseline (entry session, exit session, exit price, reason), and each
   trade's P&L equals the baseline trade's P&L x size / $100,000.
4. Look-ahead test: re-running B on the file truncated after session N leaves every entry before N with the same
   size (so no entry decision reads data after its own session).
5. Spot checks: concrete entries with date, close, SMA200, SMA200 twenty sessions earlier, regime and size.
"""
import filecmp
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'baseline'
sys.path.insert(0, str(BASE))
sys.path.insert(0, str(HERE))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from engine import DATASETS, REPO, Engine, load  # noqa: E402
from strategies import BearishSMA200Sizing  # noqa: E402

RES = HERE / 'results'
B = 'B_bearish_sma200_sizing'
report = {}

# 1. A_baseline vs frozen baseline
mine = {(r['config'], r['dataset']): r for r in json.load(open(RES / 'summary.json'))}
base = {r['dataset']: r for r in json.load(open(BASE / 'results' / 'summary.json'))}
chk = {}
for ds in DATASETS:
    a = mine[('A_baseline', ds)]
    chk[ds] = dict(
        metrics_equal=a['metrics'] == base[ds]['metrics'],
        matched_control_equal=a['matched_control'] == base[ds]['matched_control'],
        trades_csv_identical=filecmp.cmp(RES / 'trades' / f'{ds}__A_baseline.csv', BASE / 'results' / 'trades' / f'{ds}__baseline.csv', shallow=False),
        daily_csv_identical=filecmp.cmp(RES / 'daily' / f'{ds}__A_baseline.csv', BASE / 'results' / 'daily' / f'{ds}__baseline.csv', shallow=False),
    )
report['A_reproduces_baseline'] = chk

# 2. independent SMA check and 3. trade invariance / scaling
sma_chk, inv_chk = {}, {}
for ds in DATASETS:
    raw = pd.read_csv(REPO / DATASETS[ds]['file'], sep='|', header=None, names=['date', 'open', 'high', 'low', 'close', 'volume'])
    sma = raw['close'].rolling(200).mean()
    sma_lag = sma.shift(20)
    ent = pd.read_csv(RES / 'entries' / f'{ds}__{B}.csv')
    i = ent['entry_i'].to_numpy()
    full = ent['regime'] != 'fallback'
    err_sma = np.nanmax(np.abs(ent.loc[full, 'sma200'].to_numpy() - sma.iloc[i[full]].to_numpy()))
    err_lag = np.nanmax(np.abs(ent.loc[full, 'sma200_lag20'].to_numpy() - sma_lag.iloc[i[full]].to_numpy()))
    exp_bear = (raw['close'].iloc[i] < sma.iloc[i]) & (sma.iloc[i] < sma_lag.iloc[i])
    exp_size = np.where(sma_lag.iloc[i].isna(), 100000.0, np.where(exp_bear, 50000.0, 100000.0))
    sma_chk[ds] = dict(max_abs_err_sma200=float(err_sma), max_abs_err_sma200_lag20=float(err_lag),
                       fallback_iff_index_below_219=bool(((ent['entry_i'] < 219) == (ent['regime'] == 'fallback')).all()),
                       fallback_iff_pandas_lag_nan=bool((sma_lag.iloc[i].isna().to_numpy() == (ent['regime'] == 'fallback').to_numpy()).all()),
                       sizes_match_independent_rule=bool((exp_size == ent['size'].to_numpy()).all()),
                       entry_close_matches_file=bool(np.allclose(ent['close'], raw['close'].iloc[i], rtol=0, atol=0)))
    ta = pd.read_csv(RES / 'trades' / f'{ds}__A_baseline.csv')
    tb = pd.read_csv(RES / 'trades' / f'{ds}__{B}.csv')
    same = (len(ta) == len(tb) and (ta['entry_i'] == tb['entry_i']).all()
            and (ta['exit_i'].fillna(-1) == tb['exit_i'].fillna(-1)).all()
            and (ta['exit_price'] == tb['exit_price']).all() and (ta['reason'] == tb['reason']).all())
    scale = tb['investment'] / 100000.0
    inv_chk[ds] = dict(identical_trade_sequence=bool(same),
                       max_abs_profit_scaling_error=float((tb['profit'] - ta['profit'] * scale).abs().max()),
                       max_abs_interest_scaling_error=float((tb['interest'] - ta['interest'] * scale).abs().max()))
report['sma_independent_check'] = sma_chk
report['trade_invariance_and_scaling'] = inv_chk

# 4. look-ahead (truncation) test
la = {}
for ds in DATASETS:
    df = load(ds)
    full_ent = pd.read_csv(RES / 'entries' / f'{ds}__{B}.csv')
    cuts = [int(len(df) * f) for f in (0.25, 0.5, 0.75)]
    ok = True
    for n in cuts:
        s = BearishSMA200Sizing()
        Engine(df.iloc[:n].reset_index(drop=True), s).run()
        t = pd.DataFrame(s.entries)
        ref = full_ent[full_ent['entry_i'] < n]
        ok &= len(t) == len(ref) and (t['entry_i'].to_numpy() == ref['entry_i'].to_numpy()).all() and (t['size'].to_numpy() == ref['size'].to_numpy()).all()
    la[ds] = dict(cuts=cuts, entries_and_sizes_unchanged=bool(ok))
report['look_ahead_truncation_test'] = la

# 5. spot checks: per dataset, the first bearish entry, the first normal entry, and the largest winner
spots = []
for ds in DATASETS:
    ent = pd.read_csv(RES / 'entries' / f'{ds}__{B}.csv')
    picks = []
    for cond in (ent['regime'] == 'bearish', ent['regime'] == 'normal', ent['regime'] == 'fallback'):
        if cond.any():
            picks.append(ent[cond].index[0])
    picks.append(ent[ent['reason'] != 'open']['profit'].idxmax())
    for k in dict.fromkeys(picks):
        r = ent.loc[k]
        spots.append(dict(dataset=ds, date=r['date'], entry_i=int(r['entry_i']), close=r['close'],
                          sma200=None if pd.isna(r['sma200']) else r['sma200'],
                          sma200_lag20=None if pd.isna(r['sma200_lag20']) else r['sma200_lag20'],
                          regime=r['regime'], size=r['size'], exit_date=r['exit_date'], reason=r['reason'], profit=r['profit']))
report['spot_checks'] = spots

# 6. hand spot checks in plain Python (csv + math.fsum, no numpy/pandas), with fills compared between A and B
import csv  # noqa: E402
import math  # noqa: E402
HAND = [('VGT_2005_2015', '2006-06-26'), ('QQQ_1999_2015', '2000-01-05'), ('QQQ_1999_2015', '2009-03-09'),
        ('VGT_2016_2026', '2020-04-03'), ('QQQ_2016_2026', '2018-12-26'), ('QQQ_2016_2026', '2022-04-28')]
hand = []
for ds, date in HAND:
    rows = list(csv.reader(open(REPO / DATASETS[ds]['file']), delimiter='|'))
    i = [r[0] for r in rows].index(date)
    close = [float(r[4]) for r in rows]
    high = [float(r[2]) for r in rows]
    sma = math.fsum(close[i - 199:i + 1]) / 200 if i >= 199 else None
    lag = math.fsum(close[i - 219:i - 19]) / 200 if i >= 219 else None
    size = 100000.0 if lag is None else (50000.0 if close[i] < sma and sma < lag else 100000.0)
    ta = pd.read_csv(RES / 'trades' / f'{ds}__A_baseline.csv')
    tb = pd.read_csv(RES / 'trades' / f'{ds}__{B}.csv')
    a, b = ta[ta['entry_i'] == i].iloc[0], tb[tb['entry_i'] == i].iloc[0]
    rec = dict(dataset=ds, date=date, i=i, close=close[i], sma200=sma, sma200_lag20=lag, hand_size=size, engine_size_B=b['investment'],
               shares_B=b['shares'], shares_B_expected=size / close[i], exit_date=b['exit_date'], reason=b['reason'],
               exit_price_A=a['exit_price'], exit_price_B=b['exit_price'], profit_A=a['profit'], profit_B=b['profit'],
               interest_A=a['interest'], interest_B=b['interest'])
    if b['reason'] == 'trailing stop':  # stop level = 8% below max(entry close, highs of entry+1 .. exit-1)
        x = int(b['exit_i'])
        rec['trailing_stop_expected'] = 0.92 * max([close[i]] + high[i + 1:x])
    assert rec['hand_size'] == rec['engine_size_B'] and rec['exit_price_A'] == rec['exit_price_B'], rec
    assert abs(rec['shares_B'] - rec['shares_B_expected']) < 1e-9 and abs(rec['profit_B'] - rec['profit_A'] * size / 1e5) < 1e-6, rec
    if 'trailing_stop_expected' in rec:
        assert abs(rec['trailing_stop_expected'] - rec['exit_price_B']) < 1e-9, rec
    hand.append(rec)
report['hand_spot_checks'] = hand
print(pd.DataFrame(hand).T.to_string())

json.dump(report, open(RES / 'verification.json', 'w'), indent=1, default=str)
flat_ok = (all(all(v.values()) for v in chk.values()) and all(v['identical_trade_sequence'] for v in inv_chk.values())
           and all(v['entries_and_sizes_unchanged'] for v in la.values())
           and all(v['sizes_match_independent_rule'] and v['fallback_iff_index_below_219'] and v['fallback_iff_pandas_lag_nan'] for v in sma_chk.values()))
print(json.dumps({k: v for k, v in report.items() if k != 'spot_checks'}, indent=1, default=str))
print(pd.DataFrame(spots).to_string())
print('ALL CHECKS PASSED' if flat_ok else 'CHECK FAILURE')
