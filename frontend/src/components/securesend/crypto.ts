/**
 * Hybrid Encryption (AES-GCM + RSA-OAEP) using the Web Crypto API.
 *
 * - AES-GCM 256-bit encrypts the message payload.
 * - RSA-OAEP 2048 (SHA-256) encrypts the raw AES key.
 * - All operations run in the browser. Plaintext and raw keys never leave memory.
 *
 * The "demo keypair" below simulates a recipient's key bundle so the UI can
 * end-to-end demonstrate encrypt/decrypt without a backend. In production,
 * replace getRecipientPublicKey/getOwnPrivateKey with calls to your key store.
 */

export interface HybridPayload {
  /** base64 ciphertext of the message */
  encryptedData: string;
  /** base64 RSA-OAEP encrypted AES raw key */
  encryptedAESKey: string;
  /** base64 12-byte IV used for AES-GCM */
  iv: string;
  /** base64 16-byte PBKDF2 salt (symmetric / password modes only) */
  salt?: string;
}

// ---------- base64 helpers ----------
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ---------- core primitives ----------

/** Generate a fresh AES-GCM 256 key. Extractable so we can wrap it with RSA. */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Encrypt a string with AES-GCM. Returns ciphertext + iv (both base64). */
export async function encryptMessage(
  message: string,
  aesKey: CryptoKey,
): Promise<{ encryptedData: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(message);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);
  return { encryptedData: bufToB64(cipher), iv: bufToB64(iv.buffer) };
}

/** Decrypt AES-GCM ciphertext (throws on tag mismatch / wrong key). */
export async function decryptMessage(
  encryptedData: string,
  aesKey: CryptoKey,
  iv: string,
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(iv)) },
    aesKey,
    b64ToBuf(encryptedData),
  );
  return new TextDecoder().decode(plain);
}

/** Encrypt (wrap) a raw AES key with the recipient's RSA-OAEP public key. */
export async function encryptAESKey(aesKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", aesKey);
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, raw);
  return bufToB64(wrapped);
}

