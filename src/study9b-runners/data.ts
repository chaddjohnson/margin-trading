// The run window helpers of Study 8's runner (src/study8-runners/data.ts latestCommonSession, validateEnd), ported with
// one change: the data status covers this study's 13 files (Study 8's default is its five), so the new ETFs are not
// reported missing. The data status, the provenance and the calendar rules are Study 8's, imported unchanged.
import { UsageError } from '../study8-runners/aliases.ts';
import { type FileProvenance, dataStatus, firstEligibleDate } from '../study8-runners/data.ts';
import { allSymbols } from '../study9-phase-b/context.ts';

// The latest session every given symbol's file holds completely, and which file limits it.
export const latestCommonSession = async (symbols: readonly string[], root = 'data') => {
  const status = await dataStatus(root, allSymbols);
  const missing = symbols.filter((symbol) => !status[symbol]?.present);

  if (missing.length) throw new UsageError(`missing canonical data for ${missing.join(', ')} (data/<SYMBOL>/data.csv)`);

  const files = symbols.map((symbol) => status[symbol] as FileProvenance);
  const empty = files.filter((file) => file.latestCompleteSession === null);

  if (empty.length) throw new UsageError(`no complete session in ${empty.map((file) => file.file).join(', ')}`);

  const latest = files.map((file) => file.latestCompleteSession!).sort()[0]!;

  return {
    latest,
    limitedBy: files.filter((file) => file.latestCompleteSession === latest).map((file) => file.symbol),
    files
  };
};

// The run's end: the latest common complete session by default; an explicit date must not be later than it.
export const validateEnd = async (end: string | undefined, symbols: readonly string[], root = 'data') => {
  const { latest, files } = await latestCommonSession(symbols, root);

  if (end === undefined) return latest;
  // a real calendar date (Date.parse alone accepts e.g. 2026-02-30)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    new Date(Date.parse(`${end}T00:00:00Z`) || 0).toISOString().slice(0, 10) !== end
  )
    throw new UsageError(`--end must be a YYYY-MM-DD calendar date, not "${end}"`);

  if (end > latest) {
    const partial = files
      .filter((file) => file.incomplete && file.incomplete.date <= end)
      .map((file) => `${file.symbol} holds ${file.incomplete!.date} only up to ${file.incomplete!.lastBarNewYork}`);

    throw new UsageError(
      `--end ${end} is after the latest common complete session (${latest}) of ${symbols.join(', ')}${partial.length ? `; ${partial.join('; ')} (an incomplete session)` : ''}; nothing complete after ${latest} exists locally`
    );
  }

  if (end <= firstEligibleDate)
    throw new UsageError(`--end ${end} must be after the first eligible session ${firstEligibleDate}`);

  return end;
};
