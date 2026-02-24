
/**
 * HyperStorage Engine
 * Inspired by V86 virtualization storage principles.
 * Treats application state as a memory snapshot that can be mounted/unmounted from the local physical disk.
 */

import { Portfolio, UserSettings, AgentSystemState } from '../types';

interface AppSnapshot {
    timestamp: number;
    version: string;
    settings: UserSettings;
    portfolios: {
        real: Portfolio;
        sim: Record<string, Portfolio>;
    };
    agentMemory: Record<string, any>;
    integrityHash: string;
}

export class HyperStorage {
    private fileHandle: FileSystemFileHandle | null = null;
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private encryptionKey: CryptoKey | null = null;
    private isVirtual: boolean = false;

    // --- 1. Mounting (Like mounting a disk in V86) ---
    async mountLocalVault(): Promise<boolean> {
        try {
            // Request access to a local directory (Sandbox)
            this.directoryHandle = await (window as any).showDirectoryPicker({
                id: 'alphaflow-vault',
                mode: 'readwrite'
            });
            this.isVirtual = false;
            return true;
        } catch (e: any) {
            console.warn("[HyperStorage] Native mount failed (likely iframe restriction). Switching to Virtual Vault.");
            // Fallback to Virtual Vault (LocalStorage)
            this.isVirtual = true;
            return true;
        }
    }

    // --- 2. Snapshotting (Like v86.save_state) ---
    async createSnapshot(data: Omit<AppSnapshot, 'integrityHash' | 'timestamp' | 'version'>): Promise<Blob> {
        const snapshot: AppSnapshot = {
            ...data,
            timestamp: Date.now(),
            version: '1.0.0',
            integrityHash: '' // Calculated later
        };

        // Serialize
        const jsonStr = JSON.stringify(snapshot);
        const encoder = new TextEncoder();
        const encoded = encoder.encode(jsonStr);

        // Compress (Simulating V86 state compression)
        const compressedStream = new Response(encoded).body?.pipeThrough(new CompressionStream('gzip'));
        if (!compressedStream) throw new Error("Compression not supported");
        
        const compressedBlob = await new Response(compressedStream).blob();
        
        // Encrypt (If key exists)
        if (this.encryptionKey) {
            return this.encryptBlob(compressedBlob);
        }

        return compressedBlob;
    }

    // --- 3. Persistence (Writing to Disk) ---
    async saveToDisk(filename: string, blob: Blob) {
        if (this.isVirtual) {
            // Save to Virtual Vault (LocalStorage as Base64)
            const reader = new FileReader();
            return new Promise<void>((resolve, reject) => {
                reader.onloadend = () => {
                    try {
                        localStorage.setItem(`v_vault_${filename}`, reader.result as string);
                        resolve();
                    } catch (e) {
                        reject(new Error("Virtual Vault Full (LocalStorage Quota Exceeded)"));
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }

        if (!this.directoryHandle) throw new Error("No Vault Mounted");

        const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    }

    // --- 4. Restoration (Loading Snapshot) ---
    async loadFromDisk(filename: string): Promise<AppSnapshot | null> {
        let buffer: ArrayBuffer;

        if (this.isVirtual) {
            const dataUrl = localStorage.getItem(`v_vault_${filename}`);
            if (!dataUrl) return null;
            try {
                const res = await fetch(dataUrl);
                buffer = await res.arrayBuffer();
            } catch (e) {
                console.error("Virtual load failed", e);
                return null;
            }
        } else {
            if (!this.directoryHandle) return null;
            try {
                const fileHandle = await this.directoryHandle.getFileHandle(filename);
                const file = await fileHandle.getFile();
                buffer = await file.arrayBuffer();
            } catch (e) {
                console.error("Native Load failed:", e);
                return null;
            }
        }

        try {
            // Decrypt
            if (this.encryptionKey) {
                buffer = await this.decryptBuffer(buffer);
            }

            // Decompress
            const decompressedStream = new Response(buffer).body?.pipeThrough(new DecompressionStream('gzip'));
            if (!decompressedStream) throw new Error("Decompression failed");
            
            const jsonStr = await new Response(decompressedStream).text();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Snapshot processing failed:", e);
            return null;
        }
    }

    // --- Crypto Utils ---
    async initSecurity(password: string) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
        );
        this.encryptionKey = await window.crypto.subtle.deriveKey(
            { name: "PBKDF2", salt: enc.encode('alphaflow_salt'), iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
        );
    }

    private async encryptBlob(blob: Blob): Promise<Blob> {
        if (!this.encryptionKey) return blob;
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const buffer = await blob.arrayBuffer();
        const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, this.encryptionKey, buffer);
        
        // Combine IV + Data
        const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.byteLength);
        return new Blob([combined]);
    }

    private async decryptBuffer(buffer: ArrayBuffer): Promise<ArrayBuffer> {
        if (!this.encryptionKey) return buffer;
        const iv = buffer.slice(0, 12);
        const data = buffer.slice(12);
        return await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, this.encryptionKey, data);
    }
}

export const hyperStorage = new HyperStorage();
