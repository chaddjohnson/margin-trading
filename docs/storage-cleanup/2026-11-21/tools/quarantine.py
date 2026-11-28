#!/usr/bin/env python3
"""Storage cleanup 2026-11-21, Phase 1 (H1-H6): verified quarantine bundle, then removal of the exact listed paths.

  python3 -I quarantine.py --repo <repo> --manifest <dry-run.json> --group H1 --qdir <quarantine dir> --actions <ACTIONS.jsonl>
          [--bundle-only]

Per group:
  1. re-check every listed entry against the dry-run manifest (type, size, mtime_ns) and that no process has a file of
     the group open (lsof); any difference -> STOP (nothing is touched);
  2. write <qdir>/<group>.tar.zst from the exact entry list (GNU tar, --no-recursion, --null -T list, POSIX format,
     relative paths only) and <qdir>/<group>.members.json;
  3. verify: zstd -t; stream-decompress and read every tar member: names exactly the manifest's, all relative, no '..',
     every file's size, sha256, mode and mtime equal to the manifest;
  4. only then remove: each file after re-checking its lstat, then the directories deepest first with rmdir (never
     recursive); a root marked keepRootDirectory is kept;
  5. append one record to ACTIONS.jsonl.
Restartable: a group whose removal record exists in ACTIONS.jsonl is skipped; a bundle that exists but has no
verification record is rebuilt.
"""
import hashlib, json, os, subprocess, sys, tarfile, time

a = sys.argv[1:]
opt = lambda k: a[a.index(k) + 1]
REPO = os.path.realpath(opt('--repo'))
M = json.load(open(opt('--manifest')))
G = opt('--group')
QDIR = os.path.realpath(opt('--qdir'))
ACT = opt('--actions')
BUNDLE_ONLY = '--bundle-only' in a
now = lambda: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def act(rec):
    rec = {'t': now(), 'group': G, **rec}
    with open(ACT, 'a') as f:
        f.write(json.dumps(rec) + '\n')
        f.flush()
        os.fsync(f.fileno())
    print(json.dumps(rec)[:600])


def done(kind):
    if not os.path.exists(ACT):
        return None
    for l in open(ACT):
        r = json.loads(l)
        if r.get('group') == G and r.get('event') == kind and r.get('ok'):
            return r
    return None


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''):
            h.update(b)
    return h.hexdigest()


g = next(x for x in M['groups'] if x['id'] == G)
if not g['proceed']:
    act({'event': 'skip', 'ok': False, 'reason': f'dry-run problems: {g["problems"][:10]}'})
    sys.exit(2)
if done('removed'):
    print(f'{G}: already removed (ACTIONS.jsonl); nothing to do')
    sys.exit(0)

entries = [e for e in g['entries'] if e['type'] in ('file', 'dir')]
files = [e for e in entries if e['type'] == 'file']
for e in entries:
    p = os.path.realpath(os.path.join(REPO, e['path'])) if e['type'] == 'dir' else os.path.join(os.path.realpath(os.path.join(REPO, os.path.dirname(e['path']))), os.path.basename(e['path']))
    if not p.startswith(REPO + os.sep) or p.startswith(os.path.join(REPO, '.git') + os.sep):
        act({'event': 'stop', 'ok': False, 'reason': f'containment: {e["path"]}'})
        sys.exit(2)

# 1. re-check
diff = []
for e in entries:
    p = os.path.join(REPO, e['path'])
    try:
        st = os.lstat(p)
    except FileNotFoundError:
        diff.append(f'missing {e["path"]}')
        continue
    if e['type'] == 'file' and (st.st_size != e['bytes'] or st.st_mtime_ns != e['mtime_ns'] or not os.path.isfile(p) or os.path.islink(p)):
        diff.append(f'changed {e["path"]}')
    if e['type'] == 'dir' and (not os.path.isdir(p) or os.path.islink(p)):
        diff.append(f'not a dir {e["path"]}')
roots = [os.path.join(REPO, r) for r in g['roots'] if os.path.isdir(os.path.join(REPO, r))]
lo = [subprocess.run(['lsof', '-n', '-w', '-F', 'pn', '+D', r], capture_output=True, text=True) for r in roots]
openers = [l for r in lo for l in r.stdout.splitlines() if l.startswith('n')]
if diff or openers:
    act({'event': 'stop', 'ok': False, 'reason': 'state differs from the dry run or files are open', 'diff': diff[:20], 'open': openers[:20]})
    sys.exit(2)

