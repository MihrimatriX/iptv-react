import "server-only";
import { XtreamClient, XtreamError, type ChannelCategory, type ChannelStream } from "@iptv/core";

// Kept under the old name for the route handlers.
export { XtreamError as XtreamApiError };

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

const resolveCredentials = (credentials?: IPTVCredentials): IPTVCredentials => {
  if (credentials) {
    if (!credentials.username || !credentials.password || !credentials.apiBase) {
      throw new XtreamError(
        "IPTV servis bilgileri eksik. API Base URL, kullanıcı adı ve şifre gereklidir.",
        400
      );
    }
    return credentials;
  }

  if (!API_BASE || !USERNAME || !PASSWORD) {
    throw new XtreamError(
      "Xtream servis bilgileri eksik. Lutfen IPTV yapılandırmasını tamamlayın veya XTREAM_API_BASE, XTREAM_USERNAME ve XTREAM_PASSWORD environment degiskenlerini tanimlayin.",
      400
    );
  }

  return { apiBase: API_BASE, username: USERNAME, password: PASSWORD, sessionCookie: SESSION_COOKIE };
};

/** Server-side client: browser-like headers, optional session cookie, no fetch cache. */
export function createServerClient(credentials?: IPTVCredentials): XtreamClient {
  const creds = resolveCredentials(credentials);
  return new XtreamClient(creds, {
    init: { cache: "no-store" },
    headers: {
      ...XTREAM_HEADERS,
      ...(creds.userAgent ? { "User-Agent": creds.userAgent } : {}),
      ...(creds.sessionCookie ? { Cookie: creds.sessionCookie } : {}),
    },
  });
}

export async function getCategoriesWithStreams(
  credentials?: IPTVCredentials
): Promise<ChannelCategory[]> {
  return createServerClient(credentials).getLiveCatalog();
}

export type { ChannelCategory, ChannelStream };
