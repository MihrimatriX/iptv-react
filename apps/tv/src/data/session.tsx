import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { XtreamCredentials } from "@iptv/core";
import { createDemoSource, createXtreamSource, type DataSource } from "./source";
import { DEFAULT_SETTINGS, load, save, type Settings } from "../storage";
import { setProxyBase } from "../platform";

type Saved = { kind: "xtream"; credentials: XtreamCredentials } | { kind: "demo" } | null;

interface SessionValue {
  source: DataSource | null;
  credentials: XtreamCredentials | null;
  signIn(credentials: XtreamCredentials): void;
  startDemo(): void;
  signOut(): void;
  settings: Settings;
  updateSettings(patch: Partial<Settings>): void;
  favorites: Favorites;
  toggleFavorite(kind: FavoriteKind, id: number): void;
}

export type FavoriteKind = "live" | "movie" | "series";
export type Favorites = Record<FavoriteKind, number[]>;

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(() => load<Saved>("session", null));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load("settings", {}) }));
  const [favorites, setFavorites] = useState<Favorites>(() => ({
    live: [],
    movie: [],
    series: [],
    ...load<Partial<Favorites>>("favorites", {}),
  }));

  // A new source (fresh caches) whenever the account or live format changes.
  const source = useMemo(() => {
    setProxyBase(settings.proxy);
    if (!saved) return null;
    if (saved.kind === "demo") return createDemoSource();
    try {
      return createXtreamSource(saved.credentials, settings.liveFormat);
    } catch {
      return null;
    }
  }, [saved, settings.liveFormat, settings.proxy]);

  const persist = useCallback((next: Saved) => {
    save("session", next ?? undefined);
    setSaved(next);
  }, []);

  const toggleFavorite = useCallback((kind: FavoriteKind, id: number) => {
    setFavorites((current) => {
      const list = current[kind];
      const next = { ...current, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [id, ...list] };
      save("favorites", next);
      return next;
    });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      source,
      credentials: saved?.kind === "xtream" ? saved.credentials : null,
      signIn: (credentials) => persist({ kind: "xtream", credentials }),
      startDemo: () => persist({ kind: "demo" }),
      signOut: () => persist(null),
      settings,
      updateSettings: (patch) =>
        setSettings((current) => {
          const next = { ...current, ...patch };
          save("settings", next);
          return next;
        }),
      favorites,
      toggleFavorite,
    }),
    [source, saved, persist, settings, favorites, toggleFavorite]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession outside SessionProvider");
  return value;
}

/** Narrowed for screens that only render once signed in. */
export function useSource(): DataSource {
  const { source } = useSession();
  if (!source) throw new Error("No data source");
  return source;
}
