// staged-stop@1 — the rule itself, one implementation for D1 and Growth (RULE_SPECIFICATION.md §1). A tracker belongs
// to ONE virtual book with the stage ON; the book calls it immediately after its exit manager's onEntry (the fill) and
// immediately after the manager's afterSession(s) (every later session close while the position is open). It reads the
// manager's own post-entry high H and raises the manager's own level:
//
//   actPrice = e × (1 + a / 1000)                    once per position, e = the raw entry fill
//   armed    = armed ∨ H ≥ actPrice                  latched for the position
//   if armed: stopPrice = max(stopPrice, H × (1 − t2 / 1000))
//
// Nothing else changes: eligibility (the net-profit rule), triggers, fills, reasons and precedence belong to the
// manager. The counters are exact on CPU and GPU; the detail rows (purpose diagnostic) are CPU only.
import type { StagedBookConfig } from './config.ts';

export interface StagedLite {
  arms: number; // positions whose stage armed
  stagedExits: number; // trailing-stop events (full exits or retention partial sales) executed while armed
  placementExits: number; // staged exits in the session right after arming, the arming close at or below the new level
}

export interface StagedRow {
  entryS: number;
  entryRaw: number;
  actPrice: number;
  armedS: number; // -1: never armed
  highAtArming: number;
  levelAtArming: number;
  placed: boolean;
  events: {
    s: number;
    reason: string;
    raw: number;
    level: number;
    stage1Level: number;
    high: number;
    staged: boolean;
  }[];
  exitS: number; // -1 while open (the final exit, of any reason)
  exitReason: string;
}

interface Manager {
  postEntryHigh: number;
  stopPrice: number;
}

const isTrailing = (reason: string) => reason === 'trailing stop' || reason === 'trailing stop gap';

export class StagedTracker {
  readonly activation: number; // A as a fraction (a / 1000)
  readonly tsp2: number; // τ₂ as a fraction (t2 / 1000)
  arms = 0;
  stagedExits = 0;
  placementExits = 0;
  private actPrice = NaN;
  private armed = false;
  private armedS = -1;
  private placed = false;
  private row: StagedRow | null = null;
  readonly rows: StagedRow[] | null;

  constructor(
    readonly cfg: StagedBookConfig,
    readonly tau1: number, // the book's stage-1 fraction (detail rows only)
    detail = false
  ) {
    this.activation = cfg.activationTenths / 1000;
    this.tsp2 = cfg.stage2Tenths / 1000;
    this.rows = detail ? [] : null;
  }

  get isArmed() {
    return this.armed;
  }

  // Immediately after the manager's onEntry at the fill (s = the entry session, close = that session's close).
  onEntry(mgr: Manager, entryRaw: number, s: number, close: number) {
    this.actPrice = entryRaw * (1 + this.cfg.activationTenths / 1000);
    this.armed = false;
    this.armedS = -1;
    this.placed = false;
    if (this.rows) {
      this.row = {
        entryS: s,
        entryRaw,
        actPrice: this.actPrice,
        armedS: -1,
        highAtArming: NaN,
        levelAtArming: NaN,
        placed: false,
        events: [],
        exitS: -1,
        exitReason: 'open'
      };
      this.rows.push(this.row);
    }
    this.step(mgr, s, close);
  }

  // Immediately after the manager's afterSession(s) (never on the entry session).
  afterSession(mgr: Manager, s: number, close: number) {
    this.step(mgr, s, close);
  }

  private step(mgr: Manager, s: number, close: number) {
    let armedNow = false;

    if (!this.armed && mgr.postEntryHigh >= this.actPrice) {
      this.armed = true;
      this.armedS = s;
      this.arms++;
      armedNow = true;
    }
    if (!this.armed) return;
    mgr.stopPrice = Math.max(mgr.stopPrice, mgr.postEntryHigh * (1 - this.cfg.stage2Tenths / 1000));
    if (armedNow) {
      this.placed = close <= mgr.stopPrice;
      if (this.row) {
        this.row.armedS = s;
        this.row.highAtArming = mgr.postEntryHigh;
        this.row.levelAtArming = mgr.stopPrice;
        this.row.placed = this.placed;
      }
    }
  }

  // An executed exit event of the position at session s (a full exit, or a retention partial sale), before the book
  // closes the position. `raw` is the raw fill price; `mgr` is the position's manager.
  onExitEvent(reason: string, s: number, raw: number, mgr: Manager, final: boolean) {
    const staged = isTrailing(reason) && this.armed;

    if (staged) {
      this.stagedExits++;
      if (s === this.armedS + 1 && this.placed) this.placementExits++;
    }
    if (this.row) {
      if (isTrailing(reason))
        this.row.events.push({
          s,
          reason,
          raw,
          level: mgr.stopPrice,
          stage1Level: mgr.postEntryHigh * (1 - this.tau1),
          high: mgr.postEntryHigh,
          staged
        });
      if (final) {
        this.row.exitS = s;
        this.row.exitReason = reason;
      }
    }
  }

  lite(): StagedLite {
    return { arms: this.arms, stagedExits: this.stagedExits, placementExits: this.placementExits };
  }
}
