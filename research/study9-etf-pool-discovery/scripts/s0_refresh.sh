#!/usr/bin/env bash
# Study 9 S0: refresh every local ETF minute file through the latest complete US session with the repository's own
# Alpaca SIP pipeline (scripts/download.sh → npm run datasets -- append). Run from anywhere; paths are absolute.
#
#   research/study9-etf-pool-discovery/scripts/s0_refresh.sh snapshot          # 1. hard-link the prior vintage
#   research/study9-etf-pool-discovery/scripts/s0_refresh.sh download <END>    # 2. per-symbol increments (resumable)
#   research/study9-etf-pool-discovery/scripts/s0_refresh.sh append            # 3. one `datasets append` run
#
# Step 1 hard-links every data/<SYMBOL>/data.csv (and its dataset-report.json, and data/datasets-append-run.json) into
# data/vintages/pre-study9-2026-11-02/. `datasets append` writes a new temporary file and renames it over the canonical
# file, so the hard link keeps the prior vintage's exact bytes (its inode) at no disk cost; step 3 then refuses to run
# unless every snapshot still hashes to the pre-refresh inventory.
#
# Step 2 downloads, per symbol, only the sessions after the canonical file's last New York date, through END
# (exclusive in practice: Alpaca reads a date-only end as 00:00 UTC, i.e. 20:00 New York the previous day, so END is the
# calendar day after the last complete session). Each symbol is independent: a finished symbol has a .done marker with
# the increment's sha256 and is skipped on a rerun; a partial file from an interrupted download is moved to
# quarantine/ and downloaded again. Credentials are read from .env inside this script and never printed.
#
# Step 3 copies each finished increment to data/<SYMBOL>.csv and runs one `npm run datasets -- append` over all of them
# (every overlapping row must be byte-identical, the combined file is scanned in full, training and holdout rows must be
# unchanged, and the canonical file is replaced atomically). The increments stay in the vintage folder.
set -euo pipefail

R=/home/chad/projects/margin-trading
S=$R/research/study9-etf-pool-discovery
SNAP=$R/data/vintages/pre-study9-2026-11-02
REFRESH=$R/data/vintages/study9-refresh-2026-11-02
INC=$REFRESH/increments
INVENTORY=$S/results/s0/inventory-pre-refresh.json
LOGS=$S/results/logs/s0-refresh
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH

symbols() { python3 -c "import json; print(' '.join(sorted(json.load(open('$INVENTORY'))['files'])))"; }
last_date() { python3 -c "import json; print(json.load(open('$INVENTORY'))['files']['$1']['lastRow'][1:11])"; }
next_day() { python3 -c "import datetime as d; print((d.date.fromisoformat('$1') + d.timedelta(days=1)).isoformat())"; }

case "${1:-}" in
  snapshot)
    if [[ -e $SNAP ]]; then echo "$SNAP exists; the snapshot is write-once" >&2; exit 1; fi
    mkdir -p "$SNAP"
    for SYMBOL in $(symbols); do
      mkdir -p "$SNAP/$SYMBOL"
      ln "$R/data/$SYMBOL/data.csv" "$SNAP/$SYMBOL/data.csv"
      [[ -f $R/data/$SYMBOL/dataset-report.json ]] && cp -p "$R/data/$SYMBOL/dataset-report.json" "$SNAP/$SYMBOL/"
    done
    cp -p "$R/data/datasets-append-run.json" "$SNAP/datasets-append-run.json"
    cp -p "$R/data/partitions.json" "$SNAP/partitions.json"
    cp -p "$INVENTORY" "$SNAP/inventory-pre-refresh.json"
    echo "snapshot: $(ls "$SNAP" | wc -l) entries in $SNAP"
    ;;
  download)
    END=${2:?END date (the day after the last complete session)}
    mkdir -p "$INC" "$REFRESH/quarantine" "$LOGS"
    set -a; . "$R/.env"; set +a
    for SYMBOL in $(symbols); do
      if [[ -f $INC/$SYMBOL.done ]]; then echo "$SYMBOL: done earlier"; continue; fi
      if [[ -e $INC/$SYMBOL.csv ]]; then mv "$INC/$SYMBOL.csv" "$REFRESH/quarantine/$SYMBOL.csv.partial-$(date -u +%Y%m%dT%H%M%SZ)"; fi
      START=$(next_day "$(last_date "$SYMBOL")")
      if (cd "$R" && OUTPUT_DIR="$INC" scripts/download.sh "$SYMBOL" "$START" "$END" > "$LOGS/$SYMBOL.log" 2>&1) \
        && grep -q '^Download complete' "$LOGS/$SYMBOL.log"; then
        [[ -f $INC/$SYMBOL.csv ]] || : > "$INC/$SYMBOL.csv"
        printf '{"symbol":"%s","start":"%s","end":"%s","rows":%s,"sha256":"%s","at":"%s"}\n' "$SYMBOL" "$START" "$END" \
          "$(wc -l < "$INC/$SYMBOL.csv" | tr -d ' ')" "$(sha256sum "$INC/$SYMBOL.csv" | cut -d' ' -f1)" \
          "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$INC/$SYMBOL.done"
        echo "$SYMBOL: $(cat "$INC/$SYMBOL.done")"
      else
        echo "$SYMBOL: FAILED (see $LOGS/$SYMBOL.log)"
      fi
      sleep 0.4
    done
    ;;
  append)
    python3 - "$SNAP" "$INVENTORY" <<'EOF'
import hashlib, json, sys
snap, inventory = sys.argv[1], json.load(open(sys.argv[2]))["files"]
bad = [s for s, v in inventory.items()
       if hashlib.sha256(open(f"{snap}/{s}/data.csv", "rb").read()).hexdigest() != v["sha256"]]
if bad:
    sys.exit(f"snapshot does not match the pre-refresh inventory: {bad}")
print(f"snapshot verified: {len(inventory)} files equal the pre-refresh inventory")
EOF
    LIST=()
    for SYMBOL in $(symbols); do
      [[ -f $INC/$SYMBOL.done ]] || { echo "$SYMBOL has no finished increment; refusing" >&2; exit 1; }
      [[ -s $INC/$SYMBOL.csv ]] || { echo "$SYMBOL: empty increment (no new rows), skipped"; continue; }
      [[ -e $R/data/$SYMBOL.csv ]] && { echo "data/$SYMBOL.csv exists; refusing" >&2; exit 1; }
      cp "$INC/$SYMBOL.csv" "$R/data/$SYMBOL.csv"
      LIST+=("$SYMBOL")
    done
    mkdir -p "$LOGS"
    (cd "$R" && npm run datasets -- append "${LIST[@]}") > "$LOGS/append.log" 2>&1 || true
    cp -p "$R/data/datasets-append-run.json" "$REFRESH/datasets-append-run.json"
    tail -3 "$LOGS/append.log"
    ;;
  *)
    echo "usage: $0 snapshot | download <END> | append" >&2
    exit 1
    ;;
esac
