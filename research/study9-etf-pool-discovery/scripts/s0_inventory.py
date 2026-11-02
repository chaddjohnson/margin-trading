#!/usr/bin/env python3
"""Study 9 S0: a byte-level inventory of every local minute file (standard library only, read-only).

Usage: python3 research/study9-etf-pool-discovery/scripts/s0_inventory.py <out.json> [data-root]

For each data/<SYMBOL>/data.csv: sha256, bytes, rows, first and last row, the file's inode and link count, and the
sha256 of its dataset-report.json. It never prints prices beyond the first and last row of each file and computes no
strategy quantity.
"""
import hashlib
import json
import os
import sys
from datetime import datetime, timezone


def inventory(root):
    out = {}
    for symbol in sorted(os.listdir(root)):
        path = os.path.join(root, symbol, "data.csv")
        if not os.path.isfile(path):
            continue
        digest = hashlib.sha256()
        rows = 0
        first = last = None
        with open(path, "rb") as handle:
            for line in handle:
                digest.update(line)
                rows += 1
                if first is None:
                    first = line.decode().rstrip("\n")
                last = line
        stat = os.stat(path)
        report = os.path.join(root, symbol, "dataset-report.json")
        out[symbol] = {
            "file": path,
            "sha256": digest.hexdigest(),
            "bytes": stat.st_size,
            "rows": rows,
            "firstRow": first,
            "lastRow": last.decode().rstrip("\n") if last else None,
            "inode": stat.st_ino,
            "links": stat.st_nlink,
            "mtimeUtc": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            "datasetReportSha256": hashlib.sha256(open(report, "rb").read()).hexdigest()
            if os.path.isfile(report)
            else None,
        }
    return out


if __name__ == "__main__":
    target = sys.argv[1]
    root = sys.argv[2] if len(sys.argv) > 2 else "data"
    record = {
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "root": root,
        "files": inventory(root),
    }
    with open(target, "w") as handle:
        json.dump(record, handle, indent=1)
    print(f"{len(record['files'])} files inventoried → {target}")
