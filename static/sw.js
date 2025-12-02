const CACHE_NAME = 'price-tracker-v2.0.0';
const STATIC_CACHE = 'static-v2.0.0';
const DYNAMIC_CACHE = 'dynamic-v2.0.0';

const STATIC_FILES = [
  './',
  './index.html',
  './setup.html',
  './static/style.css',
  './static/core.js',
  './static/app.js',
  './static/enhanced-styles.css',
  './static/enhanced-methods.js',
  './static/manifest.json',
  './static/favicon.ico'
];

const API_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const OFFLINE_FALLBACK = {
  btc: 43000, eth: 2600, bnb: 240, ada: 0.38, sol: 60,
  xrp: 0.52, dot: 5.2, doge: 0.08, avax: 12, matic: 0.75,
  gold: 2050, silver: 24.5, platinum: 950, palladium: 1200
};

// Install event
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.hostname === 'query1.finance.yahoo.com') {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (STATIC_FILES.some(file => request.url.includes(file))) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle other requests
  event.respondWith(handleDynamicRequest(request));
});

// Handle API requests with caching and offline fallback
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      
      // Add timestamp for cache validation
      const timestampedResponse = await addTimestamp(networkResponse);
      return timestampedResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache');
    
    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const cacheTime = await getCacheTimestamp(cachedResponse);
      if (Date.now() - cacheTime < API_CACHE_TIME) {
        return cachedResponse;
      }
    }
    
    // Return offline fallback
    return createOfflineFallback(request);
  }
}

// Handle static file requests
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static file not available offline');
    return new Response('Offline', { status: 503 });
  }
}

// Handle dynamic requests
async function handleDynamicRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Add timestamp to response
async function addTimestamp(response) {
  try {
    const responseBody = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseBody);
    } catch (parseError) {
      // If not JSON, return original response
      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    
    const timestampedBody = JSON.stringify({
      data: data,
      timestamp: Date.now(),
      cached: false
    });
    
    return new Response(timestampedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error('Error adding timestamp:', error);
    return response;
  }
}

// Get cache timestamp
async function getCacheTimestamp(response) {
  try {
    const responseClone = response.clone();
    const body = await responseClone.text();
    const data = JSON.parse(body);
    return data.timestamp || 0;
  } catch (error) {
    return 0;
  }
}

// Create offline fallback response
function createOfflineFallback(request) {
  const url = new URL(request.url);
  const symbol = extractSymbolFromUrl(url.pathname);
  
  const fallbackData = {
    chart: {
      result: [{
        meta: {
          regularMarketPrice: OFFLINE_FALLBACK[symbol] || 100,
          currency: 'USD'
        }
      }]
    }
  };
  
  const responseBody = JSON.stringify({
    data: fallbackData,
    timestamp: Date.now(),
    cached: true,
    offline: true
  });
  
  return new Response(responseBody, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Extract symbol from Yahoo Finance URL
function extractSymbolFromUrl(pathname) {
  const match = pathname.match(/\/([A-Z0-9-]+)$/);
  if (match) {
    const symbol = match[1].toLowerCase();
    if (symbol.includes('btc')) return 'btc';
    if (symbol.includes('eth')) return 'eth';
    if (symbol.includes('gc=f')) return 'gold';
    if (symbol.includes('si=f')) return 'silver';
  }
  return 'btc'; // default fallback
}

// Background sync for price updates
self.addEventListener('sync', event => {
  if (event.tag === 'background-price-sync') {
    event.waitUntil(backgroundPriceSync());
  }
});

async function backgroundPriceSync() {
  try {
    console.log('Service Worker: Background sync triggered');
    
    // Notify all clients about background update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'PRICE_UPDATE_AVAILABLE'
      });
    });
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Price alert triggered',
    icon: '/static/icon-192.png',
    badge: '/static/icon-72.png',
    tag: 'price-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Price Alert', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('./')
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_PRICES':
      cachePrices(data);
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
  }
});

// Cache prices manually
async function cachePrices(pricesData) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const response = new Response(JSON.stringify({
    data: pricesData,
    timestamp: Date.now(),
    cached: true
  }));
  
  await cache.put('/api/prices', response);
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}