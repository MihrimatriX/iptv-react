const CACHE_NAME = "react-iptv-client-v3";
// Relative to this file, so it works at "/" (Docker) and "/iptv-react/" (Pages).
const PRECACHE = [
  "./",
  "./manifest.json",
  "./icons/icon-192x192.svg",
  "./icons/icon-512x512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("react-iptv-client-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.pathname.includes("/_next/static/") || url.pathname.includes("/icons/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls and live stream segments always hit the network:
  // caching video segments would only fill up storage.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.includes("/api/")
  ) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./")));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
