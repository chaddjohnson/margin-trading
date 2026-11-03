// Phase B data provenance for runner output (report-only): each file's byte prefix through the last 2026-10-30 bar
// against the prefix pinned at the Phase B freeze (results/protocol_freeze.json integrity.data.canonical). "exact" =
// the pinned file; "appended" = the pinned prefix intact plus later bytes (new sessions, never part of any sealed
// record); "HISTORY CHANGED" = the pinned prefix differs (a reconciliation would not be meaningful).
import path from 'node:path';
import fs from 'fs-extra';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';
import { protocolFreezeFile } from '../study9-phase-b/context.ts';

export type PinStatus = 'exact' | 'appended' | 'HISTORY CHANGED' | 'no Phase B pin' | 'missing';

export const pinStatusOf = (
  bytes: Buffer | undefined,
  pin: { bytes: number; sha256: string } | undefined
): PinStatus => {
  if (!bytes) return 'missing';
  if (!pin) return 'no Phase B pin';
  if (bytes.length < pin.bytes || sha256(bytes.subarray(0, pin.bytes)) !== pin.sha256) return 'HISTORY CHANGED';

  return bytes.length > pin.bytes ? 'appended' : 'exact';
};

export const phaseBPins = async (symbols: readonly string[], root = 'data') => {
  const frozen = (await fs.readJson(protocolFreezeFile)) as {
    integrity: { data: { canonical: Record<string, { bytes: number; sha256: string }> } };
  };
  const out: Record<string, { status: PinStatus; pinnedBytes: number | null; fileBytes: number | null }> = {};

  for (const symbol of symbols) {
    const file = path.join(root, symbol, 'data.csv');
    const bytes = (await fs.pathExists(file)) ? await fs.readFile(file) : undefined;
    const pin = frozen.integrity.data.canonical[symbol];

    out[symbol] = {
      status: pinStatusOf(bytes, pin),
      pinnedBytes: pin?.bytes ?? null,
      fileBytes: bytes?.length ?? null
    };
  }

  return out;
};
