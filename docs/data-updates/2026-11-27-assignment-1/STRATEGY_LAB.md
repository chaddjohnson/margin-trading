# Strategy Lab: portfolio evaluation windows, N/original on all available data, effective dates

## 1. Open N/original on all available data and look at the new trades

1. Open Strategy Lab at **http://apollo:4317** from any tailnet device (or http://127.0.0.1:4317 on apollo; the browser
   asks once for the API token: `npm --prefix apps/strategy-lab run token -- --print` on apollo) and click
   **Portfolios**. Direct link: http://apollo:4317/#/portfolio/n-original?window=all
2. Pick **6 · N/original**. Its research window replays first (2016-01-04 → 2026-10-30, *Parity verified*).
3. Under **Evaluation window**, click **All**. The page replays N/original as one continuous run through the latest
   session that both VGT and GDX hold completely (about 14 s the first time, then from the cache). The header shows:
   - **2016-01-04 → 2026-11-25** and the session count;
   - **MANUAL POST-VALIDATION EVALUATION**;
   - *Research window reproduced: identical through 2026-10-30 · archived parity verified*.
4. **Portfolio totals** show the whole run, the formal validation window (2025-01-02 → 2026-10-30, unchanged) and
   **After 2026-10-30 → 2026-11-25**. Below them is the **Periods** table (A, A1, A2, B, C): the same figures as
   `npm run manual-eval`.
5. In **Positions**, set *Period* to **Active After 2026-10-30 (post-validation) (incl. carried in)**. The list shows
   P-44, P-45 and P-46, with **P&L in this period (B)** beside each lifetime net:
   - P-44 is carried in from +$5,483.48 lifetime: its post-validation P&L is +$11,048.24, marked −$5,564.76 at the
     2026-10-30 close;
   - P-45 −$16,225.15 (protective stop 2026-11-20);
   - P-46 −$520.99.
6. Expand a position (▸) and click **Chart** on a fill. The GDX or VGT chart opens on it (candles or intraday line),
   with the entry and exit markers. The equity chart's **After 2026-10-30 (post-validation)** viewport (amber
   shading) shows the new period.

The address keeps the choice (`#/portfolio/n-original?window=all`), so a reload or a bookmark restores it. Other links:
`#/portfolio/n-original?window=custom&from=2026-11-02&to=2026-11-25&exec=continuous` (a reporting window of the
continuous run) and `…&exec=isolated` (a cold start).

## 2. Supported evaluation windows (every portfolio candidate)

