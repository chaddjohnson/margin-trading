// Stable, diff-friendly JSON for checked-in fixtures: two-space indentation, key order as constructed, and small
// leaf objects/arrays kept on one line (one price bar per line). Byte-identical for identical input.

const INLINE_LIMIT = 120;

function render(value: unknown, indent: string): string {
  const flat = JSON.stringify(value);
  if (value === null || typeof value !== 'object' || flat.length <= INLINE_LIMIT) return flat;
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v) => inner + render(v, inner)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${render(v, inner)}`).join(',\n')}\n${indent}}`;
}

export function stableStringify(value: unknown): string {
  return `${render(value, '')}\n`;
}
