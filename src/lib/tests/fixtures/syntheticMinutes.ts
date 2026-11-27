// Synthetic canonical minute rows for boundary tests (the conventions of src/lib/tests/evaluation.test.ts): every NYSE
// session from `first` to `last` gets bars at 9:30, 10:00 and the last regular minute, the closing print at 16:00
// (13:00 on early-close days) and an evening extended-hours bar at 19:30 New York, which falls on the next UTC date
// under standard time. Prices rise by 0.1 per session. No market data are involved.
import { nyseEarlyCloses, nyseHolidays } from '../../calendar.ts';
import { newYorkOffset } from '../../session.ts';

export const sessionsBetween = (first: string, last: string) => {
  const out: string[] = [];

  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86_400_000) {
    const d = new Date(t);
    const date = d.toISOString().slice(0, 10);

    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !nyseHolidays.has(date)) out.push(date);
  }
  return out;
};

// The ISO UTC timestamp of a New York wall-clock time on a date.
export const nyTime = (date: string, hour: number, minute: number) => {
  const local = Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;
  const utc = local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000);

  return new Date(utc * 1000).toISOString().replace('.000', '');
};

export const syntheticRows = (dates: readonly string[], o: { start?: number; partialLast?: boolean } = {}) => {
  const rows: string[] = [];
  let price = o.start ?? 100;

  dates.forEach((date, i) => {
    const close = nyseEarlyCloses.has(date) ? 13 : 16;
    const bar = (h: number, m: number, v = 100) =>
      `"${nyTime(date, h, m)}",${price},${price + 0.2},${price - 0.2},${price},${v}`;

    price = Math.round((price + 0.1) * 100) / 100;
    rows.push(bar(9, 30), bar(10, 0));
    if (o.partialLast && i === dates.length - 1) return; // a session appended only in part: no close
    rows.push(bar(close - 1, 59), bar(close, 0, 5000), bar(19, 30, 10));
  });
  return rows;
};

export const csvText = (rows: readonly string[]) => (rows.length ? `${rows.join('\n')}\n` : '');
