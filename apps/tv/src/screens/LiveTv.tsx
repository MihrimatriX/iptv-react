import { useEffect, useMemo, useRef, useState } from "react";
import { epgProgress, nowAndNext, upcoming, type ChannelCategory, type ChannelStream } from "@iptv/core";
import { useSession, useSource } from "../data/session";
import { useAsync, useDebounced, useNow, useShortEpg } from "../data/hooks";
import { FocusList } from "../components/FocusList";
import { Artwork } from "../components/Artwork";
import { Empty, ErrorState, Hints, ProgressBar, Spinner } from "../components/Feedback";
import { Icon } from "../components/icons";
import { usePlayer, PreviewSlot, type PlayItem, type PlayQueue } from "../player/PlayerContext";
import { useKeys } from "../keys";
import { clock } from "../format";
import type { ScreenProps } from "./types";

const ALL = "__all";
const FAVORITES = "__fav";
const PREVIEW_DELAY_MS = 1200;

// Survives switching sections so coming back lands where you left.
const memory = { category: ALL, channel: 0, zone: "channels" as "categories" | "channels" };

const byNumber = (a: ChannelStream, b: ChannelStream) =>
  (a.num ?? Number.MAX_SAFE_INTEGER) - (b.num ?? Number.MAX_SAFE_INTEGER) ||
  a.name.localeCompare(b.name, "tr", { sensitivity: "base" });

export const toPlayItem = (channel: ChannelStream): PlayItem => ({
  kind: "live",
  key: `live:${channel.id}`,
  title: channel.name,
  url: channel.streamUrl,
  poster: channel.streamIcon,
  channel,
});

export function LiveTv({ active, onExitLeft }: ScreenProps) {
  const source = useSource();
  const catalog = useAsync(() => source.liveCatalog(), [source]);
  if (catalog.loading && !catalog.data) return <Spinner label="Kanallar yükleniyor…" />;
  if (catalog.error) return <ErrorState error={catalog.error} hint="Sunucu adresini ve hesabını Ayarlar'dan kontrol et." />;
  return <LiveBrowser catalog={catalog.data ?? []} active={active} onExitLeft={onExitLeft} />;
}

