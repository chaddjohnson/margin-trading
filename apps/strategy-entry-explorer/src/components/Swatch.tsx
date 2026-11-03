import { swatchIcon } from '../chart/markers.ts';
import type { EntryEventType } from '../schema/types.ts';
import type { Role } from '../state/explorer.ts';

/** The marker glyph for a role and event type, as used on the chart (decorative: always paired with text). */
export function Swatch({ role, type }: { role: Role; type: EntryEventType }) {
  return <img className="swatch" src={swatchIcon(role, type === 'executed')} alt="" width={16} height={12} />;
}

export const TYPE_LABEL: Record<EntryEventType, string> = { signal: 'Signal', executed: 'Executed' };
