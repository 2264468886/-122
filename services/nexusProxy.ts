
/**
 * NexusProxy Controller
 * Manages the Service Worker interception and WebRTC Data Tunneling.
 * Simulates a local proxy server running directly in the browser.
 */

export class NexusProxy {
    private static instance: NexusProxy;
    private isProxyActive: boolean = false;
    private swRegistration: ServiceWorkerRegistration | null = null;
    
    // Performance Metrics
    public metrics = {
        requestsIntercepted: 0,
        bytesTransferred: 0,
        latency: 0
    };

    private constructor() {}

    public static getInstance(): NexusProxy {
        if (!NexusProxy.instance) NexusProxy.instance = new NexusProxy();
        return NexusProxy.instance;
    }

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                // Register the specific Proxy Service Worker using relative path
                this.swRegistration = await navigator.serviceWorker.register('./proxy-sw.js', {
                    scope: './'
                });
                
                // Listen for messages from SW
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'METRIC_UPDATE') {
                        this.metrics = event.data.payload;
                    }
                });

                console.log('[NexusProxy] Kernel installed.');
            } catch (e) {
                console.warn('[NexusProxy] Kernel installation failed (Environment restricted). Proxy features disabled.', e);
            }
        }
    }

    async enable() {
        if (!this.swRegistration) {
            // Attempt init if not yet done
            await this.init();
        }
        
        if (this.swRegistration && this.swRegistration.active) {
            this.isProxyActive = true;
            this.sendCommand('ENABLE_PROXY');
        } else {
            console.warn("[NexusProxy] Cannot enable proxy: Service Worker not active.");
        }
    }

    async disable() {
        this.isProxyActive = false;
        this.sendCommand('DISABLE_PROXY');
    }

    private sendCommand(type: string, payload?: any) {
        if (this.swRegistration?.active) {
            this.swRegistration.active.postMessage({ type, payload });
        }
    }

    // WASM Acceleration Simulation
    // In a real scenario, this would load a Rust-compiled .wasm file for packet inspection
    async loadWasmPacketizer() {
        return new Promise(resolve => setTimeout(resolve, 500));
    }
}

export const nexusProxy = NexusProxy.getInstance();
