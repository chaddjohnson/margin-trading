import type { Tick } from './tick.ts';

// One regular trading session built from minute bars. The inherited Tick fields aggregate the session
// like a daily bar: `time` is midnight UTC of the session's New York date, as for daily ticks, so
// calendar-day arithmetic keeps working; open is the first regular-session trade; high and low span the
// regular-session minutes and the closing print; close is the closing print, or the last regular-session
// trade when the data has no closing print; and volume sums the regular-session minutes.
export interface MarketSession extends Tick {
  date: string; // YYYY-MM-DD in America/New_York
  openTime: number; // 9:30 a.m. New York time, in Unix seconds
  closeTime: number; // the scheduled close, 4:00 p.m. or 1:00 p.m. on early-close days, in Unix seconds
  isEarlyClose: boolean;
  // Regular-session minute bars in chronological order, each timestamped at the start of its minute.
  // Minutes without trades have no bar.
  bars: Tick[];
  // The first trade of the minute that starts at the close, which holds the closing-auction print.
  closingPrint?: number;
}
