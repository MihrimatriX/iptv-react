import { normalizeXtreamApiBase } from "./normalizeApiBase.ts";
import { normaliseEpg } from "./epg.ts";
import type {
  AccountInfo,
  ChannelCategory,
  ChannelStream,
  EpgEntry,
  Episode,
  MediaCategory,
  Season,
  SeriesDetails,
  SeriesItem,
  VodDetails,
  VodItem,
  XtreamAccount,
  XtreamCategory,
  XtreamEpgListing,
  XtreamEpisode,
  XtreamSeries,
  XtreamSeriesInfo,
  XtreamStream,
  XtreamVodInfo,
  XtreamVodStream,
} from "./types.ts";

export class XtreamError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "XtreamError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface XtreamCredentials {
  apiBase: string;
  username: string;
  password: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface XtreamClientOptions {
  /** Defaults to globalThis.fetch. Tauri passes its CORS-free fetch here. */
  fetch?: FetchLike;
  headers?: Record<string, string>;
  /** Extra fetch options, e.g. { cache: "no-store" } on the server. */
  init?: RequestInit;
  /** Rewrites every API URL just before fetching (dev proxy in the browser). */
  transformUrl?: (url: string) => string;
  timeoutMs?: number;
}

export type LiveFormat = "m3u8" | "ts";

const str = (value: unknown) => (value == null ? "" : String(value)).trim();
const num = (value: unknown): number | null => {
  const parsed = Number.parseFloat(str(value));
  return Number.isFinite(parsed) ? parsed : null;
};
const firstImage = (value: unknown): string | null => {
  const image = Array.isArray(value) ? value.find(Boolean) : value;
  const url = str(image);
  return url && /^https?:\/\//i.test(url) ? url : null;
};
const byName = <T extends { name: string }>(a: T, b: T) =>
  a.name.localeCompare(b.name, "tr", { sensitivity: "base" });
const ext = (value: unknown, fallback: string) => str(value).replace(/^\./, "") || fallback;

/** Xtream "rating" is usually 0-10; rating_5based is the 5-star scale. */
const rating = (ten: unknown, five: unknown): number | null => {
  const tenBased = num(ten);
  if (tenBased != null && tenBased > 0) return Math.min(10, tenBased);
  const fiveBased = num(five);
  return fiveBased != null && fiveBased > 0 ? Math.min(10, fiveBased * 2) : null;
};

const seconds = (secs: unknown, hms: unknown): number | undefined => {
  const value = num(secs);
  if (value != null && value > 0) return value;
  const match = /^(\d+):(\d{2}):(\d{2})$/.exec(str(hms));
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : undefined;
};

export class XtreamClient {
  readonly credentials: XtreamCredentials;
  /** scheme://host:port of the panel; stream URLs hang off it. */
  readonly origin: string;
  private readonly options: XtreamClientOptions;

  constructor(credentials: XtreamCredentials, options: XtreamClientOptions = {}) {
    if (!credentials.apiBase || !credentials.username || !credentials.password) {
      throw new XtreamError(
        "IPTV servis bilgileri eksik. Sunucu adresi, kullanıcı adı ve şifre gereklidir.",
        400
      );
    }
    const apiBase = normalizeXtreamApiBase(credentials.apiBase);
    const url = new URL(apiBase);
    this.credentials = { ...credentials, apiBase };
    this.origin = `${url.protocol}//${url.host}`;
    this.options = options;
  }

  buildApiUrl(params: Record<string, string | number> = {}): string {
    const url = new URL(this.credentials.apiBase);
    const search = new URLSearchParams();
    search.set("username", this.credentials.username);
    search.set("password", this.credentials.password);
    for (const key of Object.keys(params)) search.set(key, String(params[key]));
    url.search = search.toString();
    return url.href;
  }

  async request<T>(params: Record<string, string | number> = {}): Promise<T> {
    const rawUrl = this.buildApiUrl(params);
    const url = this.options.transformUrl ? this.options.transformUrl(rawUrl) : rawUrl;
    const doFetch: FetchLike = this.options.fetch ?? ((input, init) => fetch(input, init));
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30_000)
      : null;

    let response: Response;
    try {
      response = await doFetch(url, {
        method: "GET",
        ...this.options.init,
        headers: { Accept: "application/json, text/plain, */*", ...this.options.headers },
        signal: controller?.signal,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new XtreamError(`Xtream API çağrısında bağlantı kurulamadı: ${reason}`, 503);
    } finally {
      if (timer) clearTimeout(timer);
    }

    const body = await response.text();
    if (!response.ok) {
      throw new XtreamError(
        `Xtream API isteği başarısız oldu (${response.status})`,
        response.status,
        body.slice(0, 500)
      );
    }
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new XtreamError("Xtream API beklenmedik bir yanıt döndürdü.", 502, body.slice(0, 500));
    }
  }

