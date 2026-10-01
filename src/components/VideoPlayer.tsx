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

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  /** Referer sent upstream by the proxy; defaults to the stream's origin. */
  referer?: string;
}

const controlButton =
  "rounded-xl bg-white/10 p-2.5 text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const buildPlayUrl = (rawUrl: string, referer?: string) => {
  const params = new URLSearchParams({ url: rawUrl });
  try {
    params.set("referer", referer || `${new URL(rawUrl).origin}/`);
  } catch {}
  return `/api/proxy/stream?${params.toString()}`;
};

export function VideoPlayer({ streamUrl, channelName, referer }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallHandlersRef = useRef<{ waiting: () => void; playing: () => void } | null>(null);
  const networkRetriesRef = useRef(0);
  const mediaRetriesRef = useRef(0);
  const fullReloadsRef = useRef(0);
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
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    const video = videoRef.current;
    if (video && stallHandlersRef.current) {
      video.removeEventListener("waiting", stallHandlersRef.current.waiting);
      video.removeEventListener("playing", stallHandlersRef.current.playing);
      stallHandlersRef.current = null;
    }
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const loadStream = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);
    networkRetriesRef.current = 0;
    mediaRetriesRef.current = 0;

    try {
      const playUrl = buildPlayUrl(streamUrl, referer);
      const HlsClass = (await import("hls.js")).default;
      const video = videoRef.current;
      if (!video || loadId !== loadIdRef.current) return;

      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch {}

      tearDownHls();

      if (HlsClass.isSupported()) {
        // Live IPTV: recover from blips instead of killing the player.
        const hls = new HlsClass({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 12,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 8,
          fragLoadingRetryDelay: 1000,
          appendErrorMaxRetry: 4,
        });
        hlsRef.current = hls;

        const jumpToLiveEdge = () => {
          const livePos = hls.liveSyncPosition;
          if (livePos != null && videoRef.current && Number.isFinite(livePos)) {
            videoRef.current.currentTime = livePos;
          }
        };

        const failHard = () => {
          if (loadId !== loadIdRef.current) return;
          setIsLoading(false);
          setHasError(true);
          setIsPlaying(false);
          tearDownHls();
        };

        const reloadSoft = () => {
          if (loadId !== loadIdRef.current) return;
          if (fullReloadsRef.current >= 3) {
            failHard();
            return;
          }
          fullReloadsRef.current += 1;
          setTimeout(() => {
            if (loadId === loadIdRef.current) void loadStream();
          }, 800);
        };

        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          if (loadId !== loadIdRef.current) return;
          setIsLoading(false);
          setHasError(false);
          fullReloadsRef.current = 0;
          void startPlayback();
        });

        hls.on(HlsClass.Events.FRAG_LOADED, () => {
          networkRetriesRef.current = 0;
          mediaRetriesRef.current = 0;
        });

        hls.on(HlsClass.Events.ERROR, (_event, data) => {
          if (!data.fatal || loadId !== loadIdRef.current) return;

          if (data.type === HlsClass.ErrorTypes.NETWORK_ERROR) {
            networkRetriesRef.current += 1;
            if (networkRetriesRef.current <= 5) {
              hls.startLoad();
              return;
            }
            reloadSoft();
            return;
          }

          if (data.type === HlsClass.ErrorTypes.MEDIA_ERROR) {
            mediaRetriesRef.current += 1;
            if (mediaRetriesRef.current <= 3) {
              hls.recoverMediaError();
              return;
            }
            if (mediaRetriesRef.current === 4) {
              hls.swapAudioCodec();
              hls.recoverMediaError();
              return;
            }
          }

          reloadSoft();
        });

        hls.attachMedia(video);
        hls.loadSource(playUrl);

        const onWaiting = () => {
          if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
          stallTimerRef.current = setTimeout(() => {
            if (loadId !== loadIdRef.current || !hlsRef.current) return;
            jumpToLiveEdge();
            hlsRef.current.startLoad();
            videoRef.current?.play().catch(() => {});
          }, 8000);
        };
        const onPlaying = () => {
          if (stallTimerRef.current) {
            clearTimeout(stallTimerRef.current);
            stallTimerRef.current = null;
          }
        };
        stallHandlersRef.current = { waiting: onWaiting, playing: onPlaying };
        video.addEventListener("waiting", onWaiting);
        video.addEventListener("playing", onPlaying);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari / iOS: native HLS.
        video.src = playUrl;
        setIsLoading(false);
        await startPlayback();
      } else {
        throw new Error("HLS desteklenmiyor");
      }
    } catch {
      if (loadId !== loadIdRef.current) return;
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
      tearDownHls();
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
    fullReloadsRef.current = 0;
    tearDownHls();
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
    fullReloadsRef.current = 0;
    void loadStream();
    return () => {
      loadIdRef.current += 1;
      tearDownHls();
    };
  }, [loadStream, tearDownHls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    // Let hls.js recover; only surface error if HLS is gone and media dies.
    const handleError = () => {
      if (hlsRef.current) {
        hlsRef.current.recoverMediaError();
        return;
      }
      if (fullReloadsRef.current < 3) {
        fullReloadsRef.current += 1;
        void loadStream();
        return;
      }
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [loadStream]);

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

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            <p className="text-sm font-medium text-slate-200">Yayın yükleniyor…</p>
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
