import json
import pandas as pd

sm = json.load(open('results/summary.json'))
print('=== BEAR WINDOWS (period P&L / max DD in window / trades closed / losing / interest) ===')
for r in sm:
    bw = r['metrics']['bear_windows']
    for w, s in bw.items():
        print(f"{r['dataset']:14s} {r['config']:14s} {w:10s} pnl {s['pnl']:>9,.0f}  dd {s['max_drawdown']:>9,.0f}  "
              f"closed {s['trades_closed']:>3d}  losing {s['losing_trades']:>3d}  largest {s['largest_loss']:>9,.0f}  int {s['interest']:>7,.0f}")
print()
print('=== RECOVERY WINDOWS EXT (period P&L; trades entered; pnl of trades entered) ===')
for r in sm:
    for w, s in r['extra']['recovery_windows_ext'].items():
        print(f"{r['dataset']:14s} {r['config']:14s} {w:5s} pnl {s['pnl']:>9,.0f}  entered {s['trades_entered']:>2d}  "
              f"pnl_entered {s['pnl_of_trades_entered']:>9,.0f}")
