"""Point-in-time indicator arrays for the adaptive-reentry framework (frozen with it).

Conventions (fixed for every family so results are comparable):
- All arrays are full dataset length. Index i holds the value computable at session i's CLOSE: windows
  END at session i inclusive unless the name says `prev` (ends at i-1, like the engine's entry high).
- Insufficient history yields NaN. Components must treat NaN as "indicator unavailable", fall back to
  the fixed 3% requirement (or the family's stated fallback) and count it via
  ctx.counters['indicator_fallbacks'] += 1.
- ATR(n): simple mean of the last n true ranges through i; TR_i uses the previous close. natr = ATR/close.
- realized_vol(n): standard deviation (ddof=0) of the last n close-to-close log returns through i,
  per-session (NOT annualized).
- roll_high_prev(n)[i] = max(high[i-n .. i-1]) — the engine's entry-signal convention (shorter at the
  start, exactly like the engine). drawdown_from_high(n)[i] = 1 - close_i / roll_high_prev(n)[i].
- min_close(n) / max_close(n): rolling extrema of the close through i (window n, shorter at the start).
"""
import numpy as np


class IndicatorBundle:
    """Lazy per-engine indicator cache. Access e.g. ctx.ind.natr(14)[i], ctx.ind.dd_from_high(90)[i]."""

    def __init__(self, e):
        self.e = e
        self._cache = {}

    def _get(self, key, fn):
        if key not in self._cache:
            self._cache[key] = fn()
        return self._cache[key]

    def tr(self):
        def build():
            h, l, c = self.e.h, self.e.l, self.e.c
            prev_c = np.r_[np.nan, c[:-1]]
            return np.nanmax(np.c_[h - l, np.abs(h - prev_c), np.abs(l - prev_c)], axis=1)
        return self._get('tr', build)

    def atr(self, n):
        def build():
            tr = self.tr()
            out = np.full(len(tr), np.nan)
            # window of n TRs through i needs sessions i-n+1..i, each with a previous close: i >= n
            for i in range(n, len(tr)):
                out[i] = tr[i - n + 1:i + 1].mean()
            return out
        return self._get(('atr', n), build)

    def natr(self, n):
        return self._get(('natr', n), lambda: self.atr(n) / self.e.c)

    def realized_vol(self, n):
        def build():
            c = self.e.c
            r = np.r_[np.nan, np.diff(np.log(c))]
            out = np.full(len(c), np.nan)
            for i in range(n, len(c)):
                out[i] = r[i - n + 1:i + 1].std()
            return out
        return self._get(('rv', n), build)

    def roll_high_prev(self, n):
        def build():
            h = self.e.h
            out = np.full(len(h), np.nan)
            for i in range(1, len(h)):
                out[i] = h[max(0, i - n):i].max()
            return out
        return self._get(('rhp', n), build)

    def dd_from_high(self, n):
        return self._get(('ddh', n), lambda: 1 - self.e.c / self.roll_high_prev(n))

    def min_close(self, n):
        def build():
            c = self.e.c
            out = np.empty(len(c))
            for i in range(len(c)):
                out[i] = c[max(0, i - n + 1):i + 1].min()
            return out
        return self._get(('minc', n), build)

    def max_close(self, n):
        def build():
            c = self.e.c
            out = np.empty(len(c))
            for i in range(len(c)):
                out[i] = c[max(0, i - n + 1):i + 1].max()
            return out
        return self._get(('maxc', n), build)

    def sma(self, n):
        def build():
            c = self.e.c
            out = np.full(len(c), np.nan)
            for i in range(n - 1, len(c)):
                out[i] = c[i - n + 1:i + 1].mean()
            return out
        return self._get(('sma', n), build)
