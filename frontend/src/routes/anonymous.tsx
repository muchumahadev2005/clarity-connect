import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { timeAgo } from "@/components/securesend/utils";

export const Route = createFileRoute("/anonymous")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") !== "true") {
      throw redirect({ to: "/landing" });
    }
  },
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
  unread?: boolean;
}

function AnonymousMail() {
  const [view, setView] = useState<View>("dashboard");
  const [inbox, setInbox] = useState<AnonEmail[]>([]);
  const [openEmail, setOpenEmail] = useState<AnonEmail | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [aliasPulse, setAliasPulse] = useState(false);
  const [aliasLoading, setAliasLoading] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchInbox = async () => {
    try {
      const res = await api.get("/anonymous/inbox");
      const formatted = res.data.data.map((e: any) => ({
        id: e._id,
        subject: e.subject,
        preview: e.message.substring(0, 60) + (e.message.length > 60 ? "..." : ""),
        body: e.message,
        sender: e.isSent ? `To: ${e.to}` : "Anonymous Sender",
        time: timeAgo(e.createdAt),
        unread: e.isSent ? false : e.unread,
      }));
      setInbox(formatted);
    } catch (err: any) {
      console.error("Failed to fetch inbox:", err);
    }
  };

  const loadOrCreateAlias = async (forceRegenerate = false) => {
    setAliasLoading(true);
    setAliasError(null);

    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      setAliasError("Unable to determine your email. Please log in again.");
      setAliasLoading(false);
      return;
    }

    try {
      const res = await api.post("/anonymous/generate-alias", { force: forceRegenerate });
      const fullAlias = res.data.data.alias;
      const prefix = fullAlias.split("@")[0];
      setAlias(prefix);
      localStorage.setItem("anonAlias", prefix);

      if (forceRegenerate) {
        setAliasPulse(true);
        window.setTimeout(() => setAliasPulse(false), 900);
        toast.success("New alias generated", {
          description: fullAlias,
        });
        setInbox([]);
      } else {
        await fetchInbox();
      }
    } catch (err: any) {
      setAliasError(err.response?.data?.message || "Failed to load or generate alias");
    } finally {
      setAliasLoading(false);
    }
  };

  // Generate or retrieve alias on component mount
  useEffect(() => {
    loadOrCreateAlias();
  }, []);

  // Fetch inbox whenever view changes to inbox
  useEffect(() => {
    if (view === "inbox") {
      fetchInbox();
    }
  }, [view]);

  const copyAlias = async () => {
    if (!alias) return;
    const fullEmail = `${alias}@securesend.co.in`;
    await navigator.clipboard.writeText(fullEmail);
    toast.success("Email address copied to clipboard", {
      description: fullEmail,
    });
  };

  const regenerateAlias = () => {
    loadOrCreateAlias(true);
  };

  const sendAnon = async () => {
    if (!to || !subject || !message) {
      toast.error("Please fill all fields");
      return;
    }

    if (!alias) {
      toast.error("Alias not available. Please refresh the page.");
      return;
    }

    setSending(true);
    try {
      await api.post("/anonymous/send", {
        to: to.trim(),
        subject: subject.trim(),
        message: message.trim(),
        alias,
      });

      toast.success("Sent anonymously 🎭", {
        description: "The email was delivered through SecureSend.",
      });
      setTo("");
      setSubject("");
      setMessage("");
      setView("dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send anonymous email");
    } finally {
      setSending(false);
    }
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
            onRegenerate={regenerateAlias}
            alias={alias}
            pulse={aliasPulse}
            inboxCount={inbox.filter((e) => e.unread).length}
            aliasLoading={aliasLoading}
            aliasError={aliasError}
          />
        )}

        {view === "compose" && (
          <Compose
            alias={alias}
            to={to}
            subject={subject}
            message={message}
            onTo={setTo}
            onSubject={setSubject}
            onMessage={setMessage}
            onSend={sendAnon}
            sending={sending}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "inbox" && (
          <InboxView
            alias={alias}
            emails={inbox}
            onOpen={(e) => {
              setOpenEmail(e);
              if (e.unread) {
                api.post(`/anonymous/mark-read/${e.id}`).catch((err) => {
                  console.error("Failed to mark message as read:", err);
                });
                setInbox((prev) => prev.map((m) => (m.id === e.id ? { ...m, unread: false } : m)));
              }
              setView("read");
            }}
            onBack={() => setView("dashboard")}
          />
        )}

        {view === "read" && openEmail && (
          <ReadEmail alias={alias} email={openEmail} onBack={() => setView("inbox")} />
        )}
      </main>
    </div>
  );
}


