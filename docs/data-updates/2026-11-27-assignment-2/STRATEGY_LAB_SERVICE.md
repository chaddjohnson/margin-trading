# Strategy Lab: permanent service on Apollo

**Status:** `strategy-lab.service`, a systemd **user** unit, is **active and enabled**. It starts at boot through
linger, which is on for `chad`. It serves the accepted `main` build from an immutable release checkout, with the
existing state, token, port and addresses.

## 1. What runs

| Item | Value |
|---|---|
| Unit | `~/.config/systemd/user/strategy-lab.service`, written by the repository's installer (`apps/strategy-lab/scripts/install-service.mjs` from `apps/strategy-lab/deploy/strategy-lab.service.template`), enabled via `default.target.wants` |
| Build | release `~/.local/share/strategy-lab/releases/15a7b64638df` = `main` **`15a7b646`** (the accepted tree of merge `0a368680` plus post-merge evidence): a detached, locked `git worktree`. Its UI is built in its own `apps/strategy-lab/dist` (`scripts/strategy-lab-release.sh`) |
| Command | `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=4096 <release>/apps/strategy-lab/server/main.ts` |
| State | `~/.config/strategy-lab/env`: `STRATEGY_LAB_STATE_DIR=/home/chad/projects/margin-trading/state/strategy-lab`, the same database, runs, imports, caches and API token as before. Nothing migrated: the same migrations 0001–0003 |
| Data | the release's `data/<SYMBOL>` link to the main checkout's canonical files (one file per symbol; read only) |
| Binding | 127.0.0.1:4317, 127.0.1.1:4317 (`apollo` on Apollo itself) and 100.68.60.114:4317 (Tailscale). Never the LAN: 192.168.18.14 refuses the connection |
| Authentication | unchanged: the token file in the state directory, required for every API request over the VPN (401 without it). It was never printed |
| Restart policy | `Restart=on-failure`, `RestartSec=10`, `RestartSteps=5`, `RestartMaxDelaySec=120`: recovery never stops, and the waits grow to 2 min, so there is no tight loop (`08fa5280`) |
| Boot | `UnitFileState=enabled`, `Linger=yes`, `WantedBy=default.target`. **Verified as configuration only: Apollo was not rebooted** (brief §9). Tailscale may come up after the user manager; the server then retries with the backoff until the address exists |

**Why a release checkout and not the main checkout.** The brief requires "a deliberately selected, verified build of
the accepted `main` implementation, not a mutable research worktree". The main checkout is where research branches are
switched, and the server's runner processes load the checkout's code. The release uses the established installer
unchanged; it only runs from another checkout. `docs/strategy-lab/OPERATIONS.md` §Permanent service documents it.

## 2. The transition (2026-11-28, UTC)

| Time | Step |
|---|---|
| 03:30Z | the release built from `15a7b646` (11 s); smoke-tested on loopback port 4392 against a COPY of the state: six candidates; research $482,700.73, parity verified; All $477,002.83 / DD $25,794.56 / 46 lots; P-44/45/46; chart routes 200 (`evidence/strategy-lab-release-smoke-15a7b646.json`). The copy was removed |
| 03:31Z | `~/.config/strategy-lab/env` written; the unit file installed (not yet enabled) |
| 03:31Z | the Assignment 1 **transient** unit `strategy-lab` stopped. Its process had been killed by the user's `fuser -k` at 22:21:36Z, and it had restarted and failed 1,804 times since (EADDRINUSE: the user's own server held the port). It was harmless to that server. An earlier attempt to stop it (22:30Z) was refused by the session's permission classifier |
| 03:32:04Z | the user's foreground server, `npm --prefix apps/strategy-lab run start:vpn` in tmux session `strategy-lab` (PID 3009794, from the main checkout), stopped with SIGINT (its Ctrl-C). It exited at once |
| 03:32:14Z | the state copied whole while nothing ran: `~/backups/strategy-lab/state-20261128T033214Z-before-permanent-service` (1.2 GB) |
| 03:32:15Z | `systemctl --user daemon-reload && systemctl --user enable --now strategy-lab`: active, listening. **Downtime ≈ 11 s** |

The tmux session `strategy-lab` is still there with an idle shell. The user may close it.

## 3. Verification of the deployed service

