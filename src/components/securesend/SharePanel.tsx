import { Copy, X, Check, ShieldCheck, Lock, Eye, Timer, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  link: string;
  summary: { protection: string; expiry: string; viewOnce: boolean };
  onClose: () => void;
}

export function SharePanel({ open, link, summary, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-floating animate-scale-in">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Encrypted & ready to share</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Send this link to your recipient. They'll need to unlock to view.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-2">
          <code className="flex-1 truncate text-xs font-mono">{link}</code>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-95"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Summary icon={Lock} label={summary.protection} />
          <Summary icon={Timer} label={summary.expiry} />
          <Summary icon={Eye} label={summary.viewOnce ? "View once" : "Multi view"} />
        </div>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Secure message: ${link}`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <MessageCircle className="h-4 w-4 text-success" /> Share on WhatsApp
        </a>
      </div>
    </div>
  );
}

function Summary({ icon: Icon, label }: { icon: typeof Lock; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-surface-muted px-2 py-3 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}