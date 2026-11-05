import { useCallback, useEffect, useState } from 'react';

// Responses loaded ahead of time for a key (Interactive Preview loads a result's chart data BEFORE it is displayed, so the
// swap shows the new result at once and never a blank chart). Module-level, per tab, bounded; keys name the result id.
const prefetched = new Map<string, unknown>();
export function remember(key: string, value: unknown) {
  prefetched.delete(key);
  prefetched.set(key, value);
  while (prefetched.size > 48) prefetched.delete(prefetched.keys().next().value!);
}

/**
 * Data fetched for a key. A result is only returned while it belongs to the current key, so a change of key never
 * shows stale data and needs no synchronous reset inside an effect. A response remembered for the key is returned at
 * once (no request).
 */
export function useFetched<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>
): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  const known = key !== null && prefetched.has(key);
  useEffect(() => {
    if (key === null || prefetched.has(key)) return;
    const ac = new AbortController();
    fetcher(ac.signal)
      .then((data) => !ac.signal.aborted && setState({ key, data, error: null }))
      .catch((e: Error) => !ac.signal.aborted && setState({ key, data: null, error: e.message }));
    return () => ac.abort();
    // the key identifies the request; the fetcher closes over the same values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (known) return { data: prefetched.get(key) as T, error: null };
  return state && key !== null && state.key === key
    ? { data: state.data, error: state.error }
    : { data: null, error: null };
}

/** A value that belongs to a context key: it reads as `initial` again as soon as the context changes. */
export function useScoped<T>(scope: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<{ scope: string; value: T }>({ scope, value: initial });
  const set = useCallback((value: T) => setState({ scope, value }), [scope]);
  return [state.scope === scope ? state.value : initial, set];
}
