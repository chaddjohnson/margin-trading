#!/usr/bin/env python3
# gpu-phase8 (brief §2.1): restores SELECTED compressed Assignment 3 search archives into an ISOLATED scratch directory
# (research/gpu-phase8/cache/restore/, git-ignored) for read-only use, and records every verification against the
# storage cleanup's records (docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json, from the cleanup commit d89b9dec):
#   1. the compressed original: sha256 and size = the manifest's zstSha256 / zstBytes, mode and mtime recorded, BEFORE;
#   2. `zstd -d <original .zst> -o <scratch>/<job>.sqlite` (the original is only read);
#   3. the restored file: sha256 and size = the manifest's sha256 / bytes (the pre-compression original);
#   4. SQLite: a full `PRAGMA integrity_check` through a read-only immutable URI (creates nothing), the `points` row count
#      = the manifest's pointsRows, the namespace binding (meta table) printed;
#   5. the compressed original AFTER: sha256, size, mode and mtime unchanged (preserved).
# Nothing is ever written next to the original; the original path's archive.sqlite must not exist before or after.
#   python3 -I tools/gpu-phase8/restore-archives.py <job> [<job> …]     (e.g. search-C21-broad1 search-C24-broad1)
import hashlib, json, os, sqlite3, subprocess, sys, datetime, shutil

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(REPO)
MANIFEST = 'docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json'
SCRATCH = 'research/gpu-phase8/cache/restore'
OUT = 'research/gpu-phase8/results/restore/restore-record.json'
now = lambda: datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha(f):
    h = hashlib.sha256()
    with open(f, 'rb') as x:
        for b in iter(lambda: x.read(1 << 24), b''):
            h.update(b)
    return h.hexdigest()


def stat(f):
    s = os.stat(f)
    return {'bytes': s.st_size, 'mode': oct(s.st_mode & 0o7777), 'mtime_ns': s.st_mtime_ns}


manifest = json.load(open(MANIFEST))
manifest_sha = sha(MANIFEST)
entries = {os.path.basename(e['job']): e for e in manifest['compressedArchives'] if '/vg-l0-full-joint/jobs/' in e['job']}
os.makedirs(SCRATCH, exist_ok=True)
record = json.load(open(OUT)) if os.path.exists(OUT) else {
    'kind': 'gpu-phase8 restoration of compressed Assignment 3 archives (read-only scratch copies)',
    'manifest': {'path': MANIFEST, 'sha256': manifest_sha},
    'scratch': SCRATCH,
    'restores': []
}
ok_all = True
for job in sys.argv[1:]:
    e = entries[job]
    src = e['compressed']
    orig = e['original']
    dst = os.path.join(SCRATCH, f'{job}.sqlite')
    r = {'job': job, 't0': now(), 'compressed': src, 'restored': dst, 'checks': []}
    chk = lambda name, ok, detail=None: r['checks'].append({'name': name, 'pass': bool(ok), 'detail': detail})
    chk('original path holds no restored archive (before)', not os.path.exists(orig), orig)
    before = stat(src)
    zsha = sha(src)
    chk('compressed sha256 = manifest zstSha256', zsha == e['zstSha256'], zsha)
    chk('compressed size = manifest zstBytes', before['bytes'] == e['zstBytes'], before['bytes'])
    if os.path.exists(dst):
        os.remove(dst)
    p = subprocess.run(['zstd', '-q', '-d', src, '-o', dst], capture_output=True, text=True)
    chk('zstd -d exit 0', p.returncode == 0, p.stderr.strip()[:200])
    rsha = sha(dst)
    chk('restored sha256 = manifest sha256 (the pre-compression original)', rsha == e['sha256'], rsha)
    chk('restored size = manifest bytes', os.path.getsize(dst) == e['bytes'], os.path.getsize(dst))
    db = sqlite3.connect(f'file:{os.path.abspath(dst)}?mode=ro&immutable=1', uri=True)
    ic = db.execute('PRAGMA integrity_check').fetchall()
    rows = db.execute('SELECT count(*) FROM points').fetchone()[0]
    cfgs = db.execute('SELECT count(*) FROM configs').fetchone()[0]
    meta = dict(db.execute('SELECT k, v FROM meta').fetchall())
    db.close()
    chk('PRAGMA integrity_check = ok', ic == [('ok',)], ic[:3])
    chk('points rows = manifest pointsRows', rows == e['pointsRows'], rows)
    r['configsRows'] = cfgs
    r['binding'] = meta
    after = stat(src)
    chk('compressed original unchanged after (sha256, size, mode, mtime)', sha(src) == zsha and after == before, after)
    chk('original path holds no restored archive (after)', not os.path.exists(orig), orig)
    os.chmod(dst, 0o444)  # the scratch copy is read-only
    r['restoredSha256'] = rsha
    r['restoredBytes'] = os.path.getsize(dst)
    r['compressedSha256'] = zsha
    r['compressedStat'] = before
    r['t1'] = now()
    r['pass'] = all(c['pass'] for c in r['checks'])
    ok_all &= r['pass']
    record['restores'] = [x for x in record['restores'] if x['job'] != job] + [r]
    print(json.dumps({'job': job, 'pass': r['pass'], 'rows': rows, 'configs': cfgs, 'bytes': r['restoredBytes']}))
record['scratchBytes'] = sum(os.path.getsize(os.path.join(SCRATCH, f)) for f in os.listdir(SCRATCH))
record['diskFree'] = shutil.disk_usage(REPO).free
record['updated'] = now()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(record, open(OUT, 'w'), indent=1)
open(OUT, 'a').write('\n')
sys.exit(0 if ok_all else 2)
