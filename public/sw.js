const CACHE_NAME = "react-iptv-client-v1.0.0";
const STATIC_CACHE_NAME = "react-iptv-client-static-v1.0.0";
const DYNAMIC_CACHE_NAME = "react-iptv-client-dynamic-v1.0.0";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
  "/_next/static/css/",
  "/_next/static/js/",
];

const API_CACHE_PATTERNS = [/^\/api\/xtream/, /^\/api\/health/];

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static assets:", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith("react-iptv-client-")
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (!url.protocol.startsWith("http")) {
    return;
  }

  if (API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(handleDefault(request));
});

async function handleApiRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      fetchAndCache(request, cache);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] API request failed:", error);
    return new Response("Network error", { status: 503 });
  }
}

async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Static asset request failed:", error);
    return new Response("Asset not found", { status: 404 });
  }
}

async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Navigation request failed:", error);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match("/");
    return cachedResponse || new Response("Offline", { status: 503 });
  }
}

async function handleDefault(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Default request failed:", error);
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response("Network error", { status: 503 });
  }
}

async function fetchAndCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.error("[SW] Background fetch failed:", error);
  }
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  );
}

self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log("[SW] Performing background sync...");
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || "Yeni bildirim",
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-72x72.svg",
      tag: "react-iptv-client-notification",
      requireInteraction: false,
      actions: [
        {
          action: "open",
          title: "Aç",
        },
        {
          action: "close",
          title: "Kapat",
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "REACT IPTV CLIENT",
        options
      )
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(clients.openWindow("/"));
  }
});

self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log("[SW] Service worker script loaded");
