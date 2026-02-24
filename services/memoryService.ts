
/**
 * Memory Service (Local Only)
 * Handles persistence of agent knowledge using standard LocalStorage.
 * Puter Cloud features have been removed.
 */

const STORAGE_PREFIX = 'alphaflow_mem_';

export interface MemoryStats {
    id: string;
    sizeBytes: number;
    lastModified: number;
    itemCount: number;
    source: 'LOCAL';
}

export const MemoryService = {
    saveAgentMemory: async (agentId: string, data: any): Promise<boolean> => {
        const key = `${STORAGE_PREFIX}${agentId}`;
        const payload = {
            data,
            timestamp: Date.now(),
            version: '2.0'
        };
        try {
            localStorage.setItem(key, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.warn("Local Memory Quota Exceeded");
            return false;
        }
    },

    loadAgentMemory: async (agentId: string): Promise<any | null> => {
        const key = `${STORAGE_PREFIX}${agentId}`;
        try {
            const localRaw = localStorage.getItem(key);
            if (!localRaw) return null;
            if (localRaw === '[object Object]') {
                localStorage.removeItem(key);
                return null;
            }
            const parsed = JSON.parse(localRaw);
            return parsed.data;
        } catch (e) {
            return null;
        }
    },

    getStats: async (): Promise<MemoryStats[]> => {
        const stats: MemoryStats[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                const raw = localStorage.getItem(key) || '';
                const agentId = key.replace(STORAGE_PREFIX, '');
                let timestamp = 0;
                let itemCount = 0;
                try {
                    const parsed = JSON.parse(raw);
                    timestamp = parsed.timestamp || 0;
                    itemCount = Array.isArray(parsed.data) ? parsed.data.length : (parsed.data ? Object.keys(parsed.data).length : 0);
                } catch (e) {}

                stats.push({
                    id: agentId,
                    sizeBytes: new Blob([raw]).size,
                    lastModified: timestamp,
                    itemCount,
                    source: 'LOCAL'
                });
            }
        }
        return stats;
    },

    clearAgentMemory: async (agentId: string) => {
        const key = `${STORAGE_PREFIX}${agentId}`;
        localStorage.removeItem(key);
    },

    exportAllMemories: (): string => {
        const exportData: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                const agentId = key.replace(STORAGE_PREFIX, '');
                const raw = localStorage.getItem(key);
                if (raw) {
                    try {
                        exportData[agentId] = JSON.parse(raw);
                    } catch (e) {}
                }
            }
        }
        return JSON.stringify({
            app: 'AlphaFlow',
            exportedAt: Date.now(),
            platform: 'Local',
            memories: exportData
        }, null, 2);
    },

    importMemories: async (jsonString: string): Promise<{ success: number, errors: number }> => {
        let success = 0;
        let errors = 0;
        try {
            const data = JSON.parse(jsonString);
            if (!data.memories) throw new Error("Invalid Format");
            const entries = Object.entries(data.memories);
            for (const [agentId, content] of entries) {
                try {
                    await MemoryService.saveAgentMemory(agentId, (content as any).data);
                    success++;
                } catch (e) {
                    errors++;
                }
            }
        } catch (e) {
            errors = 1;
        }
        return { success, errors };
    }
};
