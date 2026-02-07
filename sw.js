// Service Worker for FinChronicle - Offline-first PWA
// Version: 3.7.1

const CACHE_NAME = 'finchronicle-v3.7.1';
const CACHE_VERSION = '3.7.1';

// Critical files for offline functionality
const CACHE_URLS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './css/tokens.css',
    './css/styles.css',
    './css/dark-mode.css',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-icon-512.png'
];

// Optional files (cache if available, don't fail if missing)
const OPTIONAL_CACHE_URLS = [
    './robots.txt'
];

// Listen for messages from the app
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('Service Worker: Received SKIP_WAITING message');
        self.skipWaiting();
    }
});

// Install event - cache files
self.addEventListener('install', event => {
    console.log(`[SW] Installing version ${CACHE_VERSION}`);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching critical files');
                
                // Cache critical files (must succeed)
                const criticalCache = cache.addAll(CACHE_URLS);
                
                // Cache optional files (failures allowed)
                const optionalCache = Promise.all(
                    OPTIONAL_CACHE_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Optional file not cached: ${url}`, err);
                        })
                    )
                );
                
                return Promise.all([criticalCache, optionalCache]);
            })
            .then(() => {
                console.log('[SW] Installation complete - activating immediately');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('[SW] Installation failed:', err);
                throw err;
            })
    );
});

// Fetch event - cache-first strategy for offline support
self.addEventListener('fetch', event => {
    // Skip non-GET requests and external resources
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Cache hit - return cached response
                    return cachedResponse;
                }
                
                // No cache - fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache successful responses for future use
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                })
                                .catch(err => console.warn('[SW] Failed to update cache:', err));
                        }
                        return networkResponse;
                    })
                    .catch(err => {
                        console.error('[SW] Fetch failed:', err);
                        // Could return a custom offline page here if needed
                        throw err;
                    });
            })
    );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
    console.log(`[SW] Activating version ${CACHE_VERSION}`);
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log(`[SW] Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients immediately
            self.clients.claim()
        ])
        .then(() => {
            console.log('[SW] Activation complete - notifying clients');
            
            // Notify all clients that update is complete
            return self.clients.matchAll();
        })
        .then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SW_UPDATED',
                    version: CACHE_VERSION
                });
            });
            console.log(`[SW] Notified ${clients.length} client(s)`);
        })
        .catch(err => {
            console.error('[SW] Activation error:', err);
        })
    );
});
