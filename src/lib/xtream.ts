import "server-only";
import type {
  ChannelCategory,
  ChannelStream,
  XtreamCategory,
  XtreamStream,
} from "@/types/xtream";

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

const DEFAULT_API_BASE = "http://tgrpro25.xyz:8080/player_api.php";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const API_BASE = process.env.XTREAM_API_BASE ?? DEFAULT_API_BASE;
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
    return credentials;
  }

  if (!USERNAME || !PASSWORD) {
    throw new Error(
      "Xtream servis bilgileri eksik. Lutfen IPTV yapılandırmasını tamamlayın veya XTREAM_USERNAME ve XTREAM_PASSWORD environment degiskenlerini tanimlayin."
    );
  }

  return {
    apiBase: API_BASE,
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
      const originalStreamUrl = `${origin}/${folder}/${creds.username}/${creds.password}/${stream.stream_id}.${extension}`;

      const useDirectStreaming =
        process.env.USE_DIRECT_STREAMING === "true" || false;
      let proxyUrl: string;

      if (useDirectStreaming) {
        proxyUrl = originalStreamUrl;
      } else {
        const proxyBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(
          /\/$/,
          ""
        );
        const streamRefererRaw =
          creds.streamReferer?.trim() ??
          process.env.XTREAM_STREAM_REFERER?.trim() ??
          originalStreamUrl;
        let resolvedStreamReferer: string | null = streamRefererRaw;

        if (resolvedStreamReferer) {
          try {
            resolvedStreamReferer = new URL(resolvedStreamReferer).toString();
          } catch {
            resolvedStreamReferer = originalStreamUrl;
          }
        }

        const proxyParams = new URLSearchParams({ url: originalStreamUrl });
        if (resolvedStreamReferer)
          proxyParams.set("referer", resolvedStreamReferer);
        if (process.env.NODE_ENV !== "production")
          proxyParams.set("debug", "1");

        const proxyPath = `/api/proxy/stream?${proxyParams.toString()}`;
        proxyUrl = proxyBaseUrl ? `${proxyBaseUrl}${proxyPath}` : proxyPath;
      }

      return {
        id: stream.stream_id,
        name: stream.name,
        streamType,
        streamIcon: stream.stream_icon ?? null,
        added: stream.added,
        streamUrl: proxyUrl,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
    );
};

const getLiveCategories = (
  credentials?: IPTVCredentials
): Promise<XtreamCategory[]> =>
  xtreamRequest<XtreamCategory[]>(
    { action: "get_live_categories" },
    credentials
  );

const getLiveStreamsByCategory = (
  categoryId: string,
  credentials?: IPTVCredentials
): Promise<XtreamStream[]> =>
  xtreamRequest<XtreamStream[]>(
    { action: "get_live_streams", category_id: categoryId },
    credentials
  );

export async function getCategoriesWithStreams(
  credentials?: IPTVCredentials
): Promise<ChannelCategory[]> {
  ensureCredentials(credentials);
  const categories = await getLiveCategories(credentials);
  const categoriesWithStreams: ChannelCategory[] = [];

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    try {
      const streams = await getLiveStreamsByCategory(
        category.category_id,
        credentials
      );
      const normalisedCategory: ChannelCategory = {
        id: category.category_id,
        name: category.category_name,
        parentId: category.parent_id,
        order: Number.parseInt(category.category_id, 10) || index,
        streams: normaliseStreams(streams, credentials),
      };

      if (normalisedCategory.streams.length > 0) {
        categoriesWithStreams.push(normalisedCategory);
      }
    } catch {}
  }

  return categoriesWithStreams.sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
  );
}

export type { ChannelCategory, ChannelStream };
