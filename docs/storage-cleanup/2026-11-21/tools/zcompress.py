#!/usr/bin/env python3
"""Storage cleanup 2026-11-21, Z1-Z3: lossless zstd compression of completed jobs' archive.sqlite, one database at a time.

  python3 -I zcompress.py --repo <repo> --manifest <dry-run.json> --group Z1 --actions <ACTIONS.jsonl>
          [--job <job dir name>] [--keep-original] [--restore-test <scratch dir>]

Per database (the dry-run manifest's entry; the source is never written):
  1. re-check: size and mtime_ns as in the manifest, the WAL empty or absent, no rollback journal, no process has the
     database or a sidecar open (lsof); otherwise SKIP that job;
  2. PRAGMA quick_check through a read-only immutable URI (no -wal/-shm is created or changed) and the row count of
     `points` (recorded);
  3. one streaming read: sha256 of the original and `zstd -3 -T4` into archive.sqlite.zst.partial; fsync;
  4. zstd -t, then a streamed decompression hashed again: sha256 and byte count must equal the original's; the .zst gets
     the original's mode and mtime (zstd -d copies them to the restored file); rename to archive.sqlite.zst; fsync dir;
  5. record z-verified (ACTIONS.jsonl), then (unless --keep-original) re-check the source unchanged and unopened and
     remove ONLY archive.sqlite; record z-removed. Sidecars (-wal of 0 bytes, -shm) stay untouched and are recorded.
--restore-test: additionally decompress the verified .zst into <scratch dir> (an isolated directory), compare sha256,
  mode and mtime, run the FULL PRAGMA integrity_check on the restored copy, record it, and delete the scratch copy.
Restartable: a database with a z-removed record is skipped; a .zst without a z-verified record is redone.
"""
import hashlib, json, os, sqlite3, subprocess, sys, time

a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
REPO = os.path.realpath(opt('--repo'))
M = json.load(open(opt('--manifest')))
G = opt('--group')
ACT = opt('--actions')
ONLY = opt('--job')
KEEP = '--keep-original' in a
RT = opt('--restore-test')
now = lambda: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def act(rec):
    rec = {'t': now(), 'group': G, **rec}
    with open(ACT, 'a') as f:
        f.write(json.dumps(rec) + '\n')
        f.flush()
        os.fsync(f.fileno())
    print(json.dumps(rec)[:400], flush=True)


def records(archive, kind):
    if not os.path.exists(ACT):
        return []
    out = []
    for l in open(ACT):
        r = json.loads(l)
        if r.get('archive') == archive and r.get('event') == kind and r.get('ok'):
            out.append(r)
    return out


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    return h.hexdigest()


def stream_sha(cmd):
    h, n = hashlib.sha256(), 0
    pr = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    for b in iter(lambda: pr.stdout.read(1 << 22), b''):
        h.update(b)
        n += len(b)
    return h.hexdigest(), n, pr.wait()


def openers(paths):
    paths = [p for p in paths if os.path.exists(p)]
    if not paths:
        return []
    r = subprocess.run(['lsof', '-n', '-w', '-F', 'pn'] + paths, capture_output=True, text=True)
    return [l for l in r.stdout.splitlines() if l.startswith('n')]


def ro(path):
    return sqlite3.connect(f'file:{path}?mode=ro&immutable=1', uri=True)


