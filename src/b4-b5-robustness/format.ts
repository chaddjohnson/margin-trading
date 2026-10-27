// Formatting for the rendered reports: dollars, signed dollars, percentages, percentage points, shares and Markdown
// tables. Non-finite values print as "n/a" so a missing figure is visible, never silently zero.

export const dollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const cents = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';

export const signed = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const percent = (value: number, digits = 1) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}${(Math.abs(value) * 100).toFixed(digits)}%` : 'n/a';

export const signedPercent = (value: number, digits = 1) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}${(Math.abs(value) * 100).toFixed(digits)}%` : 'n/a';

export const points = (value: number, digits = 2) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}${(Math.abs(value) * 100).toFixed(digits)} pp` : 'n/a';

export const ratio = (value: number | null, digits = 2) =>
  value === null ? '∞ (no losses)' : Number.isFinite(value) ? value.toFixed(digits) : 'n/a';

export const integer = (value: number) => (Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : 'n/a');

export const grid = (key: string, value: number) =>
  ['maximumHoldDays', 'tickWindowSize', 'continuationWindow'].includes(key)
    ? String(value)
    : `${(value / 10).toFixed(1)}%`;

export const table = (header: string[], rows: (string | number)[][], align?: ('l' | 'r')[]) => {
  const alignment = header.map((_, index) => ((align?.[index] ?? (index === 0 ? 'l' : 'r')) === 'l' ? '---' : '---:'));

  return [
    `| ${header.join(' | ')} |`,
    `|${alignment.map((cell) => cell).join('|')}|`,
    ...rows.map((row) => `| ${row.map(String).join(' | ')} |`)
  ].join('\n');
};

export const flag = (value: boolean) => (value ? '**FLAG**' : 'no flag');
