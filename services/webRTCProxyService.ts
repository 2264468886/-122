
/**
 * WebRTC Proxy Service - DEPRECATED
 * Replaced by Puter Cloud Proxy
 */

export class WebRTCProxyService {
    private static instance: WebRTCProxyService;
    private constructor() {}

    public static getInstance(): WebRTCProxyService {
        if (!WebRTCProxyService.instance) {
            WebRTCProxyService.instance = new WebRTCProxyService();
        }
        return WebRTCProxyService.instance;
    }

    public isConnected(): boolean {
        return false;
    }
    
    public addListener(cb: any) {}
    public removeListener(cb: any) {}
    public connect(roomId?: string, role?: 'CLIENT' | 'HOST') { console.warn("WebRTC Proxy is deprecated"); }
    public disconnect() {}
    public fetch() { return Promise.reject("Deprecated"); }
}