| Check | Result | Evidence |
|---|---|---|
| Unit status, fragment, working directory, environment file, restart settings | active, enabled, the release directory, the env file, the settings above | `systemctl --user show strategy-lab` (in this report) |
| Logs | "database …/state/strategy-lab/strategy-lab.sqlite; state …/state/strategy-lab; UI <release>/apps/strategy-lab/dist; token required"; listening on the three addresses | `journalctl --user -u strategy-lab` |
| HTTP over 127.0.0.1, 127.0.1.1, 100.68.60.114 and `apollo` | health 200; API 401 without the token, 200 with it; UI 200; LAN refused | — |
| API smoke over the Tailscale address (`scripts/strategy-lab-smoke.mjs`) | the reference figures and lots, trajectory identical, charts 200 | `evidence/strategy-lab-service-smoke.json` |
| **A real browser** (headless system Chrome via Playwright, `scripts/strategy-lab-browser-check.mjs`) on `http://100.68.60.114:4317/#/portfolio/n-original` | **7/7 PASS** (below) | `evidence/strategy-lab-service-browser-check.json` |
| Controlled restart (`systemctl --user restart`, no run active) | new PID; the saved runs 28 → 28; health 200 | — |
| Failure recovery (`systemctl --user kill --signal=SIGKILL`) | restarted automatically after **10.6 s**, NRestarts 1, all three addresses bound | `journalctl` |

**The browser check covered:**
- **Research window:** 2016-01-04 → 2026-10-30, parity verified, $482,700.73 / $20,385.99.
- **All:** 2016-01-04 → 2026-11-25, MANUAL POST-VALIDATION, trajectory verified; $477,002.83 / $25,794.56, post
  −$5,697.90, the formal validation $94,669.70.
- **The post-validation ledger:** exactly P-44, P-45 and P-46. Their in-period P&L is +$11,048.24 (P-44 "carried in",
  lifetime +$5,483.48), −$16,225.15 (protective stop) and −$520.99.
- **Fill-to-chart:** P-45's exit selected on GDX, and P-46's entry on VGT.
- **Custom, continuous 2026-11-02 → 2026-11-25:** −$5,697.90. A To date after the data is refused.
- **Custom, isolated (a cold start):** $0.00, labelled not applicable.
- **Side effects:** no saved run was created.

**Not done:** a check from a second tailnet device, which was not available here. The Tailscale address was exercised
from Apollo itself. To check from a laptop or phone, open http://apollo:4317/#/portfolio/n-original?window=all and enter
the token once (`npm --prefix apps/strategy-lab run token -- --print` on Apollo).

## 4. How to use it

Open **http://apollo:4317/#/portfolio/n-original?window=all**. The token is asked for once per browser.
1. The header shows **2016-01-04 → 2026-11-25** and **MANUAL POST-VALIDATION EVALUATION**.
2. To see the November trades, set **Positions → Period** to **After 2026-10-30**.
3. Click **Chart** on a fill to open it on GDX or VGT.

The Research and Custom (continuous or isolated) windows are in **Evaluation window**.

## 5. Management, rollback and recovery (verified commands)

```bash
systemctl --user status strategy-lab                 # state, PID, the release directory
journalctl --user -u strategy-lab -f                 # logs
systemctl --user restart strategy-lab                # restart (runs in progress are stopped with it)
systemctl --user stop strategy-lab                   # stop (it stays enabled for the next boot)
systemctl --user start strategy-lab                  # start
systemctl --user disable --now strategy-lab          # stop and do not start at boot
systemctl --user show strategy-lab -p WorkingDirectory   # which release is live
```

**Rollback to the previous, known-working mode** (the feature-branch build from the main checkout, as before):
`systemctl --user disable --now strategy-lab`, then `npm --prefix /home/chad/projects/margin-trading/apps/strategy-lab run start:vpn`.
The main checkout is now on `main`, a superset of that build with no Strategy Lab code change.

**Rollback or upgrade to another release:** `node --no-maglev <release>/apps/strategy-lab/scripts/install-service.mjs`,
then `systemctl --user daemon-reload && systemctl --user restart strategy-lab`.

**State recovery:** stop the service, restore from `~/backups/strategy-lab/state-20261128T033214Z-before-permanent-service`,
then start it.

**Does anything need a reboot?** No. The permanent unit replaces the temporary one now: the transient unit is gone, and
the name resolves to the installed file.
