"""Validate the Python engine against the TypeScript reference copy of allIn.ts, trade by trade.
Writes results/reference_validation.json. Run from the repository root or anywhere (paths are absolute)."""
import json
import re
import subprocess
from pathlib import Path

from engine import DATASETS, REPO, run

CASES = [(d, None, None) for d in DATASETS] + [('QQQ_2016_2026', None, '2026-10-06')]
out = []
for ds, start, end in CASES:
    spec = DATASETS[ds]
    cmd = ['node', '--experimental-transform-types', '--disable-warning=ExperimentalWarning',
           'research/risk-management/baseline/reference/run_reference.ts', spec['symbol'], start or '-', end or '-', spec['file']]
    txt = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True, check=True).stdout
    entries = re.findall(r'Entered at .* on (\d{4}-\d\d-\d\d)T', txt)
    exits = re.findall(r'Exited at (\d{4}-\d\d-\d\d)T.*profit of (-?)\$([\d,]+) after', txt)
    num = lambda pat: float(re.search(pat, txt).group(1).replace(',', '')) * (-1 if re.search(pat, txt).group(0).count('-$') else 1)
    ts = dict(net=num(r'Total net profit: -?\$([\d,]+)'), mdd=num(r'Maximum drawdown \(daily mark-to-market\): \$([\d,]+)'),
              interest=num(r'Margin interest: \$([\d,]+)'), closed=int(re.search(r'Closed trades: (\d+)', txt).group(1)),
              open='plus 1 still open' in txt)
    r = run(ds, start=start, end=end)
    tr = r['trades']
    closed = tr[tr.reason != 'open']
    mism = []
    for k, (row, ex) in enumerate(zip(closed.itertuples(), exits)):
        p = float(ex[2].replace(',', '')) * (-1 if ex[1] else 1)
        if str(row.entry_date) != entries[k] or str(row.exit_date) != ex[0] or round(row.profit) != p:
            mism.append(k)
    open_ok = (len(entries) == len(tr)) and (ts['open'] == r['open'])
    py = dict(net=round(r['net']), mdd=round(r['mdd']), interest=round(r['interest']), closed=r['closed'], open=r['open'])
    ok = not mism and open_ok and len(exits) == len(closed) and py['net'] == ts['net'] and py['mdd'] == ts['mdd'] \
        and py['interest'] == ts['interest'] and py['closed'] == ts['closed']
    out.append(dict(dataset=ds, start=start or r['first_date'], end=end or r['last_date'], typescript=ts, python=py,
                    trades_compared=len(exits), entries_compared=len(entries), trade_mismatches=mism, match=ok))
    print(ds, start, end, 'TS', ts, 'PY', py, 'trade mismatches', len(mism), 'MATCH' if ok else 'FAIL')
Path(__file__).parent.joinpath('results').mkdir(exist_ok=True)
json.dump(out, open(Path(__file__).parent / 'results' / 'reference_validation.json', 'w'), indent=1)
assert all(o['match'] for o in out)
print('ALL MATCH')