/** Decrypt (unwrap) the AES key with the recipient's RSA-OAEP private key. */
export async function decryptAESKey(
  encryptedAESKey: string,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64ToBuf(encryptedAESKey),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// ---------- high level hybrid flow ----------

export async function hybridEncrypt(
  message: string,
  publicKey: CryptoKey,
  onProgress?: (aesKeyPreview: string, rsaWrappedKeyPreview: string) => void,
): Promise<HybridPayload> {
  const aesKey = await generateAESKey();

  const rawAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
  const rawAesBase64 = bufToB64(rawAesKeyBuffer);
  if (onProgress) onProgress(rawAesBase64, "");

  const { encryptedData, iv } = await encryptMessage(message, aesKey);

  const encryptedAESKey = await encryptAESKey(aesKey, publicKey);
  if (onProgress) onProgress(rawAesBase64, encryptedAESKey);

  return { encryptedData, encryptedAESKey, iv };
}

export async function hybridDecrypt(
  payload: HybridPayload,
  privateKey: CryptoKey,
  onProgress?: (aesKeyPreview: string, rsaWrappedKeyPreview: string) => void,
): Promise<string> {
  if (onProgress) onProgress("Decrypting...", payload.encryptedAESKey);

  const aesKey = await decryptAESKey(payload.encryptedAESKey, privateKey);

  const rawAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
  const rawAesBase64 = bufToB64(rawAesKeyBuffer);

  if (onProgress) onProgress(rawAesBase64, payload.encryptedAESKey);

  return decryptMessage(payload.encryptedData, aesKey, payload.iv);
}

// ---------- demo recipient keypair (in-memory only) ----------
//
// In a real app the public key would come from the backend / directory and the
// private key would be unlocked from secure local storage. For this UI demo we
// keep a browser-session keypair in memory only.

let demoKeyPairPromise: Promise<CryptoKeyPair> | null = null;

function getDemoKeyPair(): Promise<CryptoKeyPair> {
  if (!demoKeyPairPromise) {
    demoKeyPairPromise = crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
  }
  return demoKeyPairPromise;
}

export async function getRecipientPublicKey(): Promise<CryptoKey> {
  return (await getDemoKeyPair()).publicKey;
}

export async function getOwnPrivateKey(): Promise<CryptoKey> {
  return (await getDemoKeyPair()).privateKey;
}

// ---------- RSA key pair management (encrypted-at-rest vault) ----------

const RSA_KEY_KDF_ITERATIONS = 210_000;
const RSA_PRIVATE_KEY_VERSION = 1;
const unlockedPrivateKeyCache = new Map<string, CryptoKey>();

interface StoredEncryptedPrivateKey {
  version: number;
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function getUserSpecificKeys(): { LS_PUBLIC: string; LS_PRIVATE: string } {
  const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
  const userId = userEmail || "default";

  return {
    LS_PUBLIC: `securesend.rsa.publicKey.${userId}`,
    LS_PRIVATE: `securesend.rsa.privateKey.${userId}`,
  };
}

function getUserSpecificVaultKeys(): {
  LS_PUBLIC: string;
  LS_PRIVATE_ENCRYPTED: string;
  LS_PRIVATE_LEGACY: string;
} {
  const { LS_PUBLIC, LS_PRIVATE } = getUserSpecificKeys();
  return {
    LS_PUBLIC,
    LS_PRIVATE_ENCRYPTED: `${LS_PRIVATE}.vault`,
    LS_PRIVATE_LEGACY: LS_PRIVATE,
  };
}

function getCachedPrivateKeyCacheKey(): string {
  return typeof window !== "undefined" ? localStorage.getItem("userEmail") || "default" : "default";
}

export function getPrivateKeyStatus(): "none" | "legacy" | "locked" | "unlocked" {
  if (typeof window === "undefined") return "none";

  const cacheKey = getCachedPrivateKeyCacheKey();
  if (unlockedPrivateKeyCache.has(cacheKey)) return "unlocked";

  const { LS_PRIVATE_ENCRYPTED, LS_PRIVATE_LEGACY } = getUserSpecificVaultKeys();
  if (localStorage.getItem(LS_PRIVATE_ENCRYPTED)) return "locked";
  if (localStorage.getItem(LS_PRIVATE_LEGACY)) return "legacy";
  return "none";
}

export function getStoredPublicKeyB64(): string | null {
  if (typeof window === "undefined") return null;
  const { LS_PUBLIC } = getUserSpecificVaultKeys();
  return localStorage.getItem(LS_PUBLIC);
}

function setStoredEncryptedPrivateKey(blob: StoredEncryptedPrivateKey) {
  const { LS_PRIVATE_ENCRYPTED } = getUserSpecificVaultKeys();
  localStorage.setItem(LS_PRIVATE_ENCRYPTED, JSON.stringify(blob));
}

function getStoredEncryptedPrivateKey(): StoredEncryptedPrivateKey | null {
  if (typeof window === "undefined") return null;
  const { LS_PRIVATE_ENCRYPTED } = getUserSpecificVaultKeys();
  const raw = localStorage.getItem(LS_PRIVATE_ENCRYPTED);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredEncryptedPrivateKey;
    if (
      parsed &&
      parsed.version === RSA_PRIVATE_KEY_VERSION &&
      parsed.kdf === "PBKDF2-SHA-256" &&
      typeof parsed.salt === "string" &&
      typeof parsed.iv === "string" &&
      typeof parsed.ciphertext === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function getStoredLegacyPrivateKeyB64(): string | null {
  if (typeof window === "undefined") return null;
  const { LS_PRIVATE_LEGACY } = getUserSpecificVaultKeys();
  const raw = localStorage.getItem(LS_PRIVATE_LEGACY);
  if (!raw) return null;
  return raw;
}

function clearLegacyPrivateKeyStorage() {
  if (typeof window === "undefined") return;
  const { LS_PRIVATE_LEGACY } = getUserSpecificVaultKeys();
  localStorage.removeItem(LS_PRIVATE_LEGACY);
}

async function deriveVaultKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase.trim()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: RSA_KEY_KDF_ITERATIONS,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPrivateKeyForStorage(
  privateKeyB64: string,
  passphrase: string,
): Promise<StoredEncryptedPrivateKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const vaultKey = await deriveVaultKey(passphrase, salt.buffer);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    vaultKey,
    new TextEncoder().encode(privateKeyB64),
  );

  return {
    version: RSA_PRIVATE_KEY_VERSION,
    kdf: "PBKDF2-SHA-256",
    iterations: RSA_KEY_KDF_ITERATIONS,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    ciphertext: bufToB64(cipher),
  };
}

async function decryptPrivateKeyFromStorage(
  blob: StoredEncryptedPrivateKey,
  passphrase: string,
): Promise<string> {
  const vaultKey = await deriveVaultKey(passphrase, b64ToBuf(blob.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(b64ToBuf(blob.iv)) },
    vaultKey,
    b64ToBuf(blob.ciphertext),
  );
  return new TextDecoder().decode(plain);
}

// Migration: Clear old non-user-specific keys from previous versions
function migrateOldKeys() {
  if (typeof window === "undefined") return;

  const oldPublicKey = localStorage.getItem("securesend.rsa.publicKey");
  const oldPrivateKey = localStorage.getItem("securesend.rsa.privateKey");

  if (oldPublicKey || oldPrivateKey) {
    localStorage.removeItem("securesend.rsa.publicKey");
    localStorage.removeItem("securesend.rsa.privateKey");
  }
}

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", key);
  return bufToB64(spki);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return bufToB64(pkcs8);
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    b64ToBuf(b64.trim()),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"],
  );
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    b64ToBuf(b64.trim()),
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"],
  );
}

