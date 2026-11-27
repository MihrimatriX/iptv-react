// Raw Xtream Codes player_api.php shapes. Panels differ a lot, so almost
// everything is optional and numbers often arrive as strings.

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: string | number;
  direct_source?: string;
}

export interface XtreamStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string | null;
  category_id: string;
  custom_sid?: string;
  tv_archive?: number;
  tv_archive_duration?: number | string;
  added?: string;
}

export interface XtreamVodStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: number;
  stream_icon?: string;
  rating?: string | number;
  rating_5based?: number | string;
  added?: string;
  category_id: string;
  container_extension?: string;
}

export interface XtreamSeries {
  num?: number;
  name: string;
  series_id: number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  release_date?: string;
  last_modified?: string;
  rating?: string | number;
  rating_5based?: number | string;
  backdrop_path?: string[] | string;
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id: string;
}

export interface XtreamVodInfo {
  info?:
    | {
        name?: string;
        o_name?: string;
        movie_image?: string;
        cover_big?: string;
        backdrop_path?: string[] | string;
        plot?: string;
        description?: string;
        cast?: string;
        actors?: string;
        director?: string;
        genre?: string;
        releasedate?: string;
        release_date?: string;
        duration?: string;
        duration_secs?: number | string;
        rating?: string | number;
        youtube_trailer?: string;
      }
    | []; // some panels send [] when there is no metadata
  movie_data?: {
    stream_id: number;
    name: string;
    added?: string;
    category_id?: string;
    container_extension?: string;
  };
}

export interface XtreamEpisode {
  id: string | number;
  episode_num: number | string;
  title?: string;
  container_extension?: string;
  season?: number | string;
  added?: string;
  info?:
    | {
        duration?: string;
        duration_secs?: number | string;
        plot?: string;
        movie_image?: string;
        rating?: string | number;
        releasedate?: string;
      }
    | [];
}

export interface XtreamSeriesInfo {
  seasons?: Array<{
    season_number: number | string;
    name?: string;
    episode_count?: number | string;
    cover?: string;
    air_date?: string;
  }>;
  info?: Partial<XtreamSeries> & { name?: string };
  // Keyed by season number on most panels, a flat array on a few.
  episodes?: Record<string, XtreamEpisode[]> | XtreamEpisode[];
}

export interface XtreamEpgListing {
  id?: string;
  epg_id?: string;
  title: string; // base64
  description?: string; // base64
  lang?: string;
  start?: string;
  end?: string;
  start_timestamp?: string | number;
  stop_timestamp?: string | number;
  now_playing?: number;
  has_archive?: number;
}

export interface XtreamAccount {
  user_info?: {
    username?: string;
    auth?: number;
    status?: string;
    exp_date?: string | null;
    is_trial?: string;
    active_cons?: string | number;
    max_connections?: string | number;
    allowed_output_formats?: string[];
  };
  server_info?: {
    url?: string;
    port?: string;
    https_port?: string;
    server_protocol?: string;
    timezone?: string;
    timestamp_now?: number;
  };
}

// ---- Normalised shapes the apps work with ----

export interface ChannelStream {
  id: number;
  name: string;
  streamType: string;
  streamIcon: string | null;
  streamUrl: string;
  added?: string;
  /** Channel number from the panel, when it sends one. */
  num?: number;
  epgChannelId?: string | null;
  hasArchive?: boolean;
}

export interface ChannelCategory {
  id: string;
  name: string;
  order: number;
  parentId: string;
  streams: ChannelStream[];
}

export interface MediaCategory {
  id: string;
  name: string;
}

export interface VodItem {
  kind: "movie";
  id: number;
  name: string;
  categoryId: string;
  poster: string | null;
  rating: number | null;
  added?: string;
  extension: string;
}

export interface SeriesItem {
  kind: "series";
  id: number;
  name: string;
  categoryId: string;
  poster: string | null;
  rating: number | null;
  plot?: string;
  genre?: string;
  releaseDate?: string;
}

export interface MediaDetails {
  title: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  /** Seconds. */
  duration?: number;
  rating: number | null;
  poster: string | null;
  backdrop: string | null;
  trailer?: string;
}

export interface VodDetails extends MediaDetails {
  id: number;
  extension: string;
}

export interface Episode {
  id: number;
  title: string;
  season: number;
  episode: number;
  extension: string;
  plot?: string;
  duration?: number;
  still: string | null;
}

export interface Season {
  number: number;
  name: string;
  cover: string | null;
  episodes: Episode[];
}

export interface SeriesDetails extends MediaDetails {
  id: number;
  seasons: Season[];
}

export interface EpgEntry {
  id: string;
  title: string;
  description: string;
  /** Epoch milliseconds. */
  start: number;
  end: number;
}

export interface AccountInfo {
  username: string;
  status: string;
  /** Epoch milliseconds, null for unlimited. */
  expiresAt: number | null;
  isTrial: boolean;
  activeConnections: number | null;
  maxConnections: number | null;
  outputFormats: string[];
  serverTimezone?: string;
}
