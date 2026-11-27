import { useCallback, useEffect, useRef, useState } from "react";
import { epgProgress, nowAndNext } from "@iptv/core";
import { useSession } from "../data/session";
import { useNow, useShortEpg } from "../data/hooks";
import { Layer, useKeys } from "../keys";
import { Artwork } from "../components/Artwork";
import { ProgressBar } from "../components/Feedback";
import { Icon } from "../components/icons";
import { clock, duration as formatDuration } from "../format";
import { attach, type EngineHandle } from "./engine";
import { usePlayer } from "./PlayerContext";
import { getResume, setResume } from "./resume";

type Status = "loading" | "playing" | "paused" | "buffering" | "reconnecting" | "error";

const MAX_RECONNECTS = 5;
const STALL_RELOAD_MS = 15_000;
const OVERLAY_MS = 5_000;

/**
 * The single <video> of the app. It sits above every screen and is either laid
 * over the preview slot, full screen, or gone; moving between preview and full
 * screen never reloads the stream.
 */
export function Player() {
  const player = usePlayer();
  const { item, mode, previewRect } = player;
  const { settings, source, favorites, toggleFavorite } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [time, setTime] = useState({ current: 0, total: 0 });
  const [overlay, setOverlay] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  // Retry counter scoped to the current item, so a new item always starts at 0.
  const [retry, setRetry] = useState({ key: "", n: 0 });
  const attempt = item && retry.key === item.key ? retry.n : 0;
  const itemKey = useRef("");
  itemKey.current = item?.key ?? "";
  const bump = useCallback(
    () => setRetry((r) => ({ key: itemKey.current, n: (r.key === itemKey.current ? r.n : 0) + 1 })),
    []
  );
  const reconnects = useRef(0);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const seekTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const live = item?.kind === "live";
  const full = mode === "full";

  const flash = useCallback((ms = OVERLAY_MS) => {
    setOverlay(true);
    clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setOverlay(false);
    }, ms);
  }, []);

  const say = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 3000);
  }, []);

  const savePosition = useCallback(() => {
    const video = videoRef.current;
    if (!video || !item || item.kind === "live" || !Number.isFinite(video.duration)) return;
    setResume(item.key, video.currentTime, video.duration);
  }, [item]);

  // (Re)load whenever the item, the engine setting or a retry changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    if (attempt === 0) reconnects.current = 0;
    setStatus(attempt ? "reconnecting" : "loading");
    setTime({ current: 0, total: 0 });

    const retry = (reason: string) => {
      if (cancelled) return;
      engineRef.current?.destroy();
      engineRef.current = null;
      if (!live || reconnects.current >= MAX_RECONNECTS) {
        console.warn("[player] giving up:", reason);
        setStatus("error");
        return;
      }
      const wait = Math.min(1000 * 2 ** reconnects.current, 10_000);
      reconnects.current += 1;
      setStatus("reconnecting");
      retryTimer = setTimeout(() => !cancelled && bump(), wait);
    };

    attach(video, item.url, live, settings.engine, {
      onReady: () => {
        if (cancelled) return;
        const resumeAt = item.kind !== "live" && attempt === 0 ? getResume(item.key) : null;
        if (resumeAt) {
          video.currentTime = resumeAt;
          say(`Kaldığın yerden devam: ${formatDuration(resumeAt)}`);
        }
        video.play().catch(() => {
          // Autoplay with sound refused (desktop browsers): retry muted.
          video.muted = true;
          video.play().catch(() => undefined);
        });
      },
      onFatal: retry,
    }).then(
      (engine) => {
        if (cancelled) engine.destroy();
        else engineRef.current = engine;
      },
      (error: unknown) => retry(String(error))
    );

    // Watchdog: a live stream can freeze without any error event.
    let lastTime = -1;
    let lastProgress = Date.now();
    let nudged = false;
    const watchdog = live
      ? setInterval(() => {
          if (video.paused || document.hidden) {
            lastProgress = Date.now();
            return;
          }
          if (video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            lastProgress = Date.now();
            nudged = false;
            reconnects.current = 0;
            return;
          }
          const stalled = Date.now() - lastProgress;
          if (stalled > STALL_RELOAD_MS) retry("stalled");
          else if (stalled > STALL_RELOAD_MS / 2 && !nudged) {
            nudged = true;
            engineRef.current?.nudge();
          }
        }, 2000)
      : undefined;

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      clearInterval(watchdog);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [item, attempt, live, settings.engine, say, bump]);

  // New item: fresh overlay, no pending seek.
  useEffect(() => {
    setSeekTarget(null);
    if (item) flash();
  }, [item, flash]);

  // Video element events → status.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => setTime({ current: video.currentTime, total: Number.isFinite(video.duration) ? video.duration : 0 });
    const handlers: Record<string, () => void> = {
      playing: () => setStatus("playing"),
      pause: () => {
        setStatus((s) => (s === "error" ? s : "paused"));
        setOverlay(true);
      },
      waiting: () => setStatus((s) => (s === "playing" ? "buffering" : s)),
      timeupdate: update,
      durationchange: update,
      ended: () => {
        if (!item || item.kind === "live") return;
        setResume(item.key, 0, 1);
        if (item.kind === "episode" && player.step(1)) say("Sonraki bölüm");
        else player.stop();
      },
    };
    for (const name of Object.keys(handlers)) video.addEventListener(name, handlers[name]);
    return () => {
      for (const name of Object.keys(handlers)) video.removeEventListener(name, handlers[name]);
    };
  }, [item, player, say]);

  // Save VOD position every 10 s and when leaving.
  useEffect(() => {
    if (!item || item.kind === "live") return;
    const timer = setInterval(savePosition, 10_000);
    return () => {
      clearInterval(timer);
      savePosition();
    };
  }, [item, savePosition]);

  // TV multitasking / minimised window: release the decoder, resume after.
  useEffect(() => {
    const onVisibility = () => {
      const video = videoRef.current;
      if (!video || !item) return;
      if (document.hidden) {
        savePosition();
        video.pause();
      } else if (live) {
        bump();
      } else {
        video.play().catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [item, live, savePosition, bump]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
    flash();
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || live || !Number.isFinite(video.duration)) return;
    // Presses accumulate into one seek; TVs re-buffer on every seek.
    const base = seekTarget ?? video.currentTime;
    const target = Math.max(0, Math.min(video.duration - 1, base + seconds));
    setSeekTarget(target);
    flash();
    clearTimeout(seekTimer.current);
    seekTimer.current = setTimeout(() => {
      video.currentTime = target;
      setSeekTarget(null);
    }, 700);
  };

  useKeys(
    (action) => {
      if (!item) return false;
      if (status === "error") {
        if (action === "ok") {
          reconnects.current = 0;
          bump();
          return true;
        }
      }
      switch (action) {
        case "back":
        case "stop":
          if (live) player.setMode("preview");
          else {
            savePosition();
            player.stop();
          }
          return true;
        case "ok":
          if (live) {
            if (overlay) setOverlay(false);
            else flash();
          } else togglePlay();
          return true;
        case "playPause":
        case "play":
        case "pause":
          togglePlay();
          return true;
        case "up":
        case "chUp":
          if (live && player.step(-1)) flash();
          else flash();
          return true;
        case "down":
        case "chDown":
          if (live && player.step(1)) flash();
          else flash();
          return true;
        case "left":
          seekBy(-10);
          return true;
        case "right":
          seekBy(10);
          return true;
        case "rw":
          seekBy(-30);
          return true;
        case "ff":
          seekBy(30);
          return true;
        case "info":
          flash(10_000);
          return true;
        case "red":
          if (live && item.channel) {
            const wasFavorite = favorites.live.includes(item.channel.id);
            toggleFavorite("live", item.channel.id);
            say(wasFavorite ? "Favorilerden çıkarıldı" : "Favorilere eklendi");
          }
          return true;
        default:
          return true; // full-screen player swallows everything else
      }
    },
    Layer.player,
    full
  );

  if (!item) return null;

  const style =
    mode === "preview" && previewRect
      ? { left: previewRect.left, top: previewRect.top, width: previewRect.width, height: previewRect.height }
      : undefined;
  const hidden = mode === "hidden" || (mode === "preview" && !previewRect);
  const showOverlay = full && (overlay || status !== "playing" || seekTarget != null);

  return (
    <div
      className={`player player--${mode} ${hidden ? "player--offscreen" : ""} ${showOverlay ? "" : "player--clean"}`}
      style={style}
      onMouseMove={() => full && flash()}
      onClick={() => {
        if (mode === "preview") player.setMode("full");
      }}
    >
      <video ref={videoRef} className="player__video" playsInline />
      {(status === "loading" || status === "buffering" || status === "reconnecting") && (
        <div className="player__center">
          <div className="spinner" />
          {status === "reconnecting" && full && <p>Yeniden bağlanılıyor…</p>}
        </div>
      )}
      {status === "error" && (
        <div className="player__center player__error">
          <p className="state__title">Yayın açılamadı</p>
          {full && <p className="muted">OK: Tekrar dene · Geri: Kapat</p>}
        </div>
      )}
      {full && showOverlay && (live ? <LiveOverlay /> : <VodOverlay time={time} seekTarget={seekTarget} status={status} />)}
      {full && toast && <div className="toast">{toast}</div>}
      {full && source?.mode === "demo" && <div className="player__badge">DEMO</div>}
    </div>
  );
}

function LiveOverlay() {
  const { item, queue } = usePlayer();
  const { source, favorites } = useSession();
  const now = useNow(15_000);
  const channel = item?.channel ?? null;
  const epg = useShortEpg(source!, channel, 0);
  const { now: current, next } = nowAndNext(epg ?? [], now);
  if (!item || !channel) return null;
  return (
    <>
      <div className="overlay-top">
        <span className="overlay-top__clock">{clock(now)}</span>
      </div>
      <div className="overlay-bottom overlay-bottom--live">
        <Artwork src={channel.streamIcon} title={channel.name} className="overlay-bottom__logo" />
        <div className="overlay-bottom__body">
          <div className="overlay-bottom__title">
            {channel.num != null && <span className="channel-num">{channel.num}</span>}
            {channel.name}
            {favorites.live.includes(channel.id) && <Icon name="star" filled className="fav-star" />}
          </div>
          {current ? (
            <>
              <div className="epg-line">
                <span className="epg-line__time">
                  {clock(current.start)} – {clock(current.end)}
                </span>
                <span className="epg-line__title">{current.title}</span>
              </div>
              <ProgressBar value={epgProgress(current, now)} />
            </>
          ) : (
            <div className="epg-line muted">{epg ? "Yayın akışı bilgisi yok" : "Yayın akışı yükleniyor…"}</div>
          )}
          {next && (
            <div className="epg-line epg-line--next">
              <span className="epg-line__time">Sonra {clock(next.start)}</span>
              <span className="epg-line__title">{next.title}</span>
            </div>
          )}
        </div>
        <div className="overlay-bottom__side muted">
          {queue && `${queue.index + 1} / ${queue.length}`}
          <div className="overlay-hints">▲▼ Kanal · ● Favori · Geri: Liste</div>
        </div>
      </div>
    </>
  );
}

function VodOverlay({ time, seekTarget, status }: { time: { current: number; total: number }; seekTarget: number | null; status: Status }) {
  const { item } = usePlayer();
  if (!item) return null;
  const position = seekTarget ?? time.current;
  return (
    <div className="overlay-bottom overlay-bottom--vod">
      <div className="overlay-bottom__title">{item.title}</div>
      {item.subtitle && <div className="muted">{item.subtitle}</div>}
      <div className="vod-bar">
        <Icon name={status === "paused" ? "play" : "pause"} className="vod-bar__icon" />
        <span>{formatDuration(position)}</span>
        <ProgressBar value={time.total ? position / time.total : 0} />
        <span>{formatDuration(time.total)}</span>
      </div>
      <div className="overlay-hints">OK: Oynat/Duraklat · ◀ ▶ 10 sn · ⏪ ⏩ 30 sn · Geri: Çık</div>
    </div>
  );
}