export async function createAndStoreRSAKeyPair(passphrase: string): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyB64: string;
}> {
  if (!passphrase.trim()) {
    throw new Error("A device passphrase is required to protect the private key.");
  }

  if (typeof window === "undefined") {
    const kp = await generateRSAKeyPair();
    return {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      publicKeyB64: await exportPublicKey(kp.publicKey),
    };
  }

  migrateOldKeys();
  const kp = await generateRSAKeyPair();
  const newPub = await exportPublicKey(kp.publicKey);
  const newPriv = await exportPrivateKey(kp.privateKey);
  const encryptedPrivateKey = await encryptPrivateKeyForStorage(newPriv, passphrase);
  const { LS_PUBLIC } = getUserSpecificVaultKeys();
  localStorage.setItem(LS_PUBLIC, newPub);
  setStoredEncryptedPrivateKey(encryptedPrivateKey);
  clearLegacyPrivateKeyStorage();
  unlockedPrivateKeyCache.set(getCachedPrivateKeyCacheKey(), kp.privateKey);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey, publicKeyB64: newPub };
}

export async function unlockStoredRSAKeyPair(passphrase?: string): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyB64: string;
}> {
  if (typeof window === "undefined") {
    const kp = await generateRSAKeyPair();
    return {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      publicKeyB64: await exportPublicKey(kp.publicKey),
    };
  }

  migrateOldKeys();

  const { LS_PUBLIC } = getUserSpecificVaultKeys();
  const pubB64 = localStorage.getItem(LS_PUBLIC);
  if (!pubB64) {
    throw new Error("RSA_KEY_SETUP_REQUIRED");
  }

  const cachedKey = unlockedPrivateKeyCache.get(getCachedPrivateKeyCacheKey());
  if (cachedKey) {
    return {
      publicKey: await importPublicKey(pubB64),
      privateKey: cachedKey,
      publicKeyB64: pubB64,
    };
  }

  const encryptedPrivateKey = getStoredEncryptedPrivateKey();
  if (encryptedPrivateKey) {
    if (!passphrase?.trim()) {
      throw new Error("RSA_PRIVATE_KEY_LOCKED");
    }

    try {
      const privateKeyB64 = await decryptPrivateKeyFromStorage(encryptedPrivateKey, passphrase);
      const privateKey = await importPrivateKey(privateKeyB64);
      unlockedPrivateKeyCache.set(getCachedPrivateKeyCacheKey(), privateKey);
      return {
        publicKey: await importPublicKey(pubB64),
        privateKey,
        publicKeyB64: pubB64,
      };
    } catch {
      throw new Error("Incorrect passphrase.");
    }
  }

  const legacyPrivateKey = getStoredLegacyPrivateKeyB64();
  if (legacyPrivateKey) {
    if (!passphrase?.trim()) {
      throw new Error("RSA_PRIVATE_KEY_LOCKED");
    }

    try {
      const privateKey = await importPrivateKey(legacyPrivateKey);
      const encryptedLegacy = await encryptPrivateKeyForStorage(legacyPrivateKey, passphrase);
      setStoredEncryptedPrivateKey(encryptedLegacy);
      clearLegacyPrivateKeyStorage();
      unlockedPrivateKeyCache.set(getCachedPrivateKeyCacheKey(), privateKey);
      return {
        publicKey: await importPublicKey(pubB64),
        privateKey,
        publicKeyB64: pubB64,
      };
    } catch {
      throw new Error("Incorrect passphrase.");
    }
  }

  throw new Error("RSA_KEY_SETUP_REQUIRED");
}