function LiveBrowser({ catalog, active, onExitLeft }: { catalog: ChannelCategory[] } & ScreenProps) {
  const { favorites, toggleFavorite, settings } = useSession();
  const player = usePlayer();
  const [zone, setZone] = useState(memory.zone);
  const [digits, setDigits] = useState("");

  // TVs list channels by number, as the panel numbers them; name breaks ties.
  const ordered = useMemo(
    () => catalog.map((c) => ({ ...c, streams: c.streams.slice().sort(byNumber) })),
    [catalog]
  );
  const all = useMemo(() => {
    const unique = new Map<number, ChannelStream>();
    for (const c of ordered) for (const channel of c.streams) if (!unique.has(channel.id)) unique.set(channel.id, channel);
    return Array.from(unique.values()).sort(byNumber);
  }, [ordered]);
  const categories = useMemo(() => {
    const byId = new Map(all.map((channel) => [channel.id, channel]));
    const favoriteChannels = favorites.live.map((id) => byId.get(id)).filter(Boolean) as ChannelStream[];
    return [
      { id: ALL, name: "Tüm kanallar", streams: all },
      { id: FAVORITES, name: "Favoriler", streams: favoriteChannels },
      ...ordered,
    ];
  }, [ordered, all, favorites.live]);

  const [categoryIndex, setCategoryIndex] = useState(() =>
    Math.max(0, categories.findIndex((c) => c.id === memory.category))
  );
  const category = categories[Math.min(categoryIndex, categories.length - 1)];
  const channels = category.streams;
  const [channelIndex, setChannelIndex] = useState(() => Math.min(memory.channel, Math.max(0, channels.length - 1)));
  const channel = channels[channelIndex] ?? null;

  useEffect(() => {
    memory.category = category.id;
    memory.channel = channelIndex;
    memory.zone = zone;
  }, [category.id, channelIndex, zone]);

  const queue = (index: number): PlayQueue => ({
    length: channels.length,
    index,
    wrap: true,
    get: (i) => toPlayItem(channels[i]),
    onChange: setChannelIndex,
  });

  const watch = (index: number) => {
    if (channels[index]) player.play(toPlayItem(channels[index]), "full", queue(index));
  };

  // Preview once the focus rests on a channel (not while zapping in full screen).
  const settled = useDebounced(channel, PREVIEW_DELAY_MS);
  useEffect(() => {
    if (!settings.preview || !settled || settled !== channel || player.mode === "full" || zone !== "channels") return;
    player.play(toPlayItem(settled), "preview", queue(channelIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, settings.preview, zone]);

  // Number keys: type a channel number, it opens after a short pause.
  const digitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!digits) return;
    clearTimeout(digitTimer.current);
    digitTimer.current = setTimeout(() => {
      const wanted = Number(digits);
      setDigits("");
      const index = all.findIndex((c) => c.num === wanted);
      if (index === -1) return;
      setCategoryIndex(0);
      setChannelIndex(index);
      player.play(toPlayItem(all[index]), "full", {
        length: all.length,
        index,
        wrap: true,
        get: (i) => toPlayItem(all[i]),
        onChange: setChannelIndex,
      });
    }, 1500);
    return () => clearTimeout(digitTimer.current);
  }, [digits, all, player]);

  useKeys(
    (action) => {
      if (action.startsWith("digit")) {
        setDigits((d) => (d + action.slice(5)).slice(-4));
        return true;
      }
      return false;
    },
    0,
    active
  );

  return (
    <div className="live">
      <section className="column column--categories">
        <h2 className="column__title">Kategoriler</h2>
        <FocusList
          items={categories}
          itemHeight={4.25}
          focusedIndex={categoryIndex}
          active={active && zone === "categories"}
          onFocusIndex={(i) => {
            setCategoryIndex(i);
            setChannelIndex(0);
          }}
          onSelect={() => setZone("channels")}
          onKey={(action) => {
            if (action === "right") return setZone("channels"), true;
            if (action === "left" || action === "back") return onExitLeft(), true;
            return false;
          }}
          getKey={(c) => c.id}
          renderItem={(c, _i, focused) => (
            <div className={`row row--category ${focused ? "is-focused" : ""} ${c.id === category.id ? "is-current" : ""}`}>
              {c.id === FAVORITES && <Icon name="star" filled className="fav-star" />}
              <span className="row__label">{c.name}</span>
              <span className="row__count">{c.streams.length}</span>
            </div>
          )}
        />
      </section>

      <section className="column column--channels">
        <h2 className="column__title">
          {category.name} <span className="muted">· {channels.length}</span>
        </h2>
        <FocusList
          items={channels}
          itemHeight={5}
          focusedIndex={channelIndex}
          active={active && zone === "channels"}
          onFocusIndex={setChannelIndex}
          onSelect={(_c, i) => watch(i)}
          onKey={(action, c) => {
            if (action === "left") return setZone("categories"), true;
            if (action === "back") return setZone("categories"), true;
            if (action === "red" && c) return toggleFavorite("live", c.id), true;
            return false;
          }}
          getKey={(c) => c.id}
          empty={
            <Empty>
              {category.id === FAVORITES ? "Favori kanal yok. Kanal listesinde kırmızı tuşla ekleyebilirsin." : "Bu kategoride kanal yok."}
            </Empty>
          }
          renderItem={(c, _i, focused) => (
            <div className={`row row--channel ${focused ? "is-focused" : ""} ${player.item?.key === `live:${c.id}` ? "is-playing" : ""}`}>
              <span className="channel-num">{c.num ?? ""}</span>
              <Artwork src={c.streamIcon} title={c.name} className="row__logo" />
              <span className="row__label">{c.name}</span>
              {favorites.live.includes(c.id) && <Icon name="star" filled className="fav-star" />}
            </div>
          )}
        />
      </section>

      <section className="column column--detail">
        <h2 className="column__title">Önizleme</h2>
        <ChannelDetail channel={channel} previewing={player.item?.key === (channel && `live:${channel.id}`)} />
        <Hints items={[["OK", "İzle"], ["red", "Favori"], ["CH", "Sayfa"], ["0-9", "Kanal no"]]} />
      </section>

      {digits && <div className="digit-entry">{digits}</div>}
    </div>
  );
}

function ChannelDetail({ channel, previewing }: { channel: ChannelStream | null; previewing: boolean }) {
  const source = useSource();
  const now = useNow(30_000);
  const epg = useShortEpg(source, channel);
  const { now: current } = nowAndNext(epg ?? [], now);
  const later = upcoming(epg ?? [], now, 6).filter((entry) => entry !== current);

  if (!channel) return <div className="detail-empty muted">Kanal seç</div>;
  return (
    <div className="channel-detail">
      <PreviewSlot className="preview-slot">
        {!previewing && (
          <div className="preview-slot__placeholder">
            <Artwork src={channel.streamIcon} title={channel.name} className="preview-slot__logo" />
            <span className="muted">OK ile izle</span>
          </div>
        )}
      </PreviewSlot>
      <h1 className="channel-detail__name">{channel.name}</h1>
      {epg == null ? (
        <p className="muted">Yayın akışı yükleniyor…</p>
      ) : current ? (
        <div className="now-playing">
          <div className="now-playing__head">
            <span className="badge badge--live">ŞİMDİ</span>
            <span className="epg-line__time">
              {clock(current.start)} – {clock(current.end)}
            </span>
          </div>
          <div className="now-playing__title">{current.title}</div>
          <ProgressBar value={epgProgress(current, now)} />
          {current.description && <p className="now-playing__desc">{current.description}</p>}
        </div>
      ) : (
        <p className="muted">Bu kanal için yayın akışı bilgisi yok.</p>
      )}
      {later.length > 0 && (
        <ul className="schedule">
          {later.map((entry) => (
            <li key={entry.id} className="schedule__item">
              <span className="epg-line__time">{clock(entry.start)}</span>
              <span className="schedule__title">{entry.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
