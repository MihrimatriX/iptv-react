import { useMemo, useState } from "react";
import type { Episode, SeriesItem, VodItem } from "@iptv/core";
import { useSession, useSource } from "../data/session";
import { useAsync } from "../data/hooks";
import { Artwork } from "../components/Artwork";
import { ErrorState, Spinner } from "../components/Feedback";
import { FocusList } from "../components/FocusList";
import { Icon } from "../components/icons";
import { Layer, isPointerActive, useKeys } from "../keys";
import { duration, runtime, year } from "../format";
import { usePlayer, type PlayItem } from "../player/PlayerContext";
import { getResume, setResume } from "../player/resume";

interface DetailProps {
  active: boolean;
  onBack(): void;
}

interface Action {
  id: string;
  label: string;
  icon?: "play" | "star";
  run(): void;
}

function ActionRow({ actions, focused, active, onFocus }: { actions: Action[]; focused: number; active: boolean; onFocus(i: number): void }) {
  return (
    <div className="actions">
      {actions.map((action, index) => (
        <button
          key={action.id}
          type="button"
          tabIndex={-1}
          className={`button ${active && index === focused ? "is-focused" : ""}`}
          onMouseEnter={() => isPointerActive() && onFocus(index)}
          onClick={action.run}
        >
          {action.icon && <Icon name={action.icon} filled={action.icon === "star"} />}
          {action.label}
        </button>
      ))}
    </div>
  );
}

function Meta({ parts }: { parts: Array<string | null | undefined> }) {
  const shown = parts.filter(Boolean);
  return <div className="meta">{shown.map((part, i) => <span key={i}>{part}</span>)}</div>;
}

/** Wide backdrop when the panel has one, otherwise a faint poster. */
function Backdrop({ src, fallback }: { src: string | null | undefined; fallback?: string | null }) {
  const image = src || fallback;
  return (
    <div className={`backdrop ${src ? "" : "backdrop--poster"}`}>
      {image && <img src={image} alt="" />}
      <div className="backdrop__shade" />
    </div>
  );
}

export function MovieDetail({ item, active, onBack }: DetailProps & { item: VodItem }) {
  const source = useSource();
  const player = usePlayer();
  const { favorites, toggleFavorite } = useSession();
  const details = useAsync(() => source.movieDetails(item), [source, item]);
  const [focused, setFocused] = useState(0);
  const d = details.data;
  const resume = getResume(`movie:${item.id}`);

  const playItem = (): PlayItem => ({
    kind: "movie",
    key: `movie:${item.id}`,
    title: d?.title || item.name,
    subtitle: year(d?.releaseDate) ?? undefined,
    url: source.movieUrl(item, d ?? undefined),
    poster: d?.poster ?? item.poster,
  });

  const start = (fromStart: boolean) => {
    // Forgetting the saved position makes the player start at 0.
    if (fromStart) setResume(`movie:${item.id}`, 0, 1);
    player.play(playItem(), "full");
  };

  const isFavorite = favorites.movie.includes(item.id);
  const actions: Action[] = [
    { id: "play", label: resume ? `Devam et (${duration(resume)})` : "Oynat", icon: "play", run: () => start(false) },
    ...(resume ? [{ id: "restart", label: "Baştan başlat", run: () => start(true) }] : []),
    { id: "fav", label: isFavorite ? "Favorilerden çıkar" : "Favorilere ekle", icon: "star" as const, run: () => toggleFavorite("movie", item.id) },
  ];

  useKeys(
    (action) => {
      if (action === "back") return onBack(), true;
      if (action === "left") return setFocused((i) => Math.max(0, i - 1)), true;
      if (action === "right") return setFocused((i) => Math.min(actions.length - 1, i + 1)), true;
      if (action === "ok" || action === "play" || action === "playPause") return actions[Math.min(focused, actions.length - 1)].run(), true;
      if (action === "red") return toggleFavorite("movie", item.id), true;
      return true;
    },
    Layer.detail,
    active
  );

  return (
    <div className="detail">
      <Backdrop src={d?.backdrop} fallback={d?.poster ?? item.poster} />
      <div className="detail__body">
        <Artwork src={d?.poster ?? item.poster} title={item.name} variant="poster" className="detail__poster" />
        <div className="detail__info">
          <h1 className="detail__title">{d?.title || item.name}</h1>
          <Meta parts={[year(d?.releaseDate), runtime(d?.duration), d?.genre, d?.rating ?? item.rating ? `★ ${(d?.rating ?? item.rating)!.toFixed(1)}` : null]} />
          {details.loading && <Spinner />}
          {details.error && <ErrorState error={details.error} />}
          {d?.plot && <p className="detail__plot">{d.plot}</p>}
          {d?.director && <p className="detail__credit"><span className="muted">Yönetmen</span> {d.director}</p>}
          {d?.cast && <p className="detail__credit"><span className="muted">Oyuncular</span> {d.cast}</p>}
          <ActionRow actions={actions} focused={focused} active={active} onFocus={setFocused} />
        </div>
      </div>
    </div>
  );
}

type SeriesZone = "actions" | "seasons" | "episodes";

