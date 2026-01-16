// Service Worker for offline functionality
const CACHE_NAME = 'finchronicle-v3.2.0';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './robots.txt',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-icon-512.png'
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
    console.log('Service Worker: Installing new version...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Skip waiting - force activation');
                return self.skipWaiting();
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating new version...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Claiming clients - taking control immediately');
                return self.clients.claim();
            })
            .then(() => {
                // Notify all clients that update is complete
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            type: 'SW_UPDATED',
                            version: CACHE_NAME
                        });
                    });
                });
            })
    );
});