# 2. bundle
os.makedirs(QDIR, exist_ok=True)
bundle = os.path.join(QDIR, f'{G}.tar.zst')
members_file = os.path.join(QDIR, f'{G}.members.json')
ver = done('bundle-verified')
if not (ver and os.path.exists(bundle) and sha256(bundle) == ver['bundleSha256']):
    lst = os.path.join(QDIR, f'{G}.list')
    with open(lst, 'wb') as f:
        for e in entries:
            f.write(e['path'].encode() + b'\0')
    tmp = bundle + '.partial'
    t0 = time.time()
    tar = subprocess.Popen(['tar', '-C', REPO, '--no-recursion', '--null', '-T', lst, '--format=posix', '-cf', '-'], stdout=subprocess.PIPE)
    z = subprocess.run(['nice', '-n', '10', 'zstd', '-3', '-T6', '-q', '-f', '-o', tmp], stdin=tar.stdout)
    tar.stdout.close()
    if tar.wait() != 0 or z.returncode != 0:
        act({'event': 'stop', 'ok': False, 'reason': f'tar/zstd failed ({tar.returncode}/{z.returncode})'})
        sys.exit(2)
    with open(tmp, 'rb') as f:
        os.fsync(f.fileno())
    os.replace(tmp, bundle)
    # 3. verify
    if subprocess.run(['zstd', '-t', '-q', bundle]).returncode != 0:
        act({'event': 'stop', 'ok': False, 'reason': 'zstd -t failed'})
        sys.exit(2)
    want = {e['path']: e for e in entries}
    seen, bad = set(), []
    dz = subprocess.Popen(['zstd', '-dc', '-q', bundle], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=dz.stdout, mode='r|') as tf:
        for m in tf:
            n = m.name.rstrip('/')
            if n.startswith('/') or '..' in n.split('/'):
                bad.append(f'unsafe name {n}')
                continue
            e = want.get(n)
            if e is None:
                bad.append(f'unexpected member {n}')
                continue
            seen.add(n)
            if e['type'] == 'dir':
                if not m.isdir():
                    bad.append(f'type {n}')
                continue
            if not m.isfile() or m.size != e['bytes']:
                bad.append(f'size/type {n}')
                continue
            h = hashlib.sha256()
            fo = tf.extractfile(m)
            for b in iter(lambda: fo.read(1 << 22), b''):
                h.update(b)
            if h.hexdigest() != e['sha256']:
                bad.append(f'sha256 {n}')
            if oct(m.mode & 0o7777) != e['mode']:
                bad.append(f'mode {n}')
            if abs(float(m.pax_headers.get('mtime', m.mtime)) - e['mtime_ns'] / 1e9) > 1e-3:
                bad.append(f'mtime {n}')
    dz.wait()
    missing = sorted(set(want) - seen)
    if bad or missing or dz.returncode != 0:
        act({'event': 'stop', 'ok': False, 'reason': 'bundle verification failed', 'bad': bad[:20], 'missing': missing[:20]})
        sys.exit(2)
    json.dump({'group': G, 'bundle': os.path.basename(bundle), 'entries': entries}, open(members_file, 'w'), indent=1)
    bsha = sha256(bundle)
    act({'event': 'bundle-verified', 'ok': True, 'bundle': os.path.relpath(bundle, REPO), 'bundleBytes': os.path.getsize(bundle),
         'bundleAllocated': os.stat(bundle).st_blocks * 512, 'bundleSha256': bsha, 'members': len(entries), 'files': len(files),
         'rawBytes': sum(f['bytes'] for f in files), 'rawAllocated': sum(e['allocated'] for e in entries),
         'membersFile': os.path.relpath(members_file, REPO), 'membersSha256': sha256(members_file),
         'verification': 'zstd -t; every member name exact and relative; size, sha256, mode, mtime per file equal',
         'seconds': round(time.time() - t0, 1)})
if BUNDLE_ONLY:
    sys.exit(0)

# 4. remove (files, then dirs deepest first; never recursive)
removed_files = removed_bytes = 0
for e in files:
    p = os.path.join(REPO, e['path'])
    st = os.lstat(p)
    if st.st_size != e['bytes'] or st.st_mtime_ns != e['mtime_ns'] or os.path.islink(p):
        act({'event': 'stop', 'ok': False, 'reason': f'changed before removal: {e["path"]}', 'removedSoFar': removed_files})
        sys.exit(2)
    os.unlink(p)
    removed_files += 1
    removed_bytes += e['allocated']
keep = {g['roots'][-1]} if g.get('keepRootDirectory') else set()
dirs = sorted([e['path'] for e in entries if e['type'] == 'dir' and e['path'] not in keep], key=lambda x: -x.count('/'))
left = []
for d in dirs:
    try:
        os.rmdir(os.path.join(REPO, d))
    except OSError as x:
        left.append(f'{d}: {x.strerror}')
act({'event': 'removed', 'ok': not left, 'files': removed_files, 'allocatedRemoved': removed_bytes, 'dirsRemoved': len(dirs) - len(left),
     'dirsLeft': left[:20], 'rollback': f'zstd -dc {os.path.relpath(bundle, REPO)} | tar -C <repo> -xpf - --keep-old-files'})
