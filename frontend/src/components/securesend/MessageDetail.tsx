import { useEffect, useState } from "react";
import {
  Lock,
  KeyRound,
  Eye,
  Trash2,
  Reply,
  Forward,
  ShieldCheck,
  FileText,
  Download,
  EyeOff,
  AlertTriangle,
  Inbox,
  Loader2,
  Sparkles,
  Unlock,
} from "lucide-react";
import type { SecureMessage } from "./types";
import { timeAgo } from "./utils";
import { VoicePlayer } from "./VoicePlayer";
import { CircularTimer } from "./CircularTimer";
import { toast } from "sonner";
import { HybridSteps } from "./HybridSteps";
import { hybridDecrypt, loadOrCreateRSAKeyPair, importPrivateKey } from "./crypto";

interface Props {
  message: SecureMessage | null;
  onDelete: (id: string) => void;
  onMarkViewed: (id: string) => void;
}

// Use a stable reference time for SSR/first paint to avoid hydration mismatch.
function useStableNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function MessageDetail({ message, onDelete, onMarkViewed }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptStep, setDecryptStep] = useState(0);
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [aesKeyPreview, setAesKeyPreview] = useState("");
  const [rsaWrappedKeyPreview, setRsaWrappedKeyPreview] = useState("");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const now = useStableNow(!!message);

  useEffect(() => {
    // Quick and hybrid messages auto-open (unless hybrid now requires manual key entry).
    // If a message has a real encrypted payload, we don't set 'unlocked' to true
    // immediately; we let handleUnlock() perform the decryption first.
    const isQuick = message?.protection === "quick";
    const needsDecryption = !!message?.encrypted;

    setUnlocked(isQuick && !needsDecryption);
    setPwd("");
    setRevealed(false);
    setDecrypting(false);
    setDecryptStep(0);
    setDecryptedBody(isQuick && !needsDecryption ? message.content : null);
    setAesKeyPreview("");
    setRsaWrappedKeyPreview("");
    setPrivateKeyInput("");
    if (message?.protection === "hybrid") {
      const userEmail = localStorage.getItem("userEmail");
      if (userEmail) {
        const pk = localStorage.getItem(`securesend.rsa.privateKey.${userEmail}`);
        if (pk) setPrivateKeyInput(pk);
      }
    }
  }, [message?.id]);

  // Auto-trigger quick messages, but skip hybrid (requiring manual private key entry)
  useEffect(() => {
    if (
      message &&
      message.protection === "quick" && message.encrypted &&
      !unlocked &&
      !decrypting &&
      decryptStep === 0
    ) {
      handleUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id, unlocked]);

  if (!message) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center text-muted-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Inbox className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">Select a message</h3>
        <p className="mt-1 max-w-sm text-sm">
          Choose a secure message from the list to decrypt and read it. Your messages stay
          end-to-end encrypted.
        </p>
      </div>
    );
  }

  const expiresAtMs = message.expiresAt ? new Date(message.expiresAt).getTime() : null;
  const createdAtMs = new Date(message.timestamp).getTime();
  const totalMs = expiresAtMs ? Math.max(1, expiresAtMs - createdAtMs) : 0;
  const remainingMs = expiresAtMs == null ? 0 : (now == null ? expiresAtMs - createdAtMs : expiresAtMs - now);
  const isExpired = (expiresAtMs != null && now != null && remainingMs <= 0) || message.status === "expired";

  const handleUnlock = async () => {
    if (decrypting) return;
    setDecrypting(true);
    setDecryptStep(1);
    try {
      // If we have a real hybrid payload, decrypt it with Web Crypto.
      if (message.encrypted) {
        await new Promise((r) => setTimeout(r, 600)); // Pause to show step 1
        setDecryptStep(2);
        const privateKey =
          message.protection === "hybrid"
            ? await importPrivateKey(privateKeyInput)
            : (await loadOrCreateRSAKeyPair()).privateKey;
        // RSA-OAEP unwraps the AES key, then AES-GCM decrypts the body.
        const plaintext = await hybridDecrypt(message.encrypted, privateKey, (aes, rsa) => {
          setAesKeyPreview(aes);
          setRsaWrappedKeyPreview(rsa);
        });
        
        await new Promise((r) => setTimeout(r, 2000)); // Pause to show AES preview
        
        setDecryptStep(3);
        let body = plaintext;
        let requiredPwd: string | null = null;
        try {
          const env = JSON.parse(plaintext);
          if (env && typeof env === "object" && "body" in env) {
            body = String(env.body);
            requiredPwd = env.password ?? null;
          }
        } catch {
          /* not an envelope, treat plaintext as body */
        }
        if (message.protection !== "hybrid" && requiredPwd && pwd.trim() !== String(requiredPwd).trim()) {
          throw new Error("Invalid key or corrupted data");
        }
        setDecryptedBody(body);
      } else {
        // Legacy / mock messages: simulate steps and check password locally.
        await new Promise((r) => setTimeout(r, 350));
        setDecryptStep(2);
        await new Promise((r) => setTimeout(r, 350));
        setDecryptStep(3);
        if (message.password && pwd.trim() !== String(message.password).trim()) {
          throw new Error("Invalid key or corrupted data");
        }
        setDecryptedBody(message.content);
      }
      await new Promise((r) => setTimeout(r, 250));
      setDecryptStep(4);
      setUnlocked(true);
      onMarkViewed(message.id);
      toast.success("Message decrypted securely");
    } catch (err) {
      console.error("Decryption failed", err);
      toast.error("Invalid key or corrupted data");
      setDecryptStep(0);
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-surface animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-foreground px-6 py-4 text-background">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold tracking-tight">Encrypted Message</h3>
          <div className="flex items-center gap-1.5 text-xs text-background/60">
            <span>From</span>
            <span className="font-medium text-background/90">{message.sender}</span>
            <span className="opacity-40">·</span>
            <span>{timeAgo(message.timestamp)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 hover:bg-background/10 transition-colors">
            <Reply className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 hover:bg-background/10 transition-colors">
            <Forward className="h-4 w-4" />
          </button>
          <button
            className="rounded-full p-2 hover:bg-destructive/20 hover:text-destructive transition-colors"
            onClick={() => {
              onDelete(message.id);
              toast.success("Message destroyed");
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Security status bar */}
      <div className="border-b border-border bg-linear-to-r from-primary-soft/60 via-surface-muted to-surface-muted px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            icon={ShieldCheck}
            label="End-to-End Encrypted"
            tone="success"
          />
          {message.protection === "hybrid" && (
            <StatusChip icon={KeyRound} label="Hybrid: AES + RSA" tone="primary" />
          )}
          {message.protection === "password" && (
            <StatusChip icon={Lock} label="Password Protected" tone="primary" />
          )}
          {message.protection === "key" && (
            <StatusChip icon={KeyRound} label="Key Protected" tone="key" />
          )}
          {message.protection === "quick" && (
            <StatusChip icon={Sparkles} label="Quick Encryption" tone="success" />
          )}
          {message.viewOnce && (
            <StatusChip icon={Eye} label="View Once" tone="warning" />
          )}
          {expiresAtMs && (
            <div className="ml-auto">
              <CircularTimer remainingMs={remainingMs} totalMs={totalMs} expired={isExpired} />
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {isExpired ? (
          <ExpiredState />
        ) : !unlocked ? (
          <>
            {message.protection === "hybrid" ? (
              <div className="mx-auto mt-6 max-w-md animate-fade-in bg-surface p-5 border border-primary/20 rounded-2xl shadow-floating">
                <div className="flex items-center gap-2 mb-3 text-primary">
                  <KeyRound className="h-5 w-5" />
                  <h4 className="font-semibold">Decrypt Hybrid Message</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Please provide your RSA Private Key to decrypt the AES key, which will in turn unlock this message. (Pre-filled from local storage if available).
                </p>
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value)}
                  placeholder="Paste your base64 RSA private key here..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-surface-muted px-4 py-3 text-[10px] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
                  spellCheck={false}
                />
                <button
                  onClick={handleUnlock}
                  disabled={!privateKeyInput.trim() || decrypting}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Unlock className="h-4 w-4" />
                  {decrypting ? "Decrypting..." : "Decrypt AES Key & Message"}
                </button>
              </div>
            ) : (
              <LockScreen
                mode={message.protection as "key" | "quick"}
                value={pwd}
                onChange={setPwd}
                onUnlock={handleUnlock}
                decrypting={decrypting}
                expired={isExpired}
              />
            )}
            {decrypting && (
              <div className="mx-auto mt-6 max-w-md animate-fade-in">
                <HybridSteps 
                  mode="decrypt" 
                  step={decryptStep} 
                  aesKeyPreview={aesKeyPreview}
                  rsaWrappedKeyPreview={rsaWrappedKeyPreview}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Decrypting securely…
                </p>
              </div>
            )}
          </>
        ) : isExpired ? (
          <ExpiredState />
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[11px] font-medium text-success ring-1 ring-success/20 animate-fade-in">
              <ShieldCheck className="h-3.5 w-3.5" /> Decrypted securely · {message.protection === "hybrid" ? "Hybrid AES + RSA" : "Quick Encryption"}
            </div>
            <UnlockedBody
              message={message}
              revealed={revealed}
              setRevealed={setRevealed}
              decryptedBody={decryptedBody}
              unlocked={unlocked}
            />
          </>
        )}
      </div>
    </div>
  );
}

function StatusChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof Lock;
  label: string;
  tone: "success" | "primary" | "key" | "warning" | "flash";
}) {
  const tones: Record<string, string> = {
    success: "bg-success-soft text-success ring-success/20",
    primary: "bg-primary-soft text-primary ring-primary/20",
    key: "bg-key-soft text-key ring-key/20",
    warning: "bg-warning-soft text-warning-foreground ring-warning/30",
    flash: "bg-flash-soft text-flash-foreground ring-flash/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${tones[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function IconBtn({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Reply;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${
        danger ? "hover:bg-destructive/10 text-destructive" : "hover:bg-secondary text-foreground/70"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ExpiredState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-destructive/10 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="h-10 w-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-surface border-2 border-background text-destructive shadow-lg">
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground">Message Self-Destructed</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        The security timer for this message has reached zero. All encrypted content and keys have been permanently wiped from our systems.
      </p>
      <div className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-destructive/60">
          <ShieldCheck className="h-3 w-3" /> Zero-Knowledge Security
        </div>
        <div className="h-1 w-32 rounded-full bg-border overflow-hidden">
          <div className="h-full w-full bg-destructive/30" />
        </div>
      </div>
    </div>
  );
}

