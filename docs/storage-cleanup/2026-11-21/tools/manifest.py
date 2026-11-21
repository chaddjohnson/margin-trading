#!/usr/bin/env python3
"""Storage cleanup 2026-11-21: build the exact-path DRY-RUN manifest (read-only; writes only --out).

Groups H1-H6 (Phase 1 removal via a verified quarantine bundle) and Z1-Z3 (lossless zstd of archive.sqlite).
Every target is enumerated explicitly (no glob is ever handed to a deleting command); every file is listed with
size, allocated bytes, mode, mtime and (H groups) sha256. Checks recorded per group:
  containment in the repo, no symlinks, link count 1, nothing modified after the audit time, no path under the
  protected list, no path in any study seals.jsonl, in the acceptance record, or in the Phase 5 seal-protect rows.
Usage: python3 -I manifest.py --repo <repo> --out <json> [--no-hash]
"""
import calendar, hashlib, json, os, re, stat, sys, time
from concurrent.futures import ThreadPoolExecutor

args = sys.argv[1:]
REPO = os.path.realpath(args[args.index('--repo') + 1])
OUT = args[args.index('--out') + 1]
HASH = '--no-hash' not in args
AUDIT_T = calendar.timegm(time.strptime('2026-11-21T15:38:00', '%Y-%m-%dT%H:%M:%S'))  # UTC epoch

H1_RUNS = ['s2-a3-w4-b8192', 's2-a3-w8-b8192', 's2-a3-w12-b8192', 's2-a3-w8-b16384', 'p2-a3-r1', 'p2-a3-r2',
           'p2-a2-r1', 'p2-mini-r1', 'p2-mini-r2', 'p2-mini-r3', 'dev-a-mini', 'dev-b-mini', 'smoke-a2', 'smoke-mini']
H5_DIRS = ['research/gpu-phase4/cache/pool', 'research/gpu-phase4/cache/sustained', 'research/gpu-phase4/cache/barrier',
           'research/gpu-phase4/cache/staged', 'research/gpu-phase4/cache/strategy-lab-scratch',
           'research/gpu-phase3/cache/strategy-lab-scratch', 'research/gpu-phase3/cache/staged',
           'research/gpu-phase6/cache/strategy-lab-scratch', 'research/gpu-phase6/cache/barriers']
# research/gpu-phase1-feasibility/cache: npm test (src/gpu-phase1/tests/gpu.test.ts) writes unit-test* exports there,
# so the directory and those files stay; only the old Phase 1 export files (no unit-test prefix) are targets.
H5_P1 = 'research/gpu-phase1-feasibility/cache'
Z_ROOTS = {'Z1': '.cache/vg-l0-risk-families/jobs', 'Z2': '.cache/vg-l0-full-joint/jobs',
           'Z3': '.cache/vg-l0-shadow-eligibility/jobs'}

PROTECTED = [  # brief §4 and audit §D (prefix match on repo-relative paths)
    '.git/', 'config/', 'src/', 'tools/', 'apps/', 'data/', 'state/', 'evaluations/', 'node_modules/', 'docs/',
    'research/gpu-phase5/build/', 'research/gpu-phase2/build/', 'research/gpu-phase3/build/', 'research/gpu-phase4/build/',
    'research/gpu-phase5/', 'research/gpu-phase6/cache/jobs/', 'research/gpu-phase6/cache/shared-datasets/',
    'research/gpu-phase6/results/', 'research/gpu-phase3/cache/captures/', 'research/gpu-phase3/results/',
    'research/gpu-phase3/cache/replay/final-', 'research/gpu-phase3/cache/a3-qualify/', 'research/gpu-phase4/cache/replay/',
    'research/gpu-phase4/cache/a3-qualify/', 'research/gpu-phase2/', 'research/study9-phase-b/',
    'research/study9-etf-pool-discovery/', '.cache/gpu-backend/', '.cache/vg-d1-growth-joint/doors/',
    '.cache/vg-d1-growth-joint/folds/', '.cache/vg-d1-growth-joint/pilot/', '.cache/vgt-d1-growth-joint/pilot/',
    '.cache/vgt-d1-growth-joint/doors/', '.cache/vg-lifecycle-matched-optimization/jobs/search-',
    '.cache/vg-l0-risk-families/folds/', '.cache/vg-l0-risk-families/lot-rows/', '.cache/vg-l0-full-joint/folds/',
    '.cache/vg-l0-full-joint/lot-rows/', '.cache/vg-l0-shadow-eligibility/folds/', '.cache/vg-l0-session-hold/folds/',
    '.cache/vg-lifecycle-matched-optimization/folds/', '.cache/optimization-process-audit/scan/',
    '.cache/phenotype/', '.cache/frozen-sources/', '.cache/storage-cleanup-2026-11-21/']
# research/gpu-phase{3,4}/cache/*.gb2ds(.json) top-level dataset sidecars are protected too (checked by name below).


def rel(p):
    return os.path.relpath(p, REPO)


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    return h.hexdigest()


