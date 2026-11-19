#!/usr/bin/env python3
# Memory summary of every job's 10-second monitor log (report helper):
#   python3 tools/vgt-d1-growth-joint/memory.py [results/memory] > results/memory/SUMMARY.md
import glob, json, os, sys
d = sys.argv[1] if len(sys.argv) > 1 else 'research/vgt-d1-growth-joint/results/memory'
G = 2 ** 30
print('| job | samples | workers | peak cgroup (GiB) | peak RSS total (GiB) | max worker RSS (GiB) | max worker ArrayBuffers (MiB) | events (high/max/oom) | fresh / archive hits |')
print('|---|---:|---:|---:|---:|---:|---:|---|---:|')
for f in sorted(glob.glob(os.path.join(d, '*.jsonl'))):
    rows = [json.loads(l) for l in open(f) if l.strip()]
    if not rows: continue
    peak = max((r['cgroup'].get('peak') or 0) if isinstance(r['cgroup'].get('peak'), (int, float)) else 0 for r in rows)
    cur = max((r['cgroup'].get('current') or 0) if isinstance(r['cgroup'].get('current'), (int, float)) else 0 for r in rows)
    rss = max(r.get('rssTotal') or 0 for r in rows)
    wr = max([w.get('rss') or 0 for r in rows for w in r.get('workerMem', [])] or [0])
    ab = max([w.get('arrayBuffers') or 0 for r in rows for w in r.get('workerMem', [])] or [0])
    ev = rows[-1]['cgroup'].get('events', {})
    last = rows[-1].get('evaluations', {})
    print(f"| {os.path.basename(f)[:-6]} | {len(rows)} | {max(r.get('workers', 0) for r in rows)} | {max(peak, cur)/G:.2f} | {rss/G:.2f} | {wr/G:.2f} | {ab/2**20:.0f} | {ev.get('high', 0)}/{ev.get('max', 0)}/{ev.get('oom', 0)} | {last.get('fresh')} / {last.get('archiveHits')} |")
