import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster, toast } from "sonner";
import {
  VenetianMask,
  Copy,
  Send,
  Inbox as InboxIcon,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/anonymous")({
  component: AnonymousMail,
  head: () => ({
    meta: [
      { title: "Anonymous Mail 🎭 — SecureSend" },
      {
        name: "description",
        content: "Send and receive anonymous email through a private alias address.",
      },
    ],
  }),
});

type View = "dashboard" | "compose" | "inbox" | "read";

interface AnonEmail {
  id: string;
  subject: string;
  preview: string;
  body: string;
  sender: string;
  time: string;
}

const ALIAS = "x7k2@yourapp.com";

const initialInbox: AnonEmail[] = [
  {
    id: "a1",
    subject: "Thanks for the honest feedback",
    preview: "I really appreciate you reaching out — this means a lot…",
    body: "I really appreciate you reaching out — this means a lot. I had no idea the team was feeling this way, and I'd like to set up a chat to talk through it. No pressure, only if you're comfortable.",
    sender: "Anonymous Sender",
    time: "2h ago",
  },
  {
    id: "a2",
    subject: "Tip about the budget review",
    preview: "Heads up — the numbers shared in the meeting do not match…",
    body: "Heads up — the numbers shared in the meeting do not match what's in the actual ledger. You may want to double-check Q3 entries before signing off. Staying anonymous to keep things neutral.",
    sender: "Anonymous Sender",
    time: "Yesterday",
  },
  {
    id: "a3",
    subject: "Just wanted to say thank you 🎭",
    preview: "Your talk last week genuinely changed how I think about…",
    body: "Your talk last week genuinely changed how I think about my career. I didn't want to make it weird in person, so sending this anonymously. Keep doing what you're doing.",
    sender: "Anonymous Sender",
    time: "3d ago",
  },
];

