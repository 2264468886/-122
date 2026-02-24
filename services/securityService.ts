
/**
 * Security Service
 * Implements AES-256-GCM encryption for client-side secret management.
 * Uses PBKDF2 for key derivation from a user-supplied master password.
 */

export const SecurityService = {
  async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  async encrypt(text: string, password: string): Promise<string> {
    try {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.generateKey(password, salt);
        const enc = new TextEncoder();
        const encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          enc.encode(text)
        );

        const buffer = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength);
        buffer.set(salt, 0);
        buffer.set(iv, salt.byteLength);
        buffer.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength);
        
        return btoa(String.fromCharCode(...buffer));
    } catch (e) {
        console.error("Encryption failed", e);
        throw new Error("Security Error: Encryption failed");
    }
  },

  async decrypt(cipherText: string, password: string): Promise<string> {
    try {
        const binaryString = atob(cipherText);
        const buffer = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        
        const salt = buffer.slice(0, 16);
        const iv = buffer.slice(16, 28);
        const data = buffer.slice(28);
        
        const key = await this.generateKey(password, salt);
        const decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          data
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        console.error("Decryption failed", e);
        throw new Error("Decryption failed. Incorrect Master Password?");
    }
  },

  isEncrypted(text: string): boolean {
      if (!text) return false;
      try {
          return btoa(atob(text)) === text && text.length > 30;
      } catch (e) {
          return false;
      }
  }
};
