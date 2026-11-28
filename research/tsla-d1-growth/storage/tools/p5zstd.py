#!/usr/bin/env python3
"""Priority 6 (TSLA) Phase 0A: lossless, per-file, restartable zstd preservation of Priority 5's 29 official GPU job
archives (research/vg-l0-n-successor/cache/jobs/<job>/archive.sqlite), adapted from the verified 2026-11-21 tool
(docs/storage-cleanup/2026-11-21/tools/zcompress.py).

  python3 -I p5zstd.py inventory --repo <repo> --out <INVENTORY.json>
  python3 -I p5zstd.py compress  --repo <repo> --inventory <INVENTORY.json> --actions <ACTIONS.jsonl> --scratch <dir>
                                  [--job <job>] [--keep-original]
  python3 -I p5zstd.py final     --repo <repo> --inventory <INVENTORY.json> --actions <ACTIONS.jsonl> --out <json>

inventory: read-only. Per archive of the Priority 5 manifest (reports/diagnostics/job-archives.sha256): lstat (bytes,
  mtime_ns, mode, nlink, inode), the manifest's sha256 and bytes, the job's completion evidence (results/jobs/<job>/
  complete.json; the last runs.jsonl event is job-end), the SQLite journal mode and sidecars, and lsof openers.

compress (one archive at a time; the source is never written):
  1. re-check: size/mtime_ns/mode/nlink as in the inventory and = the manifest's bytes; regular file, not a link;
     job complete; no -wal/-shm/-journal sidecar; no process has the file open (lsof); otherwise SKIP (recorded).
  2. one streaming read: sha256 of the original feeding `zstd -3 -T8` into archive.sqlite.zst.partial; fsync.
     The sha256 must equal the Priority 5 manifest's (otherwise BLOCKER: the archive is left untouched).
  3. zstd -t; then the documented restore command `zstd -d -q <zst> -o <scratch>/archive.sqlite` into an isolated
     scratch directory; the restored copy's sha256 and bytes must equal the original's, and its mode and mtime.
  4. on the restored copy: full PRAGMA integrity_check; the exact schema (meta, points, configs, fits); row counts;
     meta study/job equal to the archive's own identity (door, doorPin, codeDigest, backend recorded); a
     reproducibility smoke test: every sealed (id, net, dd) triple that the study's sealed records attribute to this job
     (results/**.json with "job" = this job) is looked up in the restored points and must match exactly.
     The scratch copy is then deleted.
  5. the .zst gets the original's mode and mtime and is renamed into place (atomic); fsync dir; record z-verified.
  6. unless --keep-original: re-check the source unchanged and unopened and the .zst unchanged, then remove ONLY
     archive.sqlite; record z-removed with the restore command.
  Restartable: an archive with a z-removed record is skipped; a .zst without a z-verified record is redone.

final: read-only post-cleanup verification: every archive has a z-removed record, its .zst exists with the recorded
  sha256 and bytes and passes zstd -t, no original remains; totals.
"""
import glob, hashlib, json, os, re, sqlite3, subprocess, sys, time

P5 = 'research/vg-l0-n-successor'
MANIFEST = f'{P5}/reports/diagnostics/job-archives.sha256'
ZSTD_LEVEL = ['-3', '-T8']
SCHEMA = {
    'meta': 'CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)',
    'points': 'CREATE TABLE points (key TEXT PRIMARY KEY, json TEXT NOT NULL)',
    'configs': 'CREATE TABLE configs (key TEXT PRIMARY KEY, json TEXT NOT NULL)',
    'fits': 'CREATE TABLE fits (key TEXT PRIMARY KEY, json TEXT NOT NULL)',
}

argv = sys.argv[1:]
cmd = argv[0] if argv else ''
opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
now = lambda: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
REPO = os.path.realpath(opt('--repo', '.'))
os.chdir(REPO)


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    return h.hexdigest()


def openers(paths):
    paths = [p for p in paths if os.path.exists(p)]
    if not paths:
        return []
    r = subprocess.run(['lsof', '-n', '-w', '-F', 'pn'] + paths, capture_output=True, text=True)
    return [l for l in r.stdout.splitlines() if l.startswith('n')]


def ro(path):
    return sqlite3.connect(f'file:{path}?mode=ro&immutable=1', uri=True)