| Mode | What runs | What the figures describe | Verification shown |
|---|---|---|---|
| **Research** (default; every earlier link) | The candidate's research window: the archived benchmark its targets were sealed on, Priority 3's FULL door, 2016-01-04 → 2026-10-30 (the verified byte prefix of the canonical files) | That window | *Parity verified: n/n archived checks* (targets, record and ledger signature; N/original: 10 checks plus its 44-lot ledger in the test suite) |
| **All** | One continuous run 2016-01-04 → the **latest common complete session** of VGT and GDX (never past either file's last complete session; a partly appended session is never used) | The whole run, with development, formal validation and **post-validation** periods | *Research window reproduced*: the run is replayed beside the research window and must equal it decision for decision through 2026-10-30, or it fails; the research replay's archived parity is checked too |
| **Custom · continuous history** (the custom default) | One continuous run 2016-01-04 → *To* | The reporting window *From* → *To* (period R): positions, book states, stops and accrued interest carried in | As for All |
| **Custom · isolated window** | The run starts flat at *From* (a cold start, no earlier state) | *From* → *To* | *No archived target (isolated window): ledger-reconciled only* |

- **Date controls.** The same New York session-date fields and preset chips as the Run Test dialog: Development,
  Validation, After 2026-10-30. A *To* after the local data is refused in the form and by the server ("after the
  latest common complete session …"); nothing is fabricated.
- **Every candidate supports every mode**, the five Priority 6 candidates and N/original alike. The two VGT-only
  candidates also read the two-symbol door, so their All endpoint is the common one (both files end 2026-11-25).
- **No mode is offered that cannot run.** All and Custom are disabled when the local coverage cannot be established.

## 3. Requested and effective dates

- **Portfolio header.** The bold range is the **reported** window (what the figures describe). The (i) popover lists:
  - the requested window;
  - the simulated sessions (engine);
  - the reported sessions;
  - the research window;
  - each file's latest complete session and last row;
  - the label.
- **Single-symbol runs** (Run Test, Interactive Preview, phenotype runs):
  - **Header:** shows the **evaluated** sessions recorded in the run's provenance. When they differ from the request,
    *(requested from → to)* follows, and a *manual post-validation* badge marks windows ending after 2026-10-30.
  - **Parameters panel:** lists the evaluated window, the requested window and each symbol's evaluated sessions with
    warm-up.
  - **Chart:** a saved run's chart now stops at the sessions it evaluated; rows appended later are never drawn as if
    the run had seen them.
  - **Export bundle:** `run.json` gains `effectiveWindow`, and the README's window row shows both windows.
- **Run Test dialog:** a *To* after 2026-10-30 shows the manual post-validation note.

## 4. Cache identity

A portfolio replay's cache key now includes:
- the canonical window request;
- the research date ranges file (`config/research/date-ranges.json`, sha256);
- the content hashes of `data/VGT` and `data/GDX`, so a new data vintage is always a new identity;
- the catalog entry and the implementation fingerprint.

Different windows, execution modes or data vintages therefore never resolve to the same cached result. The replay
format is 2, so format-1 entries never match; they are evicted by the cache's normal limits. Previews and saved runs
were already content-addressed.

## 5. Parity: Strategy Lab against the command line

| Check | Result |
|---|---|
| N/original research window vs the sealed targets (A3 FULL validation, risk-metrics G0) | 10/10: $482,700.73 / DD $20,385.99 / 44 lots / development $388,031.02 (DD $19,459.83, 32 lots) / validation $94,669.70 (reset DD $20,385.99) / realized $488,265.48 / unrealized −$5,564.76 / signature `54d1c2e07c2dbbfd` |
| N/original research window vs the sealed per-lot table (`research/vg-l0-risk-metrics/results/tables/trades.csv`) | 44/44 lots: book, entry, exit, reason, open flag, principal, net to the cent |
| N/original through 2026-11-25: Strategy Lab's period table vs the CLI's committed `n-original/all-through-2026-11-25/summary.json` | **deep-equal, field for field** (A, A1, A2, B, C) |
| The same run vs the research window | identical decision for decision through 2026-10-30 |
| Totals | net $477,002.83, max minute DD $25,794.56, 46 lots, interest $73,232.88, costs $4,875.26; post-validation −$5,697.90, reset DD $25,794.56, interest $723.29, costs $244.86 |
| Lots 44–46 | P-44 D1·GDX 2026-10-23 13:33Z → 2026-11-10 16:20Z trailing stop, lifetime +$5,483.48, B +$11,048.24 (carried in from −$5,564.76); P-45 D1·GDX 2026-11-12 14:33Z → 2026-11-20 16:01Z protective stop −$16,225.15; P-46 D1·VGT 2026-11-20 17:07Z → 2026-11-25 14:30Z trailing stop (gap) −$520.99 |
| The refused D1·GDX decision of 2026-11-23 (slot held by P-46) | a refused-signal marker, never a fill |
| C4 and VGT-only + Growth 08500a60 through 2026-11-25 | identical to their research windows through 2026-10-30; validation and development figures = their archived targets |

The shared engine path is the same in both tools:
- `src/manual-eval/execute.ts` plans, opens and attributes for both the CLI and Strategy Lab;
- N/original runs through `src/vg-l0-risk-metrics/engine.ts` `replay` with `vOptions`, exactly the CLI's call.

The tests are `apps/strategy-lab/tests/portfolio-windows.test.ts`, `portfolio-parity.test.ts`, `portfolio-server.test.ts`,
`windows-model.test.ts` and `e2e/portfolio-windows.spec.ts`.

## 6. Screenshots

`screenshots/` holds them, taken by the browser test on its own server and temporary state:
- `01-n-original-all-summary.png`: header, window controls and summary;
- `02-n-original-post-validation-ledger.png`: the post-validation ledger;
- `03-n-original-gdx-lot-45-protective-stop.png`: P-45's exit on GDX;
- `04-n-original-vgt-lot-46.png`: P-46 on VGT.

## 7. Deployment status

- **Build:** `apps/strategy-lab/dist`, built from the final code (2026-11-27T20:40Z).
- **Server:** running as the transient user unit `strategy-lab` (the repository's service-template command line, tailnet
  and loopback on port 4317, the live state `state/strategy-lab`). Nothing else was running on 4317 and no service was
  installed.
- **Manage it:**
  - `systemctl --user status|stop|restart strategy-lab`;
  - `journalctl --user -u strategy-lab -f`.
- **Not permanent:** the transient unit does not survive a reboot or logout. The permanent option remains
  `npm --prefix apps/strategy-lab run service:install -- --enable`, which needs your decision. Alternatively run
  `npm --prefix apps/strategy-lab run start:vpn` yourself.
- **Already warm:** N/original's research and All replays were run once through the live server and are in its
  replay cache.

