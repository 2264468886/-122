
const CACHE_NAME = 'alphaflow-cache-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[ServiceWorker] Installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    console.log('[ServiceWorker] Activated');
});

self.addEventListener('fetch', (event) => {
    // No-op: Pass through all requests
    // Proxying is now handled by Puter Cloud Relay
});
