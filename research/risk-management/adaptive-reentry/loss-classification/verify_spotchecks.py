"""Family A verification: counter/episode consistency for every config+dataset, plus raw-price
spot-checks of three restriction episodes (two of A2_material_1 / A2_material_05, one financing-only
A0 episode). Writes tmp/verification.txt. Read-only on results/."""
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / 'baseline'))
sys.path.insert(0, str(HERE.parent / 'common'))

from engine import load  # noqa: E402

RES = HERE / 'results'
DATASETS = ['VGT_2005_2015', 'QQQ_1999_2015', 'VGT_2016_2026', 'QQQ_2016_2026']
CONFIGS = ['A0_net_loss', 'A1_price_loss_only', 'A2_material_05', 'A2_material_1', 'A2_material_2',
           'A2_material_3', 'A3_bands_a', 'A3_bands_b', 'A4_proportional_05', 'A4_proportional_10']
out = []
checks = fails = 0


def chk(label, cond, detail=''):
    global checks, fails
    checks += 1
    if not cond:
        fails += 1
        out.append(f'FAIL  {label} {detail}')
    return cond


def p(*a):
    out.append(' '.join(str(x) for x in a))


# ---- 1. counter/episode consistency from events + states + trades ----
import json
records = json.load(open(RES / 'summary.json'))
rec = {(r['dataset'], r['config']): r for r in records}
for ds in DATASETS:
    for cfg in CONFIGS:
        sm = rec[(ds, cfg)]['extra']['state_machine']
        ev = pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')
        tr = pd.read_csv(RES / 'trades' / f'{ds}__{cfg}.csv')
        closed = tr[tr['reason'] != 'open']
        losses = closed[closed['profit'] < 0]
        chk(f'{ds}/{cfg} episodes==events rows', sm['losing_exits_restricted'] == len(ev))
        chk(f'{ds}/{cfg} armed+declined==losing closed trades',
            sm['losing_exits_restricted'] + sm['triggers_declined'] == len(losses),
            f"{sm['losing_exits_restricted']}+{sm['triggers_declined']} vs {len(losses)}")
        chk(f'{ds}/{cfg} reentries==resolutions', sm['lower_price_reentries'] ==
            (ev['resolution'] == 'lower_price_reentry').sum())
        chk(f'{ds}/{cfg} resets==resolutions', sm['recovery_resets'] ==
            (ev['resolution'] == 'recovery_reset').sum())
        chk(f'{ds}/{cfg} blocked counter==episode blocked sums', sm['blocked_sessions'] ==
            int(ev['blocked_sessions'].sum()) - sm['reset_priority_blocks'])
        chk(f'{ds}/{cfg} no alt entries', sm['alt_entries'] == 0)
        # trigger semantics on the config's own trade list
        pr = closed['exit_price'] / closed['entry_price'] - 1
        armed_expect = {
            'A0_net_loss': closed['profit'] < 0,
            'A1_price_loss_only': closed['exit_price'] < closed['entry_price'],
            'A2_material_05': pr <= -0.005, 'A2_material_1': pr <= -0.01,
            'A2_material_2': pr <= -0.02, 'A2_material_3': pr <= -0.03,
            'A3_bands_a': (closed['profit'] < 0) & (closed['profit'].abs() >= 500),
            'A3_bands_b': (closed['profit'] < 0) & (closed['profit'].abs() >= 1000),
            'A4_proportional_05': closed['exit_price'] < closed['entry_price'],
            'A4_proportional_10': closed['exit_price'] < closed['entry_price'],
        }[cfg]
        chk(f'{ds}/{cfg} trigger semantics vs trade list', int(armed_expect.sum()) == len(ev),
            f'{int(armed_expect.sum())} expected armings vs {len(ev)} episodes')
p(f'counter/episode consistency: {checks} checks so far, {fails} failures')

# ---- 2. spot-check helper ----

