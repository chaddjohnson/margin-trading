import fs from 'fs-extra';
import path from 'node:path';

type Cell = string | number | boolean | null | undefined;

const csvCell = (value: Cell) => {
  if (value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
    return '';
  }

  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const writeCsv = async (file: string, rows: Record<string, Cell>[]) => {
  await fs.ensureDir(path.dirname(file));
  const headers = rows.length ? Object.keys(rows[0]!) : [];
  const lines = [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))];

  await fs.writeFile(file, `${lines.join('\n')}\n`);
};

export const writeJson = async (file: string, value: unknown) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
};

export const markdownTable = (headers: string[], rows: Cell[][], align?: ('l' | 'r')[]) => {
  const separator = headers.map((_, index) => ((align?.[index] ?? 'l') === 'r' ? '---:' : '---'));
  const format = (value: Cell) =>
    value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
      ? '–'
      : String(value).replace(/\|/g, '\\|');

  return [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(format).join(' | ')} |`)
  ].join('\n');
};

export const dollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.abs(Math.round(value)).toLocaleString('en-US')}` : '–';

export const signedDollars = (value: number) =>
  Number.isFinite(value) ? `${value > 0 ? '+' : ''}${dollars(value)}` : '–';

export const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(value) ? '–' : `${(value * 100).toFixed(digits)}%`;

export const fixed = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value) ? '–' : value.toFixed(digits);

export const labelText = (value: boolean | null | undefined) =>
  value === null || value === undefined ? 'cens.' : value ? 'yes' : 'no';
