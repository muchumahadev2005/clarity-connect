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
import { HybridSteps } from "./HybridSteps";
import {
  hybridEncrypt,
  importPublicKey,
  loadOrCreateRSAKeyPair,
  normalizeSecretKey,
  symmetricEncrypt,
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
  }) => void | Promise<void>;
}

const expiries = [
  { label: "Off", value: 0 },
  { label: "10 sec", value: 1 / 6 },
  { label: "1 min", value: 1 },
  { label: "10 min", value: 10 },
  { label: "1 hour", value: 60 },
  { label: "1 day", value: 1440 },
];

// ── Hard limits ──────────────────────────────────────────────────────────────
const MAX_VOICE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_RECORDING_SECS = 10; // 10-second cap

// ── Quota helpers (localStorage) ─────────────────────────────────────────────
function getTodayKey(prefix: string) {
  return `${prefix}_${new Date().toISOString().slice(0, 10)}`;
}
function getHourKey(prefix: string) {
  const d = new Date();
  return `${prefix}_${d.toISOString().slice(0, 13)}`; // YYYY-MM-DDTHH
}
function getCount(key: string) {
  return parseInt(localStorage.getItem(key) || "0", 10);
}
function bumpCount(key: string) {
  const n = getCount(key) + 1;
  localStorage.setItem(key, String(n));
  return n;
}

const DAILY_FILE_LIMIT = 5; // file sends per day
const HOURLY_VOICE_LIMIT = 2; // voice sends per hour