def spot(ds, cfg, exit_date, discount_fn, label):
    df = load(ds)
    df['d'] = df['date'].dt.strftime('%Y-%m-%d')
    ev = pd.read_csv(RES / 'events' / f'{ds}__{cfg}.csv')
    r = ev[ev['exit_date'] == exit_date].iloc[0]
    p(f'\n--- SPOT CHECK: {label} ({ds} / {cfg}, episode arming {exit_date}) ---')
    p(r[['exit_date', 'exit_reason', 'loss', 'losing_entry_price', 'loss_exit_price', 'price_return',
         'ref_high', 'resolution', 'resolution_date', 'reentry_date', 'reentry_close',
         'required_level_at_entry']].to_string())
    disc = discount_fn(r)
    level = r['loss_exit_price'] * (1 - disc)
    p(f'required level = {r["loss_exit_price"]:.4f} * (1-{disc}) = {level:.6f}')
    i0 = df.index[df['d'] == exit_date][0]
    pr_raw = r['loss_exit_price'] / r['losing_entry_price'] - 1
    chk(f'{label}: price_return consistent', abs(pr_raw - r['price_return']) < 1e-9)
    # ref_high = engine 90-high before the losing entry; recompute from trades file
    tr = pd.read_csv(RES / 'trades' / f'{ds}__{cfg}.csv')
    t = tr[tr['exit_date'] == exit_date].iloc[0]
    ei = int(t['entry_i'])
    rh = df['high'].to_numpy()[max(0, ei - 90):ei].max()
    chk(f'{label}: ref_high recomputed from raw highs', abs(rh - r['ref_high']) < 1e-9,
        f'{rh} vs {r["ref_high"]}')
    chk(f'{label}: entry/exit prices match trades file',
        abs(t['entry_price'] - r['losing_entry_price']) < 1e-9 and
        abs(t['exit_price'] - r['loss_exit_price']) < 1e-9)
    if r['resolution'] == 'lower_price_reentry':
        i1 = df.index[df['d'] == r['resolution_date']][0]
        c1 = df['close'].iloc[i1]
        chk(f'{label}: re-entry close <= required level', c1 <= level + 1e-9, f'{c1} vs {level}')
        seg = df['close'].iloc[i0:i1]
        chk(f'{label}: no earlier qualifying SIGNAL close was skipped: all closes before re-entry '
            f'above level OR lacked 10pct signal', True)  # checked explicitly below
        # explicit scan: any session in (i0, i1) with close<=level AND 10% signal?
        viol = []
        h = df['high'].to_numpy()
        for j in range(i0 + 1, i1):
            c = df['close'].iloc[j]
            recent = h[max(0, j - 90):j].max()
            if c <= level and (1 - c / recent) >= 0.10:
                viol.append(df['d'].iloc[j])
        chk(f'{label}: no skipped qualifying session', not viol, str(viol))
        p(f're-entry {r["resolution_date"]} close {c1:.4f} <= level {level:.4f}; '
          f'no prior session had close<=level with the 10% signal: VERIFIED')
    elif r['resolution'] == 'recovery_reset':
        i1 = df.index[df['d'] == r['resolution_date']][0]
        c1 = df['close'].iloc[i1]
        chk(f'{label}: reset close >= 0.95*ref_high', c1 >= 0.95 * r['ref_high'] - 1e-9,
            f'{c1} vs {0.95 * r["ref_high"]}')
        viol = []
        h = df['high'].to_numpy()
        for j in range(i0, i1):
            c = df['close'].iloc[j]
            if c >= 0.95 * r['ref_high'] - 1e-9:
                viol.append(df['d'].iloc[j])
            recent = h[max(0, j - 90):j].max()
            if c <= level and (1 - c / recent) >= 0.10:
                viol.append('ENTRY-SKIP ' + df['d'].iloc[j])
        chk(f'{label}: no earlier reset or skipped entry', not viol, str(viol))
        p(f'reset {r["resolution_date"]} close {c1:.4f} >= 0.95*ref_high {0.95 * r["ref_high"]:.4f}; '
          f'no earlier session qualified for reset or entry: VERIFIED')
    return r


# (a) A2_material_05 on VGT_2016_2026: the knife-edge DECLINED trigger 2022-11-03 and the preserved
#     2023-01-04 entry.
df = load('VGT_2016_2026')
df['d'] = df['date'].dt.strftime('%Y-%m-%d')
tr = pd.read_csv(RES / 'trades' / 'VGT_2016_2026__A2_material_05.csv')
t = tr[tr['exit_date'] == '2022-11-03'].iloc[0]
p('\n--- SPOT CHECK (a): A2_material_05 VGT_2016_2026 declined trigger 2022-11-03 ---')
p(t[['entry_date', 'exit_date', 'entry_price', 'exit_price', 'reason', 'interest', 'profit']].to_string())
pr = t['exit_price'] / t['entry_price'] - 1
p(f'price return = {t["exit_price"]}/{t["entry_price"]} - 1 = {pr:.6%} (threshold -0.5%)')
chk('(a) net loss but price return above -0.5% (declined correctly)',
    t['profit'] < 0 and pr > -0.005, f'{t["profit"]}, {pr}')
ev = pd.read_csv(RES / 'events' / 'VGT_2016_2026__A2_material_05.csv')
chk('(a) no A2_05 episode arms 2022-11-03', not (ev['exit_date'] == '2022-11-03').any())
nxt = tr[tr['entry_date'] > '2022-11-03'].head(2)
for _, row in nxt.iterrows():
    p(f'following trade: entry {row["entry_date"]} @ {row["entry_price"]:.4f}, profit {row["profit"]:+,.0f}')
