"use client";

/* eslint-disable react/forbid-dom-props, react/no-unknown-property */
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  isOpen: boolean;
  onClose: () => void;
  isEmbedded?: boolean;
}

export function VideoPlayer({
  streamUrl,
  channelName,
  isOpen,
  onClose,
  isEmbedded = false,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStream = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);

    try {
      const Hls = (await import("hls.js")).default;
      const video = videoRef.current;
      if (!video) return;

      try {
        video.pause();
        video.currentTime = 0;
      } catch {}

      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 5,
          debug: false,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          setIsLoading(false);
          setHasError(false);
          try {
            if (videoRef.current && !videoRef.current.paused)
              await videoRef.current.play();
          } catch {}
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            setIsLoading(false);
            setHasError(true);
            setIsPlaying(false);
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }
          }
        });

        hls.attachMedia(video);
        hls.loadSource(streamUrl);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        setIsLoading(false);
        try {
          await video.play();
        } catch {}
      } else {
        throw new Error("HLS desteklenmiyor");
      }
    } catch (error) {
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }
  }, [streamUrl]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handlePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        if (isLoading || hasError) return;
        await video.play();
      } else {
        video.pause();
      }
    } catch {}

    resetControlsTimeout();
  }, [hasError, isLoading, resetControlsTimeout]);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const video = videoRef.current;
      if (!video) return;

      setVolume(newVolume);
      video.volume = newVolume;
      setIsMuted(newVolume === 0);
      resetControlsTimeout();
    },
    [resetControlsTimeout]
  );

  const handleMuteToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = 0.8;
      setVolume(0.8);
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
    resetControlsTimeout();
  }, [isMuted, resetControlsTimeout]);

  const handleFullscreen = useCallback(() => {
    const container = playerContainerRef.current;
    if (!container) return;

    const fullscreenElement =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement;

    if (!fullscreenElement) {
      const requestFullscreen =
        container.requestFullscreen ||
        (container as any).webkitRequestFullscreen ||
        (container as any).msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen.call(container);
      }
    } else {
      const exitFullscreen =
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen.call(document);
      }
    }

    resetControlsTimeout();
  }, [resetControlsTimeout]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement;

      setIsFullscreen(Boolean(fullscreenElement));

      if (!fullscreenElement) {
        setShowControls(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
    };
  }, []);
  const handleRestart = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (hasError) {
      setHasError(false);
      setIsLoading(true);
      setIsPlaying(false);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      try {
        video.pause();
        video.currentTime = 0;
        video.src = "";
      } catch {}

      setTimeout(() => loadStream(), 100);
    } else {
      try {
        video.currentTime = 0;
        if (!video.paused) await video.play();
      } catch {}
    }
    resetControlsTimeout();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isEmbedded) {
        onClose();
      } else if (event.key === " " && isOpen) {
        event.preventDefault();
        handlePlayPause();
      } else if (event.key === "f" && isOpen) {
        event.preventDefault();
        handleFullscreen();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      if (!isEmbedded) {
        document.body.style.overflow = "hidden";
      }
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!isEmbedded) {
        document.body.style.overflow = "unset";
      }
    };
  }, [handleFullscreen, handlePlayPause, isEmbedded, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    loadStream();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, loadStream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("error", handleError);
    };
  }, [isOpen]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    video.currentTime = newTime;
  };

  if (!isOpen) return null;

  const videoContent = isEmbedded ? (
    <div
      ref={playerContainerRef}
      className={clsx(
        "flex h-full w-full items-center justify-center overflow-hidden bg-black",
        isFullscreen ? "" : "rounded-lg"
      )}
    >
      {/* Video Container */}
      <div
        className={clsx(
          "relative flex w-full items-center justify-center bg-black",
          !isFullscreen && "aspect-video"
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
      >
        <video
          ref={videoRef}
          className="h-full w-full object-contain bg-black"
          autoPlay
          muted={isMuted}
          playsInline
          crossOrigin="anonymous"
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-primary/20" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">
                  Yayın Yükleniyor
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  Lütfen bekleyin...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 text-center max-w-md mx-4">
              <div className="relative">
                <div className="rounded-full bg-red-500/20 p-6">
                  <X className="h-12 w-12 text-red-400" />
                </div>
                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Yayın Yüklenemedi
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Bu kanal şu anda erişilebilir değil veya geçici bir sorun var.
                  Lütfen daha sonra tekrar deneyin.
                </p>
              </div>
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/80 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Tekrar Dene
              </button>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={clsx(
            "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Top Controls */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-white bg-red-500/20 px-2 py-1 rounded-full border border-red-500/30">
                  CANLI
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white truncate max-w-xs">
                {channelName}
              </h2>
            </div>

            {/* Audio Control */}
            <button
              onClick={handleMuteToggle}
              className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
              title={isMuted ? "Sesi aç" : "Sesi kapat"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="p-4">
            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={handleRestart}
                  className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                  title="Yeniden başlat"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFullscreen}
                  className="rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                  title="Tam ekran (F)"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="w-full px-4">
        <div
          ref={playerContainerRef}
          className={clsx(
            "relative mx-auto w-full",
            isFullscreen ? "h-full" : "max-w-5xl aspect-video"
          )}
        >
          {/* Video Container */}
          <div
            className={clsx(
              "absolute inset-0 flex items-center justify-center overflow-hidden bg-black",
              isFullscreen ? "" : "rounded-2xl"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              if (isPlaying) {
                setShowControls(false);
              }
            }}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-contain bg-black"
              autoPlay
              muted={isMuted}
              playsInline
              crossOrigin="anonymous"
            />

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                    <div className="absolute inset-0 h-16 w-16 animate-ping rounded-full border-4 border-primary/20" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">
                      Yayın Yükleniyor
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      Lütfen bekleyin...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {hasError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-6 text-center max-w-md mx-4">
                  <div className="relative">
                    <div className="rounded-full bg-red-500/20 p-6">
                      <X className="h-12 w-12 text-red-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Yayın Yüklenemedi
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Bu kanal şu anda erişilebilir değil veya geçici bir sorun
                      var. Lütfen daha sonra tekrar deneyin.
                    </p>
                  </div>
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/80 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Tekrar Dene
                  </button>
                </div>
              </div>
            )}

            {/* Controls Overlay */}
            <div
              className={clsx(
                "absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              {/* Top Controls */}
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                    <span className="text-sm font-medium text-white bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">
                      CANLI
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold text-white truncate max-w-md">
                    {channelName}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-black/60 p-3 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                  title="Kapat (ESC)"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Bottom Controls */}
              <div className="p-6">
                {/* Progress Bar */}
                <div
                  className="mb-6 h-2 w-full cursor-pointer rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all shadow-lg shadow-primary/50"
                    style={{
                      width: `${
                        duration > 0 ? (currentTime / duration) * 100 : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      className="rounded-xl bg-black/60 p-4 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                    >
                      {isPlaying ? (
                        <Pause className="h-7 w-7" />
                      ) : (
                        <Play className="h-7 w-7" />
                      )}
                    </button>

                    <button
                      onClick={handleRestart}
                      className="rounded-xl bg-black/60 p-3 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                      title="Yeniden başlat"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleMuteToggle}
                        className="rounded-xl bg-black/60 p-3 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                      >
                        {isMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) =>
                          handleVolumeChange(parseFloat(e.target.value))
                        }
                        className="w-24 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        title={`Ses seviyesi: ${Math.round(
                          (isMuted ? 0 : volume) * 100
                        )}%`}
                        aria-label="Ses seviyesi ayarı"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFullscreen}
                      className="rounded-xl bg-black/60 p-3 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                      title="Tam ekran (F)"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" />
                      ) : (
                        <Maximize className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isEmbedded) {
    return videoContent;
  }

  if (typeof window === "undefined") return null;
  return createPortal(videoContent, document.body);
}
