import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const PASS_THROUGH_HEADERS = new Set([
  "range",
  "if-none-match",
  "if-modified-since",
  "accept",
  "accept-encoding",
  "accept-language",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-dest",
]);
const PLAYLIST_CONTENT_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "application/mpegurl",
  "audio/mpegurl",
];
const SKIPPED_PROXY_HEADERS = new Set([
  "content-security-policy",
  "content-length",
  "transfer-encoding",
]);
const PROXY_PATH = "/api/proxy/stream";
const SESSION_COOKIE = process.env.XTREAM_SESSION_COOKIE ?? null;

const isPlaylistContentType = (contentType?: string | null) =>
  contentType
    ? PLAYLIST_CONTENT_TYPES.some((type) =>
        contentType.toLowerCase().includes(type)
      )
    : false;

const buildProxiedUrl = (resource: string, baseUrl: URL): string | null => {
  if (!resource) return null;
  try {
    const absolute = new URL(resource, baseUrl);
    if (absolute.pathname.startsWith(PROXY_PATH)) return resource;
    const params = new URLSearchParams({
      url: absolute.toString(),
      referer: baseUrl.toString(),
    });
    return `${PROXY_PATH}?${params.toString()}`;
  } catch {
    return null;
  }
};

const rewritePlaylist = (body: string, baseUrl: URL) => {
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  return body
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      let rewrittenLine = line.replace(
        /URI=(['"])(.+?)\1/gi,
        (match, quote, value) => {
          const proxied = buildProxiedUrl(value, baseUrl);
          return proxied ? `URI=${quote}${proxied}${quote}` : match;
        }
      );
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return rewrittenLine;
      const proxied = buildProxiedUrl(trimmed, baseUrl);
      return proxied ? rewrittenLine.replace(trimmed, proxied) : rewrittenLine;
    })
    .join(newline);
};

