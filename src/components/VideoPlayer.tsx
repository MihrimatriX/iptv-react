"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type Hls from "hls.js";
import {
  AlertTriangle,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { clsx } from "clsx";
import { STATIC_EXPORT } from "@/lib/deploy";

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  /** Referer sent upstream by the proxy; defaults to the stream's origin. */
  referer?: string;
}

const controlButton =
  "rounded-xl bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const buildPlayUrl = (rawUrl: string, referer?: string) => {
  if (STATIC_EXPORT) return rawUrl; // no proxy on Pages; demo streams send CORS headers
  const params = new URLSearchParams({ url: rawUrl });
  try {
    params.set("referer", referer || `${new URL(rawUrl).origin}/`);
  } catch {}
  return `/api/proxy/stream?${params.toString()}`;
};

// Live playback watchdog: if the clock should be moving but isn't, escalate.
const WATCHDOG_TICK_MS = 2000;
const STALL_NUDGE_MS = 8000;
const STALL_RELOAD_MS = 16000;
const MAX_RECONNECTS = 5;

export function VideoPlayer({ streamUrl, channelName, referer }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Removes the per-load watchdog + media error listener.
  const detachRef = useRef<(() => void) | null>(null);
  // Consecutive reconnects without playback progress; bounds the retry loop.
  const reconnectsRef = useRef(0);
  const loadIdRef = useRef(0);

  // Autoplay with sound is often blocked; fall back to muted playback.
  const startPlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      video.muted = true;
      setIsMuted(true);
      await video.play().catch(() => {});
    }
  }, []);

  const tearDownHls = useCallback(() => {
    detachRef.current?.();
    detachRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const loadStream = useCallback(async (isRetry = false) => {
    const loadId = ++loadIdRef.current;
    const isCurrent = () => loadId === loadIdRef.current;
    setIsLoading(true);
    setIsBuffering(false);
    setIsReconnecting(isRetry);
    setHasError(false);
    setIsPlaying(false);

    const failHard = () => {
      if (!isCurrent()) return;
      setIsLoading(false);
      setIsReconnecting(false);
      setHasError(true);
      setIsPlaying(false);
      tearDownHls();
    };

    // Bounded reconnect with exponential backoff (1s, 2s, 4s, 8s, 10s).
    const reconnect = () => {
      if (!isCurrent()) return;
      if (reconnectsRef.current >= MAX_RECONNECTS) {
        failHard();
        return;
      }
      const delay = Math.min(1000 * 2 ** reconnectsRef.current, 10000);
      reconnectsRef.current += 1;
      tearDownHls();
      setIsReconnecting(true);
      // Invalidate this load so late hls/watchdog callbacks can't double-schedule.
      const retryId = ++loadIdRef.current;
      setTimeout(() => {
        if (retryId === loadIdRef.current) void loadStream(true);
      }, delay);
    };

    try {
      const playUrl = buildPlayUrl(streamUrl, referer);
      const HlsClass = (await import("hls.js")).default;
      const video = videoRef.current;
      if (!video || !isCurrent()) return;

      tearDownHls();
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}

      let hls: Hls | null = null;
      let mediaRetries = 0;

      const recoverMedia = () => {
        if (!hls || mediaRetries >= 3) {
          reconnect();
          return;
        }
        mediaRetries += 1;
        if (mediaRetries === 3) hls.swapAudioCodec();
        hls.recoverMediaError();
      };

      if (HlsClass.isSupported()) {
        // Live IPTV: recover from blips instead of killing the player.
        const instance = new HlsClass({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 12,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 8,
          fragLoadingRetryDelay: 1000,
          appendErrorMaxRetry: 4,
        });
        hls = instance;
        hlsRef.current = instance;

        instance.on(HlsClass.Events.MANIFEST_PARSED, () => {
          if (!isCurrent()) return;
          setIsLoading(false);
          void startPlayback();
        });

        instance.on(HlsClass.Events.ERROR, (_event, data) => {
          if (!data.fatal || !isCurrent()) return;
          if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
            recoverMedia();
            return;
          }
          // hls.js has already exhausted its own retry policy once an error is
          // fatal; a fresh manifest (new CDN token) is the reliable fix.
          reconnect();
        });

        instance.attachMedia(video);
        instance.loadSource(playUrl);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari / iOS: native HLS.
        video.src = playUrl;
        setIsLoading(false);
        void startPlayback();
      } else {
        throw new Error("HLS desteklenmiyor");
      }

      const onMediaError = () => {
        if (isCurrent()) recoverMedia();
      };

      // Watchdog: a live stream can freeze with no hls.js error and no further
      // "waiting" event (silent upstream, stuck decoder). Watch the clock itself.
      let lastTime = video.currentTime;
      let lastProgressAt = Date.now();
      let nudged = false;
      const watchdog = setInterval(() => {
        if (!isCurrent()) return;
        // Hidden tabs: Chrome may defer media loading there; judge once visible.
        if (video.paused || video.ended || document.hidden) {
          lastProgressAt = Date.now();
          return;
        }
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
          nudged = false;
          mediaRetries = 0;
          reconnectsRef.current = 0;
          setIsReconnecting(false);
          return;
        }
        const stalledFor = Date.now() - lastProgressAt;
        if (stalledFor >= STALL_RELOAD_MS) {
          reconnect();
        } else if (stalledFor >= STALL_NUDGE_MS && !nudged && hls) {
          // Cheap fix first: jump to the live edge and kick the loader.
          nudged = true;
          const livePos = hls.liveSyncPosition;
          // VOD has a "sync position" too (near the end); never jump there.
          if (hls.latestLevelDetails?.live && livePos != null && Number.isFinite(livePos)) {
            video.currentTime = livePos;
          }
          hls.startLoad();
          video.play().catch(() => {});
        }
      }, WATCHDOG_TICK_MS);

      video.addEventListener("error", onMediaError);
      detachRef.current = () => {
        clearInterval(watchdog);
        video.removeEventListener("error", onMediaError);
      };
    } catch {
      failHard();
    }
  }, [streamUrl, referer, tearDownHls, startPlayback]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      // Read the element, not state: state would be stale inside this closure.
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video || isLoading || hasError) return;
    if (video.paused) void startPlayback();
    else video.pause();
    resetControlsTimeout();
  }, [hasError, isLoading, resetControlsTimeout, startPlayback]);

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    resetControlsTimeout();
  };

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) {
      video.volume = 0.8;
      setVolume(0.8);
    }
    setIsMuted(video.muted);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handleFullscreen = useCallback(() => {
    const container = playerContainerRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (container.requestFullscreen) {
      void container.requestFullscreen();
    } else {
      // iOS Safari only supports fullscreen on the <video> element itself.
      video?.webkitEnterFullscreen?.();
    }
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handlePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {}
  };

  const handleRestart = () => {
    reconnectsRef.current = 0;
    void loadStream();
    resetControlsTimeout();
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) setShowControls(true);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't hijack typing in the search box or other inputs.
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "k") {
        event.preventDefault();
        handlePlayPause();
      } else if (key === "f") {
        handleFullscreen();
      } else if (key === "m") {
        handleMuteToggle();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleFullscreen, handleMuteToggle, handlePlayPause]);

  useEffect(() => {
    reconnectsRef.current = 0;
    void loadStream();
    return () => {
      loadIdRef.current += 1;
      tearDownHls();
    };
  }, [loadStream, tearDownHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const events: Record<string, () => void> = {
      play: () => setIsPlaying(true),
      pause: () => {
        setIsPlaying(false);
        setIsBuffering(false);
      },
      waiting: () => setIsBuffering(true),
      playing: () => setIsBuffering(false),
    };
    for (const [name, handler] of Object.entries(events)) video.addEventListener(name, handler);
    return () => {
      for (const [name, handler] of Object.entries(events)) video.removeEventListener(name, handler);
    };
  }, []);

  useEffect(
    () => () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    },
    []
  );

  const pipSupported =
    typeof document !== "undefined" && document.pictureInPictureEnabled;

  return (
    <div
      ref={playerContainerRef}
      className={clsx(
        "relative flex h-full w-full items-center justify-center overflow-hidden bg-black",
        !showControls && isPlaying && "cursor-none"
      )}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain"
        playsInline
        crossOrigin="anonymous"
        // Touch: first tap only reveals the controls, a second tap toggles playback.
        onClick={() => (showControls ? handlePlayPause() : resetControlsTimeout())}
        onDoubleClick={handleFullscreen}
      />

      {!hasError && (isLoading || isBuffering || isReconnecting) && (
        // Fades in after a short delay so micro-stalls don't flash a spinner.
        <div
          role="status"
          className={clsx(
            "pointer-events-none absolute inset-0 flex animate-fade-in items-center justify-center",
            isLoading && !isReconnecting ? "bg-black/70 backdrop-blur-sm" : "bg-black/30"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            {(isLoading || isReconnecting) && (
              <p className="rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-slate-200">
                {isReconnecting ? "Yeniden bağlanıyor…" : "Yayın yükleniyor…"}
              </p>
            )}
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="mx-4 flex max-w-sm flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-red-500/15 p-4 ring-1 ring-red-500/30">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-semibold text-white">Yayın yüklenemedi</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                Kanal şu anda erişilebilir değil veya geçici bir sorun var.
              </p>
            </div>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" />
              Tekrar dene
            </button>
          </div>
        </div>
      )}

      <div
        className={clsx(
          "pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/50 transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            CANLI
          </span>
          <h2 className="min-w-0 truncate text-sm font-semibold text-white drop-shadow sm:text-base">
            {channelName}
          </h2>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 p-3 sm:p-4">
          <button
            onClick={handlePlayPause}
            className={controlButton}
            aria-label={isPlaying ? "Duraklat (Space)" : "Oynat (Space)"}
            title={isPlaying ? "Duraklat (Space)" : "Oynat (Space)"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={handleRestart} className={controlButton} aria-label="Yeniden yükle" title="Yeniden yükle">
            <RotateCcw className="h-5 w-5" />
          </button>
          <div className="group/volume flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className={controlButton}
              aria-label={isMuted ? "Sesi aç (M)" : "Sesi kapat (M)"}
              title={isMuted ? "Sesi aç (M)" : "Sesi kapat (M)"}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
              className="hidden w-24 cursor-pointer sm:block"
              aria-label="Ses seviyesi"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {pipSupported && (
              <button
                onClick={handlePictureInPicture}
                className={controlButton}
                aria-label="Resim içinde resim"
                title="Resim içinde resim"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handleFullscreen}
              className={controlButton}
              aria-label="Tam ekran (F)"
              title="Tam ekran (F)"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
