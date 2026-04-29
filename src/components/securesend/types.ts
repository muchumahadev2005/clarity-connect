export type MessageType = "text" | "voice" | "file";
export type Folder = "inbox" | "sent" | "expired" | "logs";
export type ProtectionMode = "quick" | "password" | "key";

export interface AccessLog {
  viewedAt: string;
  ip: string;
  device: string;
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
  expiresAt: string; // ISO
  viewOnce: boolean;
  status: "new" | "viewed" | "expired";
  timestamp: string; // ISO
  views: number;
  logs: AccessLog[];
  stealth?: boolean;
}