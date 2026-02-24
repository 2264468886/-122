
/**
 * NexusProxy Service Worker
 * Intercepts exchange API calls and routes them through virtual tunnels.
 */

let isProxyEnabled = false;
const EXCHANGE_DOMAINS = ['api.binance.com', 'fapi.binance.com', 'api.huobi.pro', 'api.okx.com'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Control Channel
self.addEventListener('message', (event) => {
    if (event.data.type === 'ENABLE_PROXY') isProxyEnabled = true;
    if (event.data.type === 'DISABLE_PROXY') isProxyEnabled = false;
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Proxy Logic: Intercept Crypto Exchange API calls if proxy is enabled
    if (isProxyEnabled && EXCHANGE_DOMAINS.some(d => url.hostname.includes(d))) {
        event.respondWith(handleProxyRequest(event.request));
    }
});

async function handleProxyRequest(request) {
    // 1. Pack Request (In real app, WASM would process this)
    // 2. Route via "Puter Relay" or WebRTC Tunnel
    // Here we simulate the proxy by routing through a CORS-friendly gateway
    
    const targetUrl = request.url;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    // Clone headers but strip dangerous ones that browsers block in SW
    const headers = new Headers(request.headers);
    
    try {
        const start = Date.now();
        const response = await fetch(proxyUrl, {
            method: request.method,
            headers: headers,
            body: request.method !== 'GET' ? await request.blob() : undefined
        });
        
        // Report Metrics
        const latency = Date.now() - start;
        reportMetrics(latency);

        return response;
    } catch (e) {
        return new Response(JSON.stringify({ error: "NexusProxy Tunnel Error", details: e.message }), { status: 502 });
    }
}

function reportMetrics(latency) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'METRIC_UPDATE',
                payload: { latency }
            });
        });
    });
}