def manifest():
    out = []
    for line in open(MANIFEST):
        s, n, rel = line.split()
        out.append({'sha256': s, 'bytes': int(n), 'rel': rel, 'archive': f'{P5}/{rel}', 'job': rel.split('/')[2]})
    return out


def job_complete(job):
    c = f'{P5}/results/jobs/{job}/complete.json'
    runs = f'{P5}/cache/jobs/{job}/runs.jsonl'
    ok_c = os.path.isfile(c)
    last = None
    if os.path.isfile(runs):
        lines = [l for l in open(runs) if l.strip()]
        last = json.loads(lines[-1]) if lines else None
    ok_r = bool(last and last.get('event') == 'job-end')
    return {'completeJson': ok_c, 'completeJsonSha256': sha256(c) if ok_c else None,
            'lastRunEvent': last.get('event') if last else None, 'archivedAtEnd': last.get('archived') if last else None,
            'complete': ok_c and ok_r}


def sidecars(src):
    return {s: (os.path.getsize(src + s) if os.path.exists(src + s) else None) for s in ('-wal', '-shm', '-journal')}


def sealed_triples(job):
    """(id, net, dd) triples that the study's sealed JSON records attribute to this job (report-only smoke test)."""
    full = f'research/vg-l0-n-successor/{job}'
    out = {}

    def walk(x):
        if isinstance(x, dict):
            # Priority 5's copied incumbent rows (qualification `copiedEvidence`, stage "incumbent") were evaluated by
            # another job (the cutoff's broad qualification, whose own smoke test covers them): not this archive's rows
            if x.get('stage') == 'incumbent' and x.get('lane') == 'incumbent':
                return
            i = x.get('id')
            if isinstance(i, str) and re.fullmatch(r'rc\d-[0-9a-f]{16}', i):
                if isinstance(x.get('net'), (int, float)) and isinstance(x.get('dd'), (int, float)) and 'lots' in x:
                    out.setdefault(i, set()).add((x['net'], x['dd']))
                if isinstance(x.get('wholeNet'), (int, float)) and isinstance(x.get('wholeDd'), (int, float)):
                    out.setdefault(i, set()).add((x['wholeNet'], x['wholeDd']))
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    files = []
    for f in sorted(glob.glob(f'{P5}/results/**/*.json', recursive=True)):
        if '/jobs/' in f or '/gpu-attestations/' in f:
            continue
        try:
            v = json.load(open(f))
        except Exception:
            continue
        if isinstance(v, dict) and v.get('job') == full:
            files.append(f)
            walk(v)
    return files, out


def act(path, rec):
    rec = {'t': now(), **rec}
    with open(path, 'a') as f:
        f.write(json.dumps(rec) + '\n')
        f.flush()
        os.fsync(f.fileno())
    print(json.dumps(rec)[:600], flush=True)


def records(path, archive, kind):
    if not os.path.exists(path):
        return []
    out = []
    for l in open(path):
        r = json.loads(l)
        if r.get('archive') == archive and r.get('event') == kind and r.get('ok'):
            out.append(r)
    return out


def zstd_version():
    return subprocess.run(['zstd', '--version'], capture_output=True, text=True).stdout.strip()


