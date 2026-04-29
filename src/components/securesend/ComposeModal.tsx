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
} from "lucide-react";
import type { MessageType, ProtectionMode } from "./types";
import { cn } from "@/lib/utils";
import { UserSearch } from "./UserSearch";
import { HybridSteps } from "./HybridSteps";
import { hybridEncrypt, getRecipientPublicKey } from "./crypto";
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

export function ComposeModal({ open, onClose, onEncrypt }: Props) {
  const [tab, setTab] = useState<MessageType>("text");
  const [text, setText] = useState("");
  const [protection, setProtection] = useState<ProtectionMode>("quick");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState(10);
  const [viewOnce, setViewOnce] = useState(false);
  const [recording, setRecording] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<"link" | "direct">("link");
  const [recipient, setRecipient] = useState<string | null>(null);
  const [encStep, setEncStep] = useState(0); // 0 idle, 1-3 steps, 4 done
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyPulse, setKeyPulse] = useState(false);
  const keyInputRef = useRef<HTMLInputElement | null>(null);

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
    setFileName(null);
    setSendMode("link");
    setRecipient(null);
    setEncStep(0);
  };

  const submit = async () => {
    const content =
      tab === "text" ? text : tab === "voice" ? "Voice note · 0:24" : fileName ?? "attachment.bin";
    if (!content.trim()) return;
    const link = `https://securesend.app/m/${Math.random().toString(36).slice(2, 10)}`;
    try {
      // Real hybrid encryption with Web Crypto API.
      // Step 1: generate AES key (inside hybridEncrypt)
      setEncStep(1);
      const publicKey = await getRecipientPublicKey();
      // Step 2: encrypt message with AES-GCM
      setEncStep(2);
      // Bind the password/secret-key (if any) to the plaintext envelope so the
      // recipient must supply it to access the decoded payload. The transport
      // ciphertext itself is always AES+RSA.
      const envelope = JSON.stringify({
        v: 1,
        protection,
        password: password || null,
        body: content,
      });
      const encrypted = await hybridEncrypt(envelope, publicKey);
      // Step 3: AES key wrapped with RSA (done inside hybridEncrypt)
      setEncStep(3);
      await new Promise((r) => setTimeout(r, 250));
      setEncStep(4);
      onEncrypt({
        type: tab,
        content,
        protection,
        password,
        expiry,
        viewOnce,
        link,
        sendMode,
        recipient,
        encrypted,
      });
      reset();
    } catch (err) {
      console.error("Hybrid encryption failed", err);
      toast.error("Encryption failed. Please try again.");
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
              <HybridSteps mode="encrypt" step={encStep} />
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
                onClick={() => setRecording((r) => !r)}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full text-primary-foreground transition shadow-elegant",
                  recording ? "bg-destructive animate-pulse" : "bg-primary",
                )}
              >
                {recording ? <Square className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </button>
              <p className="mt-3 text-sm text-muted-foreground">
                {recording ? "Recording… tap to stop" : "Tap to record"}
              </p>
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
              <p className="text-xs text-muted-foreground">Max 25 MB · Encrypted in your browser</p>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          )}

          {/* Protection */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Protection
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "quick", label: "Quick", icon: Sparkles },
                  { id: "password", label: "Password", icon: Lock },
                  { id: "key", label: "Secret Key", icon: KeyRound },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProtection(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs transition",
                    protection === p.id
                      ? "border-primary bg-primary-soft text-accent-foreground font-medium"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  <p.icon className="h-4 w-4" />
                  {p.label}
                </button>
              ))}
            </div>
            {protection === "password" && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a password"
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
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
                  viewOnce ? "left-[22px]" : "left-0.5",
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
                    <p
                      className={cn(
                        "text-sm font-medium",
                        sendMode === m.id && "text-primary",
                      )}
                    >
                      {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {sendMode === "direct" && (
              <div className="mt-2 animate-fade-in">
                <UserSearch selected={recipient} onSelect={setRecipient} />
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