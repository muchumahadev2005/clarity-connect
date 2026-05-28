import { useEffect, useRef, useState } from "react";
import {
  X,
  Type,
  Mic,
  Paperclip,
  Lock,
  KeyRound,
  Sparkles,
  Eye,
  Timer,
  ShieldCheck,
  Square,
  Circle,
  Link2,
  Send,
  Info,
  RefreshCw,
  Copy,
  Check,
  Download,
  Upload,
} from "lucide-react";
import api from "@/lib/api";
import type { MessageType, ProtectionMode } from "./types";
import { cn } from "@/lib/utils";
import { UserSearch } from "./UserSearch";

import { HybridSteps } from "./HybridSteps";
import {
  hybridEncrypt,
  importPublicKey,
  loadOrCreateRSAKeyPair,
} from "./crypto";
import type { EncryptedPayload } from "./types";
import { toast } from "sonner";

function generateSecretKey() {
  const hex = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
  return `SK-${hex()}-${hex()}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onEncrypt: (payload: {
    type: MessageType;
    content: string;
    protection: ProtectionMode;
    password?: string;
    expiry: number; // minutes
    viewOnce: boolean;
    link: string;
    sendMode: "link" | "direct";
    recipient: string | null;
    attachmentName?: string;
    encrypted: EncryptedPayload;
  }) => void;
}

const expiries = [
  { label: "10 sec", value: 1 / 6 },
  { label: "1 min", value: 1 },
  { label: "10 min", value: 10 },
  { label: "1 hour", value: 60 },
  { label: "1 day", value: 1440 },
];

const MAX_VOICE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function ComposeModal({ open, onClose, onEncrypt }: Props) {
  const [tab, setTab] = useState<MessageType>("text");
  const [text, setText] = useState("");
  const [protection, setProtection] = useState<ProtectionMode>("quick");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState(10);
  const [viewOnce, setViewOnce] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);

  const isMp3File = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const validType = file.type === "audio/mpeg" || file.type === "audio/mp3" || file.type === "";
    return lowerName.endsWith(".mp3") && validType;
  };

  const handleMp3Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isMp3File(file)) {
      setAudioBlob(null);
      setAudioFileName(null);
      toast.error("Only MP3 files are supported for upload.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_VOICE_SIZE_BYTES) {
      setAudioBlob(null);
      setAudioFileName(null);
      toast.error("Audio is too large. Maximum allowed size is 50 MB.");
      e.target.value = "";
      return;
    }

    setAudioBlob(file);
    setAudioFileName(file.name);
    toast.success("MP3 ready to send securely");
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (blob.size > MAX_VOICE_SIZE_BYTES) {
            setAudioBlob(null);
            setAudioFileName(null);
            toast.error("Audio is too large. Maximum allowed size is 50 MB.");
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
          setAudioBlob(blob);
          setAudioFileName(null);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        toast.error("Could not access microphone");
      }
    }
  };
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileToEncrypt, setFileToEncrypt] = useState<File | null>(null);
  const [sendMode, setSendMode] = useState<"link" | "direct">("link");
  const [recipient, setRecipient] = useState<string | null>(null);
  const [encStep, setEncStep] = useState(0); // 0 idle, 1-3 steps, 4 done
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyPulse, setKeyPulse] = useState(false);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  // Hybrid mode state
  const [hybridReceiver, setHybridReceiver] = useState("");
  const [hybridReceiverPubKey, setHybridReceiverPubKey] = useState("");
  const [ownPublicKey, setOwnPublicKey] = useState<string>("");
  const [ownKeyCopied, setOwnKeyCopied] = useState(false);
  const [aesKeyPreview, setAesKeyPreview] = useState("");
  const [rsaWrappedKeyPreview, setRsaWrappedKeyPreview] = useState("");

  // Load (or generate) the user's RSA key pair the first time hybrid is opened.
  useEffect(() => {
    if (protection !== "hybrid" || ownPublicKey) return;
    let cancelled = false;
    (async () => {
      try {
        const { publicKeyB64 } = await loadOrCreateRSAKeyPair();
        if (!cancelled) {
          setOwnPublicKey(publicKeyB64);
          // Sync key to backend
          try {
            await api.post("/keys/register", { publicKey: publicKeyB64 });
          } catch (err) {
            console.error("Failed to sync public key", err);
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [protection, ownPublicKey]);

  // Auto-fetch receiver's public key when email is entered in hybrid mode
  useEffect(() => {
    if (protection !== "hybrid" || !hybridReceiver.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const trimmedEmail = hybridReceiver.trim();
        
        // Simple email validation - must contain @ and .
        if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
          console.log("Waiting for complete email...");
          return;
        }

        console.log(`[AUTO-FETCH] Starting fetch for: ${trimmedEmail}`);
        const apiUrl = `/users/search?q=${encodeURIComponent(trimmedEmail)}&protection=hybrid`;
        console.log(`[AUTO-FETCH] API URL: ${apiUrl}`);
        
        const res = await api.get(apiUrl);
        console.log(`[AUTO-FETCH] Response status:`, res.status);
        console.log(`[AUTO-FETCH] Response data:`, res.data);
        
        if (res.data && res.data.data) {
          console.log(`[AUTO-FETCH] Found ${res.data.data.length} results`);
          
          if (res.data.data.length > 0) {
            // Find exact email match (case-insensitive)
            const user = res.data.data.find((u: any) => 
              u.email.toLowerCase() === trimmedEmail.toLowerCase()
            );
            
            if (user) {
              console.log(`[AUTO-FETCH] Exact match found:`, user);
              if (user.publicKey) {
                console.log(`[AUTO-FETCH] ✅ Public key found! Auto-loading...`);
                setHybridReceiverPubKey(user.publicKey);
              } else {
                console.log(`[AUTO-FETCH] ⚠️ User found but NO public key in database`);
              }
            } else {
              console.log(`[AUTO-FETCH] No exact email match (partial matches available)`);
            }
          } else {
            console.log(`[AUTO-FETCH] ❌ No users found`);
          }
        } else {
          console.log(`[AUTO-FETCH] Invalid response format`);
        }
      } catch (err) {
        console.error(`[AUTO-FETCH] Error:`, err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [hybridReceiver, protection]);

  const copyOwnKey = async () => {
    if (!ownPublicKey) return;
    try {
      await navigator.clipboard.writeText(ownPublicKey);
      setOwnKeyCopied(true);
      setTimeout(() => setOwnKeyCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  // Auto-generate a secret key when "key" mode is selected and field is empty.
  useEffect(() => {
    if (protection === "key" && !password) {
      setPassword(generateSecretKey());
      setKeyPulse(true);
      setTimeout(() => setKeyPulse(false), 700);
      setTimeout(() => keyInputRef.current?.focus(), 50);
    }
    // Clear password when leaving protected modes
    if (protection === "quick") setPassword("");
  }, [protection]);

  const regenerateKey = () => {
    setPassword(generateSecretKey());
    setKeyPulse(true);
    setTimeout(() => setKeyPulse(false), 700);
    keyInputRef.current?.focus();
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const downloadKey = () => {
    if (!password) return;
    const blob = new Blob(
      [
        `SecureSend Message Key\n\nKey: ${password}\n\nKeep this key safe. Anyone with this key can decrypt your message.`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securesend-key-${password.slice(-4)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Key downloaded as .txt file");
  };

  const keyError =
    protection === "key"
      ? !password
        ? "Key is required"
        : password.length < 6
          ? "Use a stronger key"
          : null
      : null;

  if (!open) return null;

  const reset = () => {
    setTab("text");
    setText("");
    setProtection("quick");
    setPassword("");
    setExpiry(10);
    setViewOnce(false);
    setRecording(false);
    setAudioBlob(null);
    setAudioFileName(null);
    setFileName(null);
    setFileToEncrypt(null);
    setSendMode("link");
    setRecipient(null);
    setEncStep(0);
    setHybridReceiver("");
    setHybridReceiverPubKey("");
    setAesKeyPreview("");
    setRsaWrappedKeyPreview("");
  };

  const submit = async () => {
    let finalContent = text;
    let attachmentName: string | undefined;
    if (tab === "voice") {
      if (!audioBlob) {
        toast.error("Please record audio or upload an MP3 file first");
        return;
      }
      if (audioBlob.size > MAX_VOICE_SIZE_BYTES) {
        toast.error("Audio is too large. Maximum allowed size is 50 MB.");
        return;
      }
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(audioBlob);
      finalContent = await base64Promise;
    } else if (tab === "file") {
      if (!fileToEncrypt) {
        toast.error("Please choose a file first");
        return;
      }
      if (fileToEncrypt.size > MAX_FILE_SIZE_BYTES) {
        toast.error("File is too large. Maximum allowed size is 50 MB.");
        return;
      }
      attachmentName = fileToEncrypt.name;
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(fileToEncrypt);
      const dataUrl = await base64Promise;
      finalContent = JSON.stringify({
        kind: "file",
        name: fileToEncrypt.name,
        mime: fileToEncrypt.type || "application/octet-stream",
        dataUrl,
      });
    }

    if (!finalContent.trim()) return;
    if (sendMode === "direct" && !recipient) {
      toast.error("Select a user before sending directly");
      return;
    }
    if (protection === "hybrid") {
      if (!hybridReceiver.trim()) {
        toast.error("Enter the receiver email or username");
        return;
      }
      if (!hybridReceiverPubKey.trim()) {
        toast.error("Paste the receiver's public key");
        return;
      }
    }
    const origin = typeof window !== "undefined" ? window.location.origin : (import.meta.env.VITE_APP_URL || "https://securesend.co.in");
    const link = `${origin}/m/${Math.random().toString(36).slice(2, 10)}`;
    try {
      // Real hybrid encryption with Web Crypto API.
      setEncStep(1);
      // Step 1: select RSA public key.
      let publicKey: CryptoKey;
      if (protection === "hybrid") {
        try {
          publicKey = await importPublicKey(hybridReceiverPubKey);
        } catch {
          throw new Error("Invalid receiver public key");
        }
      } else {
        publicKey = (await loadOrCreateRSAKeyPair()).publicKey;
      }
      setEncStep(2);
      // Step 2: encrypt envelope (body + protection metadata) with AES-GCM,
      // then wrap the AES key with the receiver's RSA public key.
      const envelope = JSON.stringify({
        v: 1,
        protection,
        password: password || null,
        body: finalContent,
      });
      const base = await hybridEncrypt(envelope, publicKey, (aesBase64, wrappedBase64) => {
        setAesKeyPreview(aesBase64);
        setRsaWrappedKeyPreview(wrappedBase64);
      });
      const encrypted: EncryptedPayload = {
        ...base,
        mode: "hybrid",
        receiver: protection === "hybrid" ? hybridReceiver.trim() : null,
      };
      setEncStep(3);
      await new Promise((r) => setTimeout(r, 2500)); // Pause briefly so user can read the AES key and see the encryption in action
      setEncStep(4);
      onEncrypt({
        type: tab,
        content: finalContent,
        protection,
        password: protection === "hybrid" ? "" : password,
        expiry,
        viewOnce,
        link,
        sendMode,
        recipient: sendMode === "direct" ? recipient : null,
        attachmentName,
        encrypted,
      });
      reset();
    } catch (err) {
      console.error("Hybrid encryption failed", err);
      toast.error(
        err instanceof Error && err.message === "Invalid receiver public key"
          ? "Invalid receiver public key"
          : "Encryption failed. Please try again.",
      );
      setEncStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:justify-end sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-floating sm:h-auto sm:max-h-[90vh] sm:rounded-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between bg-foreground px-5 py-3 text-background">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4" /> New Secure Message
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-background/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-3">
          {(
            [
              { id: "text", label: "Text", icon: Type },
              { id: "voice", label: "Voice", icon: Mic },
              { id: "file", label: "File", icon: Paperclip },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm border-b-2 -mb-px transition",
                tab === t.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          {/* Hybrid encryption banner */}
          <div className="flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary-soft/60 px-3.5 py-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                Hybrid Encryption Enabled (AES + RSA)
                <span
                  className="group relative inline-flex"
                  title="Your message is encrypted using AES. The encryption key is secured using RSA."
                >
                  <Info className="h-3 w-3 opacity-70" />
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your message is encrypted with AES. The key is secured using RSA so only the
                receiver can decrypt it.
              </p>
            </div>
          </div>

          {encStep > 0 && (
            <div className="animate-fade-in">
              <HybridSteps 
                mode="encrypt" 
                step={encStep} 
                aesKeyPreview={aesKeyPreview}
                rsaWrappedKeyPreview={rsaWrappedKeyPreview}
              />
            </div>
          )}

          {tab === "text" && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your secure message…"
              rows={6}
              className="w-full resize-none rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          )}
          {tab === "voice" && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface-muted py-10">
              <button
                type="button"
                onClick={toggleRecording}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground transition shadow-elegant",
                  recording ? "bg-destructive animate-pulse" : "bg-primary",
                )}
              >
                {recording ? <Square className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                {recording
                  ? "Recording… tap to stop"
                  : audioBlob
                    ? audioFileName
                      ? `Selected: ${audioFileName}`
                      : "Recording saved! Tap to re-record"
                    : "Tap to record"}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioUploadInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-secondary"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload MP3
                </button>
                <input
                  ref={audioUploadInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  className="hidden"
                  onChange={handleMp3Upload}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Only MP3 files are supported</p>
              {audioBlob && !recording && (
                <p className="mt-2 text-[10px] text-success font-medium">
                  ✓ Ready to send securely
                </p>
              )}
              {recording && (
                <div className="mt-4 flex h-8 items-center gap-0.5">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-full bg-primary animate-pulse"
                      style={{ height: `${8 + ((i * 7) % 18)}px`, animationDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === "file" && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface-muted py-10 hover:border-primary transition">
              <Paperclip className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {fileName ?? "Click or drop a file to encrypt"}
              </p>
              <p className="text-xs text-muted-foreground">Max 50 MB · Encrypted in your browser</p>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (!selected) {
                    setFileName(null);
                    setFileToEncrypt(null);
                    return;
                  }
                  if (selected.size > MAX_FILE_SIZE_BYTES) {
                    toast.error("File is too large. Maximum allowed size is 50 MB.");
                    setFileName(null);
                    setFileToEncrypt(null);
                    e.target.value = "";
                    return;
                  }
                  setFileName(selected.name);
                  setFileToEncrypt(selected);
                }}
              />
            </label>
          )}

          {/* Protection */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Protection
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  { id: "quick", label: "Quick", icon: Sparkles },
                  { id: "key", label: "Secret Key", icon: KeyRound },
                  { id: "hybrid", label: "Hybrid 🔐", icon: ShieldCheck },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProtection(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs transition",
                    protection === p.id
                      ? p.id === "hybrid"
                        ? "border-primary bg-linear-to-br from-primary-soft to-[oklch(0.92_0.07_290)] text-primary font-semibold shadow-[0_0_0_4px_oklch(var(--primary)/0.12)]"
                        : "border-primary bg-primary-soft text-accent-foreground font-medium"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <p.icon className="h-4 w-4" />
                  {p.label}
                </button>
              ))}
            </div>
            {protection === "hybrid" && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div className="rounded-xl border border-primary/30 bg-linear-to-br from-primary-soft/70 to-[oklch(0.95_0.05_290)] p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <ShieldCheck className="h-4 w-4" /> Hybrid Encryption Enabled
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    AES + RSA secure encryption. Only the intended receiver can decrypt this
                    message.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Receiver
                  </label>
                  <input
                    value={hybridReceiver}
                    onChange={(e) => setHybridReceiver(e.target.value)}
                    placeholder="Enter receiver email (public key will auto-load)"
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Public Key (Auto-loaded)</span>
                    <button
                      type="button"
                      onClick={() => setHybridReceiverPubKey("")}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Clear
                    </button>
                  </label>
                  <textarea
                    value={hybridReceiverPubKey}
                    onChange={(e) => setHybridReceiverPubKey(e.target.value)}
                    placeholder="Public key will load automatically when you enter a valid email..."
                    rows={3}
                    spellCheck={false}
                    className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 font-mono text-[11px] leading-relaxed outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Public key is automatically fetched from the database when you enter the receiver email.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Your Public Key
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            // Delete from backend database
                            await api.delete('/keys/clear', {
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });
                            
                            // Clear from localStorage
                            const userEmail = localStorage.getItem('userEmail');
                            localStorage.removeItem(`securesend.rsa.publicKey.${userEmail}`);
                            localStorage.removeItem(`securesend.rsa.privateKey.${userEmail}`);
                            
                            setOwnPublicKey('');
                            toast.success('✅ Public key cleared from database and device. Close and reopen hybrid mode to generate new unique key.');
                          } catch (err) {
                            console.error('Failed to clear key', err);
                            toast.error('Failed to clear public key');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-destructive transition hover:bg-red-50 border border-destructive/20"
                      >
                        🔄 Regenerate New Key
                      </button>
                      <button
                        type="button"
                        onClick={copyOwnKey}
                        disabled={!ownPublicKey}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-primary transition hover:bg-primary-soft disabled:opacity-50"
                      >
                        {ownKeyCopied ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Public Key
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 max-h-20 overflow-auto break-all font-mono text-[10px] leading-relaxed text-foreground/70">
                    {ownPublicKey || "Generating your secure key…"}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Share this with anyone who wants to send you a hybrid-encrypted message.
                  </p>
                </div>
              </div>
            )}
            {protection === "key" && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-key-soft px-2.5 py-1 text-[11px] font-medium text-key ring-1 ring-key/20">
                  <ShieldCheck className="h-3 w-3" /> Secure Key Mode Enabled
                </div>
                <div
                  className={cn(
                    "flex items-stretch gap-2 rounded-xl border bg-surface p-1.5 transition-all",
                    keyPulse
                      ? "border-key shadow-[0_0_0_4px_oklch(var(--key)/0.15)]"
                      : "border-border focus-within:border-key focus-within:shadow-[0_0_0_4px_oklch(var(--key)/0.12)]",
                  )}
                >
                  <div className="flex items-center pl-2 text-key">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    ref={keyInputRef}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="SK-XXXX-XXXX"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm font-mono tracking-wider outline-none placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={copyKey}
                    title="Copy key"
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-foreground/70 transition hover:bg-secondary active:scale-95"
                  >
                    {keyCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={downloadKey}
                    title="Download key as .txt"
                    className="inline-flex items-center gap-1 rounded-lg px-2 text-xs font-medium text-foreground/70 transition hover:bg-secondary active:scale-95 border-l border-border/50"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={regenerateKey}
                    title="Generate new key"
                    className="inline-flex items-center gap-1 rounded-lg bg-key-soft px-2.5 text-xs font-medium text-key transition hover:opacity-90 active:scale-95"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", keyPulse && "animate-spin")} />
                    Generate
                  </button>
                </div>
                {keyError ? (
                  <p className="text-[11px] font-medium text-destructive">{keyError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    🔐 This key is required to decrypt the message. Share it separately with the
                    recipient.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Expiry */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Self-destruct
            </p>
            <div className="flex flex-wrap gap-2">
              {expiries.map((e) => (
                <button
                  key={e.label}
                  onClick={() => setExpiry(e.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    expiry === e.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground/80 hover:bg-secondary",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* View once */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">View once</p>
                <p className="text-xs text-muted-foreground">
                  Destroy immediately after first read
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewOnce((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                viewOnce ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                  viewOnce ? "left-5.5" : "left-0.5",
                )}
              />
            </button>
          </label>

          {/* Send mode */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "link", label: "Generate Link", desc: "Share via URL", icon: Link2 },
                  { id: "direct", label: "Send Directly", desc: "To a user", icon: Send },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSendMode(m.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                    sendMode === m.id
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <m.icon
                    className={cn(
                      "mt-0.5 h-4 w-4",
                      sendMode === m.id ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <p className={cn("text-sm font-medium", sendMode === m.id && "text-primary")}>
                      {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {sendMode === "direct" && (
              <div className="mt-2 animate-fade-in">
                <UserSearch
                  selected={recipient}
                  protection={protection}
                  onSelect={(email, publicKey) => {
                    setRecipient(email);
                    setHybridReceiver(email || "");
                    if (publicKey) setHybridReceiverPubKey(publicKey);
                    if (!email) setHybridReceiverPubKey("");
                  }}
                />
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-muted px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {encStep > 0 && encStep < 4
              ? "Encrypting your message…"
              : "Encrypted in your browser · AES + RSA"}
          </span>
          <button
            onClick={submit}
            disabled={(sendMode === "direct" && !recipient) || encStep > 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="h-4 w-4" />
            {encStep > 0
              ? "Encrypting…"
              : sendMode === "direct"
                ? "Encrypt & Send"
                : "Encrypt & Generate Secure Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