if cmd == 'inventory':
    ents = []
    for m in manifest():
        src = m['archive']
        e = {**m}
        if os.path.lexists(src):
            st = os.lstat(src)
            e.update({'present': True, 'lstatBytes': st.st_size, 'mtime_ns': st.st_mtime_ns,
                      'mode': oct(st.st_mode & 0o7777), 'nlink': st.st_nlink, 'inode': st.st_ino,
                      'regular': os.path.isfile(src) and not os.path.islink(src),
                      'allocated': st.st_blocks * 512, 'sizeMatchesManifest': st.st_size == m['bytes']})
            c = ro(src)
            e['journalMode'] = c.execute('PRAGMA journal_mode').fetchone()[0]
            e['meta'] = dict(c.execute('select k, v from meta').fetchall())
            c.close()
        else:
            e.update({'present': False})
        e['zstPresent'] = os.path.exists(src + '.zst')
        e['sidecars'] = sidecars(src)
        e['job'] = m['job']
        e['completion'] = job_complete(m['job'])
        e['openers'] = openers([src, src + '-wal', src + '-shm'])
        ents.append(e)
    df = subprocess.run(['df', '-B1', '--output=size,used,avail', REPO], capture_output=True, text=True).stdout.split('\n')[1].split()
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    branch = subprocess.run(['git', 'branch', '--show-current'], capture_output=True, text=True).stdout.strip()
    procs = subprocess.run(['bash', '-c', "ps -eo pid,args | grep -E '[n]ode |[s]qlite3|[z]std ' || true"], capture_output=True, text=True).stdout
    out = {'kind': 'p5 archive inventory (read-only)', 'written': now(), 'repo': '.', 'branch': branch, 'head': head,
           'manifest': MANIFEST, 'manifestSha256': sha256(MANIFEST), 'zstd': zstd_version(),
           'disk': {'sizeBytes': int(df[0]), 'usedBytes': int(df[1]), 'availBytes': int(df[2])},
           'processesNodeSqliteZstd': procs.strip().splitlines(),
           'archives': ents,
           'totals': {'count': len(ents), 'manifestBytes': sum(e['bytes'] for e in ents),
                      'presentBytes': sum(e.get('lstatBytes', 0) for e in ents if e.get('present')),
                      'allComplete': all(e['completion']['complete'] for e in ents),
                      'allSizeMatch': all(e.get('sizeMatchesManifest') for e in ents if e.get('present')),
                      'noSidecars': all(all(v is None for v in e['sidecars'].values()) for e in ents),
                      'noOpeners': all(not e['openers'] for e in ents)}}
    with open(opt('--out'), 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    print(json.dumps(out['totals']), flush=True)
    sys.exit(0)

if cmd == 'compress':
    INV = json.load(open(opt('--inventory')))
    ACT = opt('--actions')
    ONLY = opt('--job')
    KEEP = '--keep-original' in argv
    SCR = os.path.realpath(opt('--scratch'))
    jobs_root = os.path.realpath(f'{P5}/cache/jobs') + os.sep
    if SCR.startswith(os.path.realpath(P5) + os.sep):
        sys.exit('scratch must be outside the Priority 5 study')
    os.makedirs(SCR, exist_ok=True)
    zv = zstd_version()
    for j in INV['archives']:
        if ONLY and j['job'] != ONLY:
            continue
        arc = j['archive']
        src = os.path.join(REPO, arc)
        zst = src + '.zst'
        if not os.path.realpath(os.path.dirname(src)).startswith(jobs_root) or os.path.basename(src) != 'archive.sqlite':
            act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': 'containment'})
            continue
        if records(ACT, arc, 'z-removed'):
            print(f'{arc}: already compressed, verified and removed', flush=True)
            continue
        t0 = time.time()
        if not os.path.lexists(src):
            act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': 'original absent without a z-removed record'})
            continue
        st = os.lstat(src)
        why = []
        if not j.get('present') or st.st_size != j['lstatBytes'] or st.st_size != j['bytes'] or st.st_mtime_ns != j['mtime_ns'] \
                or oct(st.st_mode & 0o7777) != j['mode'] or os.path.islink(src) or st.st_nlink != 1 or not os.path.isfile(src):
            why.append('changed since the inventory or not a regular single-link file of the manifest size')
        comp = job_complete(j['job'])
        if not comp['complete']:
            why.append(f'job not complete {comp}')
        side = sidecars(src)
        if any(v is not None for v in side.values()):
            why.append(f'sidecars {side}')
        op = openers([src, src + '-wal', src + '-shm'])
        if op:
            why.append(f'open: {op[:5]}')
        if why:
            act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': '; '.join(why)})
            continue
        ver = records(ACT, arc, 'z-verified')
        ver = ver[-1] if ver else None
        if not (ver and os.path.exists(zst) and os.path.getsize(zst) == ver['zstBytes'] and sha256(zst) == ver['zstSha256']):
            part = zst + '.partial'
            if os.path.exists(part):
                os.unlink(part)
            # 2. one streaming read: sha256 + zstd
            h, n = hashlib.sha256(), 0
            z = subprocess.Popen(['nice', '-n', '10', 'ionice', '-c2', '-n7', 'zstd', *ZSTD_LEVEL, '-q', '-f', '-o', part],
                                 stdin=subprocess.PIPE)
            with open(src, 'rb') as f:
                for b in iter(lambda: f.read(1 << 22), b''):
                    h.update(b)
                    n += len(b)
                    z.stdin.write(b)
            z.stdin.close()
            if z.wait() != 0 or n != j['bytes']:
                act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'zstd exit {z.returncode} or short read {n}'})
                continue
            orig = h.hexdigest()
            with open(part, 'rb') as f:
                os.fsync(f.fileno())
            if orig != j['sha256']:
                os.unlink(part)
                act(ACT, {'event': 'z-blocker', 'ok': False, 'archive': arc, 'reason': 'original sha256 differs from the Priority 5 manifest',
                          'sha256': orig, 'manifestSha256': j['sha256']})
                continue
            # 3. zstd -t and the documented restore command into isolated scratch
            t_ok = subprocess.run(['zstd', '-t', '-q', part]).returncode == 0
            dst = os.path.join(SCR, 'archive.sqlite')
            if os.path.exists(dst):
                os.unlink(dst)
            r = subprocess.run(['nice', '-n', '10', 'zstd', '-d', '-q', part, '-o', dst])
            rs = os.stat(dst) if os.path.exists(dst) else None
            rsha = sha256(dst) if rs else None
            # zstd copies the source file's attributes; the .partial still has default ones, so mode/mtime are checked
            # after the final .zst carries the original's (step 5, then the final restore check)
            fail = None
            if not (t_ok and r.returncode == 0 and rs and rs.st_size == j['bytes'] and rsha == orig):
                fail = f'restore failed t={t_ok} rc={r.returncode} bytes={rs.st_size if rs else None} sha={rsha == orig}'
            ic = rows = meta = schema = None
            smoke = {}
            if not fail:
                # 4. integrity, schema, rows, meta, smoke test on the restored copy
                c = ro(dst)
                ic = c.execute('PRAGMA integrity_check').fetchall()
                schema = {t: s for t, s in c.execute("select name, sql from sqlite_master where type='table'").fetchall()}
                rows = {t: c.execute(f'select count(*) from {t}').fetchone()[0] for t in SCHEMA if t in schema}
                meta = dict(c.execute('select k, v from meta').fetchall())
                files, trip = sealed_triples(j['job'])
                found = {}
                ids = list(trip)
                for k in range(0, len(ids), 500):
                    chunk = ids[k:k + 500]
                    q = 'select json from points where substr(json, 8, 20) in (%s)' % ','.join('?' * len(chunk))
                    for (js,) in c.execute(q, chunk):
                        d = json.loads(js)
                        found.setdefault(d['id'], set()).add((d.get('net'), d.get('dd')))
                c.close()
                matched = sum(1 for i in ids if trip[i] <= found.get(i, set()))
                smoke = {'sealedFiles': files, 'sealedIds': len(ids), 'matchedIds': matched,
                         'unmatched': [i for i in ids if not trip[i] <= found.get(i, set())][:10]}
                if ic != [('ok',)]:
                    fail = f'integrity_check {ic[:3]}'
                elif schema != SCHEMA:
                    fail = f'schema {schema}'
                elif meta.get('study') != P5 or meta.get('job') != j['job']:
                    fail = f'meta identity {meta.get("study")} {meta.get("job")}'
                elif matched != len(ids):
                    fail = f'smoke test: {len(ids) - matched} sealed ids not reproduced'
                elif comp.get('archivedAtEnd') is not None and rows['points'] < 1:
                    fail = 'empty points table'
            if os.path.exists(dst):
                os.unlink(dst)
            if fail:
                os.unlink(part)
                act(ACT, {'event': 'z-blocker', 'ok': False, 'archive': arc, 'reason': fail})
                continue
            if os.lstat(src).st_mtime_ns != j['mtime_ns'] or os.lstat(src).st_size != j['bytes']:
                os.unlink(part)
                act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': 'source changed during compression'})
                continue
            # 5. finalize the .zst
            os.chmod(part, int(j['mode'], 8))
            os.utime(part, ns=(st.st_atime_ns, j['mtime_ns']))
            os.replace(part, zst)
            dfd = os.open(os.path.dirname(zst), os.O_RDONLY)
            os.fsync(dfd)
            os.close(dfd)
            # restored attributes from the final .zst (the documented command again, then mode/mtime/sha)
            r2 = subprocess.run(['nice', '-n', '10', 'zstd', '-d', '-q', zst, '-o', dst])
            rs2 = os.stat(dst)
            attr_ok = r2.returncode == 0 and oct(rs2.st_mode & 0o7777) == j['mode'] and rs2.st_mtime_ns // 10**9 == j['mtime_ns'] // 10**9 \
                and rs2.st_size == j['bytes'] and sha256(dst) == orig
            os.unlink(dst)
            if not attr_ok:
                act(ACT, {'event': 'z-blocker', 'ok': False, 'archive': arc, 'reason': 'final restore attributes/sha differ'})
                continue
            zs = os.stat(zst)
            ver = {'event': 'z-verified', 'ok': True, 'archive': arc, 'zst': arc + '.zst', 'job': j['job'],
                   'bytes': j['bytes'], 'allocated': st.st_blocks * 512, 'sha256': orig, 'manifestSha256Equal': True,
                   'mode': j['mode'], 'mtime_ns': j['mtime_ns'], 'zstBytes': zs.st_size, 'zstAllocated': zs.st_blocks * 512,
                   'zstSha256': sha256(zst), 'ratio': round(zs.st_size / j['bytes'], 5), 'zstd': zv,
                   'zstdOptions': ' '.join(ZSTD_LEVEL), 'integrityCheck': 'ok', 'schema': 'meta, points, configs, fits (exact)',
                   'rows': rows, 'meta': {k: meta.get(k) for k in ('study', 'job', 'door', 'doorPin', 'codeDigest', 'backend')},
                   'smoke': smoke, 'restoreCommandVerified': f'zstd -d -q {arc}.zst -o <scratch>/archive.sqlite (sha256, bytes, mode, mtime equal)',
                   'checks': 'manifest sha256 (single read feeding zstd); zstd -t; documented restore into isolated scratch: sha256+bytes; '
                             'full PRAGMA integrity_check; exact schema; row counts; meta identity; sealed (id, net, dd) smoke test; '
                             'final .zst restore: sha256, bytes, mode, mtime',
                   'seconds': round(time.time() - t0, 1)}
            act(ACT, ver)
        if KEEP:
            continue
        # 6. remove only the verified original
        st2 = os.lstat(src)
        op = openers([src, src + '-wal', src + '-shm'])
        if st2.st_size != j['bytes'] or st2.st_mtime_ns != j['mtime_ns'] or op or not os.path.exists(zst) or sha256(zst) != ver['zstSha256']:
            act(ACT, {'event': 'z-skip', 'ok': False, 'archive': arc, 'reason': f'pre-removal re-check failed (open {op[:3]})'})
            continue
        os.unlink(src)
        act(ACT, {'event': 'z-removed', 'ok': True, 'archive': arc, 'allocatedFreed': st2.st_blocks * 512, 'zstKept': arc + '.zst',
                  'restore': f'zstd -d -q {arc}.zst -o {arc}  (then sha256 must be {ver["sha256"]})'})
    sys.exit(0)

