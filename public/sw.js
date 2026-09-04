/* Gmora STEM — app-shell service worker.
 * Caches static branding assets only. Navigations are network-first.
 * Never caches /api/, video tokens, or private lesson files.
 */
const CACHE = 'gmora-shell-v1';
const PRECACHE = ['/logo.svg', '/logo-dark.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
        ).then(() => self.clients.claim()),
    );
});

function isPrivatePath(pathname) {
    return (
        pathname.startsWith('/api/') ||
        pathname.includes('/video') ||
        pathname.includes('/token') ||
        pathname.startsWith('/lessons/') ||
        pathname.startsWith('/presentations/') ||
        pathname.startsWith('/submissions/') ||
        pathname.startsWith('/certificates/')
    );
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (isPrivatePath(url.pathname)) return;

    // Navigations: network first, fall back to any cached shell page.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/logo.svg').then(() => Response.error())),
        );
        return;
    }

    // Precached static assets only — cache-first.
    if (PRECACHE.includes(url.pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => cached || fetch(request).then((response) => {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy));
                return response;
            })),
        );
    }
});