function HybridDecryptingScreen() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-scale-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-primary to-[oklch(0.65_0.18_290)] text-primary-foreground animate-glow-pulse">
          <Loader2 className="h-9 w-9 animate-spin" />
        </div>
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight">Decrypting securely…</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Unwrapping the AES key with your private key. Only you can read this message.
      </p>
    </div>
  );
}

function LockScreen({
  mode,
  value,
  onChange,
  onUnlock,
  decrypting,
  expired,
}: {
  mode: "password" | "key" | "quick";
  value: string;
  onChange: (v: string) => void;
  onUnlock: () => void;
  decrypting: boolean;
  expired?: boolean;
}) {
  const Icon = mode === "key" ? KeyRound : Lock;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-scale-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-primary to-[oklch(0.65_0.18_240)] text-primary-foreground animate-glow-pulse ${
            decrypting ? "animate-unlock" : ""
          }`}
        >
          {decrypting ? <Unlock className="h-9 w-9" /> : <Icon className="h-9 w-9" />}
        </div>
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight">
        {mode === "key" ? "Enter secret key" : "Enter password"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Only authorized users can decrypt this message.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <input
          type={mode === "key" ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onUnlock()}
          placeholder={mode === "key" ? "SK-XXXX-XXXX" : "••••••••"}
          autoFocus
          disabled={decrypting}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-center font-mono tracking-wider outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/15 focus:scale-[1.01] disabled:opacity-60"
        />
        <button
          onClick={onUnlock}
          disabled={decrypting || expired}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
        >
          {decrypting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Decrypting…
            </>
          ) : expired ? (
            <>
              <AlertTriangle className="h-4 w-4" /> Link Expired
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" /> Unlock & Decrypt
            </>
          )}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Demo: try <span className="font-mono">demo1234</span> or{" "}
        <span className="font-mono">SK-9F2A-7C81</span>
      </p>
    </div>
  );
}

function UnlockedBody({
  message,
  revealed,
  setRevealed,
  decryptedBody,
  unlocked,
}: {
  message: SecureMessage;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
  decryptedBody?: string | null;
  unlocked: boolean;
}) {
  if (message.stealth && !revealed) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-2xl border border-border bg-surface-muted p-5 text-sm leading-relaxed">
          All systems nominal. Latency steady at 42ms across regions. Dashboards green.
        </div>
        <button
          onClick={() => setRevealed(true)}
          className="group inline-flex items-center gap-2 rounded-full border border-dashed border-primary/40 bg-primary-soft/50 px-3.5 py-2 text-xs text-primary transition-all hover:border-primary hover:bg-primary-soft"
        >
          <EyeOff className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
          Tap to reveal hidden content
        </button>
      </div>
    );
  }

  const handleDownloadAttachment = async () => {
    if (!unlocked || !decryptedBody) {
      toast.error("Please decrypt the message before downloading.");
      return;
    }

    let fileName = message.preview || "attachment.bin";
    let dataUrl = decryptedBody;

    // New format supports metadata (name/mime) while keeping backward compatibility.
    if (decryptedBody.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(decryptedBody);
        if (parsed && typeof parsed === "object") {
          dataUrl = String(parsed.dataUrl || parsed.data || "");
          fileName = String(parsed.name || parsed.fileName || fileName);
        }
      } catch {
        // keep fallback values
      }
    }

    if (!dataUrl.startsWith("data:")) {
      toast.error("This attachment cannot be downloaded. Ask the sender to re-send the file.");
      return;
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("File decrypted and downloaded.");
    } catch {
      toast.error("Could not download the file. Please try again.");
    }
  };

  return (
    <div className={`space-y-5 ${message.stealth ? "animate-blur-in" : "animate-fade-in"}`}>
      {message.type === "voice" && (
        <VoicePlayer audioSrc={unlocked ? (decryptedBody || undefined) : undefined} />
      )}
      {message.type === "file" && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{message.preview}</p>
              <p className="text-xs text-muted-foreground">Encrypted attachment</p>
            </div>
          </div>
            <button
              onClick={handleDownloadAttachment}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-all hover:opacity-95 active:scale-95"
            >
            <Download className="h-3.5 w-3.5" /> Decrypt & download
          </button>
        </div>
      )}
        {message.type !== "file" && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {unlocked ? (decryptedBody || "[Message is empty]") : message.content}
          </p>
        )}
      {message.viewOnce && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-warning-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This is a view-once message. It will self-destruct after you leave this page.</span>
        </div>
      )}
    </div>
  );
}
