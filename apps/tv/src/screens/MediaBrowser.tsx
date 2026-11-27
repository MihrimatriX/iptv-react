import { useEffect, useMemo, useState } from "react";
import type { MediaCategory, SeriesItem, VodItem } from "@iptv/core";
import { useSession, useSource } from "../data/session";
import { useAsync } from "../data/hooks";
import { FocusList } from "../components/FocusList";
import { FocusGrid } from "../components/FocusGrid";
import { Artwork } from "../components/Artwork";
import { Empty, ErrorState, Spinner } from "../components/Feedback";
import { Icon } from "../components/icons";
import type { ScreenProps } from "./types";

type Item = VodItem | SeriesItem;
const ALL = "__all";
const FAVORITES = "__fav";
const COLUMNS = 6;

const memory: Record<string, { category: string; item: number; zone: "categories" | "grid" }> = {};

interface MediaBrowserProps extends ScreenProps {
  kind: "movie" | "series";
  onOpen(item: Item): void;
}

export function MediaBrowser({ kind, ...rest }: MediaBrowserProps) {
  const source = useSource();
  const data = useAsync<[MediaCategory[], Item[]]>(
    () =>
      kind === "movie"
        ? Promise.all([source.vodCategories(), source.movies()])
        : Promise.all([source.seriesCategories(), source.series()]),
    [source, kind]
  );
  const label = kind === "movie" ? "Filmler" : "Diziler";
  if (data.loading && !data.data) return <Spinner label={`${label} yükleniyor…`} />;
  if (data.error) return <ErrorState error={data.error} />;
  const [categories, items] = data.data ?? [[], []];
  return <Browser key={kind} kind={kind} categories={categories} items={items} {...rest} />;
}

function Browser({
  kind,
  categories,
  items,
  active,
  onExitLeft,
  onOpen,
}: MediaBrowserProps & { categories: MediaCategory[]; items: Item[] }) {
  const { favorites, toggleFavorite } = useSession();
  const favoriteIds = kind === "movie" ? favorites.movie : favorites.series;
  const remembered = memory[kind] ?? { category: ALL, item: 0, zone: "grid" as const };
  const [zone, setZone] = useState(remembered.zone);

  const lists = useMemo(() => {
    const byCategory = new Map<string, Item[]>();
    for (const item of items) {
      const bucket = byCategory.get(item.categoryId);
      if (bucket) bucket.push(item);
      else byCategory.set(item.categoryId, [item]);
    }
    const byId = new Map(items.map((item) => [item.id, item]));
    return [
      { id: ALL, name: kind === "movie" ? "Tüm filmler" : "Tüm diziler", items },
      { id: FAVORITES, name: "Favoriler", items: favoriteIds.map((id) => byId.get(id)).filter(Boolean) as Item[] },
      ...categories
        .map((c) => ({ id: c.id, name: c.name, items: byCategory.get(c.id) ?? [] }))
        .filter((c) => c.items.length > 0),
    ];
  }, [items, categories, favoriteIds, kind]);

  const [categoryIndex, setCategoryIndex] = useState(() => Math.max(0, lists.findIndex((l) => l.id === remembered.category)));
  const list = lists[Math.min(categoryIndex, lists.length - 1)];
  const [itemIndex, setItemIndex] = useState(() => Math.min(remembered.item, Math.max(0, list.items.length - 1)));

  useEffect(() => {
    memory[kind] = { category: list.id, item: itemIndex, zone };
  }, [kind, list.id, itemIndex, zone]);

  return (
    <div className="media">
      <section className="column column--categories">
        <h2 className="column__title">{kind === "movie" ? "Film kategorileri" : "Dizi kategorileri"}</h2>
        <FocusList
          items={lists}
          itemHeight={4.25}
          focusedIndex={categoryIndex}
          active={active && zone === "categories"}
          onFocusIndex={(i) => {
            setCategoryIndex(i);
            setItemIndex(0);
          }}
          onSelect={() => setZone("grid")}
          onKey={(action) => {
            if (action === "right") return setZone("grid"), true;
            if (action === "left" || action === "back") return onExitLeft(), true;
            return false;
          }}
          getKey={(l) => l.id}
          renderItem={(l, _i, focused) => (
            <div className={`row row--category ${focused ? "is-focused" : ""} ${l.id === list.id ? "is-current" : ""}`}>
              {l.id === FAVORITES && <Icon name="star" filled className="fav-star" />}
              <span className="row__label">{l.name}</span>
              <span className="row__count">{l.items.length}</span>
            </div>
          )}
        />
      </section>
      <section className="column column--grid">
        <h2 className="column__title">
          {list.name} <span className="muted">· {list.items.length}</span>
        </h2>
        <FocusGrid
          items={list.items}
          columns={COLUMNS}
          rowHeight={23}
          focusedIndex={itemIndex}
          active={active && zone === "grid"}
          onFocusIndex={setItemIndex}
          onSelect={(item) => onOpen(item)}
          onKey={(action, item) => {
            if (action === "left" || action === "back") return setZone("categories"), true;
            if (action === "red" && item) return toggleFavorite(kind, item.id), true;
            return false;
          }}
          getKey={(item) => item.id}
          empty={<Empty>{list.id === FAVORITES ? "Henüz favori yok. Kırmızı tuşla ekleyebilirsin." : "Bu kategoride içerik yok."}</Empty>}
          renderItem={(item, _i, focused) => (
            <PosterCard item={item} focused={focused} favorite={favoriteIds.includes(item.id)} />
          )}
        />
      </section>
    </div>
  );
}

export function PosterCard({ item, focused, favorite }: { item: Item; focused: boolean; favorite: boolean }) {
  return (
    <div className={`poster-card ${focused ? "is-focused" : ""}`}>
      <Artwork src={item.poster} title={item.name} variant="poster" className="poster-card__art" />
      {favorite && <Icon name="star" filled className="poster-card__fav" />}
      {item.rating != null && <span className="poster-card__rating">★ {item.rating.toFixed(1)}</span>}
      <div className="poster-card__title">{item.name}</div>
    </div>
  );
}
