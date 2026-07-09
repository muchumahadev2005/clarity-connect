export type MessageType = "text" | "voice" | "file";
export type Folder = "inbox" | "sent" | "expired" | "logs";
export type ProtectionMode = "quick" | "password" | "key" | "hybrid";

export interface AccessLog {
  viewedAt: string;
  ip: string;
  device: string;
  viewer?: string;
}

export interface EncryptedPayload {
  /** base64 AES-GCM ciphertext */
  encryptedData: string;
  /** base64 RSA-OAEP wrapped AES key */
  encryptedAESKey: string;
  /** base64 12-byte IV */
  iv: string;
  /** base64 salt used for KDF (password / key-derivation modes) */
  salt?: string;
  /** base64 IV used to encrypt the AES key itself (hybrid mode) */
  keyIv?: string;
  /** Which high-level encryption mode was used (e.g. "password", "key", "hybrid") */
  encryptionMode?: string;
  /** Key-derivation function identifier (e.g. "pbkdf2", "scrypt") */
  kdf?: string;
  /** Number of KDF iterations */
  kdfIterations?: number;
  /** AES algorithm variant (e.g. "AES-GCM", "AES-CBC") */
  aesAlgorithm?: string;
  /** RSA algorithm variant (e.g. "RSA-OAEP") */
  rsaAlgorithm?: string;
  /** Encryption mode used for this payload */
  mode?: "hybrid" | "demo";
  /** Optional receiver identifier (email or username) — UI only */
  receiver?: string | null;
}

export interface SecureMessage {
  id: string;
  folder: Exclude<Folder, "logs">;
  sender: string;
  preview: string;
  content: string;
  type: MessageType;
  protection: ProtectionMode;
  password?: string;
  expiresAt: string | null; // ISO
  viewOnce: boolean;
  status: "new" | "viewed" | "expired";
  timestamp: string; // ISO
  views: number;
  logs: AccessLog[];
  stealth?: boolean;
  /** Real hybrid (AES + RSA) ciphertext, when encrypted in-browser. */
  encrypted?: EncryptedPayload;
}
