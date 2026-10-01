import "server-only";
import type {
  ChannelCategory,
  ChannelStream,
  XtreamCategory,
  XtreamStream,
} from "@/types/xtream";
import { normalizeXtreamApiBase } from "@/lib/normalizeApiBase";

export class XtreamApiError extends Error {
  status: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "XtreamApiError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, XtreamApiError.prototype);
  }
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const API_BASE = process.env.XTREAM_API_BASE;
const USERNAME = process.env.XTREAM_USERNAME;
const PASSWORD = process.env.XTREAM_PASSWORD;
const SESSION_COOKIE = process.env.XTREAM_SESSION_COOKIE;

const XTREAM_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "tr,en-US;q=0.9,en;q=0.8",
  "Cache-Control": "max-age=0",
  Connection: "keep-alive",
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": DEFAULT_USER_AGENT,
} as const;

interface IPTVCredentials {
  apiBase: string;
  username: string;
  password: string;
  sessionCookie?: string;
  userAgent?: string;
  streamReferer?: string;
}

const ensureCredentials = (credentials?: IPTVCredentials) => {
  if (credentials) {
    if (
      !credentials.username ||
      !credentials.password ||
      !credentials.apiBase
    ) {
      throw new Error(
        "IPTV servis bilgileri eksik. API Base URL, kullanıcı adı ve şifre gereklidir."
      );
    }
    return {
      ...credentials,
      apiBase: normalizeXtreamApiBase(credentials.apiBase),
    };
  }

  if (!API_BASE || !USERNAME || !PASSWORD) {
    throw new Error(
      "Xtream servis bilgileri eksik. Lutfen IPTV yapılandırmasını tamamlayın veya XTREAM_API_BASE, XTREAM_USERNAME ve XTREAM_PASSWORD environment degiskenlerini tanimlayin."
    );
  }

  return {
    apiBase: normalizeXtreamApiBase(API_BASE),
    username: USERNAME,
    password: PASSWORD,
    sessionCookie: SESSION_COOKIE,
  };
};

const buildXtreamUrl = (
  searchParams: Record<string, string | number>,
  credentials?: IPTVCredentials
) => {
  const creds = ensureCredentials(credentials);
  const url = new URL(creds.apiBase);
  const params = new URLSearchParams({
    username: creds.username,
    password: creds.password,
    ...Object.fromEntries(
      Object.entries(searchParams).map(([key, value]) => [key, String(value)])
    ),
  });
  url.search = params.toString();
  return url;
};

const xtreamRequest = async <T>(
  params: Record<string, string | number>,
  credentials?: IPTVCredentials
): Promise<T> => {
  const url = buildXtreamUrl(params, credentials);
  const creds = ensureCredentials(credentials);

  try {
    const headers = {
      ...XTREAM_HEADERS,
      ...(creds.userAgent ? { "User-Agent": creds.userAgent } : {}),
      ...(creds.sessionCookie ? { Cookie: creds.sessionCookie } : {}),
    };

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers,
    });
    const rawBody = await response.text();

    if (!response.ok) {
      throw new XtreamApiError(
        `Xtream API istegi basarisiz oldu (${response.status})`,
        response.status,
        rawBody.slice(0, 500)
      );
    }

    try {
      return JSON.parse(rawBody) as T;
    } catch {
      throw new XtreamApiError(
        "Xtream API beklenmedik bir yanit dondurdu.",
        502,
        rawBody.slice(0, 500)
      );
    }
  } catch (error) {
    if (error instanceof XtreamApiError) throw error;
    const message =
      error instanceof Error
        ? `Xtream API cagrisinda baglanti kurulamadi: ${error.message}`
        : "Xtream API cagrisinda baglanti kurulamadi.";
    throw new XtreamApiError(message, 503);
  }
};

const normaliseStreams = (
  streams: XtreamStream[],
  credentials?: IPTVCredentials
): ChannelStream[] => {
  const creds = ensureCredentials(credentials);
  const baseUrl = new URL(creds.apiBase);
  const origin = `${baseUrl.protocol}//${baseUrl.host}`;

  return streams
    .map((stream) => {
      const streamType = stream.stream_type?.toLowerCase() ?? "live";
      const extension = streamType === "live" ? "m3u8" : "mp4";
      const folder = streamType === "live" ? "live" : "movie";
      const streamUrl = `${origin}/${folder}/${creds.username}/${creds.password}/${stream.stream_id}.${extension}`;

      return {
        id: stream.stream_id,
        name: stream.name,
        streamType,
        streamIcon: stream.stream_icon ?? null,
        added: stream.added,
        streamUrl,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
};

export async function getCategoriesWithStreams(
  credentials?: IPTVCredentials
): Promise<ChannelCategory[]> {
  ensureCredentials(credentials);
  // One get_live_streams call (no category_id) instead of one per category.
  const [categories, streams] = await Promise.all([
    xtreamRequest<XtreamCategory[]>({ action: "get_live_categories" }, credentials),
    xtreamRequest<XtreamStream[]>({ action: "get_live_streams" }, credentials),
  ]);

  // Bad credentials: panels answer 200 with {user_info:{auth:0}} instead of a list.
  if (!Array.isArray(categories) || !Array.isArray(streams)) {
    throw new XtreamApiError("Xtream API kimlik dogrulamasi basarisiz.", 401);
  }

  const byCategory = Map.groupBy(streams, (stream) => String(stream.category_id));

  return categories
    .map((category, index) => ({
      id: String(category.category_id),
      name: category.category_name,
      parentId: String(category.parent_id ?? "0"),
      order: Number.parseInt(category.category_id, 10) || index,
      streams: normaliseStreams(
        byCategory.get(String(category.category_id)) ?? [],
        credentials
      ),
    }))
    .filter((category) => category.streams.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }));
}

export type { ChannelCategory, ChannelStream };
