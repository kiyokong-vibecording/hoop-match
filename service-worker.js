const CACHE_NAME = "hoop-match-v52";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/config.js",
  "./data/facilities.js",
  "./assets/hero-court.jpg",
  "./assets/icon-180.png",
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

// ネットワーク優先: つながるときは常に最新を表示し、キャッシュも更新する。
// オフラインのときだけキャッシュから表示する(更新後に古い画面が残る事故を防ぐ)。
self.addEventListener("fetch", (event) => {
  const { request } = event;
  // サーバーAPI(supabase等の外部オリジン)と送信系リクエストはキャッシュしない
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }
  // ブラウザのHTTPキャッシュも素通りさせず、サーバーに更新有無を確認する(変更がなければ304で軽い)。
  // ページ遷移のリクエストはオプション付きで作り直せないため、そのまま取得する
  const networkRequest = request.mode === "navigate" ? fetch(request) : fetch(request, { cache: "no-cache" });
  event.respondWith(
    networkRequest
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
