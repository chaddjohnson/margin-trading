#!/usr/bin/env python3
"""Storage cleanup 2026-11-21: after restoring a quarantine group, verify every restored file against the dry-run
manifest (bytes, sha256, mode, mtime). Read-only.
  python3 -I verify-restore.py --manifest DRY_RUN_MANIFEST.json --group H3 [--repo .]
"""
import hashlib, json, os, sys

a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
REPO = os.path.realpath(opt('--repo', '.'))
g = next(x for x in json.load(open(opt('--manifest')))['groups'] if x['id'] == opt('--group'))
bad, n = [], 0
for e in g['entries']:
    p = os.path.join(REPO, e['path'])
    if e['type'] == 'dir':
        if not os.path.isdir(p):
            bad.append(f'missing dir {e["path"]}')
        continue
    if e['type'] != 'file':
        continue
    n += 1
    if not os.path.isfile(p):
        bad.append(f'missing {e["path"]}')
        continue
    st = os.stat(p)
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    if st.st_size != e['bytes'] or h.hexdigest() != e['sha256']:
        bad.append(f'content {e["path"]}')
    if oct(st.st_mode & 0o7777) != e['mode']:
        bad.append(f'mode {e["path"]}')
    if abs(st.st_mtime_ns - e['mtime_ns']) > 1000:
        bad.append(f'mtime {e["path"]}')
print(f'{g["id"]}: {n} files checked, {len(bad)} problems', bad[:20])
sys.exit(1 if bad else 0)
