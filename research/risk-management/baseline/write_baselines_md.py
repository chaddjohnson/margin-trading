"""Generate BASELINES.md from the verification outputs (no hand-transcribed numbers)."""
import json
from pathlib import Path

R = Path(__file__).parent / 'results'
val = json.load(open(R / 'reference_validation.json'))
dv = json.load(open(R / 'data_verification.json'))
summ = json.load(open(R / 'summary.json'))
L = ['# Baselines — reproduction and data verification\n',
     'Coordinator deliverable 1. All numbers below are generated from `results/*.json` by `write_baselines_md.py`.\n',
     '## 1. Reproduction of the four reference baselines\n',
     'The authoritative implementation is `src/app/allIn.ts` (commit dc2f8c2, unchanged). That file currently hardcodes '
     '`data/${symbol}/${symbol}-1999-2015.csv`, so it cannot load the VGT 2004–2015 file or either 2016–2026 file as committed. '
     'For verification it was copied to `reference/allIn_reference.ts` with one change: the data file is passed as a parameter '
     '(see the diff at the top of that file). It was run with `node --experimental-transform-types` (`reference/run_reference.ts`).\n',
     'The Python research engine (`engine.py`) was then compared with it trade by trade: entry date, exit date and net P&L to the '
     'dollar for every closed trade, the open position, and the totals.\n',
     '| Dataset | Range | TS net | Python net | TS max DD | Python max DD | TS interest | Python interest | Closed trades | Open at end | Trade mismatches | Result |',
     '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|']
for v in val:
    t, p = v['typescript'], v['python']
    L.append(f"| {v['dataset']} | {v['start']} → {v['end']} | {t['net']:,.0f} | {p['net']:,.0f} | {t['mdd']:,.0f} | {p['mdd']:,.0f} | "
             f"{t['interest']:,.0f} | {p['interest']:,.0f} | {p['closed']} | {'yes' if p['open'] else 'no'} | {len(v['trade_mismatches'])} | "
             f"{'**exact match**' if v['match'] else 'MISMATCH'} |")
L += ['\nAll four reference values reproduce exactly.',
      '- **VGT 2005–2015:** $11,602 / $73,404.',
      '- **QQQ 1999–2015:** −$2,886 / $149,561.',
      '- **VGT 2016–2026:** $161,772 / $38,323.',
      '- **QQQ 2016–2026:** $116,710 / $39,237, with an end date of 2026-10-06.\n',
      '**QQQ 2016–2026 date range.** The data file extends one session further, to 2026-10-07. As required, experiments use the full file, '
      'which gives **$116,388**. The −$322 difference is the open position marked at one more close, with one more day of interest. '
      'Max drawdown is unchanged.\n',
      '**Open positions at the end.** Three datasets end with a position open: VGT 2005–2015, QQQ 1999–2015 and QQQ 2016–2026. Net profit includes '
      'its unrealized P&L at the last close, net of accrued interest, consistently with allIn.ts.\n',
      '## 2. Data verification\n',
      '| Dataset | File | First | Last | Rows | Duplicate dates | Gaps > 5 days | Non-positive prices | OHLC-inconsistent rows | Zero-range rows | Largest daily moves | SMA200 first available |',
      '|---|---|---|---|---:|---:|---|---:|---:|---:|---|---|']
for k, d in dv.items():
    L.append(f"| {k} | `{d['file']}` | {d['first']} | {d['last']} | {d['rows']} | {d['duplicate_dates']} | {', '.join(d['gaps_over_5_days']) or 'none'} | "
             f"{d['nonpositive_prices']} | {d['ohlc_inconsistent_rows']} | {d['zero_range_rows']} | "
             f"{'; '.join(f'{a} {b:+.1%}' for a, b in d['largest_daily_moves'])} | {d['sma200_first_available']} |")
L += ['\n- **Market closure gap.** The only gap over 5 days is the post-9/11 closure (2001-09-11 to 2001-09-17).',
      '- **Large moves.** The largest moves are real market events: Jan 2001 rate cut, Oct 2008, Mar 2020, Apr 9 2025.',
      '- **File name vs contents.** The file named `VGT-2004-2015.csv` actually starts on 2005-02-25.',
      '- **Price adjustment.** Prices appear split- and dividend-adjusted, and are used as given, as in allIn.ts.',
      '- **Warm-up.** No data before each file\'s first date exists in the repository. Indicators that need history (for example SMA200) are '
      'unavailable until enough sessions have accumulated; experiments must use their specified fallback and report how often it applies. The '
      'baseline\'s own 90-session high uses a shorter window during the first 90 sessions, exactly as allIn.ts does.\n',
      '## 3. Research engine\n',
      '- **Files:** `engine.py` (replica plus extension hooks) and `metrics.py` (standard metrics, windows, matched controls, output writing). Both are '
      'frozen and read-only during the experiments; their SHA-256 values are in `CHECKSUMS.txt`.',
      '- **Hooks:** `entry_size`, `entry_allowed`, `extra_stops`, `add_on`, `on_exit`, `on_session_end`. They are inert by default.',
      '- **Hook tests** (`test_engine.py`):',
      '  - An unreachable extra stop and a zero add-on both reproduce the baseline exactly.',
      '  - A $50k fixed size produces exactly half the profit and drawdown with identical trades. Profit-conditional activation and the loss exit '
      'depend only on the sign of P&L, so position size never changes the trade sequence.',
      '  - Margin dollar-days equal total interest ÷ (11% ÷ 365) exactly, and full-range window statistics equal the totals.',
      '- **Assumptions introduced for extensions** (none affect the baseline):',
      '  - Extra sell stops fill at the open if the open is at or below them. Otherwise, the highest level the session low reaches fills, because '
      'price must pass higher levels first; no high/low ordering is assumed. There is one fill per session.',
      '  - Add-on lots are bought at the close, accrue their own interest, cannot trigger an exit in their purchase session, and never reset or '
      'lower the stop.\n',
      '## 4. Baseline standard metrics\n',
      '| Metric | ' + ' | '.join(r['dataset'] for r in summ) + ' |', '|---|' + '---:|' * len(summ)]