if cmd == 'final':
    INV = json.load(open(opt('--inventory')))
    ACT = opt('--actions')
    rows, bad = [], 0
    for j in INV['archives']:
        arc = j['archive']
        v = records(ACT, arc, 'z-verified')
        rm = records(ACT, arc, 'z-removed')
        zst = arc + '.zst'
        e = {'archive': arc, 'verified': bool(v), 'removed': bool(rm), 'originalPresent': os.path.lexists(arc),
             'zstPresent': os.path.exists(zst)}
        if v and e['zstPresent']:
            v = v[-1]
            e.update({'zstBytes': os.path.getsize(zst), 'zstSha256': sha256(zst),
                      'zstdTest': subprocess.run(['zstd', '-t', '-q', zst]).returncode == 0,
                      'bytes': v['bytes'], 'sha256': v['sha256']})
            e['ok'] = e['zstSha256'] == v['zstSha256'] and e['zstBytes'] == v['zstBytes'] and e['zstdTest'] and e['removed'] and not e['originalPresent']
        else:
            e['ok'] = False
        bad += not e['ok']
        rows.append(e)
    tot = {'archives': len(rows), 'ok': len(rows) - bad, 'bad': bad,
           'originalBytes': sum(r.get('bytes', 0) for r in rows), 'zstBytes': sum(r.get('zstBytes', 0) for r in rows)}
    out = {'kind': 'p5 archive post-cleanup verification (read-only)', 'written': now(), 'totals': tot, 'archives': rows}
    with open(opt('--out'), 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    print(json.dumps(tot), flush=True)
    sys.exit(1 if bad else 0)

sys.exit(__doc__)
