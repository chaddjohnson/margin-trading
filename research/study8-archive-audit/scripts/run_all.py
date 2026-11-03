"""Regenerates every audit output from the sealed records and writes outputs/MANIFEST.sha256.

Run from the repository root:  python3 -B research/study8-archive-audit/scripts/run_all.py
Read-only on everything outside research/study8-archive-audit/outputs/. The manifest lists the sha256 of every input
the scripts read (the sealed Study 8 records, the ETF metadata) and of every output, so a second run can be compared
byte for byte (`--check` exits 1 if any output differs from the manifest).
"""

import os
import runpy
import sys

import common as c

SCRIPTS = ['inventory.py', 'frontier.py', 'saturation.py', 'persistence.py', 'etf_inventory.py']


def manifest_lines():
    lines = []
    for path, sha in sorted(c.INPUTS.items()):
        lines.append(f'{sha}  {path}  input')
    for name in sorted(os.listdir(c.OUT)):
        if name in ('MANIFEST.sha256', 'baseline-manifest.sha256') or name.startswith('verify-'):
            continue
        lines.append(f'{c.sha256_file(os.path.join(c.OUT, name))}  {c.rel(os.path.join(c.OUT, name))}  output')
    return lines


def main():
    check = '--check' in sys.argv
    before = None
    path = os.path.join(c.OUT, 'MANIFEST.sha256')
    if check:
        with open(path) as f:
            before = f.read().splitlines()
    for script in SCRIPTS:
        try:
            runpy.run_path(os.path.join(c.HERE, script), run_name='__main__')
        except SystemExit as stop:  # a script ending with sys.exit(main()); only a zero status may continue
            if stop.code not in (0, None):
                raise
    # the ETF inventory script reads its own inputs; record them too (metadata files only)
    for root, _, files in os.walk(os.path.join(c.ROOT, 'data')):
        for name in files:
            if name == 'dataset-report.json':
                c._note(os.path.join(root, name))
    c._note(os.path.join(c.ROOT, 'research', 'd1-robust-pool-discovery', 'results', 'audit', 'universe.json'))
    lines = manifest_lines()
    if check:
        if lines != before:
            changed = sorted(set(lines) ^ set(before))
            print('MANIFEST DIFFERS:\n' + '\n'.join(changed[:40]))
            sys.exit(1)
        print(f'check: {len(lines)} manifest lines identical')
        return
    with open(path, 'w', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'manifest: {len(lines)} lines → {c.rel(path)}')


if __name__ == '__main__':
    main()