export function SeriesDetail({ item, active, onBack }: DetailProps & { item: SeriesItem }) {
  const source = useSource();
  const player = usePlayer();
  const { favorites, toggleFavorite } = useSession();
  const details = useAsync(() => source.seriesDetails(item), [source, item]);
  const d = details.data;
  const seasons = d?.seasons ?? [];
  const [zone, setZone] = useState<SeriesZone>("episodes");
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [actionIndex, setActionIndex] = useState(0);
  const season = seasons[Math.min(seasonIndex, Math.max(0, seasons.length - 1))];
  const episodes = season?.episodes ?? [];

  // Flat list across seasons: "next episode" continues into the next season.
  const flat = useMemo(() => seasons.reduce<Episode[]>((all, s) => all.concat(s.episodes), []), [seasons]);
  const toItem = (episode: Episode): PlayItem => ({
    kind: "episode",
    key: `episode:${episode.id}`,
    title: d?.title || item.name,
    subtitle: `S${episode.season} B${episode.episode}${episode.title ? ` · ${episode.title}` : ""}`,
    url: source.episodeUrl(episode),
    poster: episode.still ?? d?.poster ?? item.poster,
  });
  const playEpisode = (episode: Episode | undefined) => {
    if (!episode) return;
    const index = flat.indexOf(episode);
    player.play(toItem(episode), "full", {
      length: flat.length,
      index,
      wrap: false,
      get: (i) => toItem(flat[i]),
    });
  };

  // First episode with a saved position, else the very first one.
  const resumeEpisode = flat.find((episode) => getResume(`episode:${episode.id}`) != null);
  const isFavorite = favorites.series.includes(item.id);
  const actions: Action[] = [
    {
      id: "play",
      label: resumeEpisode ? `Devam et · S${resumeEpisode.season} B${resumeEpisode.episode}` : "İlk bölümü oynat",
      icon: "play",
      run: () => playEpisode(resumeEpisode ?? flat[0]),
    },
    { id: "fav", label: isFavorite ? "Favorilerden çıkar" : "Favorilere ekle", icon: "star", run: () => toggleFavorite("series", item.id) },
  ];

  useKeys(
    (action) => {
      if (action === "back") return onBack(), true;
      if (action === "red") return toggleFavorite("series", item.id), true;
      if (zone === "actions") {
        if (action === "left") return setActionIndex((i) => Math.max(0, i - 1)), true;
        if (action === "right") {
          if (actionIndex < actions.length - 1) setActionIndex(actionIndex + 1);
          else if (seasons.length) setZone("episodes");
          return true;
        }
        if (action === "ok") return actions[actionIndex].run(), true;
        if (action === "down" && seasons.length) return setZone("episodes"), true;
        return true;
      }
      if (zone === "seasons") {
        if (action === "left") {
          if (seasonIndex > 0) {
            setSeasonIndex(seasonIndex - 1);
            setEpisodeIndex(0);
          } else setZone("actions");
          return true;
        }
        if (action === "right" && seasonIndex < seasons.length - 1) {
          setSeasonIndex(seasonIndex + 1);
          setEpisodeIndex(0);
          return true;
        }
        if (action === "down" || action === "ok") return setZone("episodes"), true;
        if (action === "up") return setZone("actions"), true;
        return true;
      }
      return false; // episodes: the list handles it, its onKey moves zones
    },
    Layer.detail,
    active
  );

  return (
    <div className="detail detail--series">
      <Backdrop src={d?.backdrop} fallback={d?.poster ?? item.poster} />
      <div className="detail__body">
        <div className="detail__info detail__info--narrow">
          <h1 className="detail__title">{d?.title || item.name}</h1>
          <Meta parts={[year(d?.releaseDate ?? item.releaseDate), d?.genre ?? item.genre, seasons.length ? `${seasons.length} sezon` : null, (d?.rating ?? item.rating) != null ? `★ ${(d?.rating ?? item.rating)!.toFixed(1)}` : null]} />
          {(d?.plot ?? item.plot) && <p className="detail__plot">{d?.plot ?? item.plot}</p>}
          {d?.cast && <p className="detail__credit"><span className="muted">Oyuncular</span> {d.cast}</p>}
          <ActionRow actions={actions} focused={actionIndex} active={active && zone === "actions"} onFocus={(i) => { setZone("actions"); setActionIndex(i); }} />
        </div>
        <div className="episodes">
          {details.loading && <Spinner label="Bölümler yükleniyor…" />}
          {details.error && <ErrorState error={details.error} />}
          {seasons.length > 0 && (
            <>
              <div className="seasons">
                {seasons.map((s, i) => (
                  <span
                    key={s.number}
                    className={`chip ${i === seasonIndex ? "is-current" : ""} ${active && zone === "seasons" && i === seasonIndex ? "is-focused" : ""}`}
                    onClick={() => { setSeasonIndex(i); setEpisodeIndex(0); }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
              <FocusList
                items={episodes}
                itemHeight={7.5}
                focusedIndex={episodeIndex}
                active={active && zone === "episodes"}
                layer={Layer.detail}
                onFocusIndex={setEpisodeIndex}
                onSelect={(episode) => playEpisode(episode)}
                onKey={(action) => {
                  if (action === "up") return setZone("seasons"), true;
                  if (action === "left") return setZone("actions"), true;
                  return false;
                }}
                getKey={(e) => e.id}
                renderItem={(episode, _i, focused) => {
                  const resumeAt = getResume(`episode:${episode.id}`);
                  return (
                    <div className={`row row--episode ${focused ? "is-focused" : ""}`}>
                      <Artwork src={episode.still} title={`${episode.episode}`} variant="still" className="row__still" />
                      <div className="row__text">
                        <div className="row__label">{episode.title || `${episode.episode}. Bölüm`}</div>
                        <div className="muted row__sub">
                          {runtime(episode.duration)}
                          {resumeAt ? ` · ${duration(resumeAt)} izlendi` : ""}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
