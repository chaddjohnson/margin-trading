#!/usr/bin/env python3
"""Power check for the replay comparison: re-runs the eight configurations under alternative readings of
PROTOCOL.md and reports which configurations' trade lists change. A reading that changes a configuration is
one the exact match with the study engine actually discriminates; a reading that changes nothing was not
exercised by the data. Sensitivity only: nothing here feeds replay.py's outputs.

    python3 research/vgt-intraday-study/replay/sensitivity.py
"""

import importlib.util
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('replay', os.path.join(HERE, 'replay.py'))
rp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rp)

S = rp.load_sessions()


def key(trades):
    return [(t['entry_date'], t['entry_price'], t['exit_date'], t['exit_price'], t['exit_reason']) for t in trades]


BASE = {(p, m): key(rp.run(p, m, S)) for p, m in rp.CONFIGS}


def report(label, **kw):
    changed = [f'{p}__{m}' for p, m in rp.CONFIGS if key(rp.run(p, m, S, **kw)) != BASE[(p, m)]]
    print(f'{label}: {", ".join(changed) if changed else "no configuration changes"}')


def stable_gap_not_counted(n):
    def f(s, rh):
        out, started, trough, timer, prev = [], False, None, None, None
        for b in rp.eligible(s, 600):
            dip = rp.is_dip(b[4], rh)
            gap = prev is not None and b[0] != prev + 60
            prev = b[0]
            if not started:
                if dip:
                    started, trough, timer = True, b[3], 0
                continue
            if gap:
                timer = 0
            if b[3] < trough:
                trough, timer = b[3], 0
            elif not gap:
                timer += 1
            if timer >= n and dip:
                out.append((b[0] + 60, b[4], 'stable'))
        return out
    return f


# 1. STABLE: a gap bar that is not a new low ends with timer 0 instead of 1.
orig = rp.POLICIES['STABLE_15']
rp.POLICIES['STABLE_15'] = stable_gap_not_counted(15)
report('STABLE gap bar leaves timer at 0')
rp.POLICIES['STABLE_15'] = orig

# 2. E applied to the bar start instead of its completion.
orig = rp.eligible
rp.eligible = lambda s, e: [b for b in s.bars
                            if s.open_time + (e - 570) * 60 <= b[0] and b[0] + 60 <= s.close_time - 60]
report('E compared with bar start')
rp.eligible = orig

# 3. A gate-blocked candidate ends the session's attempts (no later bars considered).
saved = dict(rp.POLICIES)
for name, f in saved.items():
    rp.POLICIES[name] = (lambda f: lambda s, rh: f(s, rh)[:1])(f)
report('only the first candidate per session')
rp.POLICIES.update(saved)

# 4. No provisional episode low in the gate (stored low only).
orig = rp.reset_level
rp.reset_level = lambda r, low=None: orig(r, None)
report('gate without provisional episode low')
rp.reset_level = orig

# 5. Minute stop also checks the fill's own bar (after raising H with it).
orig = rp.minute_walk
rp.minute_walk = lambda pos, s, i, interest: orig(pos, s, i - 1 if interest == 0.0 and i > 0 else i, interest)
report('minute stop checks the fill bar')
rp.minute_walk = orig

# 6. Same-session round trip keeps the pre-existing restriction (NOTES.md item 14).
report('round trip does not clear restriction', alt_restore_on_round_trip=True)