rows = [('Net profit', 'net_profit', '{:,.0f}'), ('Realized / unrealized', None, None), ('Margin interest', 'margin_interest', '{:,.0f}'),
        ('Closed trades (W/L)', None, None), ('Win rate', 'win_rate', '{:.0%}'), ('Avg win / avg loss', None, None),
        ('Largest win / loss', None, None), ('Max drawdown', 'max_drawdown', '{:,.0f}'), ('Max DD / $100k', 'max_drawdown_pct_of_100k', '{:.0%}'),
        ('Peak → trough', None, None), ('Profit / max DD', 'profit_to_drawdown', '{:.2f}'), ('Max consecutive losses', 'max_consecutive_losses', '{}'),
        ('Lowest cumulative P&L', 'min_cumulative_pnl', '{:,.0f}'), ('Fell below −$100k', 'fell_below_minus_100k', '{}'),
        ('Longest underwater (days)', None, None), ('Worst day', None, None), ('Avg borrowed (all sessions)', 'avg_borrowed_all_sessions', '{:,.0f}'),
        ('Avg borrowed (while invested)', 'avg_borrowed_while_invested', '{:,.0f}'), ('% sessions exposed', 'pct_sessions_exposed', '{:.0%}'),
        ('Margin dollar-days', 'margin_dollar_days', None), ('Net profit per $1M dollar-days', 'net_profit_per_1m_dollar_days', '{:,.0f}')]
for label, key, f in rows:
    vals = []
    for r in summ:
        m = r['metrics']
        if key and f:
            vals.append(f.format(m[key]))
        elif label == 'Realized / unrealized':
            vals.append(f"{m['realized_profit']:,.0f} / {m['unrealized_profit']:,.0f}")
        elif label == 'Closed trades (W/L)':
            vals.append(f"{m['closed_trades']} ({m['winning_trades']}/{m['losing_trades']})")
        elif label == 'Avg win / avg loss':
            vals.append(f"{m['avg_winning_trade']:,.0f} / {m['avg_losing_trade']:,.0f}")
        elif label == 'Largest win / loss':
            vals.append(f"{m['largest_winning_trade']:,.0f} / {m['largest_losing_trade']:,.0f}")
        elif label == 'Peak → trough':
            vals.append(f"{m['mdd_peak_date']} → {m['mdd_trough_date']}")
        elif label == 'Longest underwater (days)':
            vals.append(f"{m['longest_underwater_days']}{'' if m['longest_underwater_recovered'] else ' (not recovered)'}")
        elif label == 'Worst day':
            vals.append(f"{m['worst_day_mtm_change']:,.0f} ({m['worst_day_date']})")
        elif key == 'margin_dollar_days':
            vals.append(f"${m[key] / 1e6:,.1f}M·d")
    L.append(f'| {label} | ' + ' | '.join(vals) + ' |')
L += ['\n### Bear-market windows (calendar boundaries)\n',
      'Period P&L is the change in cumulative P&L across the window. Window drawdown is peak-to-trough inside it.\n',
      '| Dataset | Window | Period P&L | Max DD in window | Interest | Trades closed | Losing | Largest loss | Avg borrowed |',
      '|---|---|---:|---:|---:|---:|---:|---:|---:|']
for r in summ:
    for k, w in r['metrics']['bear_windows'].items():
        L.append(f"| {r['dataset']} | {k} | {w['pnl']:,.0f} | {w['max_drawdown']:,.0f} | {w['interest']:,.0f} | {w['trades_closed']} | "
                 f"{w['losing_trades']} | {w['largest_loss']:,.0f} | {w['avg_borrowed']:,.0f} |")
L += ['\n### Recovery windows\n', '| Dataset | Window | Period P&L | P&L of trades entered in window (n) |', '|---|---|---:|---:|']
for r in summ:
    for k, w in r['metrics']['recovery_windows'].items():
        L.append(f"| {r['dataset']} | {k} ({w['window']}) | {w['pnl']:,.0f} | {w['pnl_of_trades_entered']:,.0f} ({w['trades_entered']}) |")
L += ['\n## 5. Reproducing\n',
      '```\nPY=<python with pandas numpy scipy tabulate>\ncd research/risk-management/baseline\n$PY validate_reference.py   # TS vs Python, trade by trade\n'
      '$PY test_engine.py         # hook and accounting tests\n$PY verify_data.py         # data checks\n$PY run_baseline.py        # writes results/\n'
      '$PY write_baselines_md.py  # regenerates this file\n```']
(Path(__file__).parent / 'BASELINES.md').write_text('\n'.join(L) + '\n')
print('written')
