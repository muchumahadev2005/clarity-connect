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
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
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
export async function encryptAESKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<string> {
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
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ---------- high level hybrid flow ----------

export async function hybridEncrypt(
  message: string,
  publicKey: CryptoKey,
): Promise<HybridPayload> {
  const aesKey = await generateAESKey();
  const { encryptedData, iv } = await encryptMessage(message, aesKey);
  const encryptedAESKey = await encryptAESKey(aesKey, publicKey);
  return { encryptedData, encryptedAESKey, iv };
}

export async function hybridDecrypt(
  payload: HybridPayload,
  privateKey: CryptoKey,
): Promise<string> {
  const aesKey = await decryptAESKey(payload.encryptedAESKey, privateKey);
  return decryptMessage(payload.encryptedData, aesKey, payload.iv);
}

// ---------- demo recipient keypair (in-memory only) ----------
//
// In a real app the public key would come from the backend / directory and the
// private key would be unlocked from secure local storage (e.g. derived from a
// passphrase via PBKDF2 and never sent to the server). For this UI demo we
// generate one fresh keypair per browser session and keep it only in memory.

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

// ---------- RSA key pair management (localStorage persisted) ----------

const LS_PUBLIC = "securesend.rsa.publicKey";
const LS_PRIVATE = "securesend.rsa.privateKey";

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

export async function loadOrCreateRSAKeyPair(): Promise<{
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
  const pubB64 = localStorage.getItem(LS_PUBLIC);
  const privB64 = localStorage.getItem(LS_PRIVATE);
  if (pubB64 && privB64) {
    try {
      const publicKey = await importPublicKey(pubB64);
      const privateKey = await importPrivateKey(privB64);
      return { publicKey, privateKey, publicKeyB64: pubB64 };
    } catch {
      // fall through and regenerate
    }
  }
  const kp = await generateRSAKeyPair();
  const newPub = await exportPublicKey(kp.publicKey);
  const newPriv = await exportPrivateKey(kp.privateKey);
  localStorage.setItem(LS_PUBLIC, newPub);
  localStorage.setItem(LS_PRIVATE, newPriv);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey, publicKeyB64: newPub };
}

export function clearStoredRSAKeys() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_PUBLIC);
  localStorage.removeItem(LS_PRIVATE);
}
