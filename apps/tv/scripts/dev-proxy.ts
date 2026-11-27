import type { Plugin } from "vite";
import { Readable } from "node:stream";

/**
 * Dev-server only. A browser on localhost can't call an Xtream panel directly
 * (no CORS headers, often plain http), but TVs and Tauri can. This middleware
 * stands in for them while developing in a desktop browser:
 *   /__api?url=…     JSON API passthrough
 *   /__stream?url=…  media passthrough; HLS playlists are rewritten so every
 *                    segment and sub-playlist also goes through the proxy.
 * Never shipped: `apply: "serve"`.
 */
export function devProxy(): Plugin {
  return {
    name: "iptv-dev-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? "/", "http://localhost");
        if (requestUrl.pathname !== "/__api" && requestUrl.pathname !== "/__stream") return next();

        const target = requestUrl.searchParams.get("url");
        if (!target || !/^https?:\/\//i.test(target)) {
          res.statusCode = 400;
          res.end("url parameter required");
          return;
        }

        try {
          const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36" };
          if (req.headers.range) headers.Range = String(req.headers.range);
          const upstream = await fetch(target, { headers, redirect: "follow" });
          res.statusCode = upstream.status;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "no-store");

          const type = upstream.headers.get("content-type") ?? "";
          const isPlaylist = /mpegurl/i.test(type) || /\.m3u8?(\?|$)/i.test(new URL(upstream.url).pathname);
          if (requestUrl.pathname === "/__stream" && isPlaylist) {
            const text = await upstream.text();
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.end(rewritePlaylist(text, upstream.url));
            return;
          }

          for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
            const value = upstream.headers.get(name);
            if (value) res.setHeader(name, value);
          }
          if (!upstream.body) return void res.end();
          Readable.fromWeb(upstream.body as never).on("error", () => res.destroy()).pipe(res);
        } catch (error) {
          res.statusCode = 502;
          res.end(error instanceof Error ? error.message : "proxy error");
        }
      });
    },
  };
}

const proxied = (uri: string, base: string) =>
  `/__stream?url=${encodeURIComponent(new URL(uri, base).href)}`;

function rewritePlaylist(text: string, base: string) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri: string) => `URI="${proxied(uri, base)}"`);
      }
      return proxied(trimmed, base);
    })
    .join("\n");
}
