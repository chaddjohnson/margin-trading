"""Experiment 1 (sma_sizing): SMA200-regime position sizing, implemented only through engine.Strategy hooks.

Configs (SPEC.md, section "1. SMA-based sizing"):
- A_baseline: the unmodified baseline Strategy ($100,000 on every entry).
- B_bearish_sma200_sizing: only `entry_size` is overridden. At an entry at session i (decided at session i's close,
  which is the entry price):
    SMA200_i       = mean(close[i-199 .. i])            (session i's own close included)
    SMA200_{i-20}  = mean(close[i-219 .. i-20])
    bearish        = close_i < SMA200_i and SMA200_i < SMA200_{i-20}
    size           = $50,000 if bearish else $100,000
  If SMA200_{i-20} is unavailable (i < 219, 0-based session index into the file), size = $100,000 and the entry
  is counted as a fallback. The size is fixed at entry (no add-ons, no resizing).

No look-ahead: only e.c[0 .. i] is read, and the engine calls entry_size at session i's close, the moment of the
entry decision and fill.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'baseline'))

import numpy as np  # noqa: E402

from engine import Strategy  # noqa: E402

SMA_N = 200
SLOPE_LAG = 20
FIRST_FULL_INDEX = SMA_N - 1 + SLOPE_LAG  # 219: first 0-based index with SMA200_{i-20} available
BEARISH_SIZE = 50000.0
NORMAL_SIZE = 100000.0


def sma200_at(closes, j):
    """Mean of closes j-199 .. j, or None if fewer than 200 sessions exist through j."""
    if j < SMA_N - 1:
        return None
    return float(np.mean(closes[j - SMA_N + 1:j + 1]))


class Baseline(Strategy):
    """A_baseline: no hook overridden. Records each entry so entries can be compared with config B."""

    name = 'A_baseline'

    def __init__(self):
        self.entries = []

    def entry_size(self, e, i):
        size = e.params.base_size
        self.entries.append(dict(entry_i=i, date=str(e.dates.iloc[i].date()), close=float(e.c[i]), size=size))
        return size


class BearishSMA200Sizing(Strategy):
    """B_bearish_sma200_sizing: $50k when close < SMA200 and SMA200 is below its value 20 sessions earlier."""

    name = 'B_bearish_sma200_sizing'

    def __init__(self):
        self.entries = []  # one record per entry decision (the engine calls entry_size only when it enters)

    def entry_size(self, e, i):
        closes = e.c[:i + 1]  # data through session i's close only
        close = float(closes[i])
        sma = sma200_at(closes, i)
        sma_lag = sma200_at(closes, i - SLOPE_LAG)
        if sma is None or sma_lag is None:
            regime, size = 'fallback', NORMAL_SIZE
        else:
            bearish = close < sma and sma < sma_lag
            regime, size = ('bearish', BEARISH_SIZE) if bearish else ('normal', NORMAL_SIZE)
        self.entries.append(dict(entry_i=i, date=str(e.dates.iloc[i].date()), close=close, sma200=sma,
                                 sma200_lag20=sma_lag, close_below_sma=(close < sma) if sma is not None else None,
                                 sma_falling=(sma < sma_lag) if sma_lag is not None else None,
                                 regime=regime, size=size))
        return size


CONFIGS = {
    'A_baseline': Baseline,
    'B_bearish_sma200_sizing': BearishSMA200Sizing,
}