def walk(root):
    """All entries under root (root included), lstat-based; never follows symlinks."""
    out = []
    for dp, dns, fns in os.walk(root, followlinks=False):
        for n in dns + fns:
            out.append(os.path.join(dp, n))
    return [root] + out


def entry(p):
    st = os.lstat(p)
    kind = 'dir' if stat.S_ISDIR(st.st_mode) else 'file' if stat.S_ISREG(st.st_mode) else 'symlink' if stat.S_ISLNK(st.st_mode) else 'other'
    return {'path': rel(p), 'type': kind, 'bytes': st.st_size if kind == 'file' else 0, 'allocated': st.st_blocks * 512,
            'mode': oct(stat.S_IMODE(st.st_mode)), 'mtime_ns': st.st_mtime_ns, 'nlink': st.st_nlink}


seal_files = set()
for dp, _, fns in os.walk(os.path.join(REPO, 'research')):
    if 'seals.jsonl' in fns and '/cache' not in dp:
        for line in open(os.path.join(dp, 'seals.jsonl'), encoding='utf8'):
            try:
                seal_files.add(json.loads(line).get('file', ''))
            except Exception:
                pass
acc = json.load(open(os.path.join(REPO, 'config/gpu-backend/acceptance.json')))
acc_text = json.dumps(acc)
seal_rows = {r['file'] for r in json.load(open(os.path.join(REPO, 'research/gpu-phase5/results/seals/apply.json')))['rows']}


def check_paths(entries):
    problems = []
    for e in entries:
        p = e['path']
        if p.startswith('..') or os.path.isabs(p):
            problems.append(f'outside repo: {p}')
        if e['type'] in ('symlink', 'other'):
            problems.append(f'{e["type"]}: {p}')
        if e['type'] == 'file' and e['nlink'] != 1:
            problems.append(f'hard link: {p}')
        if e['mtime_ns'] / 1e9 > AUDIT_T and e['type'] == 'file':
            problems.append(f'modified after the audit: {p}')
        pp = p + ('/' if e['type'] == 'dir' else '')
        for x in PROTECTED:
            if pp.startswith(x):
                problems.append(f'protected prefix {x}: {p}')
        if re.match(r'research/gpu-phase[34]/cache/[^/]+\.gb2ds(\.json)?$', p):
            problems.append(f'protected dataset sidecar: {p}')
        if p in seal_files:
            problems.append(f'in a seals.jsonl: {p}')
        if p in seal_rows:
            problems.append(f'in the seal-protect rows: {p}')
        if e['type'] == 'file' and f'"{p}"' in acc_text:
            problems.append(f'in the acceptance record: {p}')
    return problems


groups = []


def h_group(gid, title, roots, files_filter=None, keep_root=False, extra=None):
    entries = []
    for r in roots:
        a = os.path.join(REPO, r)
        if not os.path.lexists(a):
            entries.append({'path': r, 'type': 'missing'})
            continue
        for p in walk(a):
            e = entry(p)
            if files_filter and not files_filter(e):
                continue
            entries.append(e)
    files = [e for e in entries if e['type'] == 'file']
    if HASH:
        with ThreadPoolExecutor(8) as ex:
            for e, h in zip(files, ex.map(lambda e: sha256(os.path.join(REPO, e['path'])), files)):
                e['sha256'] = h
    problems = check_paths([e for e in entries if e['type'] != 'missing'])
    problems += [f'missing: {e["path"]}' for e in entries if e['type'] == 'missing']
    groups.append({'id': gid, 'title': title, 'action': 'quarantine bundle (tar --zstd, verified per member) then remove',
                   'roots': roots, 'keepRootDirectory': keep_root, 'files': len(files),
                   'bytes': sum(e['bytes'] for e in files), 'allocated': sum(e['allocated'] for e in entries),
                   'newestMtime': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(max([e['mtime_ns'] for e in files] or [0]) / 1e9)),
                   'problems': problems, 'proceed': not problems, **(extra or {}), 'entries': entries})


# H1
base = 'research/gpu-phase3/cache/replay'
present = sorted(n for n in os.listdir(os.path.join(REPO, base)) if re.match(r'^(s2-|p2-|dev-|smoke-)', n))
h_group('H1', 'GPU Phase 3 benchmark/pre-final replays', [f'{base}/{n}' for n in H1_RUNS],
        extra={'globMatchesAuditList': present == sorted(H1_RUNS), 'present': present})
# H2
pil = []
for s in sorted(os.listdir(os.path.join(REPO, '.cache'))):
    j = os.path.join(REPO, '.cache', s, 'jobs')
    if os.path.isdir(j):
        pil += [f'.cache/{s}/jobs/{n}' for n in sorted(os.listdir(j)) if n.startswith('pilot-')]
h_group('H2', 'completed-study pilot jobs (.cache/<study>/jobs/pilot-*)', pil,
        extra={'byStudy': {s: sum(1 for p in pil if p.split('/')[1] == s) for s in sorted({p.split('/')[1] for p in pil})}})
