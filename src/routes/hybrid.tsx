import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  KeyRound,
  Copy,
  Check,
  Send,
  Inbox,
  RefreshCw,
  Lock,
  Unlock,
  ShieldCheck,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  loadOrCreateRSAKeyPair,
  clearStoredRSAKeys,
  importPublicKey,
  generateAESKey,
  encryptMessage,
  encryptAESKey,
  decryptAESKey,
  decryptMessage,
} from "@/components/securesend/crypto";

export const Route = createFileRoute("/hybrid")({
  component: HybridPage,
  head: () => ({
    meta: [
      { title: "Hybrid Encryption Playground · SecureSend" },
      {
        name: "description",
        content:
          "Generate RSA keys, share public keys, and encrypt messages with AES + RSA hybrid encryption — all in the browser.",
      },
    ],
  }),
});

type Tab = "send" | "receive";

interface Payload {
  encryptedData: string;
  encryptedAESKey: string;
  iv: string;
}

function HybridPage() {
  const [tab, setTab] = useState<Tab>("send");
  const [publicKeyB64, setPublicKeyB64] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [keyStatus, setKeyStatus] = useState<"loading" | "ready">("loading");
  const [copiedPub, setCopiedPub] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { privateKey, publicKeyB64 } = await loadOrCreateRSAKeyPair();
        if (cancelled) return;
        setPrivateKey(privateKey);
        setPublicKeyB64(publicKeyB64);
        setKeyStatus("ready");
      } catch (e) {
        console.error(e);
        toast.error("Failed to initialize RSA keys");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const regenerateKeys = async () => {
    setKeyStatus("loading");
    clearStoredRSAKeys();
    const { privateKey, publicKeyB64 } = await loadOrCreateRSAKeyPair();
    setPrivateKey(privateKey);
    setPublicKeyB64(publicKeyB64);
    setKeyStatus("ready");
    toast.success("New RSA key pair generated");
  };

  const copyPublicKey = async () => {
    await navigator.clipboard.writeText(publicKeyB64);
    setCopiedPub(true);
    toast.success("Public key copied");
    setTimeout(() => setCopiedPub(false), 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Hybrid Encryption</h1>
              <p className="text-xs text-muted-foreground">AES-GCM 256 · RSA-OAEP 2048</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Your public key card */}
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Your Public Key</h2>
            </div>
            <button
              onClick={regenerateKeys}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this with anyone who wants to send you encrypted messages. Your private key
            never leaves this browser.
          </p>
          <div className="mt-3 rounded-xl border border-border bg-surface-muted p-3 font-mono text-[11px] leading-relaxed text-foreground/80">
            {keyStatus === "loading" ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating keys…
              </span>
            ) : (
              <span className="block max-h-32 overflow-auto break-all">{publicKeyB64}</span>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={copyPublicKey}
              disabled={keyStatus !== "ready"}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-95 active:scale-95 disabled:opacity-60"
            >
              {copiedPub ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedPub ? "Copied" : "Copy Public Key"}
            </button>
          </div>
        </section>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-full border border-border bg-surface p-1">
          <TabButton active={tab === "send"} onClick={() => setTab("send")} icon={Send} label="Send Message" />
          <TabButton active={tab === "receive"} onClick={() => setTab("receive")} icon={Inbox} label="Receive Message" />
        </div>

        <div className="mt-4">
          {tab === "send" ? <SendPanel /> : <ReceivePanel privateKey={privateKey} />}
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Send;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function SendPanel() {
  const [message, setMessage] = useState("");
  const [receiverPub, setReceiverPub] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Payload | null>(null);

  const onEncrypt = async () => {
    if (!message.trim()) return toast.error("Enter a message");
    if (!receiverPub.trim()) return toast.error("Paste the receiver's public key");
    setBusy(true);
    setOut(null);
    try {
      const pub = await importPublicKey(receiverPub);
      const aes = await generateAESKey();
      const { encryptedData, iv } = await encryptMessage(message, aes);
      const encryptedAESKey = await encryptAESKey(aes, pub);
      setOut({ encryptedData, encryptedAESKey, iv });
      toast.success("Message encrypted");
    } catch (e) {
      console.error(e);
      toast.error("Encryption failed — check the public key");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4 text-primary" /> Encrypt a message
      </h3>
      <div className="mt-4 space-y-3">
        <Field label="Message">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your secret message…"
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>
        <Field label="Receiver Public Key (base64 SPKI)">
          <textarea
            value={receiverPub}
            onChange={(e) => setReceiverPub(e.target.value)}
            rows={3}
            placeholder="MIIBIjANBgkqhki…"
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-3 font-mono text-[11px] leading-relaxed outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>
        <button
          onClick={onEncrypt}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Encrypting…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Encrypt
            </>
          )}
        </button>
      </div>

      {out && (
        <div className="mt-6 space-y-3 animate-fade-in">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Encrypted output
          </h4>
          <CopyField label="Encrypted Message" value={out.encryptedData} />
          <CopyField label="Encrypted AES Key" value={out.encryptedAESKey} />
          <CopyField label="IV" value={out.iv} />
          <CopyField label="Payload (JSON)" value={JSON.stringify(out, null, 2)} mono multiline />
        </div>
      )}
    </section>
  );
}

function ReceivePanel({ privateKey }: { privateKey: CryptoKey | null }) {
  const [encryptedData, setEncryptedData] = useState("");
  const [encryptedAESKey, setEncryptedAESKey] = useState("");
  const [iv, setIv] = useState("");
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [plain, setPlain] = useState<string | null>(null);

  const tryParsePayload = () => {
    if (!payload.trim()) return;
    try {
      const p = JSON.parse(payload) as Payload;
      if (p.encryptedData && p.encryptedAESKey && p.iv) {
        setEncryptedData(p.encryptedData);
        setEncryptedAESKey(p.encryptedAESKey);
        setIv(p.iv);
        toast.success("Payload parsed");
      } else {
        toast.error("Payload missing required fields");
      }
    } catch {
      toast.error("Invalid JSON payload");
    }
  };

  const onDecrypt = async () => {
    if (!privateKey) return toast.error("Keys not ready yet");
    if (!encryptedData || !encryptedAESKey || !iv)
      return toast.error("Fill all encrypted fields");
    setBusy(true);
    setPlain(null);
    try {
      const aes = await decryptAESKey(encryptedAESKey, privateKey);
      const text = await decryptMessage(encryptedData, aes, iv);
      setPlain(text);
      toast.success("Message decrypted");
    } catch (e) {
      console.error(e);
      toast.error("Invalid key or corrupted data");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Unlock className="h-4 w-4 text-primary" /> Decrypt a message
      </h3>

      <div className="mt-4 space-y-3">
        <Field label="Paste full payload JSON (optional)">
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={3}
            placeholder='{"encryptedData":"…","encryptedAESKey":"…","iv":"…"}'
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-3 font-mono text-[11px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>
        <button
          onClick={tryParsePayload}
          className="text-xs font-medium text-primary hover:underline"
        >
          Auto-fill from payload →
        </button>

        <Field label="Encrypted Message">
          <textarea
            value={encryptedData}
            onChange={(e) => setEncryptedData(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-3 font-mono text-[11px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>
        <Field label="Encrypted AES Key">
          <textarea
            value={encryptedAESKey}
            onChange={(e) => setEncryptedAESKey(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3.5 py-3 font-mono text-[11px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>
        <Field label="IV">
          <input
            value={iv}
            onChange={(e) => setIv(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 font-mono text-[11px] outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </Field>

        <button
          onClick={onDecrypt}
          disabled={busy || !privateKey}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-elegant transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Decrypting…
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" /> Decrypt
            </>
          )}
        </button>
      </div>

      {plain !== null && (
        <div className="mt-6 animate-fade-in">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[11px] font-medium text-success ring-1 ring-success/20">
            <ShieldCheck className="h-3.5 w-3.5" /> Decrypted securely
          </div>
          <div className="whitespace-pre-wrap rounded-xl border border-border bg-surface-muted p-4 text-sm leading-relaxed">
            {plain}
          </div>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function CopyField({
  label,
  value,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary-soft"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div
        className={`mt-1.5 ${multiline ? "max-h-40" : "max-h-20"} overflow-auto break-all text-foreground/80 ${
          mono ? "font-mono text-[11px] leading-relaxed" : "text-xs"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