function Dashboard({
  onCompose,
  onInbox,
  onCopy,
  onRegenerate,
  alias,
  pulse,
  inboxCount,
  aliasLoading,
  aliasError,
}: {
  onCompose: () => void;
  onInbox: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  alias: string | null;
  pulse: boolean;
  inboxCount: number;
  aliasLoading: boolean;
  aliasError: string | null;
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
        <p className="mt-1 text-xs text-muted-foreground">
          All emails are sent using secure aliases under securesend.co.in
        </p>
      </div>

      {/* Alias card */}
      <div
        className={cn(
          "rounded-2xl border bg-surface p-6 shadow-elegant transition-all duration-500",
          aliasError
            ? "border-red-300 bg-red-50 ring-1 ring-red-200"
            : pulse
              ? "border-anon/60 ring-2 ring-anon/30 shadow-floating"
              : "border-border",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your alias address
          </div>
          {!aliasError && (
            <span className="inline-flex items-center gap-1 rounded-full bg-anon-soft px-2 py-0.5 text-[10px] font-semibold text-anon ring-1 ring-anon/20">
              <span className="h-1.5 w-1.5 rounded-full bg-anon animate-pulse" />
              Active Alias
            </span>
          )}
        </div>

        {aliasError ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">
            <div className="text-lg">⚠️</div>
            <div className="flex-1">
              <p className="font-medium">{aliasError}</p>
              <p className="mt-1 text-xs text-red-700">
                Try logging in again or refreshing the page.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-anon to-[oklch(0.65_0.18_240)] text-anon-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                {aliasLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-surface-muted rounded animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : alias ? (
                  <span
                    key={alias}
                    className="truncate font-mono text-base sm:text-lg font-semibold animate-fade-in"
                  >
                    {alias}@securesend.co.in
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Failed to load alias</span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={onCopy}
                  disabled={!alias || aliasLoading}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full bg-anon-soft px-4 py-2.5 text-sm font-medium text-anon ring-1 ring-anon/20 hover:bg-anon hover:text-anon-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={aliasLoading}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-full bg-anon px-4 py-2.5 text-sm font-medium text-anon-foreground ring-1 ring-anon hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={cn("h-4 w-4", pulse && "animate-spin")} />
                  Regenerate
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              🔐 Your alias hides your real email. You can regenerate it anytime.
            </div>
          </>
        )}
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
          <p className="text-sm text-muted-foreground">Read messages people sent to your alias.</p>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-anon" />
          How it works
        </div>
        <p className="mt-1 leading-relaxed">
          Replies come back to your alias inbox. We never share your real email with the recipient.
        </p>
      </div>
    </div>
  );
}

function Compose({
  alias,
  to,
  subject,
  message,
  onTo,
  onSubject,
  onMessage,
  onSend,
  sending,
  onBack,
}: {
  alias: string | null;
  to: string;
  subject: string;
  message: string;
  onTo: (v: string) => void;
  onSubject: (v: string) => void;
  onMessage: (v: string) => void;
  onSend: () => void;
  sending: boolean;
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-anon-soft text-anon ring-1 ring-anon/20">
            <VenetianMask className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">New anonymous email</h2>
            <p className="text-xs text-muted-foreground">
              From:{" "}
              {alias ? (
                `${alias}@securesend.co.in`
              ) : (
                <span className="text-muted-foreground">Loading...</span>
              )}
            </p>
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
          disabled={sending}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-anon px-5 py-3 text-sm font-medium text-anon-foreground shadow-elegant hover:shadow-floating transition-all"
        >
          <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Anonymously 🎭"}
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
  alias,
  emails,
  onOpen,
  onBack,
}: {
  alias: string | null;
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
          Messages sent to{" "}
          <span className="font-mono">{alias ? `${alias}@securesend.co.in` : "Loading..."}</span>
        </p>
      </div>

      {emails.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No messages here.
        </div>
      )}

      <ul className="space-y-3">
        {emails.map((e) => (
          <li key={e.id}>
            <button
              onClick={() => onOpen(e)}
              className={cn(
                "group flex w-full gap-4 rounded-2xl border border-border bg-surface p-4 text-left shadow-elegant hover:border-anon/40 hover:shadow-floating transition-all",
                e.unread && "border-anon/30 bg-anon-soft/30",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-anon-soft text-anon ring-1 ring-anon/20">
                <VenetianMask className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <span className={cn("truncate text-sm sm:text-base", e.unread ? "font-semibold" : "font-medium")}>
                    {e.unread && (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-anon align-middle" />
                    )}
                    {e.subject}
                  </span>
                  <span className="shrink-0 text-[10px] sm:text-[11px] text-muted-foreground">{e.time}</span>
                </div>
                <p className="mt-0.5 truncate text-xs sm:text-sm text-muted-foreground">{e.preview}</p>
                <div className="mt-2 flex">
                  <div className="inline-flex items-center gap-1 rounded-full bg-anon-soft px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-anon ring-1 ring-anon/20 max-w-full">
                    <span className="truncate">{e.sender}</span> 🎭
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReadEmail({
  alias,
  email,
  onBack,
}: {
  alias: string | null;
  email: AnonEmail;
  onBack: () => void;
}) {
  const isSent = email.sender.startsWith("To: ");
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
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-anon to-[oklch(0.65_0.18_240)] text-anon-foreground">
            <VenetianMask className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold">
              {isSent ? `You (Anonymously)` : "Anonymous Sender"} 🎭
            </div>
            <div className="text-xs text-muted-foreground">via securesend.co.in</div>
            <div className="text-xs text-muted-foreground">
              {isSent ? `${email.sender} · ${email.time}` : `to ${alias} · ${email.time}`}
            </div>
          </div>
        </div>

        <h1 className="mt-5 text-xl font-semibold tracking-tight">{email.subject}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {email.body}
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-anon-soft px-3 py-2 text-xs text-anon ring-1 ring-anon/20">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isSent 
            ? "Your identity was hidden from the recipient using your alias." 
            : "The sender's real identity is hidden by their alias."
          }
        </div>
      </article>
    </div>
  );
}
