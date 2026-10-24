#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/download.sh <symbol> [start date] [end date]
#   Run from the repository root. Writes data/<SYMBOL>.csv (or $OUTPUT_DIR/<SYMBOL>.csv): headerless, comma-delimited one-minute bars (SIP feed, raw prices).
#   The dates are YYYY-MM-DD and inclusive; the start defaults to 2016-01-04 and the end to today (UTC), so a refresh
#   reaches the latest available session. (Until 2026-10-24 the end was fixed at 2026-10-13, which is why the
#   canonical files ended there.) For a full refresh, `npm run datasets -- import <SYMBOL> --replace`; for only the
#   new sessions, a start after the canonical file's last date and `npm run datasets -- append <SYMBOL>`.
if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "Usage: $0 <symbol> [start date] [end date]" >&2
  exit 1
fi

SYMBOL=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
START=${2:-2016-01-04}
END=${3:-$(date -u +%Y-%m-%d)}

for VALUE in "$START" "$END"; do
  if [[ ! "$VALUE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "Dates must be YYYY-MM-DD, not '$VALUE'" >&2
    exit 1
  fi
done

if [[ -e "${OUTPUT_DIR:-data}/${SYMBOL}.csv" ]]; then
  echo "${OUTPUT_DIR:-data}/${SYMBOL}.csv exists; move it away first (the download appends to it)" >&2
  exit 1
fi

: "${ALPACA_API_KEY:?Set ALPACA_API_KEY}"
: "${ALPACA_SECRET_KEY:?Set ALPACA_SECRET_KEY}"

OUTPUT="${OUTPUT_DIR:-data}/${SYMBOL}.csv"
BASE_URL="https://data.alpaca.markets/v2/stocks/${SYMBOL}/bars"

PAGE_TOKEN=""
PAGE=0

while true; do
  ARGS=(
    --data-urlencode "timeframe=1Min"
    --data-urlencode "start=${START}"
    --data-urlencode "end=${END}"
    --data-urlencode "feed=sip"
    --data-urlencode "adjustment=raw"
    --data-urlencode "limit=10000"
  )

  if [[ -n "$PAGE_TOKEN" ]]; then
    ARGS+=(--data-urlencode "page_token=$PAGE_TOKEN")
  fi

  RESPONSE=$(curl -fsS --retry 5 --retry-all-errors \
    -G "$BASE_URL" \
    -H "APCA-API-KEY-ID: $ALPACA_API_KEY" \
    -H "APCA-API-SECRET-KEY: $ALPACA_SECRET_KEY" \
    "${ARGS[@]}")

  echo "$RESPONSE" | jq -r '
    .bars[] |
    [.t, .o, .h, .l, .c, .v] |
    @csv
  ' >> "$OUTPUT"

  PAGE=$((PAGE + 1))
  COUNT=$(echo "$RESPONSE" | jq '.bars | length')
  echo "Page $PAGE: $COUNT bars"

  PAGE_TOKEN=$(echo "$RESPONSE" | jq -r '.next_page_token // empty')

  if [[ -z "$PAGE_TOKEN" ]]; then
    break
  fi
done

echo "Download complete: $OUTPUT"
# The file has no header row: one comma-delimited bar per line.
echo "Total bars: $(wc -l < "$OUTPUT" | tr -d ' ')"
echo "Bars from ${START} through ${END}"
echo "Next: npm run datasets -- import ${SYMBOL} --replace"
echo "(or, for a download of only the sessions after the canonical file: npm run datasets -- append ${SYMBOL})"
