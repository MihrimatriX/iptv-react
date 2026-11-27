import { useEffect, useMemo, useRef, useState } from "react";
import { createSearchIndex, type ChannelStream, type SeriesItem, type VodItem } from "@iptv/core";
import { useSource } from "../data/session";
import { useAsync, useDebounced } from "../data/hooks";
import { FocusList } from "../components/FocusList";
import { Artwork } from "../components/Artwork";
import { Empty, Spinner } from "../components/Feedback";
import { TextField } from "../components/TextField";
import { useKeys } from "../keys";
import { usePlayer } from "../player/PlayerContext";
import { toPlayItem } from "./LiveTv";
import type { ScreenProps } from "./types";

type Result =
  | { kind: "live"; item: ChannelStream }
  | { kind: "movie"; item: VodItem }
  | { kind: "series"; item: SeriesItem };

const PER_KIND = 40;
const LABEL = { live: "Kanal", movie: "Film", series: "Dizi" } as const;
let lastTerm = "";

export function Search({ active, onExitLeft, onOpen }: ScreenProps & { onOpen(item: VodItem | SeriesItem): void }) {
  const source = useSource();
  const player = usePlayer();
  const [term, setTerm] = useState(lastTerm);
  const [zone, setZone] = useState<"input" | "results">("input");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const settled = useDebounced(term, 300);

  // Everything loads in parallel; a panel without VOD still searches channels.
  const data = useAsync(
    () =>
      Promise.all([
        source.liveCatalog().then((c) => c.reduce<ChannelStream[]>((all, cat) => all.concat(cat.streams), [])),
        source.movies().catch(() => [] as VodItem[]),
        source.series().catch(() => [] as SeriesItem[]),
      ]),
    [source]
  );

  const search = useMemo(() => {
    if (!data.data) return null;
    const [live, movies, series] = data.data;
    // Channels appear in several categories; search each one once.
    const unique = Array.from(new Map(live.map((c) => [c.id, c])).values());
    return {
      live: createSearchIndex(unique, (c) => c.name),
      movie: createSearchIndex(movies, (m) => m.name),
      series: createSearchIndex(series, (s) => s.name),
    };
  }, [data.data]);

  const results = useMemo<Result[]>(() => {
    if (!search || settled.trim().length < 2) return [];
    return [
      ...search.live(settled, PER_KIND).map((item) => ({ kind: "live" as const, item })),
      ...search.movie(settled, PER_KIND).map((item) => ({ kind: "movie" as const, item })),
      ...search.series(settled, PER_KIND).map((item) => ({ kind: "series" as const, item })),
    ];
  }, [search, settled]);

  useEffect(() => {
    lastTerm = term;
    setIndex(0);
  }, [term]);

  const open = (result: Result) => {
    if (result.kind === "live") player.play(toPlayItem(result.item), "full");
    else onOpen(result.item);
  };

  useKeys(
    (action) => {
      if (zone !== "input") return false;
      if (action === "ok") {
        if (document.activeElement === input.current) input.current?.blur();
        else input.current?.focus();
        return true;
      }
      if (action === "down" && results.length) {
        input.current?.blur();
        setZone("results");
        return true;
      }
      if (action === "left" || action === "back") {
        input.current?.blur();
        onExitLeft();
        return true;
      }
      return false;
    },
    0,
    active
  );

  return (
    <div className="search">
      <TextField ref={input} label="Kanal, film veya dizi ara" type="search" value={term} onChange={setTerm} focused={active && zone === "input"} placeholder="En az 2 harf" />
      {data.loading && <Spinner label="Katalog hazırlanıyor…" />}
      <FocusList
        className="search__results"
        items={results}
        itemHeight={5.5}
        focusedIndex={index}
        active={active && zone === "results"}
        onFocusIndex={setIndex}
        onSelect={open}
        onKey={(action, _r, i) => {
          if ((action === "up" && i === 0) || action === "back") return setZone("input"), true;
          if (action === "left") return onExitLeft(), true;
          return false;
        }}
        getKey={(r) => `${r.kind}:${r.item.id}`}
        empty={settled.trim().length >= 2 && !data.loading ? <Empty>“{settled}” için sonuç yok.</Empty> : null}
        renderItem={(r, _i, focused) => (
          <div className={`row row--result ${focused ? "is-focused" : ""}`}>
            <Artwork
              src={r.kind === "live" ? r.item.streamIcon : r.item.poster}
              title={r.item.name}
              className="row__logo"
            />
            <span className="row__label">{r.item.name}</span>
            <span className={`badge badge--${r.kind}`}>{LABEL[r.kind]}</span>
          </div>
        )}
      />
    </div>
  );
}