# H3, H4
h_group('H3', 'ETF screening prefix doors (byte-prefix copies of data/<SYM>/data.csv)', ['.cache/growth-etf-screening/doors'])
h_group('H4', 'other rebuildable prefix doors', ['.cache/vg-balanced-entry-eligibility/doors', '.cache/growth140-vgt-stable/doors'])
# H5
h_group('H5', 'GPU scratch, Phase 4 dataset copies, Phase 1 exports (unit-test* kept)', H5_DIRS + [H5_P1],
        files_filter=lambda e: not (e['path'].startswith(H5_P1) and (e['path'] == H5_P1 or os.path.basename(e['path']).startswith('unit-test'))))
# H6
h_group('H6', 'reverted growth-vgt-study8 attempt', ['.cache/growth-vgt-study8'])

# Z1-Z3
for gid, root in Z_ROOTS.items():
    jobs = []
    for n in sorted(os.listdir(os.path.join(REPO, root))):
        if not re.match(r'^(search|qualify)-[^/]+$', n):
            continue
        d = os.path.join(REPO, root, n)
        a = os.path.join(d, 'archive.sqlite')
        rec = {'job': f'{root}/{n}', 'archive': rel(a), 'problems': []}
        if not os.path.isfile(a) or os.path.islink(a):
            rec['problems'].append('no regular archive.sqlite')
            jobs.append(rec)
            continue
        e = entry(a)
        rec.update(bytes=e['bytes'], allocated=e['allocated'], mode=e['mode'], mtime_ns=e['mtime_ns'], nlink=e['nlink'])
        with open(a, 'rb') as f:
            hdr = f.read(100)
        rec['sqliteHeader'] = {'magic': hdr[:16] == b'SQLite format 3\x00', 'pageSize': int.from_bytes(hdr[16:18], 'big'),
                               'writeVersion': hdr[18], 'readVersion': hdr[19], 'walMode': hdr[18] == 2 and hdr[19] == 2,
                               'pageCount': int.from_bytes(hdr[28:32], 'big')}
        side = {}
        for s in ('-wal', '-shm', '-journal'):
            q = a + s
            side[s] = os.path.getsize(q) if os.path.exists(q) else None
        rec['sidecars'] = side
        try:
            pr = json.load(open(os.path.join(d, 'progress.json')))
            rec['progressStage'] = (pr.get('body') or {}).get('stage')
            runs = [json.loads(l) for l in open(os.path.join(d, 'runs.jsonl')) if l.strip()]
            rec['lastRun'] = runs[-1]
        except Exception as x:
            rec['progressStage'] = f'unreadable: {x}'
            rec['lastRun'] = {}
        if side['-wal']:
            rec['problems'].append(f'non-empty WAL ({side["-wal"]} bytes)')
        if side['-journal'] is not None:
            rec['problems'].append('rollback journal present')
        if not rec['sqliteHeader']['magic']:
            rec['problems'].append('not an SQLite file')
        if rec['sqliteHeader']['pageSize'] * rec['sqliteHeader']['pageCount'] != e['bytes']:
            rec['problems'].append('header page count x page size != file size')
        if rec['lastRun'].get('event') != 'job-end':
            rec['problems'].append(f'last runs.jsonl event {rec["lastRun"].get("event")!r} != job-end')
        if rec['mtime_ns'] / 1e9 > AUDIT_T:
            rec['problems'].append('archive modified after the audit')
        rec['problems'] += check_paths([e])
        if os.path.exists(a + '.zst'):
            rec['note'] = 'archive.sqlite.zst already exists'
        rec['proceed'] = not rec['problems']
        rec['action'] = 'zstd -3 (lossless) -> archive.sqlite.zst beside it; verify; then remove archive.sqlite'
        jobs.append(rec)
    groups.append({'id': gid, 'root': root, 'jobs': len(jobs), 'bytes': sum(j.get('bytes', 0) for j in jobs),
                   'allocated': sum(j.get('allocated', 0) for j in jobs), 'proceedJobs': sum(1 for j in jobs if j.get('proceed')),
                   'entries': jobs})

out = {'kind': 'storage cleanup 2026-11-21 dry-run manifest', 't': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
       'repo': '.', 'auditTime': '2026-11-21T15:38:00Z', 'hashed': HASH, 'protectedPrefixes': PROTECTED,
       'sealedPathsKnown': len(seal_files), 'groups': groups}
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(out, f, indent=1)
for g in groups:
    if g['id'].startswith('H'):
        print(g['id'], g['files'], 'files', round(g['allocated'] / 2**30, 2), 'GiB', 'proceed' if g['proceed'] else f'STOP {g["problems"][:5]}')
    else:
        print(g['id'], g['jobs'], 'jobs', round(g['allocated'] / 2**30, 2), 'GiB', g['proceedJobs'], 'proceed',
              [(j['job'], j['problems']) for j in g['entries'] if not j.get('proceed')][:5])
