const CACHE_NAME = "hoop-match-v44";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/config.js",
  "./data/facilities.js",
  "./assets/hero-court.png",
  "./assets/ogp.jpg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./manifest.webmanifest",
  "./terms.html",
  "./privacy.html",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // サーバーAPI(supabase等の外部オリジン)はキャッシュせず常にネットワークへ
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
