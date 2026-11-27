import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ChannelStream } from "@iptv/core";

export interface PlayItem {
  kind: "live" | "movie" | "episode";
  /** Stable id for resume positions and favourites, e.g. "movie:42". */
  key: string;
  title: string;
  subtitle?: string;
  url: string;
  poster?: string | null;
  channel?: ChannelStream;
}

/** Lazily materialised list for zapping (live) or auto-next (episodes). */
export interface PlayQueue {
  length: number;
  index: number;
  get(index: number): PlayItem;
  onChange?(index: number): void;
  /** Live zapping wraps around; episodes stop at the last one. */
  wrap?: boolean;
}

export type PlayerMode = "hidden" | "preview" | "full";

interface PlayerValue {
  item: PlayItem | null;
  mode: PlayerMode;
  queue: PlayQueue | null;
  previewRect: DOMRect | null;
  play(item: PlayItem, mode: Exclude<PlayerMode, "hidden">, queue?: PlayQueue | null): void;
  setMode(mode: PlayerMode): void;
  /** Moves within the queue (channel up/down, next episode). */
  step(delta: number): boolean;
  stop(): void;
  setPreviewSlot(element: HTMLElement | null): void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<PlayItem | null>(null);
  const [mode, setModeState] = useState<PlayerMode>("hidden");
  const [queue, setQueue] = useState<PlayQueue | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [previewRect, setPreviewRect] = useState<DOMRect | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(() => {
    if (!slot) {
      setPreviewRect(null);
      return;
    }
    const measure = () => setPreviewRect(slot.getBoundingClientRect());
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(slot);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [slot]);

  // Leaving the screen that hosts the preview stops the preview.
  useEffect(() => {
    if (!slot && mode === "preview") {
      setItem(null);
      setModeState("hidden");
    }
  }, [slot, mode]);

  const play = useCallback<PlayerValue["play"]>((next, nextMode, nextQueue = null) => {
    setItem((current) => (current && current.key === next.key && current.url === next.url ? current : next));
    setQueue(nextQueue);
    setModeState(nextMode);
  }, []);

  const step = useCallback((delta: number) => {
    const q = queueRef.current;
    if (!q || q.length === 0) return false;
    const raw = q.index + delta;
    if (!q.wrap && (raw < 0 || raw >= q.length)) return false;
    const index = (raw + q.length) % q.length;
    if (index === q.index) return false;
    const nextQueue = { ...q, index };
    setQueue(nextQueue);
    setItem(q.get(index));
    q.onChange?.(index);
    return true;
  }, []);

  const value = useMemo<PlayerValue>(
    () => ({
      item,
      mode,
      queue,
      previewRect,
      play,
      step,
      setMode: (next) => {
        if (next === "hidden") setItem(null);
        setModeState(next);
      },
      stop: () => {
        setItem(null);
        setQueue(null);
        setModeState("hidden");
      },
      setPreviewSlot: setSlot,
    }),
    [item, mode, queue, previewRect, play, step]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer outside PlayerProvider");
  return value;
}

/** Renders the box the preview video is laid over. */
export function PreviewSlot({ className, children }: { className?: string; children?: ReactNode }) {
  const { setPreviewSlot } = usePlayer();
  return (
    <div className={className} ref={setPreviewSlot}>
      {children}
    </div>
  );
}
