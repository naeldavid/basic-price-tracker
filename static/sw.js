// Enhanced Service Worker for Better Performance and Offline Support

const CACHE_NAME = 'price-tracker-v2.1';
const STATIC_CACHE = 'static-v2.1';
const DYNAMIC_CACHE = 'dynamic-v2.1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/setup.html',
    '/static/style.css',
    '/static/enhanced-styles.css',
    '/static/enhanced-features.css',
    '/static/core.js',
    '/static/app.js',
    '/static/enhanced-features.js',
    '/static/manifest.json'
];

const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FALLBACK_PRICES = {
    btc: 43000, eth: 2600, bnb: 240, ada: 0.38, sol: 60,
    gold: 2050, silver: 24.5, usd_eur: 0.92, usd_gbp: 0.79
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                return cache.addAll(STATIC_ASSETS);
            }),
            caches.open(DYNAMIC_CACHE).then(cache => {
                // Pre-cache some dynamic content
                return Promise.resolve();
            })
        ]).then(() => {
            console.log('Service Worker installed successfully');
            return self.skipWaiting();
        }).catch(error => {
            console.error('Service Worker installation failed:', error);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Static assets - Cache First strategy
    if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // API requests - Network First with fallback
    if (url.hostname.includes('finance.yahoo.com') || url.hostname.includes('api.')) {
        event.respondWith(networkFirstWithFallback(request));
        return;
    }
    
    // Other requests - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Cache First Strategy
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache First failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

// Network First with Fallback Strategy
async function networkFirstWithFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful API responses with timestamp
            const cache = await caches.open(DYNAMIC_CACHE);
            const responseToCache = networkResponse.clone();
            
            // Add timestamp to cached response
            const responseWithTimestamp = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: {
                    ...Object.fromEntries(responseToCache.headers.entries()),
                    'sw-cached-at': Date.now().toString()
                }
            });
            
            cache.put(request, responseWithTimestamp);
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse.status}`);
    } catch (error) {
        console.warn('Network request failed, trying cache:', error);
        
        // Try to get from cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            const cachedAt = cachedResponse.headers.get('sw-cached-at');
            const age = Date.now() - parseInt(cachedAt || '0');
            
            // If cache is fresh enough, use it
            if (age < API_CACHE_DURATION) {
                return cachedResponse;
            }
        }
        
        // Return fallback data for price requests
        if (request.url.includes('finance.yahoo.com')) {
            return createFallbackPriceResponse(request.url);
        }
        
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// Create fallback response for price requests
function createFallbackPriceResponse(url) {
    // Extract symbol from URL and provide fallback price
    let symbol = 'BTC';
    let price = FALLBACK_PRICES.btc;
    
    if (url.includes('ETH')) {
        symbol = 'ETH';
        price = FALLBACK_PRICES.eth;
    } else if (url.includes('GC=F')) {
        symbol = 'GOLD';
        price = FALLBACK_PRICES.gold;
    }
    // Add more symbol mappings as needed
    
    const fallbackData = {\n        chart: {\n            result: [{\n                meta: {\n                    regularMarketPrice: price,\n                    symbol: symbol\n                }\n            }]\n        },\n        fallback: true,\n        timestamp: Date.now()\n    };\n    \n    return new Response(JSON.stringify(fallbackData), {\n        status: 200,\n        headers: {\n            'Content-Type': 'application/json',\n            'sw-fallback': 'true'\n        }\n    });\n}\n\n// Background Sync for price updates\nself.addEventListener('sync', (event) => {\n    if (event.tag === 'background-price-sync') {\n        event.waitUntil(backgroundPriceSync());\n    }\n});\n\nasync function backgroundPriceSync() {\n    try {\n        console.log('Background sync: Updating prices...');\n        \n        // Fetch latest prices in background\n        const priceUrls = [\n            'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD',\n            'https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD',\n            'https://query1.finance.yahoo.com/v8/finance/chart/GC=F'\n        ];\n        \n        const cache = await caches.open(DYNAMIC_CACHE);\n        \n        for (const url of priceUrls) {\n            try {\n                const response = await fetch(url);\n                if (response.ok) {\n                    await cache.put(url, response.clone());\n                }\n            } catch (error) {\n                console.warn('Background sync failed for:', url, error);\n            }\n        }\n        \n        // Notify clients about updated prices\n        const clients = await self.clients.matchAll();\n        clients.forEach(client => {\n            client.postMessage({\n                type: 'BACKGROUND_SYNC',\n                action: 'PRICE_UPDATE_AVAILABLE'\n            });\n        });\n        \n        console.log('Background sync completed');\n    } catch (error) {\n        console.error('Background sync failed:', error);\n    }\n}\n\n// Push notifications for price alerts\nself.addEventListener('push', (event) => {\n    if (!event.data) return;\n    \n    try {\n        const data = event.data.json();\n        const options = {\n            body: data.body || 'Price alert triggered',\n            icon: '/static/icon-192.png',\n            badge: '/static/icon-72.png',\n            tag: 'price-alert',\n            requireInteraction: true,\n            actions: [\n                {\n                    action: 'view',\n                    title: 'View Details'\n                },\n                {\n                    action: 'dismiss',\n                    title: 'Dismiss'\n                }\n            ],\n            data: {\n                url: data.url || '/',\n                timestamp: Date.now()\n            }\n        };\n        \n        event.waitUntil(\n            self.registration.showNotification(data.title || 'Price Alert', options)\n        );\n    } catch (error) {\n        console.error('Push notification error:', error);\n    }\n});\n\n// Handle notification clicks\nself.addEventListener('notificationclick', (event) => {\n    event.notification.close();\n    \n    if (event.action === 'view') {\n        event.waitUntil(\n            clients.openWindow(event.notification.data.url || '/')\n        );\n    }\n});\n\n// Message handling from main thread\nself.addEventListener('message', (event) => {\n    const { type, data } = event.data;\n    \n    switch (type) {\n        case 'SKIP_WAITING':\n            self.skipWaiting();\n            break;\n            \n        case 'CACHE_PRICES':\n            cachePriceData(data);\n            break;\n            \n        case 'CLEAR_CACHE':\n            clearAllCaches();\n            break;\n            \n        case 'GET_CACHE_SIZE':\n            getCacheSize().then(size => {\n                event.ports[0].postMessage({ cacheSize: size });\n            });\n            break;\n    }\n});\n\n// Cache price data from main thread\nasync function cachePriceData(data) {\n    try {\n        const cache = await caches.open(DYNAMIC_CACHE);\n        const response = new Response(JSON.stringify(data), {\n            headers: {\n                'Content-Type': 'application/json',\n                'sw-cached-at': Date.now().toString()\n            }\n        });\n        \n        await cache.put('/api/prices/latest', response);\n        console.log('Price data cached successfully');\n    } catch (error) {\n        console.error('Failed to cache price data:', error);\n    }\n}\n\n// Clear all caches\nasync function clearAllCaches() {\n    try {\n        const cacheNames = await caches.keys();\n        await Promise.all(\n            cacheNames.map(cacheName => caches.delete(cacheName))\n        );\n        console.log('All caches cleared');\n    } catch (error) {\n        console.error('Failed to clear caches:', error);\n    }\n}\n\n// Get total cache size\nasync function getCacheSize() {\n    try {\n        let totalSize = 0;\n        const cacheNames = await caches.keys();\n        \n        for (const cacheName of cacheNames) {\n            const cache = await caches.open(cacheName);\n            const requests = await cache.keys();\n            \n            for (const request of requests) {\n                const response = await cache.match(request);\n                if (response) {\n                    const blob = await response.blob();\n                    totalSize += blob.size;\n                }\n            }\n        }\n        \n        return Math.round(totalSize / 1024); // Return size in KB\n    } catch (error) {\n        console.error('Failed to calculate cache size:', error);\n        return 0;\n    }\n}\n\n// Periodic cache cleanup\nsetInterval(async () => {\n    try {\n        const cache = await caches.open(DYNAMIC_CACHE);\n        const requests = await cache.keys();\n        const now = Date.now();\n        \n        for (const request of requests) {\n            const response = await cache.match(request);\n            if (response) {\n                const cachedAt = response.headers.get('sw-cached-at');\n                const age = now - parseInt(cachedAt || '0');\n                \n                // Remove entries older than 1 hour\n                if (age > 3600000) {\n                    await cache.delete(request);\n                    console.log('Removed stale cache entry:', request.url);\n                }\n            }\n        }\n    } catch (error) {\n        console.error('Cache cleanup failed:', error);\n    }\n}, 1800000); // Run every 30 minutes\n\nconsole.log('Enhanced Service Worker loaded successfully');