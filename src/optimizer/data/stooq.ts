// Stooq.com daily-data access over HTTP.
//
// The documented entry point is the historical-data page, for example
// https://stooq.com/q/d/?f=20050101&t=20261015&s=vgt.us&c=1. The page is HTML; its "Download data in csv
// file..." link (q/d/l/?s=...&f=...&t=...&i=d) is followed to get the CSV. Responses are classified so a
// blocked request (browser-verification challenge, request limit) is never mistaken for a missing symbol,
// and HTML is never saved as CSV. Access controls are not circumvented: a challenge page ends the attempt.
import { classifyNonCsv } from './transform.ts';

export const stooqBase = 'https://stooq.com/';

export const stooqSymbol = (symbol: string) => `${symbol.toLowerCase()}.us`;

export const compactDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Date ${date} is not YYYY-MM-DD`);
  }

  return date.replaceAll('-', '');
};

export const historicalPageUrl = (symbol: string, startDate: string, endDate: string) => {
  const url = new URL('q/d/', stooqBase);

  url.search = new URLSearchParams({
    f: compactDate(startDate),
    t: compactDate(endDate),
    s: stooqSymbol(symbol),
    c: '1'
  }).toString();

  return url.toString();
};

// The CSV endpoint behind the page's download link, used only when the page itself can't be parsed but
// was a genuine history page. Parameters as the page's own link: s, f, t, i=d.
export const directCsvUrl = (symbol: string, startDate: string, endDate: string) => {
  const url = new URL('q/d/l/', stooqBase);

  url.search = new URLSearchParams({
    s: stooqSymbol(symbol),
    f: compactDate(startDate),
    t: compactDate(endDate),
    i: 'd'
  }).toString();

  return url.toString();
};

const decodeEntities = (value: string) =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');

// Finds the "Download data in csv file..." link on a historical-data page. The href is resolved against
// the page's <base href> when it has one; a bare `q/d/l/...` href is otherwise taken relative to the site
// root, where Stooq serves the CSV endpoint (the live page could not be fetched to confirm which form it
// uses, so both are handled).
export const findCsvLink = (html: string, pageUrl: string): string | undefined => {
  const anchors = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["']?)([^"'\s>]*)\1[^>]*>([\s\S]*?)<\/a>/gi)];
  const byText = anchors.find((anchor) => /download data in csv file/i.test(anchor[3]!.replace(/<[^>]+>/g, '')));
  const byHref = anchors.find((anchor) => /(^|\/)q\/d\/l\/\?/.test(decodeEntities(anchor[2]!)));
  const anchor = byText ?? byHref;

  if (!anchor) {
    return undefined;
  }

  const href = decodeEntities(anchor[2]!);
  const base = html.match(/<base\b[^>]*\bhref\s*=\s*(["']?)([^"'\s>]*)\1/i)?.[2];
  const resolveFrom = base
    ? new URL(decodeEntities(base), pageUrl).toString()
    : href.startsWith('q/d/l/')
      ? stooqBase
      : pageUrl;

  return new URL(href, resolveFrom).toString();
};

export interface HttpResponse {
  status: number;
  contentType: string;
  body: string;
}

export type Fetcher = (url: string, timeoutMs: number) => Promise<HttpResponse>;

export const nodeFetcher: Fetcher = async (url, timeoutMs) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'margin-trading-research/1.0 (daily-data preparation)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  });

  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    body: await response.text()
  };
};

export type AttemptStatus =
  'ok' | 'blocked' | 'rate_limited' | 'no_data' | 'not_csv' | 'http_error' | 'network_error' | 'no_csv_link';

export interface HttpAttempt {
  url: string;
  status: AttemptStatus;
  httpStatus?: number;
  detail: string;
  at: string;
}

export interface StooqHttpResult {
  ok: boolean;
  pageUrl: string;
  csvUrl?: string;
  body?: string;
  attempts: HttpAttempt[];
  failure?: AttemptStatus;
}

export interface HttpOptions {
  fetcher?: Fetcher;
  timeoutMs?: number;
  retries?: number; // extra attempts after a transient failure
  backoffMs?: number; // first backoff, doubled each retry
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// One GET with bounded retries for transient failures (network errors, timeouts, 5xx, 429). Blocks and
// non-CSV answers are not retried.
const getWithRetries = async (
  url: string,
  options: Required<Omit<HttpOptions, 'fetcher'>> & { fetcher: Fetcher },
  attempts: HttpAttempt[],
  expect: 'page' | 'csv'
): Promise<HttpResponse | undefined> => {
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    if (attempt > 0) {
      await options.sleep(options.backoffMs * 2 ** (attempt - 1));
    }

    const at = options.now().toISOString();
    let response: HttpResponse;

    try {
      response = await options.fetcher(url, options.timeoutMs);
    } catch (error) {
      attempts.push({ url, status: 'network_error', detail: String((error as Error)?.message ?? error), at });
      continue;
    }

    const problem = classifyNonCsv(response.body);
    const isChallenge = problem?.startsWith('browser-verification');
    const isLimit = response.status === 429 || problem?.includes('limit');

    if (isChallenge) {
      attempts.push({ url, status: 'blocked', httpStatus: response.status, detail: problem!, at });

      return undefined;
    }

    if (isLimit) {
      attempts.push({ url, status: 'rate_limited', httpStatus: response.status, detail: problem ?? 'HTTP 429', at });
      continue;
    }

    if (response.status >= 500) {
      attempts.push({ url, status: 'http_error', httpStatus: response.status, detail: `HTTP ${response.status}`, at });
      continue;
    }

    if (response.status !== 200) {
      const excerpt = response.body
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);

      attempts.push({
        url,
        status: response.status === 401 || response.status === 403 ? 'blocked' : 'http_error',
        httpStatus: response.status,
        detail: `HTTP ${response.status}${excerpt ? `: ${excerpt}` : ''}`,
        at
      });

      return undefined;
    }

    if (expect === 'csv' && problem) {
      attempts.push({
        url,
        status: problem.includes('No data') ? 'no_data' : 'not_csv',
        httpStatus: response.status,
        detail: problem,
        at
      });

      return undefined;
    }

    attempts.push({ url, status: 'ok', httpStatus: response.status, detail: `${response.body.length} bytes`, at });

    return response;
  }

  return undefined;
};

export const downloadStooqDaily = async (
  symbol: string,
  startDate: string,
  endDate: string,
  httpOptions: HttpOptions = {}
): Promise<StooqHttpResult> => {
  const options = {
    fetcher: httpOptions.fetcher ?? nodeFetcher,
    timeoutMs: httpOptions.timeoutMs ?? 30000,
    retries: httpOptions.retries ?? 2,
    backoffMs: httpOptions.backoffMs ?? 2000,
    sleep: httpOptions.sleep ?? defaultSleep,
    now: httpOptions.now ?? (() => new Date())
  };
  const attempts: HttpAttempt[] = [];
  const pageUrl = historicalPageUrl(symbol, startDate, endDate);
  const failure = (): StooqHttpResult => ({
    ok: false,
    pageUrl,
    attempts,
    failure: attempts.at(-1)?.status ?? 'network_error'
  });

  const page = await getWithRetries(pageUrl, options, attempts, 'page');

  if (!page) {
    return failure();
  }

  const csvUrl = findCsvLink(page.body, pageUrl);

  if (!csvUrl) {
    attempts.push({
      url: pageUrl,
      status: 'no_csv_link',
      httpStatus: page.status,
      detail: 'the page has no "Download data in csv file" link',
      at: options.now().toISOString()
    });

    return failure();
  }

  const csv = await getWithRetries(csvUrl, options, attempts, 'csv');

  if (!csv) {
    return failure();
  }

  return { ok: true, pageUrl, csvUrl, body: csv.body, attempts };
};
