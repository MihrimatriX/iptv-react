import { useEffect, useState } from "react";
import type { ChannelStream, EpgEntry } from "@iptv/core";
import type { DataSource } from "./source";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload(): void;
}

/** Runs `load` when deps change; stale results from an older run are dropped. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((current) => ({ data: current.data, error: null, loading: true }));
    load().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error: unknown) =>
        alive &&
        setState({ data: null, error: error instanceof Error ? error : new Error(String(error)), loading: false })
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}

/** Value that only settles after `ms` without changes: avoids work while zapping through lists. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** Short EPG for a channel, fetched once the focus has rested on it. */
export function useShortEpg(source: DataSource, channel: ChannelStream | null, restMs = 350) {
  const settled = useDebounced(channel, restMs);
  const [entries, setEntries] = useState<EpgEntry[] | null>(null);
  useEffect(() => {
    setEntries(null);
    if (!settled) return;
    let alive = true;
    source.shortEpg(settled).then(
      (list) => alive && setEntries(list),
      () => alive && setEntries([])
    );
    return () => {
      alive = false;
    };
  }, [source, settled]);
  return settled === channel ? entries : null;
}

/** Re-renders every `ms` so clocks and progress bars move. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}