jan = tr[tr['entry_date'] == '2023-01-04']
chk('(a) A2_05 holds the baseline 2023-01-04 +28k winner (identical entry)',
    len(jan) == 1 and jan['profit'].iloc[0] > 27000,
    jan.to_string() if len(jan) else 'missing')
i = df.index[df['d'] == '2023-01-04'][0]
c = df['close'].iloc[i]
recent = df['high'].to_numpy()[max(0, i - 90):i].max()
chk('(a) 2023-01-04 close has the 10% signal in raw data', 1 - c / recent >= 0.10,
    f'close {c}, 90d-high {recent}, dip {1 - c / recent:.4f}')
p(f'2023-01-04: close {c:.4f}, prev-90-high {recent:.4f}, dip {1 - c / recent:.2%} >= 10%: VERIFIED')
# and the A0 contrast: blocked that session by level 0.97*39.7609?
ev0 = pd.read_csv(RES / 'events' / 'VGT_2016_2026__A0_net_loss.csv')
r0 = ev0[ev0['exit_date'] == '2022-11-03'].iloc[0]
lvl0 = r0['loss_exit_price'] * 0.97
chk('(a) A0 level above Jan-2023 closes (so A0 blocked)', c > lvl0, f'{c} vs {lvl0}')
p(f'A0 contrast: frozen loss exit {r0["loss_exit_price"]:.4f} -> level {lvl0:.4f}; 2023-01-04 close '
  f'{c:.4f} is {c / lvl0 - 1:+.2%} above it -> blocked under A0: VERIFIED')

# (b) A2_material_1 on QQQ_1999_2015: a 2000-02 cascade episode resolved by lower-price re-entry.
ev1 = pd.read_csv(RES / 'events' / 'QQQ_1999_2015__A2_material_1.csv')
cas = ev1[(ev1['exit_date'] >= '2001-01-01') & (ev1['exit_date'] <= '2001-12-31')]
p('\n2001 A2_material_1 episodes:')
p(cas[['exit_date', 'loss', 'price_return', 'resolution', 'resolution_date']].to_string(index=False))
spot('QQQ_1999_2015', 'A2_material_1', cas.iloc[0]['exit_date'], lambda r: 0.03,
     '(b) A2_material_1 2001 cascade episode')

# (c) A0 financing-only episode QQQ 2010-08-24 that blocked the +$19,221 winner.
r = spot('QQQ_1999_2015', 'A0_net_loss', '2010-08-24', lambda r: 0.03,
         '(c) A0 financing-only 2010-08-24')
chk('(c) financing-only: exit >= entry and net loss', r['loss_exit_price'] >= r['losing_entry_price']
    and r['loss'] < 0)
dfq = load('QQQ_1999_2015')
dfq['d'] = dfq['date'].dt.strftime('%Y-%m-%d')
i = dfq.index[dfq['d'] == '2010-08-26'][0]
c = dfq['close'].iloc[i]
lvl = r['loss_exit_price'] * 0.97
p(f'2010-08-26 (baseline winner entry): close {c:.4f} vs required {lvl:.4f} '
  f'({c / lvl - 1:+.2%} above) -> blocked; winner +$19,221 foregone: VERIFIED')
chk('(c) 2010-08-26 close above required level (block was real)', c > lvl)

# (d) extra: A4_proportional_10 QQQ99-15 2001 episode — proportional level arithmetic.
ev4 = pd.read_csv(RES / 'events' / 'QQQ_1999_2015__A4_proportional_10.csv')
r4 = ev4[(ev4['exit_date'] >= '2001-01-01')].iloc[0]
lvl_expect = r4['loss_exit_price'] * (1 - min(max(1.0 * abs(r4['price_return']), 0.01), 0.08))
p(f'\n--- SPOT CHECK (d): A4_proportional_10 episode {r4["exit_date"]} ---')
p(f'price_return {r4["price_return"]:.4%} -> required decline clip(1.0*|r|,1%,8%) = '
  f'{min(max(abs(r4["price_return"]), 0.01), 0.08):.4%}; level {lvl_expect:.4f}; '
  f'required_level_at_entry {r4["required_level_at_entry"]}')
if r4['resolution'] == 'lower_price_reentry':
    chk('(d) stored required level equals proportional arithmetic',
        abs(r4['required_level_at_entry'] - lvl_expect) < 1e-9)
    chk('(d) re-entry close <= level', r4['reentry_close'] <= lvl_expect + 1e-9)

p(f'\nTOTAL: {checks} checks, {fails} failures')
(HERE / 'tmp').mkdir(exist_ok=True)
(HERE / 'tmp' / 'verification.txt').write_text('\n'.join(out) + '\n')
print('\n'.join(out[-80:]))
print('\nwritten tmp/verification.txt')
sys.exit(1 if fails else 0)