g = next(x for x in M['groups'] if x['id'] == G)
for j in g['entries']:
    name = j['job'].split('/')[-1]
    if ONLY and name != ONLY:
        continue
    arc = j['archive']
    src = os.path.join(REPO, arc)
    zst = src + '.zst'
    if not os.path.realpath(os.path.dirname(src)).startswith(os.path.join(REPO, '.cache') + os.sep):
        act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': 'containment'})
        continue
    if records(arc, 'z-removed'):
        print(f'{arc}: already compressed and removed', flush=True)
        continue
    if not j.get('proceed'):
        act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'dry-run problems {j["problems"]}'})
        continue
    t0 = time.time()
    # 1. re-check
    st = os.lstat(src)
    side = {s: (os.path.getsize(src + s) if os.path.exists(src + s) else None) for s in ('-wal', '-shm', '-journal')}
    why = []
    if st.st_size != j['bytes'] or st.st_mtime_ns != j['mtime_ns'] or os.path.islink(src) or st.st_nlink != 1:
        why.append('changed since the dry run')
    if side != j['sidecars']:
        why.append(f'sidecars changed {side} != {j["sidecars"]}')
    if side['-wal']:
        why.append('non-empty WAL')
    if side['-journal'] is not None:
        why.append('rollback journal')
    op = openers([src, src + '-wal', src + '-shm'])
    if op:
        why.append(f'open: {op[:5]}')
    if why:
        act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': '; '.join(why)})
        continue
    side_sha = {s: sha256(src + s) for s in ('-wal', '-shm') if side[s] is not None}
    ver = records(arc, 'z-verified')
    ver = ver[-1] if ver else None
    if not (ver and os.path.exists(zst) and os.path.getsize(zst) == ver['zstBytes'] and sha256(zst) == ver['zstSha256']):
        # 2. read-only integrity
        c = ro(src)
        qc = c.execute('PRAGMA quick_check').fetchall()
        rows = c.execute('select count(*) from points').fetchone()[0]
        c.close()
        if qc != [('ok',)]:
            act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'quick_check {qc[:3]}'})
            continue
        # 3. compress with one streaming read
        part = zst + '.partial'
        h, n = hashlib.sha256(), 0
        z = subprocess.Popen(['nice', '-n', '10', 'zstd', '-3', '-T4', '-q', '-f', '-o', part], stdin=subprocess.PIPE)
        with open(src, 'rb') as f:
            for b in iter(lambda: f.read(1 << 22), b''):
                h.update(b)
                n += len(b)
                z.stdin.write(b)
        z.stdin.close()
        if z.wait() != 0 or n != j['bytes']:
            act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'zstd exit {z.returncode} or short read {n}'})
            continue
        orig = h.hexdigest()
        with open(part, 'rb') as f:
            os.fsync(f.fileno())
        # 4. verify
        t_ok = subprocess.run(['zstd', '-t', '-q', part]).returncode == 0
        dsha, dn, rc = stream_sha(['zstd', '-dc', '-q', part])
        if not (t_ok and rc == 0 and dsha == orig and dn == j['bytes']):
            act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'verification failed t={t_ok} rc={rc} sha={dsha == orig} n={dn}'})
            os.unlink(part)
            continue
        if os.lstat(src).st_mtime_ns != j['mtime_ns'] or os.lstat(src).st_size != j['bytes']:
            act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': 'source changed during compression'})
            os.unlink(part)
            continue
        os.chmod(part, int(j['mode'], 8))
        os.utime(part, ns=(st.st_atime_ns, j['mtime_ns']))
        os.replace(part, zst)
        dfd = os.open(os.path.dirname(zst), os.O_RDONLY)
        os.fsync(dfd)
        os.close(dfd)
        zs = os.stat(zst)
        ver = {'event': 'z-verified', 'ok': True, 'archive': arc, 'zst': arc + '.zst', 'bytes': j['bytes'],
               'allocated': st.st_blocks * 512, 'sha256': orig, 'mode': j['mode'], 'mtime_ns': j['mtime_ns'],
               'zstBytes': zs.st_size, 'zstAllocated': zs.st_blocks * 512, 'zstSha256': sha256(zst),
               'ratio': round(zs.st_size / j['bytes'], 4), 'quickCheck': 'ok', 'pointsRows': rows,
               'lastRunArchived': j.get('lastRun', {}).get('archived'), 'sidecars': side, 'sidecarSha256': side_sha,
               'checks': 'quick_check(ro,immutable); single-read sha256; zstd -t; streamed decompression sha256 + bytes equal',
               'seconds': round(time.time() - t0, 1)}
        act(ver)
    # optional isolated restore test
    if RT:
        os.makedirs(RT, exist_ok=True)
        dst = os.path.join(RT, 'archive.sqlite')
        if os.path.exists(dst):
            os.unlink(dst)
        r = subprocess.run(['zstd', '-d', '-q', zst, '-o', dst])
        rs = os.stat(dst)
        rsha = sha256(dst)
        c = ro(dst)
        ic = c.execute('PRAGMA integrity_check').fetchall()
        rows2 = c.execute('select count(*) from points').fetchone()[0]
        meta = dict(c.execute('select k, v from meta').fetchall())
        c.close()
        ok = r.returncode == 0 and rsha == ver['sha256'] and ic == [('ok',)] and rows2 == ver['pointsRows'] and \
            oct(rs.st_mode & 0o7777) == ver['mode'] and rs.st_mtime_ns // 1000000000 == ver['mtime_ns'] // 1000000000
        act({'event': 'z-restore-test', 'ok': ok, 'archive': arc, 'restoredTo': os.path.relpath(dst, REPO), 'sha256Equal': rsha == ver['sha256'],
             'integrityCheck': ic[:3], 'pointsRows': rows2, 'mode': oct(rs.st_mode & 0o7777), 'mtimeEqualSeconds': rs.st_mtime_ns // 10**9 == ver['mtime_ns'] // 10**9,
             'mtimeNsRestored': rs.st_mtime_ns, 'meta': {k: meta[k] for k in list(meta)[:8]}})
        os.unlink(dst)
        if not ok:
            print('restore test FAILED: stopping', flush=True)
            sys.exit(2)
    if KEEP:
        continue
    # 5. remove only the verified original
    st2 = os.lstat(src)
    op = openers([src, src + '-wal', src + '-shm'])
    if st2.st_size != j['bytes'] or st2.st_mtime_ns != j['mtime_ns'] or op or not os.path.exists(zst) or sha256(zst) != ver['zstSha256']:
        act({'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'pre-removal re-check failed (open {op[:3]})'})
        continue
    os.unlink(src)
    act({'event': 'z-removed', 'ok': True, 'archive': arc, 'allocatedFreed': st2.st_blocks * 512, 'zstKept': arc + '.zst',
         'restore': f'zstd -d {arc}.zst -o {arc}  (then sha256 must be {ver["sha256"]})'})
