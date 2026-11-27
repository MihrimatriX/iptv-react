import {
  XtreamClient,
  buildDemoCatalog,
  buildDemoMovies,
  buildDemoSeries,
  demoEpg,
  demoMovieUrl,
  demoSeriesDetails,
  demoVodDetails,
  DEMO_SERIES_CATEGORIES,
  DEMO_VOD_CATEGORIES,
  type AccountInfo,
  type ChannelCategory,
  type ChannelStream,
  type EpgEntry,
  type Episode,
  type LiveFormat,
  type MediaCategory,
  type SeriesDetails,
  type SeriesItem,
  type VodDetails,
  type VodItem,
  type XtreamCredentials,
} from "@iptv/core";
import { apiFetch, transformApiUrl } from "../platform";

/** Everything a screen needs, whether it comes from a panel or the demo data. */
export interface DataSource {
  readonly mode: "xtream" | "demo";
  account(): Promise<AccountInfo | null>;
  liveCatalog(): Promise<ChannelCategory[]>;
  shortEpg(channel: ChannelStream): Promise<EpgEntry[]>;
  vodCategories(): Promise<MediaCategory[]>;
  movies(): Promise<VodItem[]>;
  movieDetails(item: VodItem): Promise<VodDetails>;
  movieUrl(item: VodItem, details?: VodDetails): string;
  seriesCategories(): Promise<MediaCategory[]>;
  series(): Promise<SeriesItem[]>;
  seriesDetails(item: SeriesItem): Promise<SeriesDetails>;
  episodeUrl(episode: Episode): string;
}

const EPG_TTL_MS = 5 * 60 * 1000;

/** Memoises a promise; a rejection is dropped so the next call retries. */
function memo<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | null = null;
  return () => {
    if (!pending) {
      pending = fn().catch((error) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}

function keyedMemo<K, T>(fn: (key: K) => Promise<T>, ttl = Infinity) {
  const cache = new Map<K, { at: number; value: Promise<T> }>();
  return (key: K) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = fn(key).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { at: Date.now(), value });
    // Bound memory on huge panels: drop the oldest entries.
    if (cache.size > 500) cache.delete(cache.keys().next().value as K);
    return value;
  };
}

export function createXtreamSource(credentials: XtreamCredentials, liveFormat: LiveFormat): DataSource {
  const client = new XtreamClient(credentials, { fetch: apiFetch, transformUrl: transformApiUrl });
  const epg = keyedMemo((id: number) => client.getShortEpg(id, 8), EPG_TTL_MS);
  const movieInfo = keyedMemo((id: number) => client.getVodDetails(id));
  const seriesInfo = keyedMemo((id: number) => client.getSeriesDetails(id));
  return {
    mode: "xtream",
    account: memo(() => client.getAccount()),
    liveCatalog: memo(() => client.getLiveCatalog(liveFormat)),
    shortEpg: (channel) => epg(channel.id),
    vodCategories: memo(() => client.getVodCategories()),
    movies: memo(() => client.getVodStreams()),
    movieDetails: (item) => movieInfo(item.id),
    movieUrl: (item, details) => client.movieUrl(item.id, details?.extension ?? item.extension),
    seriesCategories: memo(() => client.getSeriesCategories()),
    series: memo(() => client.getSeries()),
    seriesDetails: (item) => seriesInfo(item.id),
    episodeUrl: (episode) => client.episodeUrl(episode.id, episode.extension),
  };
}

const delay = <T,>(value: T, ms = 250) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export function createDemoSource(): DataSource {
  const movies = buildDemoMovies();
  const series = buildDemoSeries();
  return {
    mode: "demo",
    account: () => Promise.resolve(null),
    liveCatalog: memo(() => delay(buildDemoCatalog())),
    shortEpg: (channel) => delay(demoEpg(channel.id), 150),
    vodCategories: () => Promise.resolve(DEMO_VOD_CATEGORIES),
    movies: () => delay(movies),
    movieDetails: (item) => delay(demoVodDetails(item), 150),
    movieUrl: (item) => demoMovieUrl(item.id),
    seriesCategories: () => Promise.resolve(DEMO_SERIES_CATEGORIES),
    series: () => delay(series),
    seriesDetails: (item) => delay(demoSeriesDetails(item), 150),
    episodeUrl: (episode) => demoMovieUrl(episode.id),
  };
}
