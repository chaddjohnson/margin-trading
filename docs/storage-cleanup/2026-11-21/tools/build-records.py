#!/usr/bin/env python3
"""Storage cleanup 2026-11-21: build ARCHIVE_MANIFEST.json (everything needed to restore without guessing) and a
measured summary (summary.json) from ACTIONS.jsonl and DRY_RUN_MANIFEST.json. Read-only except its two outputs.
  python3 -I build-records.py --dir docs/storage-cleanup/2026-11-21
"""
import json, os, sys

D = sys.argv[sys.argv.index('--dir') + 1]
acts = [json.loads(l) for l in open(os.path.join(D, 'ACTIONS.jsonl'))]
M = json.load(open(os.path.join(D, 'DRY_RUN_MANIFEST.json')))
last = lambda pred: ([a for a in acts if pred(a)] or [None])[-1]

quarantine, archives, skipped = [], [], []
for g in M['groups']:
    gid = g['id']
    if gid.startswith('H'):
        b = last(lambda a: a.get('group') == gid and a.get('event') == 'bundle-verified' and a.get('ok'))
        r = last(lambda a: a.get('group') == gid and a.get('event') == 'removed')
        quarantine.append({
            'group': gid, 'title': g['title'], 'roots': g['roots'], 'removed': bool(r and r['ok']),
            'bundle': b and b['bundle'], 'bundleBytes': b and b['bundleBytes'], 'bundleAllocated': b and b['bundleAllocated'],
            'bundleSha256': b and b['bundleSha256'], 'membersFile': b and b['membersFile'], 'membersSha256': b and b['membersSha256'],
            'entries': b and b['members'], 'files': b and b['files'], 'rawBytes': b and b['rawBytes'],
            'allocatedRemoved': r and r.get('allocatedRemoved'),
            'perFileSha256': f'DRY_RUN_MANIFEST.json groups[id={gid}].entries (path, bytes, sha256, mode, mtime_ns)',
            'restore': [f'sha256sum {b and b["bundle"]}   # must equal bundleSha256',
                        f'cd <repo> && zstd -dc {b and b["bundle"]} | tar -C . -xpf - --keep-old-files',
                        f'python3 -I docs/storage-cleanup/2026-11-21/tools/verify-restore.py --manifest docs/storage-cleanup/2026-11-21/DRY_RUN_MANIFEST.json --group {gid}'],
            'retention': 'keep at least until 2026-12-21 (30 days); purging is a manual decision needing the user\'s authorization'})
    else:
        for j in g['entries']:
            v = last(lambda a: a.get('archive') == j['archive'] and a.get('event') == 'z-verified' and a.get('ok'))
            r = last(lambda a: a.get('archive') == j['archive'] and a.get('event') == 'z-removed' and a.get('ok'))
            t = last(lambda a: a.get('archive') == j['archive'] and a.get('event') == 'z-restore-test')
            s = last(lambda a: a.get('archive') == j['archive'] and a.get('event') == 'z-skip')
            if not r:
                skipped.append({'group': gid, 'archive': j['archive'], 'reason': s and s.get('reason') or 'not processed'})
            archives.append({
                'group': gid, 'job': j['job'], 'original': j['archive'], 'compressed': v and v['zst'], 'originalRemoved': bool(r),
                'bytes': j['bytes'], 'allocated': j['allocated'], 'sha256': v and v['sha256'], 'mode': j['mode'],
                'mtime_ns': j['mtime_ns'], 'zstBytes': v and v['zstBytes'], 'zstAllocated': v and v['zstAllocated'],
                'zstSha256': v and v['zstSha256'], 'ratio': v and v['ratio'], 'pointsRows': v and v['pointsRows'],
                'lastRunArchived': v and v['lastRunArchived'], 'sqliteHeader': j['sqliteHeader'],
                'sidecarsLeftInPlace': v and v['sidecars'], 'sidecarSha256': v and v['sidecarSha256'],
                'restoreTested': bool(t and t['ok']),
                'restore': [f'cd <repo> && test ! -e {j["archive"]}',
                            f'zstd -d {j["archive"]}.zst -o {j["archive"]}   # keeps the .zst; restores mode and mtime',
                            f'sha256sum {j["archive"]}   # must equal {v and v["sha256"]}']})

summ = {
    'quarantineGroups': len(quarantine), 'quarantineRemoved': sum(q['removed'] for q in quarantine),
    'rawAllocatedRemovedH': sum(q['allocatedRemoved'] or 0 for q in quarantine),
    'bundleAllocated': sum(q['bundleAllocated'] or 0 for q in quarantine),
    'archives': len(archives), 'archivesCompressedAndRemoved': sum(a['originalRemoved'] for a in archives),
    'rawAllocatedRemovedZ': sum(a['allocated'] for a in archives if a['originalRemoved']),
    'zstAllocated': sum(a['zstAllocated'] or 0 for a in archives if a['originalRemoved']),
    'rowsEqualLastRunArchived': sum(1 for a in archives if a['pointsRows'] is not None and a['pointsRows'] == a['lastRunArchived']),
    'skipped': skipped}
summ['netFreedH'] = summ['rawAllocatedRemovedH'] - summ['bundleAllocated']
summ['netFreedZ'] = summ['rawAllocatedRemovedZ'] - summ['zstAllocated']
summ['netFreedTotal'] = summ['netFreedH'] + summ['netFreedZ']
for k in ('rawAllocatedRemovedH', 'bundleAllocated', 'netFreedH', 'rawAllocatedRemovedZ', 'zstAllocated', 'netFreedZ', 'netFreedTotal'):
    summ[k + 'GiB'] = round(summ[k] / 2**30, 2)
byg = {}
for a in archives:
    x = byg.setdefault(a['group'], {'archives': 0, 'removed': 0, 'raw': 0, 'zst': 0})
    x['archives'] += 1
    if a['originalRemoved']:
        x['removed'] += 1
        x['raw'] += a['allocated']
        x['zst'] += a['zstAllocated']
for x in byg.values():
    x['rawGiB'], x['zstGiB'], x['netGiB'] = round(x['raw'] / 2**30, 2), round(x['zst'] / 2**30, 2), round((x['raw'] - x['zst']) / 2**30, 2)
    x['ratio'] = round(x['zst'] / x['raw'], 4) if x['raw'] else None
summ['byZGroup'] = byg
summ['byHGroup'] = {q['group']: {'rawGiB': round((q['allocatedRemoved'] or 0) / 2**30, 2), 'bundleGiB': round((q['bundleAllocated'] or 0) / 2**30, 2)} for q in quarantine}
json.dump({'kind': 'storage cleanup 2026-11-21 archive manifest', 'quarantine': quarantine, 'compressedArchives': archives},
          open(os.path.join(D, 'ARCHIVE_MANIFEST.json'), 'w'), indent=1)
json.dump(summ, open(os.path.join(D, 'summary.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in summ.items() if k != 'skipped'}, indent=1)[:3000])
print('skipped:', len(skipped), skipped[:5])
