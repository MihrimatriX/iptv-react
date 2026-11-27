import type Hls from "hls.js";
import { isTv, needsNativePlayback, playableUrl } from "../platform";
import type { Settings } from "../storage";

export interface EngineCallbacks {
  /** Unrecoverable for this attempt: the caller decides whether to retry. */
  onFatal(reason: string): void;
  onReady(): void;
}

export interface EngineHandle {
  destroy(): void;
  /** Live: jump back to the edge after a stall. */
  nudge(): void;
  kind: "hlsjs" | "native";
}

const isHlsUrl = (url: string) => /\.m3u8(\?|$)/i.test(url) || /\/\.m3u8/i.test(url) || /mpegurl/i.test(url);

/**
 * Picks hls.js or the engine's own player. TVs decode HLS, MPEG-TS and MKV in
 * hardware through <video src>, which is lighter than MSE on a TV CPU; desktop
 * browsers mostly need hls.js.
 */
export async function attach(
  video: HTMLVideoElement,
  rawUrl: string,
  live: boolean,
  engine: Settings["engine"],
  callbacks: EngineCallbacks
): Promise<EngineHandle> {
  const url = playableUrl(rawUrl);
  const hlsSource = isHlsUrl(rawUrl);
  const nativeHls = !!video.canPlayType("application/vnd.apple.mpegurl");
  const { default: HlsClass } = await import("hls.js");
  const preferNative =
    engine === "native" ||
    // On webOS hls.js would hit CORS on segments; <video src> is not bound by it.
    needsNativePlayback() ||
    (engine === "auto" && (isTv ? nativeHls : !HlsClass.isSupported()));

  if (hlsSource && !preferNative && HlsClass.isSupported()) {
    const hls: Hls = new HlsClass({
      // Tauri swaps window.fetch for its CORS-free one; FetchLoader picks it up.
      ...(window.__TAURI_INTERNALS__ ? { loader: (await import("hls.js")).FetchLoader } : {}),
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: live ? 30 : 60,
      maxBufferLength: live ? 30 : 60,
      maxMaxBufferLength: 120,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 12,
      manifestLoadingMaxRetry: 4,
      levelLoadingMaxRetry: 6,
      fragLoadingMaxRetry: 8,
      appendErrorMaxRetry: 4,
    });
    let mediaRecoveries = 0;
    hls.on(HlsClass.Events.MANIFEST_PARSED, () => callbacks.onReady());
    hls.on(HlsClass.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
        mediaRecoveries += 1;
        if (mediaRecoveries === 2) hls.swapAudioCodec();
        hls.recoverMediaError();
        return;
      }
      callbacks.onFatal(data.details || data.type);
    });
    hls.attachMedia(video);
    hls.loadSource(url);
    return {
      kind: "hlsjs",
      destroy: () => hls.destroy(),
      nudge: () => {
        const edge = hls.liveSyncPosition;
        if (hls.latestLevelDetails?.live && edge != null && Number.isFinite(edge)) video.currentTime = edge;
        hls.startLoad();
      },
    };
  }

  const onError = () => callbacks.onFatal(video.error ? `media error ${video.error.code}` : "media error");
  const onReady = () => callbacks.onReady();
  video.addEventListener("error", onError);
  video.addEventListener("loadedmetadata", onReady, { once: true } as AddEventListenerOptions);
  video.src = url;
  video.load();
  return {
    kind: "native",
    destroy: () => {
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", onReady);
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
    nudge: () => {
      if (live && video.seekable.length) video.currentTime = video.seekable.end(video.seekable.length - 1) - 2;
    },
  };
}
