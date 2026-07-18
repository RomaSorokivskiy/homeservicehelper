const CACHE = "our-home-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([self.clients.claim(), caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))])));
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(event.data.urls.filter((url) => new URL(url, self.location.origin).origin === self.location.origin).map((url) => cache.add(new Request(url, { credentials: "include" })).catch(() => null)))));
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => { const copy=response.clone(); caches.open(CACHE).then((cache)=>cache.put(event.request,copy)); return response; }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.mode === "navigate" ? caches.match("/") : undefined))));
});
