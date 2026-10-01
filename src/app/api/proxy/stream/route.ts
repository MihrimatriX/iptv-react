import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

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
  // fetch() already decompressed the body; forwarding this makes the
  // browser try to gunzip plain text (ERR_CONTENT_DECODING_FAILED).
  "content-encoding",
  // Never leak upstream redirects to the browser — HLS would then
  // hit the CDN directly (CORS / 509) instead of staying on our proxy.
  "location",
  "content-location",
]);
const PROXY_PATH = "/api/proxy/stream";
const SESSION_COOKIE = process.env.XTREAM_SESSION_COOKIE ?? null;

// SSRF guard: the proxy takes arbitrary URLs, so never let it reach
// loopback / LAN / cloud-metadata addresses (also checked on every redirect hop).
const PRIVATE_NETS = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  PRIVATE_NETS.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  PRIVATE_NETS.addSubnet(net, prefix, "ipv6");
}

class BlockedTargetError extends Error {}

// ponytail: DNS is checked once per hop, so a rebinding host could still flip
// between lookup and connect. Pin the resolved IP in a custom agent if that matters.
const assertPublicUrl = async (url: URL) => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedTargetError(`Protocol not allowed: ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true });
  for (const { address, family } of addresses) {
    if (PRIVATE_NETS.check(address, family === 6 ? "ipv6" : "ipv4")) {
      throw new BlockedTargetError(`Private address not allowed: ${host}`);
    }
  }
};

const fetchPublic = async (url: URL, init: RequestInit) => {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    await assertPublicUrl(current);
    const response = await fetch(current, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      return response;
    }
    current = new URL(location, current);
  }
  throw new BlockedTargetError("Too many redirects");
};

const isPlaylistContentType = (contentType?: string | null) =>
  contentType
    ? PLAYLIST_CONTENT_TYPES.some((type) =>
        contentType.toLowerCase().includes(type)
      )
    : false;

const buildProxiedUrl = (
  resource: string,
  baseUrl: URL,
  requestOrigin: string,
  debug: boolean = false
): string | null => {
  if (!resource) return null;

  try {
    let absolute: URL;

    // Önce absolute URL olarak parse etmeyi dene
    try {
      absolute = new URL(resource);
      // Eğer absolute URL ise ve zaten proxy URL'i ise, olduğu gibi döndür
      if (absolute.pathname.startsWith(PROXY_PATH)) {
        if (debug) {
          console.log("[Proxy] Already proxied URL:", resource);
        }
        return resource;
      }
    } catch {
      // Absolute URL değilse, relative URL olarak base URL ile birleştir
      try {
        absolute = new URL(resource, baseUrl);
      } catch (error) {
        if (debug) {
          console.error("[Proxy] Failed to parse URL:", {
            resource,
            baseUrl: baseUrl.toString(),
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return null;
      }
    }

    // Eğer zaten proxy URL'i ise, olduğu gibi döndür
    if (absolute.pathname.startsWith(PROXY_PATH)) {
      if (debug) {
        console.log(
          "[Proxy] Already proxied URL (after parse):",
          absolute.toString()
        );
      }
      return resource;
    }

    // Segment URL'leri için referer olarak playlist URL'ini kullan
    // Çünkü segment URL'leri playlist'ten geliyor ve upstream server playlist URL'ini referer olarak bekliyor
    // Playlist URL'leri için de playlist URL'ini kullan
    const refererForProxy = baseUrl.toString();

    // URL'leri encode et (URLSearchParams çift encode yapmaması için manuel encode)
    const encodedUrl = encodeURIComponent(absolute.toString());
    const encodedReferer = encodeURIComponent(refererForProxy);

    // Absolute proxy URL oluştur
    const proxyPath = `${PROXY_PATH}?url=${encodedUrl}&referer=${encodedReferer}`;
    const proxyUrl = `${requestOrigin}${proxyPath}`;

    if (debug) {
      console.log("[Proxy] Rewriting URL:", {
        original: resource,
        absolute: absolute.toString(),
        proxied: proxyUrl,
        baseUrl: baseUrl.toString(),
        isAbsolute:
          resource.startsWith("http://") || resource.startsWith("https://"),
      });
    }

    return proxyUrl;
  } catch (error) {
    if (debug) {
      console.error("[Proxy] Failed to build proxied URL:", {
        resource,
        baseUrl: baseUrl.toString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
};

const rewritePlaylist = (
  body: string,
  baseUrl: URL,
  requestOrigin: string,
  debug: boolean = false
) => {
  const newline = body.includes("\r\n") ? "\r\n" : "\n";
  return body
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;

      // URI= parametrelerini yakala (EXT-X-KEY, EXT-X-MAP gibi)
      let rewrittenLine = line.replace(
        /URI=(['"])(.+?)\1/gi,
        (match, quote, value) => {
          const proxied = buildProxiedUrl(value, baseUrl, requestOrigin, debug);
          return proxied ? `URI=${quote}${proxied}${quote}` : match;
        }
      );

      const trimmed = line.trim();

      // Yorum satırları ve boş satırları atla
      if (!trimmed || trimmed.startsWith("#")) {
        return rewrittenLine;
      }

      // Segment URL'lerini proxy'le (yorum satırı olmayan, URI= içermeyen satırlar)
      // Bu genellikle direkt segment URL'leridir
      const proxied = buildProxiedUrl(trimmed, baseUrl, requestOrigin, debug);
      if (proxied && proxied !== trimmed) {
        return proxied;
      }

      return rewrittenLine;
    })
    .join(newline);
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

  // Request origin'ini al (localhost için doğru çalışması için)
  const requestOrigin = request.nextUrl.origin;

  if (!streamUrl) {
    return (
      NextResponse.json({ error: "Stream URL is required" }, { status: 400 })
    );
  }

  try {
    // URL'i decode et - encodeURIComponent ile encode edilmiş URL'leri decode et
    // Çift encode edilmiş URL'leri de handle et
    let decodedUrl: string = streamUrl;
    try {
      // Önce bir kez decode et
      decodedUrl = decodeURIComponent(streamUrl);
      // Eğer hala encode edilmiş görünüyorsa (örneğin %25 gibi), tekrar decode et
      if (decodedUrl.includes("%25")) {
        decodedUrl = decodeURIComponent(decodedUrl);
      }
    } catch {
      // Eğer decode edilemezse, zaten decode edilmiş demektir
      decodedUrl = streamUrl;
    }

    const targetUrl = new URL(decodedUrl);

    // Referer belirleme - localhost'tan gelen referer'ı kullanma
    // Segment URL'leri için referer olarak segment URL'in kendi path'ini kullan
    // Playlist URL'leri için refererParam'dan veya target URL'in origin'inden referer al
    let refererHeader: string | null = null;

    const isSegmentUrl = targetUrl.pathname.endsWith(".ts");

    if (isSegmentUrl) {
      // Segment URL'leri için referer olarak segment URL'in kendi path'ini kullan
      // Ama önce refererParam'dan playlist URL'ini kontrol et
      if (refererParam?.trim()) {
        try {
          const decodedReferer = decodeURIComponent(refererParam.trim());
          const refererUrl = new URL(decodedReferer);
          // Localhost referer'ları kabul etme
          if (
            !refererUrl.hostname.includes("localhost") &&
            !refererUrl.hostname.includes("127.0.0.1")
          ) {
            refererHeader = refererUrl.toString();
          }
        } catch {
          // Geçersiz referer, kullanma
        }
      }

      // Eğer referer yoksa, segment URL'in kendi path'ini kullan
      if (!refererHeader) {
        refererHeader = `${targetUrl.origin}${targetUrl.pathname}`;
      }
    } else {
      // Playlist URL'leri için refererParam'dan veya target URL'in origin'inden referer al
      if (refererParam?.trim()) {
        try {
          const decodedReferer = decodeURIComponent(refererParam.trim());
          const refererUrl = new URL(decodedReferer);
          // Localhost referer'ları kabul etme
          if (
            !refererUrl.hostname.includes("localhost") &&
            !refererUrl.hostname.includes("127.0.0.1")
          ) {
            refererHeader = refererUrl.toString();
          }
        } catch {
          // Geçersiz referer, kullanma
        }
      }

      // Eğer referer yoksa veya localhost ise, target URL'in origin'ini kullan
      if (!refererHeader) {
        refererHeader = `${targetUrl.origin}/`;
      }
    }

    const upstreamHeaders = new Headers({
      "User-Agent": process.env.XTREAM_USER_AGENT ?? DEFAULT_USER_AGENT,
      Accept: request.headers.get("accept") ?? "*/*",
      "Accept-Language":
        request.headers.get("accept-language") ?? "tr,en-US;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Referer: refererHeader,
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
      signal: request.signal,
      cache: "no-store",
    };

    if (debugEnabled) {
      console.log("[Proxy] Fetching upstream:", {
        url: targetUrl.toString(),
        referer: refererHeader || `${targetUrl.origin}/`,
        headers: Object.fromEntries(upstreamHeaders.entries()),
      });
    }

    let retryStage = "initial";
    let upstreamResponse = await fetchPublic(targetUrl, fetchOptions);

    if (debugEnabled) {
      console.log("[Proxy] Upstream response:", {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: Object.fromEntries(upstreamResponse.headers.entries()),
        url: targetUrl.toString(),
      });
    }

    // Retry logic — IPTV CDNs are picky about Referer on .ts segments
    if (upstreamResponse.status === 403 || upstreamResponse.status === 401) {
      const retries: Array<{ stage: string; referer: string | null }> = [
        { stage: "origin-referer", referer: `${targetUrl.origin}/` },
        { stage: "no-referer", referer: null },
      ];
      for (const attempt of retries) {
        if (upstreamResponse.ok) break;
        if (attempt.referer) {
          upstreamHeaders.set("Referer", attempt.referer);
        } else {
          upstreamHeaders.delete("Referer");
        }
        upstreamHeaders.delete("Origin");
        retryStage = attempt.stage;
        if (debugEnabled) {
          console.log(`[Proxy] Retrying (${attempt.stage})`);
        }
        upstreamResponse = await fetchPublic(targetUrl, fetchOptions);
      }
    } else if (upstreamResponse.status === 404) {
      // 404 için farklı referer stratejileri dene
      const originalReferer = upstreamHeaders.get("Referer");

      if (isSegmentUrl && refererParam?.trim()) {
        // Segment URL'leri için önce playlist URL'ini referer olarak dene
        try {
          const decodedReferer = decodeURIComponent(refererParam.trim());
          const refererUrl = new URL(decodedReferer);
          if (
            !refererUrl.hostname.includes("localhost") &&
            !refererUrl.hostname.includes("127.0.0.1")
          ) {
            upstreamHeaders.set("Referer", refererUrl.toString());
            retryStage = "playlist-referer";
            if (debugEnabled) {
              console.log("[Proxy] Retrying with playlist referer:", {
                originalReferer,
                newReferer: refererUrl.toString(),
              });
            }
            upstreamResponse = await fetchPublic(targetUrl, fetchOptions);
          }
        } catch {
          // Geçersiz referer, devam et
        }
      }

      // Hala 404 ise, origin referer ile dene
      if (upstreamResponse.status === 404) {
        upstreamHeaders.set("Referer", `${targetUrl.origin}/`);
        retryStage = "origin-referer";
        if (debugEnabled) {
          console.log("[Proxy] Retrying with origin referer:", {
            originalReferer,
            newReferer: `${targetUrl.origin}/`,
          });
        }
        upstreamResponse = await fetchPublic(targetUrl, fetchOptions);
      }

      // Hala 404 ise, referer'ı tamamen kaldır
      if (upstreamResponse.status === 404) {
        upstreamHeaders.delete("Referer");
        retryStage = "no-referer-after-404";
        if (debugEnabled) {
          console.log("[Proxy] Retrying without Referer after 404");
        }
        upstreamResponse = await fetchPublic(targetUrl, fetchOptions);
      }
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

      return errorResponse;
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

      // After 302 to CDN, relative /hls/*.ts must resolve against the
      // final URL — not the panel host (panel returns 403 for those paths).
      let playlistBaseUrl = targetUrl;
      try {
        if (upstreamResponse.url) {
          playlistBaseUrl = new URL(upstreamResponse.url);
        }
      } catch {}

      if (debugEnabled) {
        const lines = text.split(/\r?\n/).slice(0, 20);
        console.log("[Proxy] Playlist preview:", lines.join("\n"));
        console.log("[Proxy] Playlist base:", {
          requested: targetUrl.toString(),
          resolved: playlistBaseUrl.toString(),
        });
      }

      const rewritten = rewritePlaylist(
        text,
        playlistBaseUrl,
        requestOrigin,
        debugEnabled
      );

      // Debug için: Rewrite edilmiş ilk birkaç satırı logla
      if (debugEnabled) {
        const rewrittenLines = rewritten.split(/\r?\n/).slice(0, 20);
        console.log(
          "[Proxy] Rewritten playlist preview:",
          rewrittenLines.join("\n")
        );
      }

      responseHeaders.delete("content-length");
      return (
        new NextResponse(rewritten, {
          status: upstreamResponse.status,
          headers: responseHeaders,
        })
      );
    }

    return (
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
      { status: error instanceof BlockedTargetError ? 403 : 500 }
    );

    if (shouldLog) {
      errorResponse.headers.set("X-Proxy-Debug", "1");
      errorResponse.headers.set(
        "X-Proxy-Environment",
        process.env.NODE_ENV || "unknown"
      );
    }

    return errorResponse;
  }
}
