/// <reference lib="webworker" />
// ViTale Service Worker — Offline-first PWA
// Strategy:
//   - App shell (JS/CSS/fonts): Cache-First (serve fast, update in bg)
//   - API calls (GET only):     Network-First with 5s timeout, fallback to cache
//   - Static assets (images):   Stale-While-Revalidate
//   - POST/PATCH/DELETE:        Network-only (never cache mutations)

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `vitale-shell-${CACHE_VERSION}`;
const DATA_CACHE  = `vitale-data-${CACHE_VERSION}`;
const IMG_CACHE   = `vitale-img-${CACHE_VERSION}`;

// App shell — these files are cached on install
const SHELL_URLS = [
  '/',
  '/activate',
  '/passport',
  '/explore',
  '/chat',
  '/partners',
  '/manifest.json',
];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_URLS).catch(err => {
        console.warn('[SW] Shell pre-cache partial failure:', err);
      });
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![SHELL_CACHE, DATA_CACHE, IMG_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and cross-origin mutations
  if (request.method !== 'GET') return;

  // 2. API calls → Network-First with timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, DATA_CACHE, 5000));
    return;
  }

  // 3. Images → Stale-While-Revalidate
  if (request.destination === 'image') {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
    return;
  }

  // 4. Next.js static chunks + fonts → Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 5. App shell pages → Network-First (fast fallback for offline)
  event.respondWith(networkFirstWithTimeout(request, SHELL_CACHE, 3000));
});

// ─── STRATEGIES ───────────────────────────────────────────────────────────────

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithTimeout(
  request: Request,
  cacheName: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    clearTimeout(timer);
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page as last resort
    const offlineCache = await caches.match('/');
    return offlineCache ?? new Response('Không có kết nối mạng. Vui lòng thử lại.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached ?? (await networkFetch) ?? new Response('', { status: 404 });
}
