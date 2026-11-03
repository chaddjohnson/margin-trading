// Formatting for the Markdown tables in the reports. Dollar amounts are rounded to whole dollars and
// percentages to one decimal for display; the CSV/JSON results keep full precision.
export const money = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : '–';

export const signedMoney = (value: number) =>
  Number.isFinite(value)
    ? `${value > 0 ? '+' : value < 0 ? '−' : '±'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`
    : '–';

export const percent = (value: number, digits = 1) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '–';

export const number = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '–');

export const table = (headers: string[], rows: (string | number)[][], align?: ('l' | 'r')[]) => {
  const alignment = headers.map((_header, index) =>
    (align?.[index] ?? (index === 0 ? 'l' : 'r')) === 'r' ? '---:' : '---'
  );

  return [
    `| ${headers.join(' | ')} |`,
    `| ${alignment.join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(' | ')} |`)
  ].join('\n');
};
