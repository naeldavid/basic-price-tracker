const CACHE_NAME = 'price-tracker-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/setup.html',
    '/static/style.css',
    '/static/core.js',
    '/static/app.js',
    '/static/logger.js',
    '/static/favicon.ico',
    '/static/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip external API calls (always fetch fresh)
    const ALLOWED_API_HOSTS = [
        'api.binance.com',
        'open.er-api.com',
        'api.metalpriceapi.com',
        'api.allorigins.win',
        'api.rss2json.com',
        's3.tradingview.com'
    ];
    try {
        const requestHost = new URL(request.url).hostname;
        if (ALLOWED_API_HOSTS.includes(requestHost)) {
            event.respondWith(fetch(request));
            return;
        }
    } catch {
        return;
    }
    
    // Network-first strategy for same-origin app files only
    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith(
        fetch(request)
            .then(response => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                return response;
            })
            .catch(() =>
                caches.match(request).then(cached => cached || caches.match('/index.html'))
            )
    );
});

// Message handler with origin verification (CWE-346)
self.addEventListener('message', (event) => {
    if (!event.origin || !self.location.origin.startsWith(event.origin.split('/').slice(0, 3).join('/'))) return;
    if (event.data && event.data.type === 'CACHE_PRICES') {
        // handled passively — no action needed
    }
});

// Background sync support
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prices') {
        event.waitUntil(syncPrices());
    }
});

async function syncPrices() {
    // Background sync placeholder
    return Promise.resolve();
}

// Push notification support
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Price alert triggered!',
        icon: '/static/favicon.ico',
        badge: '/static/favicon.ico',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification('Price Tracker', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = self.location.origin + '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(target);
        })
    );
});