export function ComposeModal({ open, onClose, onEncrypt }: Props) {
  const [tab, setTab] = useState<MessageType>("text");
  const [text, setText] = useState("");
  const [protection, setProtection] = useState<ProtectionMode>("quick");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState(10);
  const [viewOnce, setViewOnce] = useState(false);

  const handleToggleViewOnce = () => {
    setViewOnce((prev) => {
      const next = !prev;
      if (next) {
        setExpiry(0);
      } else {
        setExpiry(10);
      }
      return next;
    });
  };
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0); // countdown display
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      toast.error(
        `Audio is too large. Maximum allowed size is ${MAX_VOICE_SIZE_BYTES / 1024 / 1024} MB.`,
      );
      e.target.value = "";
      return;
    }

    setAudioBlob(file);
    setAudioFileName(file.name);
    toast.success("MP3 ready to send securely");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setRecordingSecs(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      stopRecording();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        let options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          options = { mimeType: "audio/ogg;codecs=opus" };
        }
        
        const recorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm;codecs=opus",
          });
          if (blob.size > MAX_VOICE_SIZE_BYTES) {
            setAudioBlob(null);
            setAudioFileName(null);
            toast.error(
              `Audio is too large. Maximum allowed size is ${MAX_VOICE_SIZE_BYTES / 1024 / 1024} MB.`,
            );
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          setAudioBlob(blob);
          setAudioFileName(null);
          stream.getTracks().forEach((t) => t.stop());
        };

        recorder.start();
        setRecording(true);
        setRecordingSecs(0);

        // Auto-stop at MAX_RECORDING_SECS and show live countdown
        let elapsed = 0;
        recordingTimerRef.current = setInterval(() => {
          elapsed += 1;
          setRecordingSecs(elapsed);
          if (elapsed >= MAX_RECORDING_SECS) {
            stopRecording();
            toast.info(`Recording capped at ${MAX_RECORDING_SECS} seconds.`);
          }
        }, 1000);
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
  const [suggestions, setSuggestions] = useState<{ email: string; publicKey?: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Autocomplete email search suggestions
  useEffect(() => {
    const query = hybridReceiver.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const apiUrl = `/users/search?q=${encodeURIComponent(query)}&protection=${protection}`;
        const res = await api.get(apiUrl);
        if (res.data && res.data.data) {
          setSuggestions(res.data.data);
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      }
    }, 150); // Small debounce for autocomplete suggestions

    return () => clearTimeout(timer);
  }, [hybridReceiver, protection]);

  const [aesKeyPreview, setAesKeyPreview] = useState("");
  const [rsaWrappedKeyPreview, setRsaWrappedKeyPreview] = useState("");
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
            const user = res.data.data.find(
              (u: { email: string; publicKey?: string }) =>
                u.email.toLowerCase() === trimmedEmail.toLowerCase(),
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

  // Auto-generate a secret key when "key" mode is selected and field is empty.
  useEffect(() => {
    if (protection === "key") {
      // Auto-generate a fresh key whenever switching into key mode.
      setPassword(generateSecretKey());
      setKeyPulse(true);
      setTimeout(() => setKeyPulse(false), 700);
      setTimeout(() => keyInputRef.current?.focus(), 50);
    } else {
      // Clear whatever was in the password field when switching to any other
      // mode — prevents the auto-generated key leaking into the Password field.
      setPassword("");
    }
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
      : protection === "password"
        ? !password
          ? "Password is required"
          : password.length < 6
            ? "Use a stronger password"
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
    setEncStep(0);
    setHybridReceiver("");
    setHybridReceiverPubKey("");
    setAesKeyPreview("");
    setRsaWrappedKeyPreview("");
  };

  const submit = async () => {
    let finalContent = text;
    let attachmentName: string | undefined;

    // Enforce quotas
    if (tab === "file") {
      const dailyKey = getTodayKey("file_sends");
      if (getCount(dailyKey) >= DAILY_FILE_LIMIT) {
        toast.error(`Daily limit reached. You can only send ${DAILY_FILE_LIMIT} files per day.`);
        return;
      }
    } else if (tab === "voice") {
      const hourlyKey = getHourKey("voice_sends");
      const isLoggedIn = typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true";
      const limit = isLoggedIn ? 10 : HOURLY_VOICE_LIMIT;
      if (getCount(hourlyKey) >= limit) {
        toast.error(
          `Hourly limit reached. You can only send ${limit} voice messages per hour.`,
        );
        return;
      }
    }

    if (tab === "voice") {
      if (!audioBlob) {
        toast.error("Please record audio or upload an MP3 file first");
        return;
      }
      if (audioBlob.size > MAX_VOICE_SIZE_BYTES) {
        toast.error(
          `Audio is too large. Maximum allowed size is ${MAX_VOICE_SIZE_BYTES / 1024 / 1024} MB.`,
        );
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
        toast.error(
          `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
        );
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
    if (keyError) {
      toast.error(keyError);
      return;
    }
    const resolvedRecipient = hybridReceiver.trim();

    if (sendMode === "direct" && !resolvedRecipient) {
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
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : import.meta.env.VITE_APP_URL || "https://securesend.co.in";
    const link = `${origin}/m/${Math.random().toString(36).slice(2, 10)}`;
    try {
      setEncStep(1);

      let encrypted: EncryptedPayload;

      if (protection === "key" || protection === "password" || protection === "quick") {
        setEncStep(2);
        const secret =
          protection === "quick"
            ? "securesend_default"
            : protection === "key"
              ? normalizeSecretKey(password)
              : password;

        const envelope = JSON.stringify({
          v: 1,
          protection,
          password: secret || null,
          body: finalContent,
        });

        const base = await symmetricEncrypt(envelope, secret, (aesBase64, wrappedBase64) => {
          setAesKeyPreview(aesBase64);
          setRsaWrappedKeyPreview(wrappedBase64);
        });

        encrypted = {
          ...base,
          mode: "demo",
          receiver: null,
        };
      } else {
        // Hybrid mode (uses RSA)
        // Step 1: select RSA public key.
        let publicKey: CryptoKey;
        try {
          publicKey = await importPublicKey(hybridReceiverPubKey);
        } catch {
          throw new Error("Invalid receiver public key");
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
        encrypted = {
          ...base,
          mode: "hybrid",
          receiver: hybridReceiver.trim(),
        };
      }
      setEncStep(3);
      await new Promise((r) => setTimeout(r, 2500)); // Pause briefly so user can read the AES key and see the encryption in action
      setEncStep(4);
      await onEncrypt({
        type: tab,
        content: finalContent,
        protection,
        password:
          protection === "hybrid"
            ? ""
            : protection === "quick"
              ? "securesend_default"
              : protection === "key"
                ? normalizeSecretKey(password)
                : password,
        expiry,
        viewOnce,
        link,
        sendMode,
        recipient: sendMode === "direct" ? resolvedRecipient : null,
        attachmentName,
        encrypted,
      });

      // Bump quotas
      if (tab === "file") {
        bumpCount(getTodayKey("file_sends"));
      } else if (tab === "voice") {
        bumpCount(getHourKey("voice_sends"));
      }

      reset();
    } catch (err) {
      console.error("Hybrid encryption failed", err);
      toast.error(err instanceof Error ? err.message : "Encryption failed. Please try again.");
      setEncStep(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 animate-fade-in">
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
                  ? `Recording… ${MAX_RECORDING_SECS - recordingSecs}s remaining`
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
              <p className="text-xs text-muted-foreground">Max 8 MB · Encrypted in your browser</p>
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
                    toast.error(
                      `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
                    );
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
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-3">
              {(
                [
                  { id: "quick", label: "Quick", icon: Sparkles },
                  { id: "key", label: "Secret Key", icon: KeyRound },
                  { id: "password", label: "Password", icon: Lock },
                  { id: "hybrid", label: "Hybrid", icon: ShieldCheck },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProtection(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-1.5 py-3 text-[11px] sm:text-xs transition text-center",
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
                <div className="relative">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Receiver
                  </label>
                  <input
                    value={hybridReceiver}
                    onChange={(e) => {
                      setHybridReceiver(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter receiver email (public key will auto-load)"
                    className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setShowSuggestions(false)}
                      />
                      <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-floating scrollbar-thin">
                        {suggestions.map((s) => (
                          <button
                            key={s.email}
                            type="button"
                            onClick={() => {
                              setHybridReceiver(s.email);
                              setHybridReceiverPubKey(s.publicKey || "");
                              setShowSuggestions(false);
                            }}
                            className="flex w-full items-center px-4 py-2.5 text-left text-xs hover:bg-secondary transition-colors"
                          >
                            <span className="font-medium text-foreground">{s.email}</span>
                            {s.publicKey && (
                              <span className="ml-auto rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                Key Found
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
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
            {protection === "password" && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary ring-1 ring-primary/20">
                  <Lock className="h-3 w-3" /> Password Protected
                </div>
                <div
                  className={cn(
                    "flex items-stretch gap-2 rounded-xl border bg-surface p-1.5 transition-all",
                    "border-border focus-within:border-primary focus-within:shadow-[0_0_0_4px_oklch(var(--primary)/0.12)]",
                  )}
                >
                  <div className="flex items-center pl-2 text-primary">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Enter a password"
                    className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
                {keyError ? (
                  <p className="text-[11px] font-medium text-destructive">{keyError}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    🔐 The recipient will need this password to decrypt the message.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Expiry */}
          <div className={cn("transition-opacity duration-200", viewOnce && "opacity-50 pointer-events-none")}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Self-destruct
            </p>
            <div className="flex flex-wrap gap-2">
              {expiries.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  disabled={viewOnce}
                  onClick={() => setExpiry(e.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    !viewOnce && expiry === e.value
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
              onClick={handleToggleViewOnce}
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

            {sendMode === "direct" && protection !== "hybrid" && (
              <div className="mt-2 relative">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Receiver
                </label>
                <input
                  value={hybridReceiver}
                  onChange={(e) => {
                    setHybridReceiver(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Enter receiver email"
                  className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setShowSuggestions(false)}
                    />
                    <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-floating scrollbar-thin">
                      {suggestions.map((s) => (
                        <button
                          key={s.email}
                          type="button"
                          onClick={() => {
                            setHybridReceiver(s.email);
                            setHybridReceiverPubKey(s.publicKey || "");
                            setShowSuggestions(false);
                          }}
                          className="flex w-full items-center px-4 py-2.5 text-left text-xs hover:bg-secondary transition-colors"
                        >
                          <span className="font-medium text-foreground">{s.email}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
            disabled={encStep > 0}
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
