import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { MessageDetail } from "@/components/securesend/MessageDetail";
import type { SecureMessage } from "@/components/securesend/types";
import { Toaster, toast } from "sonner";
import { ShieldCheck, ArrowLeft, Loader2, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/m/$messageId")({
  component: MessageViewerPage,
});

function MessageViewerPage() {
  const { messageId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<SecureMessage | null>(null);

  const fetchMessage = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/messages/${messageId}`);
      const m = res.data.data;

      const isExpired = Boolean(m.expiresAt && new Date(m.expiresAt) < new Date());
      const isDestructed = isExpired || Boolean(m.viewOnce && (m.views || 0) > 0);
      const hasEncryptedPayload = Boolean(m.encryptedData && m.encryptedAESKey && m.iv);

      const mapped: SecureMessage = {
        id: m._id,
        folder: "inbox",
        sender: "Shared Secure Link 🔗",
        preview: isDestructed
          ? "Message destructed or expired"
          : m.type === "text"
            ? "Encrypted Message"
            : `Encrypted ${m.type}`,
        content: isDestructed ? "" : "[Secure Message Content]",
        type: m.type,
        protection: m.protection,
        password: m.password || "",
        expiresAt: m.expiresAt,
        viewOnce: m.viewOnce,
        status: isDestructed ? "expired" : m.views > 0 ? "viewed" : "new",
        timestamp: m.createdAt,
        views: m.views || 0,
        logs: [],
        encrypted: hasEncryptedPayload
          ? {
              encryptedData: m.encryptedData,
              encryptedAESKey: m.encryptedAESKey,
              iv: m.iv,
            }
          : undefined,
      };

      setMessage(mapped);
    } catch (err: any) {
      console.error("Failed to load message", err);
      setError(err.response?.data?.message || "Failed to load secure message. The link might be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessage();
  }, [messageId]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      setMessage(null);
      setError("Message deleted permanently by user request.");
      toast.success("Message destroyed");
    } catch (err) {
      console.error("Failed to delete message", err);
      toast.error("Failed to delete message from server");
    }
  };

  const handleMarkViewed = async (id: string) => {
    try {
      const res = await api.post(`/messages/${id}/view`);
      setMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          views: res.data.data.views,
          status: prev.status === "expired" ? "expired" : "viewed",
        };
      });
    } catch (err) {
      console.error("Failed to mark message as viewed", err);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background flex flex-col justify-between">
      <Toaster position="bottom-right" theme="light" />
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-120 w-120 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 w-full">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-linear-to-br from-primary to-key shadow-glow-primary">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">SecureSend</span>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-primary hover:underline">
            Go to App Dashboard
          </Link>
        </div>
      </header>

      {/* Content wrapper */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Fetching encrypted message payload...</p>
          </div>
        ) : error ? (
          <div className="w-full text-center py-10 px-6 rounded-2xl border border-destructive/20 bg-surface shadow-elegant max-w-md mx-auto animate-scale-in">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Access Denied</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {error}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/landing"
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-all"
              >
                Go Back Home
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground hover:opacity-90 shadow-elegant transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        ) : message ? (
          <div className="w-full rounded-2xl border border-border bg-surface overflow-hidden shadow-floating animate-scale-in max-h-[80vh] flex flex-col">
            <MessageDetail
              message={message}
              onDelete={handleDelete}
              onMarkViewed={handleMarkViewed}
            />
          </div>
        ) : null}
      </main>

      <footer className="border-t border-border bg-surface-muted/30 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SecureSend. All decrypted content stays client-side.
      </footer>
    </div>
  );
}
