const CACHE_VERSION = "2026-07-30";
const CACHE_NAME = `kanak-foods-shell-${CACHE_VERSION}`;
const STATIC_ASSETS = ["/", "/offline", "/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.url.startsWith("chrome-extension:")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && !url.pathname.startsWith("/profile") && !url.pathname.startsWith("/orders") && !url.pathname.startsWith("/store") && !url.pathname.startsWith("/admin") && !url.pathname.startsWith("/delivery")) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match("/offline"))),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || ["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
    return;
  }

  if (url.pathname === "/manifest.json" || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        });
        return cached ?? network;
      }),
    );
  }
});