const applyCors = <T extends Response | NextResponse>(response: T): T => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Range, Accept, Origin, Referer, User-Agent, Cache-Control, Pragma, X-Requested-With",
    "Access-Control-Expose-Headers":
      "Accept-Ranges, Content-Length, Content-Range, X-Proxy-Debug, X-Proxy-Environment",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Max-Age": "86400",
  };
  Object.entries(corsHeaders).forEach(([key, value]) =>
    response.headers.set(key, value)
  );
  return response;
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const streamUrl = searchParams.get("url");
  const refererParam = searchParams.get("referer");
  const debugEnabled =
    searchParams.get("debug") === "1" ||
    searchParams.get("debug") === "true" ||
    searchParams.has("debug");
  const shouldLog = debugEnabled || process.env.NODE_ENV === "production";

  if (!streamUrl) {
    return applyCors(
      NextResponse.json({ error: "Stream URL is required" }, { status: 400 })
    );
  }

  try {
    const decodedUrl = decodeURIComponent(streamUrl);
    const targetUrl = new URL(decodedUrl);

    // Referer belirleme
    let refererHeader =
      refererParam?.trim() || targetUrl.searchParams.get("referer");
    if (refererHeader) {
      try {
        refererHeader = new URL(refererHeader, targetUrl).toString();
      } catch {
        refererHeader = refererParam ?? targetUrl.origin;
      }
    }

    const upstreamHeaders = new Headers({
      "User-Agent": process.env.XTREAM_USER_AGENT ?? DEFAULT_USER_AGENT,
      Accept: request.headers.get("accept") ?? "*/*",
      "Accept-Language":
        request.headers.get("accept-language") ?? "tr,en-US;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: refererHeader || `${targetUrl.origin}/`,
      Origin: targetUrl.origin,
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-fetch-dest": "video",
    });

    // Pass-through headers
    PASS_THROUGH_HEADERS.forEach((header) => {
      const value = request.headers.get(header);
      if (value && !upstreamHeaders.has(header))
        upstreamHeaders.set(header, value);
    });

    // Forward headers
    [
      "x-forwarded-for",
      "x-real-ip",
      "true-client-ip",
      "cf-connecting-ip",
      "forwarded",
    ].forEach((header) => {
      const value = request.headers.get(header);
      if (value)
        upstreamHeaders.set(
          header
            .replace("x-", "X-")
            .replace("cf-", "CF-")
            .replace("true-", "True-"),
          value
        );
    });

    if (SESSION_COOKIE && !upstreamHeaders.has("cookie")) {
      upstreamHeaders.set("Cookie", SESSION_COOKIE);
    }

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "follow",
      signal: request.signal,
      cache: "no-store",
    };
    let retryStage = "initial";
    let upstreamResponse = await fetch(targetUrl, fetchOptions);

    // Retry logic
    if (upstreamResponse.status === 403) {
      upstreamHeaders.delete("Referer");
      retryStage = "no-referer";
      upstreamResponse = await fetch(targetUrl, fetchOptions);
    } else if (upstreamResponse.status === 404) {
      upstreamHeaders.set("Referer", `${targetUrl.origin}/`);
      retryStage = "origin-referer";
      upstreamResponse = await fetch(targetUrl, fetchOptions);
    }

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const detail = await upstreamResponse.text().catch(() => undefined);
      const errorResponse = NextResponse.json(
        {
          error: "Stream not available",
          status: upstreamResponse.status,
          message: `Upstream server returned ${upstreamResponse.status}: ${upstreamResponse.statusText}`,
          ...(shouldLog && {
            debug: {
              url: targetUrl.toString(),
              status: upstreamResponse.status,
              retryStage,
              detail: detail?.slice(0, 200),
            },
          }),
        },
        { status: upstreamResponse.status || 502 }
      );

      if (shouldLog) {
        const debugHeaders = {
          "X-Proxy-Debug": "1",
          "X-Proxy-Referer": refererHeader ?? `${targetUrl.origin}/`,
          "X-Proxy-Origin": targetUrl.origin,
          "X-Proxy-Sent-Cookie": upstreamHeaders.has("Cookie") ? "yes" : "no",
          "X-Proxy-Retry": retryStage,
          "X-Proxy-Upstream-Status": String(upstreamResponse.status),
          "X-Proxy-Target-Host": targetUrl.host,
          "X-Proxy-Environment": process.env.NODE_ENV || "unknown",
        };
        Object.entries(debugHeaders).forEach(([key, value]) =>
          errorResponse.headers.set(key, value)
        );
      }

      return applyCors(errorResponse);
    }

    const contentType = upstreamResponse.headers.get("content-type");
    const responseHeaders = new Headers();

    // Copy headers
    upstreamResponse.headers.forEach((value, key) => {
      if (!SKIPPED_PROXY_HEADERS.has(key.toLowerCase()))
        responseHeaders.set(key, value);
    });

    // Set response headers
    Object.entries({
      "Content-Type": contentType ?? "application/octet-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    }).forEach(([key, value]) => responseHeaders.set(key, value));

    const isPlaylistByExt = targetUrl.pathname.toLowerCase().endsWith(".m3u8");

    // Debug headers
    if (debugEnabled) {
      const debugHeaders = {
        "X-Proxy-Debug": "1",
        "X-Proxy-Referer": refererHeader ?? `${targetUrl.origin}/`,
        "X-Proxy-Origin": targetUrl.origin,
        "X-Proxy-Sent-Cookie": upstreamHeaders.has("Cookie") ? "yes" : "no",
        "X-Proxy-Retry": retryStage,
        "X-Proxy-Upstream-Status": String(upstreamResponse.status),
        "X-Proxy-Is-Playlist":
          isPlaylistContentType(contentType) || isPlaylistByExt ? "1" : "0",
        "X-Proxy-Target-Host": targetUrl.host,
      };
      Object.entries(debugHeaders).forEach(([key, value]) =>
        responseHeaders.set(key, value)
      );
    }

    // Handle playlist content
    if (isPlaylistContentType(contentType) || isPlaylistByExt) {
      const text = await upstreamResponse.text();
      const rewritten = rewritePlaylist(text, targetUrl);
      responseHeaders.delete("content-length");
      return applyCors(
        new NextResponse(rewritten, {
          status: upstreamResponse.status,
          headers: responseHeaders,
        })
      );
    }

    return applyCors(
      new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    );
  } catch (error) {
    const errorResponse = NextResponse.json(
      {
        error: "Failed to fetch stream",
        message: error instanceof Error ? error.message : "Unknown error",
        ...(shouldLog && {
          debug: {
            error: error instanceof Error ? error.message : String(error),
            streamUrl: streamUrl?.substring(0, 100) + "...",
          },
        }),
      },
      { status: 500 }
    );

    if (shouldLog) {
      errorResponse.headers.set("X-Proxy-Debug", "1");
      errorResponse.headers.set(
        "X-Proxy-Environment",
        process.env.NODE_ENV || "unknown"
      );
    }

    return applyCors(errorResponse);
  }
}

export async function OPTIONS() {
  return applyCors(new NextResponse(null, { status: 200 }));
}
