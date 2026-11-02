#!/usr/bin/env python3
"""ETF inventory of the locally available minute-bar datasets (Study 8 archive audit, stage A6 groundwork).

Read-only and deterministic. Run from the repository root:

    python3 research/study8-archive-audit/scripts/etf_inventory.py

For every directory directly under data/ that contains data.csv it records the file size and, from
data/<SYMBOL>/dataset-report.json, the status, rows, first/last timestamps, the data sha256 (first 16 hex) and the
anomaly list. Only when the report is missing or lacks those fields are the first and last line of data.csv read
(source "file head/tail"). In every case the first and last line are read once more, only to parse their timestamp
field, as a consistency check against the report; no other line of a data file is ever parsed.

Labels come only from repository files (never invented):
  - canonical list and eligibility cohort: research/d1-robust-pool-discovery/results/audit/universe.json `eligible`
    (61), asserted identical to research/d1-ranked-preemption/results/audit/universe.json;
  - tier, category, fund structure, Vanguard-issued flag: the same universe.json `symbols` entries (declared in
    src/d1-robust/context.ts);
  - economic-exposure cluster, semiconductor and control-instrument flags: the standalone audit's census
    research/d1-standalone-etf-opportunity-audit/results/inventory/census.json (declared in
    src/d1-standalone-opportunity-audit/context.ts `clusters`);
  - B5 book and phenotype: config/pools/B5.json `books`.

Outputs (overwritten, byte-identical on a rerun while the inputs are unchanged):
  research/study8-archive-audit/outputs/etf-inventory.csv
  research/study8-archive-audit/outputs/etf-inventory.md
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
OUT_DIR = ROOT / "research" / "study8-archive-audit" / "outputs"
OUT_CSV = OUT_DIR / "etf-inventory.csv"
OUT_MD = OUT_DIR / "etf-inventory.md"

UNIVERSE_ROBUST = "research/d1-robust-pool-discovery/results/audit/universe.json"
UNIVERSE_PREEMPTION = "research/d1-ranked-preemption/results/audit/universe.json"
CENSUS = "research/d1-standalone-etf-opportunity-audit/results/inventory/census.json"
B5_POOL = "config/pools/B5.json"
LABEL_DECLARATIONS = ("src/d1-robust/context.ts", "src/d1-standalone-opportunity-audit/context.ts")

COMMAND = "python3 research/study8-archive-audit/scripts/etf_inventory.py"
FIRST_SESSION = "2016-01-04"
LATEST_END = "2026-10-29"
NEW_YORK = ZoneInfo("America/New_York")

COLUMNS = [
    "symbol",
    "bytes",
    "metaSource",
    "status",
    "rows",
    "firstTimestamp",
    "lastTimestamp",
    "firstNewYorkDate",
    "lastNewYorkDate",
    "sha256First16",
    "anomalies",
    "headTailMatchesReport",
    "inCanonicalList",
    "universeCohort",
    "universeReasons",
    "tier",
    "category",
    "cluster",
    "structureKind",
    "issuer",
    "flags",
    "b5Book",
]


def sha256_of(relative: str) -> str:
    return hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()


def load_json(relative: str):
    with open(ROOT / relative, encoding="utf-8") as handle:
        return json.load(handle)


def timestamp_field(line: bytes) -> str:
    """The first CSV field of one data line (the bar's UTC ISO timestamp), quotes removed."""
    return line.decode("utf-8").split(",", 1)[0].strip().strip('"')


def head_tail_timestamps(path: Path) -> tuple[str, str]:
    """Timestamps of the first and the last line of a data file; nothing else is parsed."""
    with open(path, "rb") as handle:
        first = handle.readline()
        size = handle.seek(0, io.SEEK_END)
        window = 256
        while True:
            start = max(0, size - window)
            handle.seek(start)
            chunk = handle.read(size - start).rstrip(b"\r\n")
            cut = chunk.rfind(b"\n")
            if cut >= 0 or start == 0:
                last = chunk[cut + 1 :]
                break
            window *= 2
    return timestamp_field(first), timestamp_field(last)


def new_york_date(timestamp: str) -> str:
    if not timestamp:
        return ""
    moment = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return moment.astimezone(NEW_YORK).date().isoformat()


def main() -> int:
    if not DATA.is_dir():
        print(f"no data/ directory under {ROOT}", file=sys.stderr)
        return 1

    robust = load_json(UNIVERSE_ROBUST)
    preemption = load_json(UNIVERSE_PREEMPTION)
    if sorted(robust["eligible"]) != sorted(preemption["eligible"]):
        print("the two universe.json eligible lists differ", file=sys.stderr)
        return 1
    canonical = set(robust["eligible"])
    universe = robust["symbols"]

    census_clusters: dict[str, set[tuple]] = {}
    for row in load_json(CENSUS)["rows"]:
        census_clusters.setdefault(row["symbol"], set()).add(
            (row["cluster"], bool(row["semiconductor"]), bool(row["controlInstrument"]))
        )
    for symbol, values in census_clusters.items():
        if len(values) != 1:
            print(f"{symbol}: inconsistent census labels {sorted(values)}", file=sys.stderr)
            return 1

    b5_books = {book["symbol"]: book.get("phenotype", "") for book in load_json(B5_POOL)["books"]}

    symbols = sorted(p.name for p in DATA.iterdir() if p.is_dir() and (p / "data.csv").is_file())
    rows = []
    for symbol in symbols:
        data_file = DATA / symbol / "data.csv"
        report_file = DATA / symbol / "dataset-report.json"
        size = data_file.stat().st_size
        head_ts, tail_ts = head_tail_timestamps(data_file)

        report = None
        if report_file.is_file():
            with open(report_file, encoding="utf-8") as handle:
                report = json.load(handle)
        after = (report or {}).get("after") or {}
        has_report = (
            report is not None
            and "status" in report
            and all(key in after for key in ("rows", "firstTimestamp", "lastTimestamp", "sha256"))
        )

        if has_report:
            source = "dataset-report.json"
            status = report["status"]
            row_count = str(after["rows"])
            first_ts, last_ts = after["firstTimestamp"], after["lastTimestamp"]
            digest = after["sha256"][:16]
            anomalies = "; ".join(report.get("anomalies") or [])
            matches = "yes" if (after.get("bytes") == size and first_ts == head_ts and last_ts == tail_ts) else "no"
        else:
            source = "file head/tail"
            status = (report or {}).get("status", "")
            row_count = ""
            first_ts, last_ts = head_ts, tail_ts
            digest = ""
            anomalies = "; ".join((report or {}).get("anomalies") or [])
            matches = "n/a"

        entry = universe.get(symbol, {})
        structure = entry.get("structure") or {}
        cluster, semiconductor, control = next(iter(census_clusters.get(symbol, {("", False, False)})))
        flags = []
        if semiconductor:
            flags.append("semiconductor fund")
        if control:
            flags.append("control instrument")
        if entry.get("vanguardIssued"):
            flags.append("Vanguard-issued")

        rows.append(
            {
                "symbol": symbol,
                "bytes": str(size),
                "metaSource": source,
                "status": status,
                "rows": row_count,
                "firstTimestamp": first_ts,
                "lastTimestamp": last_ts,
                "firstNewYorkDate": new_york_date(first_ts),
                "lastNewYorkDate": new_york_date(last_ts),
                "sha256First16": digest,
                "anomalies": anomalies,
                "headTailMatchesReport": matches,
                "inCanonicalList": "yes" if symbol in canonical else "no",
                "universeCohort": entry.get("cohort", ""),
                "universeReasons": "; ".join(entry.get("reasons") or []),
                "tier": entry.get("tier", ""),
                "category": entry.get("category", ""),
                "cluster": cluster,
                "structureKind": structure.get("kind", ""),
                "issuer": structure.get("issuer", ""),
                "flags": "; ".join(flags),
                "b5Book": f"yes ({b5_books[symbol]})" if symbol in b5_books else "no",
            }
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    OUT_CSV.write_text(buffer.getvalue(), encoding="utf-8", newline="\n")

    firsts = sorted(row["firstNewYorkDate"] for row in rows)
    late_start = [row["symbol"] for row in rows if row["firstNewYorkDate"] > FIRST_SESSION]
    early_end = [row["symbol"] for row in rows if row["lastNewYorkDate"] < LATEST_END]
    full_end = [row["symbol"] for row in rows if row["lastNewYorkDate"] >= LATEST_END]
    not_canonical = [row["symbol"] for row in rows if row["inCanonicalList"] == "no"]
    mismatches = [row["symbol"] for row in rows if row["headTailMatchesReport"] == "no"]
    fallbacks = [row["symbol"] for row in rows if row["metaSource"] != "dataset-report.json"]
    canonical_missing = sorted(canonical - set(symbols))

    def listing(items: list[str]) -> str:
        return ", ".join(items) if items else "none"

    sources = [UNIVERSE_ROBUST, UNIVERSE_PREEMPTION, CENSUS, B5_POOL, *LABEL_DECLARATIONS]
    lines = [
        "# ETF inventory — locally available minute-bar datasets",
        "",
        f"Generated by `{COMMAND}` (run from the repository root; read-only; deterministic — no clock value is",
        "written). Metadata come from each `data/<SYMBOL>/dataset-report.json`; only the first and last line of a",
        "`data.csv` are read, for their timestamp field. New York dates are the UTC timestamps converted to",
        "America/New_York.",
        "",
        f"- **Symbols with `data/<SYMBOL>/data.csv`:** {len(rows)}.",
        f"- **Canonical list:** `{UNIVERSE_ROBUST}` `eligible` ({len(canonical)} symbols; identical to",
        f"  `{UNIVERSE_PREEMPTION}`). Not in it: {listing(not_canonical)}. Canonical but without local data:"
        f" {listing(canonical_missing)}.",
        f"- **Earliest / latest first New York date:** {firsts[0]} / {firsts[-1]}.",
        f"- **First date after {FIRST_SESSION}:** {listing(late_start)}.",
        f"- **Last date before {LATEST_END} ({len(early_end)} symbols):** {listing(early_end)}.",
        f"- **Last date on or after {LATEST_END}:** {listing(full_end)}.",
        f"- **Metadata fallback to file head/tail:** {listing(fallbacks)}. **Report disagrees with file (bytes or",
        f"  first/last timestamp):** {listing(mismatches)}.",
        "",
        "Label sources (labels are copied, never inferred):",
        "",
        "- `inCanonicalList`, `universeCohort`, `universeReasons`, `tier`, `category`, `structureKind`, `issuer`,",
        "  Vanguard-issued flag: the universe.json files above (declared in `src/d1-robust/context.ts`).",
        "- `cluster`, semiconductor / control-instrument flags: the standalone audit census (declared in",
        "  `src/d1-standalone-opportunity-audit/context.ts` `clusters`); assigned to the 61 canonical symbols only.",
        f"- `b5Book`: `{B5_POOL}` `books`.",
        "",
        "| Source file | sha256 |",
        "|---|---|",
        *[f"| `{source}` | `{sha256_of(source)}` |" for source in sources],
        "",
        "| " + " | ".join(COLUMNS) + " |",
        "|" + "---|" * len(COLUMNS),
    ]
    for row in rows:
        lines.append("| " + " | ".join(row[column].replace("|", "\\|") for column in COLUMNS) + " |")
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")

    print(f"wrote {OUT_CSV.relative_to(ROOT)} and {OUT_MD.relative_to(ROOT)} ({len(rows)} symbols)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