function AnonymousMail() {
  const [view, setView] = useState<View>("dashboard");
  const [inbox] = useState<AnonEmail[]>(initialInbox);
  const [openEmail, setOpenEmail] = useState<AnonEmail | null>(null);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const copyAlias = async () => {
    await navigator.clipboard.writeText(ALIAS);
    toast.success("Alias copied to clipboard");
  };

  const sendAnon = () => {
    if (!to || !subject || !message) {
      toast.error("Please fill all fields");
      return;
    }
    toast.success("Sent anonymously 🎭", {
      description: "Your identity stays hidden.",
    });
    setTo("");
    setSubject("");
    setMessage("");
    setView("dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="bottom-right" theme="light" />

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to SecureSend
          </Link>
          <div className="flex items-center gap-2 rounded-full bg-anon-soft px-3 py-1 text-xs font-medium text-anon ring-1 ring-anon/20">
            <VenetianMask className="h-3.5 w-3.5" />
            Anonymous Mode
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 animate-fade-in">
        {view === "dashboard" && (
          <Dashboard
            onCompose={() => setView("compose")}
            onInbox={() => setView("inbox")}
            onCopy={copyAlias}
            inboxCount={inbox.length}
          />
        )}

        {view === "compose" && (
          <Compose
            to={to}
            subject={subject}
            message={message}
            onTo={setTo}
            onSubject={setSubject}
            onMessage={setMessage}
            onSend={sendAnon}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "inbox" && (
          <InboxView
            emails={inbox}
            onOpen={(e) => {
              setOpenEmail(e);
              setView("read");
            }}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "read" && openEmail && (
          <ReadEmail email={openEmail} onBack={() => setView("inbox")} />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  onCompose,
  onInbox,
  onCopy,
  inboxCount,
}: {
  onCompose: () => void;
  onInbox: () => void;
  onCopy: () => void;
  inboxCount: number;
}) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-anon-soft text-anon ring-1 ring-anon/20">
          <VenetianMask className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Anonymous Mail 🎭</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send and receive email through a disposable alias. No one sees who you really are.
        </p>
      </div>

      {/* Alias card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your alias address
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-anon to-[oklch(0.65_0.18_240)] text-anon-foreground">
              <Mail className="h-5 w-5" />
            </div>
            <span className="font-mono text-lg font-semibold">{ALIAS}</span>
          </div>
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-full bg-anon-soft px-4 py-2 text-sm font-medium text-anon ring-1 ring-anon/20 hover:bg-anon hover:text-anon-foreground transition-colors"
          >
            <Copy className="h-4 w-4" /> Copy Alias
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Rotates automatically every 30 days
        </div>
      </div>

      {/* Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={onCompose}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface p-5 text-left shadow-elegant hover:border-anon/40 hover:shadow-floating transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-anon text-anon-foreground">
            <Send className="h-5 w-5" />
          </div>
          <div className="font-semibold">Send Anonymous Email</div>
          <p className="text-sm text-muted-foreground">
            Compose a message — your real identity stays hidden.
          </p>
        </button>

        <button
          onClick={onInbox}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-border bg-surface p-5 text-left shadow-elegant hover:border-anon/40 hover:shadow-floating transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-anon-soft text-anon ring-1 ring-anon/20">
            <InboxIcon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2 font-semibold">
            View Inbox
            {inboxCount > 0 && (
              <span className="rounded-full bg-anon px-2 py-0.5 text-[11px] font-medium text-anon-foreground">
                {inboxCount}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Read messages people sent to your alias.
          </p>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-anon" />
          How it works
        </div>
        <p className="mt-1 leading-relaxed">
          Replies come back to your alias inbox. We never share your real email with the
          recipient.
        </p>
      </div>
    </div>
  );
}

function Compose({
  to,
  subject,
  message,
  onTo,
  onSubject,
  onMessage,
  onSend,
  onBack,
}: {
  to: string;
  subject: string;
  message: string;
  onTo: (v: string) => void;
  onSubject: (v: string) => void;
  onMessage: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-anon-soft text-anon">
            <VenetianMask className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">New anonymous email</h2>
            <p className="text-xs text-muted-foreground">From: {ALIAS}</p>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="To">
            <input
              type="email"
              value={to}
              onChange={(e) => onTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => onSubject(e.target.value)}
              placeholder="What's it about?"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </Field>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 focus-within:border-anon/50 focus-within:ring-2 focus-within:ring-anon/15 transition-all">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Message
            </div>
            <textarea
              value={message}
              onChange={(e) => onMessage(e.target.value)}
              rows={7}
              placeholder="Write what you want to say…"
              className="mt-1 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-anon-soft px-3 py-2 text-xs text-anon ring-1 ring-anon/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your identity will not be revealed.
        </div>

        <button
          onClick={onSend}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-anon px-5 py-3 text-sm font-medium text-anon-foreground shadow-elegant hover:shadow-floating transition-all"
        >
          <Send className="h-4 w-4" /> Send Anonymously 🎭
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-2 focus-within:border-anon/50 focus-within:ring-2 focus-within:ring-anon/15 transition-all">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function InboxView({
  emails,
  onOpen,
  onBack,
}: {
  emails: AnonEmail[];
  onOpen: (e: AnonEmail) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Anonymous Inbox</h2>
        <p className="text-sm text-muted-foreground">
          Messages sent to <span className="font-mono">{ALIAS}</span>
        </p>
      </div>

      <ul className="space-y-3">
        {emails.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onOpen(e)}
              className={cn(
                "group flex w-full gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-elegant hover:border-anon/40 hover:shadow-floating transition-all",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-anon-soft text-anon ring-1 ring-anon/20">
                <VenetianMask className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{e.subject}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{e.time}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{e.preview}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-anon-soft px-2 py-0.5 text-[11px] font-medium text-anon ring-1 ring-anon/20">
                  {e.sender} 🎭
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadEmail({ email, onBack }: { email: AnonEmail; onBack: () => void }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inbox
      </button>

      <article className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-anon to-[oklch(0.65_0.18_240)] text-anon-foreground">
            <VenetianMask className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">Anonymous Sender 🎭</div>
            <div className="text-xs text-muted-foreground">
              to {ALIAS} · {email.time}
            </div>
          </div>
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">{email.subject}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {email.body}
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-anon-soft px-3 py-2 text-xs text-anon ring-1 ring-anon/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          The sender's real identity is hidden by their alias.
        </div>
      </article>
    </div>
  );
}
