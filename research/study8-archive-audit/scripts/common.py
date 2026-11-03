"""Shared, read-only helpers for the Study 8 archive audit (report-only; standard library only).

Every input is read from the sealed Study 8 records under research/study8-expanded-regime-d1/ and its sha256 is
recorded, so each report states exactly which bytes it was computed from. Nothing here writes outside
research/study8-archive-audit/outputs/, runs the engine, or reads market data.
"""

import csv
import gzip
import hashlib
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIT = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(AUDIT))
S8 = os.path.join(ROOT, 'research', 'study8-expanded-regime-d1')
OUT = os.path.join(AUDIT, 'outputs')

TRACKS = ['G', 'V', 'VG', 'VXR', 'VXRG', 'VXRKG']
FOLDS = ['F19', 'F20', 'F21', 'F23', 'F24']
BOOKS = {'G': ['GDX'], 'V': ['VGT'], 'VG': ['VGT', 'GDX'], 'VXR': ['VGT', 'XBI', 'XRT'],
         'VXRG': ['VGT', 'XBI', 'XRT', 'GDX'], 'VXRKG': ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']}

# The eight D1 parameters in the record order of a `books` string (X/Y/stop/hold/L/buffer/P/W) and the box of
# src/multi-etf-d1/context.ts (grid units). The normalized L-infinity distance is the study's (search.ts farEnough →
# study6 designs.ts normalizedDistance): max over books and keys of |a - b| / (max - min).
KEYS = ['targetPercentChange', 'trailingBuyPercentage', 'trailingStopPercentage', 'maximumHoldDays',
        'tickWindowSize', 'intradayLossBuffer', 'pullback', 'continuationWindow']
SHORT = ['X', 'Y', 'stop', 'hold', 'L', 'buffer', 'P', 'W']
BOX = {'targetPercentChange': (80, 300), 'trailingBuyPercentage': (1, 50), 'trailingStopPercentage': (30, 150),
       'maximumHoldDays': (3, 30), 'tickWindowSize': (20, 250), 'intradayLossBuffer': (0, 60),
       'pullback': (30, 200), 'continuationWindow': (10, 200)}
# Neighbourhood radius r (PROTOCOL.md §5) in grid units: X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10,
# buffer ±1.0 pt, P ±1.0 pt, W ±20 (tenths-of-a-point parameters are in tenths).
RADIUS = {'targetPercentChange': 10, 'trailingBuyPercentage': 2, 'trailingStopPercentage': 10, 'maximumHoldDays': 2,
          'tickWindowSize': 10, 'intradayLossBuffer': 10, 'pullback': 10, 'continuationWindow': 20}

CEILING = 35000.0
SHARE_MIN = 0.90
BANDS = [('90–93%', 0.90, 0.93), ('93–95%', 0.93, 0.95), ('95–98%', 0.95, 0.98), ('98–100%', 0.98, 1.0000001)]
Z = 1.645  # the study's one-sided Wilson z (src/study8-expanded-regime-d1/evidence.ts wilsonLower)

INPUTS = {}


def rel(path):
    return os.path.relpath(path, ROOT)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def _note(path):
    INPUTS[rel(path)] = sha256_file(path)


def load_json(path):
    _note(path)
    with open(path) as f:
        return json.load(f)


def search(track, fold):
    return load_json(os.path.join(S8, 'results', 'search', track, fold, 'search.json'))


def qualification(track, fold):
    return load_json(os.path.join(S8, 'results', 'qualify', track, fold, 'qualification.json'))


def test_record(fold):
    return load_json(os.path.join(S8, 'results', 'test', fold, 'test.json'))


def frozen_selection():
    return load_json(os.path.join(S8, 'FROZEN_SELECTION.json'))


ARCHIVE_FLOATS = ['violation', 'net', 'dd', 'r1Share', 'r1P90Dd', 'r1MedianNet', 'r1P10Net']
ARCHIVE_INTS = ['lots', 'episodes', 'r2', 'r3']


def archive(track, fold):
    path = os.path.join(S8, 'results', 'search', track, fold, 'search-archive.csv.gz')
    _note(path)
    rows = []
    with gzip.open(path, 'rt', newline='') as f:
        for row in csv.DictReader(f):
            for key in ARCHIVE_FLOATS:
                row[key] = float(row[key])
            for key in ARCHIVE_INTS:
                row[key] = int(row[key])
            rows.append(row)
    return rows


def parse_books(text):
    """'VGT:234/9/79/15/71/20/99/121|GDX:…' → {'VGT': (234, 9, …)}."""
    out = {}
    for part in text.split('|'):
        symbol, values = part.split(':')
        out[symbol] = tuple(int(v) for v in values.split('/'))
    return out


def books_of_grids(books):
    """{'VGT': {'targetPercentChange': 234, …}} → {'VGT': (234, …)}."""
    return {symbol: tuple(int(grid[k]) for k in KEYS) for symbol, grid in books.items()}


def linf(a, b):
    return max(abs(a[s][i] - b[s][i]) / (BOX[KEYS[i]][1] - BOX[KEYS[i]][0]) for s in a for i in range(8))


def near_bound_count(books):
    """Coordinates within one radius r of a box bound (the trigger for the in-box gate Q2b/T2b)."""
    n = 0
    for values in books.values():
        for i, v in enumerate(values):
            lo, hi = BOX[KEYS[i]]
            if v - lo < RADIUS[KEYS[i]] or hi - v < RADIUS[KEYS[i]]:
                n += 1
    return n


def wilson_lower(share, n, z=Z):
    if not n > 0:
        return float('nan')
    centre = share + z * z / (2 * n)
    margin = z * math.sqrt(share * (1 - share) / n + z * z / (4 * n * n))
    return (centre - margin) / (1 + z * z / n)


def wilson_upper(share, n, z=Z):
    if not n > 0:
        return float('nan')
    centre = share + z * z / (2 * n)
    margin = z * math.sqrt(share * (1 - share) / n + z * z / (4 * n * n))
    return (centre + margin) / (1 + z * z / n)


def max_bound_confidence(n):
    """Confidence that the neighbourhood's worst DD is at or above its true 90th percentile: 1 − 0.9^n."""
    return 1 - 0.9 ** n


def band_of(share):
    for name, lo, hi in BANDS:
        if lo <= share < hi:
            return name
    return '<90%' if share < 0.90 else '—'


def spearman(xs, ys):
    """Spearman's rho with average ranks for ties; None if n < 3 or a constant series."""
    n = len(xs)
    if n < 3:
        return None

    def ranks(v):
        order = sorted(range(n), key=lambda i: v[i])
        r = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j + 1 < n and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2 + 1
            i = j + 1
        return r

    rx, ry = ranks(xs), ranks(ys)
    mx, my = sum(rx) / n, sum(ry) / n
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sxx = sum((a - mx) ** 2 for a in rx)
    syy = sum((b - my) ** 2 for b in ry)
    if sxx == 0 or syy == 0:
        return None
    return sxy / math.sqrt(sxx * syy)


def fisher_ci(rho, n, z=1.645):
    """Approximate 90% interval for Spearman's rho (Fisher z with the Bonett–Wright variance 1.06/(n − 3))."""
    if rho is None or n <= 3 or abs(rho) >= 1:
        return (None, None)
    zr = math.atanh(rho)
    se = math.sqrt(1.06 / (n - 3))
    return (math.tanh(zr - z * se), math.tanh(zr + z * se))


def clopper_pearson(k, n, alpha=0.10):
    """Exact two-sided (1 − alpha) binomial interval, by bisection on the binomial CDF (standard library only)."""
    if n == 0:
        return (float('nan'), float('nan'))

    def cdf(x, p):
        # in log space, so large n cannot overflow
        if p <= 0:
            return 1.0
        if p >= 1:
            return 1.0 if x >= n else 0.0
        lp, lq = math.log(p), math.log1p(-p)
        base = math.lgamma(n + 1)
        return sum(math.exp(base - math.lgamma(i + 1) - math.lgamma(n - i + 1) + i * lp + (n - i) * lq)
                   for i in range(0, x + 1))

    def solve_decreasing(target, f):
        # the p in [0, 1] with f(p) = target, for f decreasing in p
        lo, hi = 0.0, 1.0
        for _ in range(80):
            mid = (lo + hi) / 2
            if f(mid) > target:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    # lower: P(X >= k | p) = alpha/2  <=>  P(X <= k - 1 | p) = 1 - alpha/2; upper: P(X <= k | p) = alpha/2
    lower = 0.0 if k == 0 else solve_decreasing(1 - alpha / 2, lambda p: cdf(k - 1, p))
    upper = 1.0 if k == n else solve_decreasing(alpha / 2, lambda p: cdf(k, p))
    return (lower, upper)


def median(values):
    v = sorted(values)
    if not v:
        return float('nan')
    m = len(v) // 2
    return v[m] if len(v) % 2 else (v[m - 1] + v[m]) / 2


def money(x, digits=0):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return 'n/a'
    sign = '−' if x < -0.5 * 10 ** -digits else ''
    return f'{sign}${abs(x):,.{digits}f}'


def pct(x, digits=1):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return 'n/a'
    return f'{x * 100:.{digits}f}%'


def num(x, digits=2):
    if x is None or (isinstance(x, float) and not math.isfinite(x)):
        return 'n/a'
    return f'{x:.{digits}f}'


def md_table(headers, rows):
    out = ['| ' + ' | '.join(headers) + ' |', '|' + '|'.join('---' for _ in headers) + '|']
    for r in rows:
        out.append('| ' + ' | '.join(str(c) for c in r) + ' |')
    return '\n'.join(out)


def write(name, text):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', newline='\n') as f:
        f.write(text if text.endswith('\n') else text + '\n')


def write_csv(name, headers, rows):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(headers)
        for r in rows:
            w.writerow(r)


def write_json(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), 'w', newline='\n') as f:
        json.dump(obj, f, indent=1, sort_keys=True, allow_nan=True)
        f.write('\n')


def inputs_block():
    rows = [(path, sha[:16]) for path, sha in sorted(INPUTS.items())]
    return md_table(['input (read-only)', 'sha256 (16)'], rows)
