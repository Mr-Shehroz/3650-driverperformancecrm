// File: public/sw.js
// (REPLACE the whole file)

/* DRS Performance Portal service worker */
const VERSION = "drs-v4"; // change this on every big release so phones drop old saved files
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const SHELL_CACHE = `${VERSION}-shell`;
const OFFLINE_URL = "/offline";
const SHELL_URL = "/driver-offline";

// Matches /_next/static/... asset paths inside HTML and CSS
const ASSET_RE = /\/_next\/static\/[^"'\\\s)]+/g;
// Images from /public used by the offline pages (logo, icons)
const IMG_RE =
  /(?:src|href)="(\/(?!_next\/)[^"?]+\.(?:png|jpg|jpeg|svg|webp|ico))"/g;
const ALWAYS = ["/logo.webp"];

/** Caches the offline app + offline page and every script/style/font they need */
async function precacheShell() {
  const shell = await caches.open(SHELL_CACHE);
  const staticCache = await caches.open(STATIC_CACHE);
  const assets = new Set(ALWAYS);

  for (const url of [OFFLINE_URL, SHELL_URL]) {
    const res = await fetch(url, {
      cache: "reload",
      credentials: "same-origin",
    });
    if (!res.ok) continue;
    const html = await res.clone().text();
    await shell.put(url, res);
    (html.match(ASSET_RE) || []).forEach((a) => assets.add(a));
    for (const m of html.matchAll(IMG_RE)) assets.add(m[1]);
  }

  // CSS files point to font files, cache those too
  for (const a of Array.from(assets)) {
    if (!a.endsWith(".css")) continue;
    try {
      const css = await (await fetch(a)).text();
      (css.match(ASSET_RE) || []).forEach((m) => assets.add(m));
    } catch {}
  }

  await Promise.all(
    Array.from(assets).map((a) => staticCache.add(a).catch(() => {})),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheShell()
      .catch((err) => console.error("Precache failed", err))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  // Logout: remove saved pages (the offline app and pending entries stay)
  if (event.data?.type === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
  // Online: refresh the offline app so it matches the latest deploy
  if (event.data?.type === "REFRESH_SHELL") {
    event.waitUntil(precacheShell().catch(() => {}));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)
  );
}

function isDriverPath(pathname) {
  return (
    pathname === "/" ||
    pathname === "/driver" ||
    pathname.startsWith("/driver/")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Next.js client navigation (RSC), API, exports and PDFs always go to the network
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.endsWith("/export") ||
    url.pathname.endsWith("/pdf")
  )
    return;

  // Next.js build files never change (new deploy = new file name): cache first
  // Other files (logo, icons) can change: show saved copy, update it in the background
  if (isStaticAsset(url)) {
    const hashed = url.pathname.startsWith("/_next/static/");
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = () =>
          fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          });
        if (cached) {
          if (!hashed) event.waitUntil(network().catch(() => {}));
          return cached;
        }
        return network();
      }),
    );
    return;
  }

  // Pages: network first
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && url.pathname !== SHELL_URL) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          // Offline app itself
          if (url.pathname === SHELL_URL || url.pathname === OFFLINE_URL) {
            const hit = await caches.match(url.pathname, {
              ignoreSearch: true,
            });
            if (hit) return hit;
          }
          // Any driver page → open the offline app at the same path
          if (isDriverPath(url.pathname) && (await caches.match(SHELL_URL))) {
            const target = url.pathname === "/" ? "/driver" : url.pathname;
            return Response.redirect(
              `${self.location.origin}${SHELL_URL}#${target}`,
              302,
            );
          }
          // Everything else: last saved copy, then the offline page
          return (
            (await caches.match(req)) ||
            (await caches.match(OFFLINE_URL)) ||
            Response.error()
          );
        }
      })(),
    );
  }
});