export async function loadOrCreateRSAKeyPair(): Promise<{
  publicKey: CryptoKey;
  privateKey?: CryptoKey;
  publicKeyB64: string;
  requiresSetup: boolean;
}> {
  if (typeof window === "undefined") {
    const kp = await generateRSAKeyPair();
    return {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      publicKeyB64: await exportPublicKey(kp.publicKey),
      requiresSetup: false,
    };
  }

  migrateOldKeys();
  let pubB64 = getStoredPublicKeyB64();
  if (!pubB64) {
    try {
      const generated = await createAndStoreRSAKeyPair("securesend_default");
      pubB64 = generated.publicKeyB64;
    } catch (err) {
      console.error("Auto key generation failed", err);
      throw new Error("RSA_KEY_SETUP_REQUIRED");
    }
  }

  const publicKey = await importPublicKey(pubB64);
  const cacheKey = getCachedPrivateKeyCacheKey();
  let privateKey = unlockedPrivateKeyCache.get(cacheKey);

  if (!privateKey) {
    try {
      const unlocked = await unlockStoredRSAKeyPair("securesend_default");
      privateKey = unlocked.privateKey;
    } catch {
      // ignore, key is locked and passphrase is required
    }
  }

  return {
    publicKey,
    privateKey,
    publicKeyB64: pubB64,
    requiresSetup: false,
  };
}

export function clearStoredRSAKeys() {
  if (typeof window === "undefined") return;
  const { LS_PUBLIC, LS_PRIVATE_ENCRYPTED, LS_PRIVATE_LEGACY } = getUserSpecificVaultKeys();
  localStorage.removeItem(LS_PUBLIC);
  localStorage.removeItem(LS_PRIVATE_ENCRYPTED);
  localStorage.removeItem(LS_PRIVATE_LEGACY);
  unlockedPrivateKeyCache.delete(getCachedPrivateKeyCacheKey());
}

// ---------- high level symmetric flow ----------

export function normalizeSecretKey(secretKey: string): string {
  return secretKey
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

const SYMMETRIC_KDF_ITERATIONS = 210_000;

/**
 * Derives an AES-GCM key from a password.
 *
 * - When `salt` is provided: uses PBKDF2-SHA-256 (secure, new messages).
 * - When `salt` is absent:  falls back to bare SHA-256 hash for backward
 *   compatibility with messages created before this upgrade.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt?: ArrayBuffer,
): Promise<CryptoKey> {
  if (salt) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password.trim()),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations: SYMMETRIC_KDF_ITERATIONS,
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
  }
  // Legacy path (no salt) — SHA-256 hash for backward compatibility.
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password.trim()));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

export async function symmetricEncrypt(
  message: string,
  secretKey: string,
  onProgress?: (aesKeyPreview: string, rsaWrappedKeyPreview: string) => void,
): Promise<HybridPayload> {
  // Generate a fresh random salt for PBKDF2 on every call.
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await deriveKeyFromPassword(secretKey, saltBytes.buffer);

  const rawAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
  const rawAesBase64 = bufToB64(rawAesKeyBuffer);
  if (onProgress) onProgress(rawAesBase64, "N/A (Symmetric)");

  const { encryptedData, iv } = await encryptMessage(message, aesKey);

  return {
    encryptedData,
    encryptedAESKey: "symmetric",
    iv,
    salt: bufToB64(saltBytes.buffer),
  };
}

export async function symmetricDecrypt(
  payload: HybridPayload,
  secretKey: string,
  onProgress?: (aesKeyPreview: string, rsaWrappedKeyPreview: string) => void,
): Promise<string> {
  // Use PBKDF2 when salt is present, fall back to SHA-256 for legacy payloads.
  const saltBuf = payload.salt ? b64ToBuf(payload.salt) : undefined;
  const aesKey = await deriveKeyFromPassword(secretKey, saltBuf);

  const rawAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
  const rawAesBase64 = bufToB64(rawAesKeyBuffer);
  if (onProgress) onProgress(rawAesBase64, "N/A (Symmetric)");

  return decryptMessage(payload.encryptedData, aesKey, payload.iv);
}
