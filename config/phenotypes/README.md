# Phenotypes

A phenotype is a named, symbol-specific parameter vector for a strategy architecture. Phenotypes live here as
version-controlled JSON; the strategy files under `src/app/` are never edited to run one.

```bash
npm run app -- <strategy> <symbol> --phenotype <name>
npm run app -- allIn-trailingBuy-postExitContinuation KRE --phenotype lowDd
```

## Running one

```text
npm run app -- <strategy> <symbol> [start date] [end date] [data file] [output dir] [stop fill]
  --phenotype <name>            the phenotype in config/phenotypes/<architecture>/<symbol>.json
  [--phenotype-file <path>]     read it from another file (same format, same symbol)
  [--execution <profile>]       another config/execution/<profile>.json than the file names
```

The positional arguments mean what they mean to the strategy (`-` leaves one unset). The trailing-buy and buffer
positionals (7th and 8th) set phenotype parameters, so they are refused together with `--phenotype`. Without
`--phenotype` every command behaves exactly as before.

Before the backtest the run prints the strategy and its source file, the symbol, the phenotype and its file, every
applied value next to the file's default, any **IGNORED** parameter, the strategy's own constants that stay at
their file values, the dataset (with its sha256 checked against the profile), the simulated and first eligible
dates, the investment and the interest rate. The strategy then prints its usual trades and summary, and writes its
usual `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `setups.csv` and `summary.json` when given an output
directory, plus `phenotype-run.json` (the resolved run and its periods). Output into `research/` is refused.

After the backtest it prints the **periods** of the one continuous run: each period of the execution profile
(`development` through 2023-12-29, `holdout` from 2024-01-02) and `full` (from the first eligible session). Nothing
is reset at a boundary; a period's net is the change of marked equity (realized plus the open position at the
close, net of interest) from the close before it to its last close, with the research programs' own accounting
(`src/trailing-buy-variants/accounting.ts`). A run fails, and says so, if the strategy did not read every injected
value.

## The verified D1 commands

| Command | Full net | Minute DD | Development | Holdout |
|---|---:|---:|---:|---:|
| `npm run app -- allIn-trailingBuy-postExitContinuation VGT --phenotype primary` | $183,043.82 | $19,330.69 | $137,222.97 | $45,820.85 |
| `npm run app -- allIn-trailingBuy-postExitContinuation XBI --phenotype primary` | $206,045.81 | $27,885.29 | $151,798.52 | $54,247.29 (open) |
| `npm run app -- allIn-trailingBuy-postExitContinuation XRT --phenotype primary` | $165,729.49 | $23,383.16 | $145,468.01 | $20,261.48 |
| `npm run app -- allIn-trailingBuy-postExitContinuation KRE --phenotype primary` | $195,047.71 | $26,271.47 | $171,785.29 | $23,262.43 |
| `npm run app -- allIn-trailingBuy-postExitContinuation KRE --phenotype lowDd` | $174,147.76 | $22,724.74 | $158,512.40 | $15,635.36 |

`src/phenotype/tests/reproduction.test.ts` checks each against its research trade by trade
(`research/vgt-d1-refinement/results/baseline/baseline.json` for VGT, `research/multi-etf-d1/results/holdout/`
for the others). VGT's 2024–2025 window was inspected by earlier VGT programs, so it is not a sealed holdout.

## Adding a phenotype or a symbol

Add a phenotype to the symbol's file, or create `config/phenotypes/<architecture>/<SYMBOL>.json`; no code changes.

```json
{
  "schemaVersion": 1,
  "architecture": "D1",
  "symbol": "KRE",
  "execution": "multi-etf-d1",
  "phenotypes": {
    "lowDd": {
      "description": "free text",
      "parameters": {
        "targetPercentChange": "29.9%",
        "trailingBuyPercentage": "2.7%",
        "trailingStopPercentage": "3.1%",
        "maximumHoldDays": 4,
        "tickWindowSize": 230,
        "intradayLossBuffer": "2.3%",
        "pullback": "9.4%",
        "continuationWindow": 60
      },
      "provenance": { "candidateId": "d1-a389037400" }
    }
  }
}
```

- **Percentages are strings in percentage points with a `%` sign** and at most one decimal: `"29.9%"` is 0.299.
  A bare number (`0.299` or `29.9`) is refused with the string it probably meant, as is `"29.15%"` (off the 0.1
  percentage-point grid). Day and session counts are JSON integers (`maximumHoldDays` in calendar days,
  `tickWindowSize` and `continuationWindow` in sessions).
- Every parameter of the architecture is required, and unknown keys are refused, so nothing falls back to a default.
- The file name is the symbol, case-sensitively, and must match `symbol`.
- `description` and `provenance` are metadata: printed and recorded, never passed to a strategy.
- `npm run app -- phenotypes validate` checks every file; `npm run app -- phenotypes list` shows them.

The D1 parameters and ranges are in `src/phenotype/architectures.ts`. The frozen research files
(`research/*/FROZEN_CANDIDATES.json` and results) are only read, never written.

## Execution profiles

`config/execution/<name>.json` holds what is not a phenotype: the data file pattern, `firstEligibleDate` (no
session before it arms; the multi-ETF research's common eligibility is 2017-06-15), `investmentPerEntry`,
`marginInterestRate`, `stopFill`, the reporting `periods` and the expected data hashes. The investment and the rate
are injected into the strategy's own constants. Command-line positionals (dates, data file, output, stop fill)
override the profile.

## Strategies and architectures

`src/phenotype/strategies.ts` lists every `src/app/` entry point once: the 17 compatible strategy files, with
the parameters each applies or may ignore (a strategy without post-exit continuation ignores `pullback` and
`continuationWindow`, and says so on every run), and the reason for each one that doesn't take phenotypes.
[COMPATIBILITY.md](COMPATIBILITY.md) is the generated matrix (`npm run app -- phenotypes matrix
config/phenotypes/COMPATIBILITY.md`).

How a phenotype reaches an unmodified strategy file: `src/phenotype/injection.ts` derives a module from the file's
source with a few exact-once substitutions (each parameter's declaration reads an injected value, the session load
takes the runner's sessions, the arming guard adds the first eligible date), caches it in `.cache/phenotype/`
(git-ignored) keyed by the source hash, and imports it. One module per strategy file, shared by all phenotypes;
nothing is copied or edited by hand. With nothing injected it gives exactly the original's trades
(`src/phenotype/tests/injection.test.ts`, every compatible file).

- **New compatible strategy file**: add an entry to `compatibleStrategies` (its arming guard, ignorable parameters
  and own constants) and remove it from `incompatibleEntryPoints`; the registry tests check the substitutions.
- **New architecture**: add it to `architectures` in `src/phenotype/architectures.ts`, give its strategy files
  entries in `strategies.ts`, and put its phenotypes in `config/phenotypes/<architecture>/`.
