// localStorage can throw (quota, private mode) or be wiped; never let that crash the app.

const PREFIX = "afu-iptv:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    if (value === undefined) window.localStorage.removeItem(PREFIX + key);
    else window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export interface Settings {
  engine: "auto" | "native" | "hlsjs";
  liveFormat: "m3u8" | "ts";
  preview: boolean;
  /** Base URL of a self-hosted copy of the web app used as CORS proxy; "" for none. */
  proxy: string;
}

export const DEFAULT_SETTINGS: Settings = { engine: "auto", liveFormat: "m3u8", preview: true, proxy: "" };
