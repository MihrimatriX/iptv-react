import type { FetchLike } from "@iptv/core";

declare global {
  interface Window {
    tizen?: {
      tvinputdevice?: { registerKeyBatch?: (keys: string[]) => void; registerKey?: (key: string) => void };
      application?: { getCurrentApplication: () => { exit: () => void; hide?: () => void } };
    };
    webOS?: { platformBack?: () => void; deviceInfo?: unknown };
    PalmSystem?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

export type PlatformKind = "tizen" | "webos" | "tauri" | "browser";

const detect = (): PlatformKind => {
  if (typeof window === "undefined") return "browser";
  if (window.tizen) return "tizen";
  if (window.webOS || window.PalmSystem || /Web0S|webOS/i.test(navigator.userAgent)) return "webos";
  if (window.__TAURI_INTERNALS__) return "tauri";
  return "browser";
};

export const platform: PlatformKind = detect();
export const isTv = platform === "tizen" || platform === "webos";
export const isDesktopShell = platform === "tauri";
/** Running from `vite dev` in a normal browser: route panel traffic through the dev proxy. */
const useDevProxy = import.meta.env.DEV && platform === "browser";

export const platformLabel: Record<PlatformKind, string> = {
  tizen: "Samsung Tizen",
  webos: "LG webOS",
  tauri: "Masaüstü",
  browser: "Tarayıcı",
};

/** Called once before render. */
export async function initPlatform() {
  if (platform === "tizen") {
    // Media, colour and number keys are only delivered after registering them.
    const keys = [
      "MediaPlayPause", "MediaPlay", "MediaPause", "MediaStop", "MediaFastForward", "MediaRewind",
      "ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue", "ChannelUp", "ChannelDown", "Info",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    ];
    try {
      window.tizen?.tvinputdevice?.registerKeyBatch?.(keys);
    } catch {
      for (const key of keys) {
        try {
          window.tizen?.tvinputdevice?.registerKey?.(key);
        } catch {
          /* key not supported on this model */
        }
      }
    }
  }

  if (platform === "tauri") {
    // Panels and CDNs rarely send CORS headers. Tauri's HTTP plugin runs the
    // request in Rust, so API calls and hls.js (FetchLoader uses self.fetch) get through.
    const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
    window.fetch = tauriFetch as typeof window.fetch;
  }
}

// ---- Network paths to the panel ----
//
// 1. Direct: Tizen (<access origin="*">), Tauri (Rust HTTP) and panels that
//    send Access-Control-Allow-Origin.
// 2. webOS: packaged apps follow CORS, so when a direct call fails the request
//    goes through the bundled JS service (platforms/webos-service) over Luna.
// 3. Optional proxy: the user's own server running this repo's Next.js app
//    (/api/proxy/stream with STREAM_PROXY_CORS_ORIGIN=*). Works everywhere,
//    also for hls.js segments.

let proxyBase = "";

/** "https://iptv.example.com" or "" to talk to the panel directly. */
export function setProxyBase(value: string | undefined) {
  proxyBase = (value ?? "").trim().replace(/\/+$/, "");
}

const viaProxy = (url: string) => `${proxyBase}/api/proxy/stream?url=${encodeURIComponent(url)}`;

let lunaPreferred = false;

export const apiFetch: FetchLike = async (url, init) => {
  if (proxyBase) return fetch(viaProxy(url), init);
  if (platform === "webos" && lunaPreferred) return lunaFetch(url);
  try {
    return await fetch(url, init);
  } catch (error) {
    // A CORS refusal surfaces as a TypeError with no status.
    if (platform !== "webos" || !hasLuna()) throw error;
    const response = await lunaFetch(url);
    lunaPreferred = true;
    return response;
  }
};

/** API URL rewrite for the dev proxy; identity everywhere else. */
export const transformApiUrl = useDevProxy
  ? (url: string) => `/__api?url=${encodeURIComponent(url)}`
  : undefined;

export function playableUrl(url: string): string {
  if (proxyBase) return viaProxy(url);
  if (useDevProxy && /^http:\/\//i.test(url)) return `/__stream?url=${encodeURIComponent(url)}`;
  return url;
}

/** Whether hls.js can fetch this URL; media elements (native playback) are not bound by CORS. */
export const needsNativePlayback = () => platform === "webos" && !proxyBase;

// ---- webOS Luna bridge ----

interface PalmBridge {
  onservicecallback: (raw: string) => void;
  call(uri: string, params: string): void;
}
type PalmBridgeCtor = new () => PalmBridge;

const hasLuna = () => typeof (window as unknown as { PalmServiceBridge?: unknown }).PalmServiceBridge === "function";
const pendingBridges = new Set<PalmBridge>(); // keep bridges alive until they answer

function lunaCall<T>(uri: string, params: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const Bridge = (window as unknown as { PalmServiceBridge?: PalmBridgeCtor }).PalmServiceBridge;
    if (!Bridge) return reject(new Error("Luna bridge unavailable"));
    const bridge = new Bridge();
    pendingBridges.add(bridge);
    bridge.onservicecallback = (raw) => {
      pendingBridges.delete(bridge);
      try {
        const message = JSON.parse(raw) as T & { returnValue?: boolean; errorText?: string };
        if (message.returnValue === false) reject(new Error(message.errorText || "Luna call failed"));
        else resolve(message);
      } catch (error) {
        reject(error);
      }
    };
    bridge.call(uri, JSON.stringify(params));
  });
}

async function lunaFetch(url: string): Promise<Response> {
  const message = await lunaCall<{ status: number; body: string }>("luna://com.afu.iptv.service/fetch", { url });
  return new Response(message.body, { status: message.status || 200 });
}

/** Leaves the app (TV) or closes the window (desktop). */
export async function exitApp() {
  try {
    if (platform === "tizen") return window.tizen?.application?.getCurrentApplication().exit();
    if (platform === "tauri") {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow().close();
    }
    window.close();
  } catch {
    /* nothing else to try */
  }
}

/** Exit makes sense on TVs and desktop; in a browser tab it does nothing useful. */
export const canExit = platform !== "browser";