  /** Lists come back as `{user_info:{auth:0}}` instead of [] on bad credentials. */
  private async list<T>(params: Record<string, string | number>): Promise<T[]> {
    const data = await this.request<unknown>(params);
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === "object" && "user_info" in data) {
      throw new XtreamError("Xtream API kimlik doğrulaması başarısız.", 401);
    }
    return []; // e.g. null for an empty category
  }

  // ---- Account ----

  async getAccount(): Promise<AccountInfo> {
    const data = await this.request<XtreamAccount>();
    const user = data?.user_info;
    if (!user || Number(user.auth) !== 1) {
      throw new XtreamError("Kullanıcı adı veya şifre hatalı.", 401);
    }
    const expires = num(user.exp_date);
    return {
      username: str(user.username) || this.credentials.username,
      status: str(user.status) || "Active",
      expiresAt: expires ? expires * 1000 : null,
      isTrial: str(user.is_trial) === "1",
      activeConnections: num(user.active_cons),
      maxConnections: num(user.max_connections),
      outputFormats: Array.isArray(user.allowed_output_formats) ? user.allowed_output_formats : [],
      serverTimezone: data.server_info?.timezone,
    };
  }

  // ---- Stream URLs ----

  liveUrl(streamId: number, format: LiveFormat = "m3u8"): string {
    const { username, password } = this.credentials;
    return `${this.origin}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${format}`;
  }

  movieUrl(streamId: number, extension = "mp4"): string {
    const { username, password } = this.credentials;
    return `${this.origin}/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.${extension}`;
  }

  episodeUrl(episodeId: number, extension = "mp4"): string {
    const { username, password } = this.credentials;
    return `${this.origin}/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${episodeId}.${extension}`;
  }

  // ---- Live ----

  async getLiveCategories(): Promise<MediaCategory[]> {
    const categories = await this.list<XtreamCategory>({ action: "get_live_categories" });
    return categories.map((c) => ({ id: str(c.category_id), name: str(c.category_name) }));
  }

  async getLiveStreams(categoryId?: string, format: LiveFormat = "m3u8"): Promise<ChannelStream[]> {
    const streams = await this.list<XtreamStream>(
      categoryId ? { action: "get_live_streams", category_id: categoryId } : { action: "get_live_streams" }
    );
    return streams.map((stream) => this.toChannel(stream, format));
  }

  toChannel(stream: XtreamStream, format: LiveFormat = "m3u8"): ChannelStream {
    const streamType = stream.stream_type?.toLowerCase() || "live";
    const streamUrl =
      streamType === "live" ? this.liveUrl(stream.stream_id, format) : this.movieUrl(stream.stream_id);
    const channelNumber = num(stream.num);
    return {
      id: stream.stream_id,
      name: str(stream.name),
      streamType,
      streamIcon: firstImage(stream.stream_icon),
      added: stream.added,
      streamUrl,
      num: channelNumber ?? undefined,
      epgChannelId: stream.epg_channel_id || null,
      hasArchive: Number(stream.tv_archive) === 1,
    };
  }

  /**
   * Live categories with their channels, from one get_live_streams call
   * (no category_id) instead of one call per category.
   */
  async getLiveCatalog(format: LiveFormat = "m3u8"): Promise<ChannelCategory[]> {
    const [categories, streams] = await Promise.all([
      this.list<XtreamCategory>({ action: "get_live_categories" }),
      this.list<XtreamStream>({ action: "get_live_streams" }),
    ]);

    const byCategory = new Map<string, XtreamStream[]>();
    for (const stream of streams) {
      const key = String(stream.category_id);
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(stream);
      else byCategory.set(key, [stream]);
    }

    return categories
      .map((category, index) => ({
        id: String(category.category_id),
        name: str(category.category_name),
        parentId: String(category.parent_id ?? "0"),
        order: Number.parseInt(category.category_id, 10) || index,
        streams: (byCategory.get(String(category.category_id)) ?? [])
          .map((stream) => this.toChannel(stream, format))
          .sort(byName),
      }))
      .filter((category) => category.streams.length > 0)
      .sort(byName);
  }

  // ---- EPG ----

  /** Current and next few programmes. Cheap; use it for lists and overlays. */
  async getShortEpg(streamId: number, limit = 6): Promise<EpgEntry[]> {
    const data = await this.request<{ epg_listings?: XtreamEpgListing[] }>({
      action: "get_short_epg",
      stream_id: streamId,
      limit,
    });
    return normaliseEpg(data?.epg_listings);
  }

  /** The panel's full schedule for one channel (often several days). */
  async getFullEpg(streamId: number): Promise<EpgEntry[]> {
    const data = await this.request<{ epg_listings?: XtreamEpgListing[] }>({
      action: "get_simple_data_table",
      stream_id: streamId,
    });
    return normaliseEpg(data?.epg_listings);
  }

  // ---- Movies ----

  async getVodCategories(): Promise<MediaCategory[]> {
    const categories = await this.list<XtreamCategory>({ action: "get_vod_categories" });
    return categories.map((c) => ({ id: str(c.category_id), name: str(c.category_name) }));
  }

  async getVodStreams(categoryId?: string): Promise<VodItem[]> {
    const items = await this.list<XtreamVodStream>(
      categoryId ? { action: "get_vod_streams", category_id: categoryId } : { action: "get_vod_streams" }
    );
    return items.map((item) => ({
      kind: "movie" as const,
      id: Number(item.stream_id),
      name: str(item.name),
      categoryId: str(item.category_id),
      poster: firstImage(item.stream_icon),
      rating: rating(item.rating, item.rating_5based),
      added: item.added,
      extension: ext(item.container_extension, "mp4"),
    }));
  }

  async getVodDetails(vodId: number): Promise<VodDetails> {
    const data = await this.request<XtreamVodInfo>({ action: "get_vod_info", vod_id: vodId });
    const info = data?.info && !Array.isArray(data.info) ? data.info : {};
    const movie = data?.movie_data;
    return {
      id: vodId,
      title: str(info.name) || str(movie?.name) || str(info.o_name),
      plot: str(info.plot) || str(info.description) || undefined,
      cast: str(info.cast) || str(info.actors) || undefined,
      director: str(info.director) || undefined,
      genre: str(info.genre) || undefined,
      releaseDate: str(info.releasedate) || str(info.release_date) || undefined,
      duration: seconds(info.duration_secs, info.duration),
      rating: rating(info.rating, undefined),
      poster: firstImage(info.movie_image) ?? firstImage(info.cover_big),
      backdrop: firstImage(info.backdrop_path),
      trailer: str(info.youtube_trailer) || undefined,
      extension: ext(movie?.container_extension, "mp4"),
    };
  }

  // ---- Series ----

  async getSeriesCategories(): Promise<MediaCategory[]> {
    const categories = await this.list<XtreamCategory>({ action: "get_series_categories" });
    return categories.map((c) => ({ id: str(c.category_id), name: str(c.category_name) }));
  }

  async getSeries(categoryId?: string): Promise<SeriesItem[]> {
    const items = await this.list<XtreamSeries>(
      categoryId ? { action: "get_series", category_id: categoryId } : { action: "get_series" }
    );
    return items.map((item) => ({
      kind: "series" as const,
      id: Number(item.series_id),
      name: str(item.name),
      categoryId: str(item.category_id),
      poster: firstImage(item.cover),
      rating: rating(item.rating, item.rating_5based),
      plot: str(item.plot) || undefined,
      genre: str(item.genre) || undefined,
      releaseDate: str(item.releaseDate) || str(item.release_date) || undefined,
    }));
  }

  async getSeriesDetails(seriesId: number): Promise<SeriesDetails> {
    const data = await this.request<XtreamSeriesInfo>({ action: "get_series_info", series_id: seriesId });
    const info = data?.info ?? {};

    const rawEpisodes: XtreamEpisode[] = Array.isArray(data?.episodes)
      ? data.episodes
      : Object.keys(data?.episodes ?? {}).reduce<XtreamEpisode[]>((all, key) => {
          const list = (data.episodes as Record<string, XtreamEpisode[]>)[key] ?? [];
          return all.concat(list.map((episode) => ({ season: episode.season ?? key, ...episode })));
        }, []);

    const seasons = new Map<number, Season>();
    for (const meta of data?.seasons ?? []) {
      const number = num(meta.season_number) ?? 0;
      seasons.set(number, {
        number,
        name: str(meta.name) || `${number}. Sezon`,
        cover: firstImage(meta.cover),
        episodes: [],
      });
    }
    for (const raw of rawEpisodes) {
      const epInfo = raw.info && !Array.isArray(raw.info) ? raw.info : {};
      const season = num(raw.season) ?? 1;
      const episode: Episode = {
        id: Number(raw.id),
        title: str(raw.title),
        season,
        episode: num(raw.episode_num) ?? 0,
        extension: ext(raw.container_extension, "mp4"),
        plot: str(epInfo.plot) || undefined,
        duration: seconds(epInfo.duration_secs, epInfo.duration),
        still: firstImage(epInfo.movie_image),
      };
      if (!seasons.has(season)) {
        seasons.set(season, { number: season, name: `${season}. Sezon`, cover: null, episodes: [] });
      }
      seasons.get(season)!.episodes.push(episode);
    }

    const seasonList = Array.from(seasons.values())
      .filter((season) => season.episodes.length > 0)
      .sort((a, b) => a.number - b.number);
    for (const season of seasonList) season.episodes.sort((a, b) => a.episode - b.episode);

    return {
      id: seriesId,
      title: str(info.name),
      plot: str(info.plot) || undefined,
      cast: str(info.cast) || undefined,
      director: str(info.director) || undefined,
      genre: str(info.genre) || undefined,
      releaseDate: str(info.releaseDate) || str(info.release_date) || undefined,
      duration: undefined,
      rating: rating(info.rating, info.rating_5based),
      poster: firstImage(info.cover),
      backdrop: firstImage(info.backdrop_path),
      trailer: str(info.youtube_trailer) || undefined,
      seasons: seasonList,
    };
  }
}
