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
  const now = useStableNow(!!message);

  useEffect(() => {
    // Quick messages auto-open.
    setUnlocked(message?.protection === "quick");
    setPwd("");
    setRevealed(false);
    setDecrypting(false);
    setDecryptStep(0);
  }, [message?.id]);

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

  const expiresAtMs = new Date(message.expiresAt).getTime();
  const createdAtMs = new Date(message.timestamp).getTime();
  const totalMs = Math.max(1, expiresAtMs - createdAtMs);
  const remainingMs = now == null ? expiresAtMs - createdAtMs : expiresAtMs - now;
  const isExpired = (now != null && remainingMs <= 0) || message.status === "expired";

  const handleUnlock = () => {
    if (decrypting) return;
    setDecrypting(true);
    setDecryptStep(1);
    setTimeout(() => setDecryptStep(2), 350);
    setTimeout(() => setDecryptStep(3), 700);
    setTimeout(() => {
      if (message.password && pwd !== message.password) {
        toast.error("Unable to decrypt message. Invalid key or access.");
        setDecrypting(false);
        setDecryptStep(0);
        return;
      }
      setDecryptStep(4);
      setUnlocked(true);
      onMarkViewed(message.id);
      toast.success("Message decrypted securely");
      setDecrypting(false);
    }, 1050);
  };

  return (
    <div className="flex h-full flex-col bg-surface animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {message.stealth && !revealed ? "Status update" : message.preview}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            From <span className="font-medium text-foreground">{message.sender}</span> ·{" "}
            <span suppressHydrationWarning>{timeAgo(message.timestamp)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Reply" icon={Reply} />
          <IconBtn label="Forward" icon={Forward} />
          <IconBtn
            label="Delete"
            icon={Trash2}
            danger
            onClick={() => {
              onDelete(message.id);
              toast.success("Message destroyed");
            }}
          />
        </div>
      </div>

      {/* Security status bar */}
      <div className="border-b border-border bg-gradient-to-r from-primary-soft/60 via-surface-muted to-surface-muted px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip
            icon={ShieldCheck}
            label="End-to-End Encrypted"
            tone="success"
          />
          <StatusChip icon={KeyRound} label="Hybrid: AES + RSA" tone="primary" />
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
          <div className="ml-auto">
            <CircularTimer remainingMs={remainingMs} totalMs={totalMs} expired={isExpired} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {isExpired ? (
          <ExpiredState />
        ) : !unlocked ? (
          <>
            <LockScreen
              mode={message.protection as "password" | "key" | "quick"}
              value={pwd}
              onChange={setPwd}
              onUnlock={handleUnlock}
              decrypting={decrypting}
            />
            {decrypting && (
              <div className="mx-auto mt-6 max-w-md animate-fade-in">
                <HybridSteps mode="decrypt" step={decryptStep} />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Decrypting securely…
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[11px] font-medium text-success ring-1 ring-success/20 animate-fade-in">
              <ShieldCheck className="h-3.5 w-3.5" /> Decrypted securely · Hybrid AES + RSA
            </div>
            <UnlockedBody message={message} revealed={revealed} setRevealed={setRevealed} />
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
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">This message has self-destructed</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        The contents are no longer recoverable. The original sender can resend if needed.
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
}: {
  mode: "password" | "key" | "quick";
  value: string;
  onChange: (v: string) => void;
  onUnlock: () => void;
  decrypting: boolean;
}) {
  const Icon = mode === "key" ? KeyRound : Lock;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-scale-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl" />
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.65_0.18_240)] text-primary-foreground animate-glow-pulse ${
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
          disabled={decrypting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
        >
          {decrypting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Decrypting…
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
}: {
  message: SecureMessage;
  revealed: boolean;
  setRevealed: (v: boolean) => void;
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

  return (
    <div className={`space-y-5 ${message.stealth ? "animate-blur-in" : "animate-fade-in"}`}>
      {message.type === "voice" && <VoicePlayer />}
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
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground transition-all hover:opacity-95 active:scale-95">
            <Download className="h-3.5 w-3.5" /> Decrypt & download
          </button>
        </div>
      )}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {message.content}
      </p>
      {message.viewOnce && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-xs text-warning-foreground">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This is a view-once message. It will self-destruct after you leave this page.</span>
        </div>
      )}
    </div>
  );
}

function FirstAccessUnlocking() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-scale-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-flash/40 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-flash to-[oklch(0.62_0.2_40)] text-white animate-unlock shadow-elegant">
          <Unlock className="h-9 w-9" />
        </div>
      </div>
      <h3 className="mt-6 flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Loader2 className="h-4 w-4 animate-spin text-flash" />
        Unlocking secure message…
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        First-access auto unlock in progress. This message will not be available again.
      </p>
    </div>
  );
}

function FirstAccessBanner() {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-flash/40 bg-flash-soft px-4 py-3 text-xs text-flash-foreground animate-fade-in">
      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-flash" />
      <span>
        <span className="font-semibold">One-time view enabled</span> — this message will disappear
        after viewing.
      </span>
    </div>
  );
}

function AlreadyAccessedState({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-destructive/30 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
          <AlertTriangle className="h-8 w-8" />
        </div>
      </div>
      <h3 className="mt-5 text-lg font-semibold">This message has already been accessed</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        For security reasons, this message is no longer available. First-access messages can only
        be opened once.
      </p>
      <button
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground/80 transition-all hover:bg-secondary active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" /> Go Back
      </button>
    </div>
  );
}
