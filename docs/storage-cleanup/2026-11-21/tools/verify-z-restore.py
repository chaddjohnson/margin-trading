#!/usr/bin/env python3
"""Storage cleanup 2026-11-21: verify restored Z archives against ARCHIVE_MANIFEST.json (sha256, bytes, mode, mtime).
Read-only. Archives not restored are listed as such.
  python3 -I verify-z-restore.py --group Z2 [--only search-] [--manifest docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json]
"""
import hashlib, json, os, sys

a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
M = json.load(open(opt('--manifest', 'docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json')))
G, ONLY = opt('--group'), opt('--only', '')
ok = bad = absent = 0
for e in M['compressedArchives']:
    if e['group'] != G or not e['job'].split('/')[-1].startswith(ONLY):
        continue
    p = e['original']
    if not os.path.exists(p):
        absent += 1
        continue
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    st = os.stat(p)
    good = h.hexdigest() == e['sha256'] and st.st_size == e['bytes'] and oct(st.st_mode & 0o7777) == e['mode'] and st.st_mtime_ns == e['mtime_ns']
    ok += good
    bad += not good
    print(('OK ' if good else 'BAD ') + p, flush=True)
print(f'{G}: {ok} restored and identical, {bad} different, {absent} not restored')
sys.exit(1 if bad else 0)
