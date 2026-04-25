import { useEffect, useState } from "react";
import {
  Lock,
  KeyRound,
  Eye,
  Timer,
  Trash2,
  Reply,
  Forward,
  ShieldCheck,
  FileText,
  Download,
  EyeOff,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import type { SecureMessage } from "./types";
import { formatCountdown, timeAgo } from "./utils";
import { VoicePlayer } from "./VoicePlayer";
import { toast } from "sonner";

interface Props {
  message: SecureMessage | null;
  onDelete: (id: string) => void;
  onMarkViewed: (id: string) => void;
}

export function MessageDetail({ message, onDelete, onMarkViewed }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setUnlocked(message?.protection === "quick");
    setPwd("");
    setRevealed(false);
  }, [message?.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!message) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center text-muted-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
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

  const expiresIn = new Date(message.expiresAt).getTime() - now;
  const isExpired = expiresIn <= 0 || message.status === "expired";

  const handleUnlock = () => {
    if (message.password && pwd !== message.password) {
      toast.error("Incorrect password or key.");
      return;
    }
    setUnlocked(true);
    onMarkViewed(message.id);
    toast.success("Message decrypted");
  };

  return (
    <div className="flex h-full flex-col bg-surface animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold tracking-tight">
              {message.stealth && !revealed ? "Status update" : message.preview}
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            From <span className="font-medium text-foreground">{message.sender}</span> ·{" "}
            {timeAgo(message.timestamp)}
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

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-muted px-6 py-2.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" /> End-to-end encrypted
        </span>
        {message.protection !== "quick" && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {message.protection === "password" ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            {message.protection === "password" ? "Password protected" : "Secret key"}
          </span>
        )}
        {message.viewOnce && (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> View once
          </span>
        )}
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-medium tabular-nums ${
            isExpired
              ? "bg-destructive/15 text-destructive"
              : expiresIn < 60_000
                ? "bg-warning/20 text-warning-foreground"
                : "bg-primary-soft text-accent-foreground"
          }`}
        >
          <Timer className="h-3.5 w-3.5" />
          {isExpired ? "Expired" : `Self-destructs in ${formatCountdown(expiresIn)}`}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {isExpired ? (
          <ExpiredState />
        ) : !unlocked ? (
          <LockScreen
            mode={message.protection}
            value={pwd}
            onChange={setPwd}
            onUnlock={handleUnlock}
          />
        ) : (
          <UnlockedBody message={message} revealed={revealed} setRevealed={setRevealed} />
        )}
      </div>
    </div>
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
      className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        danger ? "hover:bg-destructive/10 text-destructive" : "hover:bg-secondary text-foreground/70"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ExpiredState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
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
}: {
  mode: "password" | "key" | "quick";
  value: string;
  onChange: (v: string) => void;
  onUnlock: () => void;
}) {
  const Icon = mode === "key" ? KeyRound : Lock;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center animate-scale-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        {mode === "key" ? "Enter secret key" : "Enter password"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        This message is encrypted. Enter the {mode === "key" ? "key" : "password"} provided by the
        sender to decrypt it.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2">
        <input
          type={mode === "key" ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onUnlock()}
          placeholder={mode === "key" ? "SK-XXXX-XXXX" : "••••••••"}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-center font-mono tracking-wider outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={onUnlock}
          className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-elegant hover:opacity-95 transition"
        >
          Unlock & Decrypt
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Hint for demo: try <span className="font-mono">demo1234</span> or{" "}
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
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface-muted p-5 text-sm leading-relaxed">
          All systems nominal. Latency steady at 42ms across regions. Dashboards green.
        </div>
        <button
          onClick={() => setRevealed(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition"
        >
          <EyeOff className="h-3.5 w-3.5" /> This message contains hidden content — reveal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {message.type === "voice" && <VoicePlayer />}
      {message.type === "file" && (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{message.preview}</p>
              <p className="text-xs text-muted-foreground">Encrypted attachment</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95">
            <Download className="h-3.5 w-3.5" /> Decrypt & download
          </button>
        </div>
      )}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {message.content}
      </p>
      {message.viewOnce && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-warning-foreground">
          ⚠️ This is a view-once message. It will self-destruct after you leave this page.
        </div>
      )}
    </div>
  );
}