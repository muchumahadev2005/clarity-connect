import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/securesend/Sidebar";
import { MessageList } from "@/components/securesend/MessageList";
import { MessageDetail } from "@/components/securesend/MessageDetail";
import { ComposeModal } from "@/components/securesend/ComposeModal";
import { SharePanel } from "@/components/securesend/SharePanel";
import { AccessLogs } from "@/components/securesend/AccessLogs";
import { initialMessages } from "@/components/securesend/mockData";
import type { Folder, SecureMessage } from "@/components/securesend/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { LandingPage } from "./landing";

export const Route = createFileRoute("/")({
  component: SecureSendApp,
});

function SecureSendApp() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [messages, setMessages] = useState<SecureMessage[]>(initialMessages);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<{ email: string } | null>(null);

  // Fetch real messages and user profile from backend
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const token = localStorage.getItem("token");
    if (!isLoggedIn || !token) return;

    const fetchAppContent = async () => {
      try {
        const [inRes, outRes, userRes] = await Promise.all([
          api.get("/messages/inbox"),
          api.get("/messages/outbox"),
          api.get("/auth/me"),
        ]);

        setUser(userRes.data.user);

        // Auto-generate and sync E2EE keys to the database
        try {
          const { getPrivateKeyStatus, loadOrCreateRSAKeyPair, getStoredPublicKeyB64 } =
            await import("@/components/securesend/crypto");
          const keyStatus = getPrivateKeyStatus();
          if (keyStatus === "none") {
            console.log("[KEYS] No local keypair found. Auto-generating...");
            const generated = await loadOrCreateRSAKeyPair();
            await api.post("/keys/register", { publicKey: generated.publicKeyB64 });
            console.log("[KEYS] Registered auto-generated key pair.");
          } else {
            const currentPubKey = getStoredPublicKeyB64();
            if (currentPubKey) {
              await api.post("/keys/register", { publicKey: currentPubKey }).catch((err) => {
                console.warn(
                  "[KEYS] Failed to sync key to backend (might be already synced):",
                  err,
                );
              });
            }
          }
        } catch (keyErr) {
          console.error("[KEYS] Key registration failed:", keyErr);
        }

        interface DBMessageLog {
          viewedAt?: string;
          createdAt?: string;
          ip?: string;
          ipAddress?: string;
          device?: string;
          viewer?: string;
          userId?: { email: string };
        }

        interface DBMessage {
          _id: string;
          expiresAt?: string | null;
          viewOnce?: boolean;
          views?: number;
          encryptedData?: string;
          encryptedAESKey?: string;
          iv?: string;
          logs?: DBMessageLog[];
          type?: "text" | "file";
          protection?: "quick" | "password" | "key" | "hybrid";
          password?: string;
          createdAt: string;
          senderId?: { email: string };
          receiverId?: { email: string };
          salt?: string;
          keyIv?: string;
          encryptionMode?: string;
          kdf?: string;
          kdfIterations?: number;
          aesAlgorithm?: string;
          rsaAlgorithm?: string;
        }

        const mapMsg = (m: DBMessage, folder: "inbox" | "sent") => {
          const isExpired = Boolean(m.expiresAt && new Date(m.expiresAt) < new Date());
          const isDestructed = isExpired || Boolean(m.viewOnce && (m.views || 0) > 0);
          const hasEncryptedPayload = Boolean(m.encryptedData && m.encryptedAESKey && m.iv);
          const logs = (m.logs || []).map((l: DBMessageLog) => ({
            viewedAt: l.viewedAt || l.createdAt || new Date().toISOString(),
            ip: l.ip || l.ipAddress || "Unknown IP",
            device: l.device || "Unknown device",
            viewer: l.viewer || l.userId?.email || undefined,
          }));

          return {
            id: m._id,
            folder,
            sender:
              folder === "inbox"
                ? m.senderId?.email || "Anonymous"
                : `You → ${m.receiverId?.email || "Link"}`,
            preview: isDestructed
              ? "Message destructed or expired"
              : m.type === "text"
                ? "Encrypted Message"
                : `Encrypted ${m.type}`,
            content: isDestructed ? "" : "[Secure Message Content]",
            type: m.type,
            protection: m.protection || "quick",
            password: m.password || "",
            expiresAt: m.expiresAt,
            viewOnce: m.viewOnce,
            status: isDestructed ? "expired" : "new",
            timestamp: m.createdAt,
            views: m.views || 0,
            logs,
            encrypted: hasEncryptedPayload
              ? {
                  encryptedData: m.encryptedData,
                  encryptedAESKey: m.encryptedAESKey,
                  iv: m.iv,
                  salt: m.salt,
                  keyIv: m.keyIv,
                  encryptionMode: m.encryptionMode,
                  kdf: m.kdf,
                  kdfIterations: m.kdfIterations,
                  aesAlgorithm: m.aesAlgorithm,
                  rsaAlgorithm: m.rsaAlgorithm,
                  mode: "hybrid",
                }
              : undefined,
          } as SecureMessage;
        };

        const allMessages = [
          ...inRes.data.data.map((m: DBMessage) => mapMsg(m, "inbox")),
          ...outRes.data.data.map((m: DBMessage) => mapMsg(m, "sent")),
        ];

        setMessages(allMessages);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchAppContent();

    // Periodically check for expired messages in local state
    const interval = setInterval(() => {
      setMessages((prev) => {
        const now = new Date();
        let changed = false;
        const next = prev.map((m) => {
          if (m.expiresAt && new Date(m.expiresAt) < now && m.status !== "expired") {
            changed = true;
            return {
              ...m,
              status: "expired" as const,
              preview: "Message destructed or expired",
              content: "",
              encrypted: undefined,
            };
          }
          return m;
        });
        return changed ? next : prev;
      });
    }, 1000); // Check every second so self-destructed messages move quickly

    return () => clearInterval(interval);
  }, []);

  // When the user changes selection or leaves the message folder, check if the previously
  // selected message was a view-once message that has been decrypted/viewed. If so,
  // mark it as expired in the local state so they can't open it again.
  useEffect(() => {
    setMessages((prevMsgs) => {
      let changed = false;
      const nextMsgs = prevMsgs.map((m) => {
        const isNotCurrentlyOpen = m.id !== selectedId || folder === "logs";
        if (m.viewOnce && m.views > 0 && isNotCurrentlyOpen && m.status !== "expired") {
          changed = true;
          return {
            ...m,
            status: "expired" as const,
            content: "",
            preview: "Message destructed or expired",
            encrypted: undefined,
          };
        }
        return m;
      });
      return changed ? nextMsgs : prevMsgs;
    });
  }, [selectedId, folder]);

  // Auto-collapse sidebar on small screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setCollapsed(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const [share, setShare] = useState<{
    open: boolean;
    link: string;
    summary: { protection: string; expiry: string; viewOnce: boolean };
  }>({
    open: false,
    link: "",
    summary: { protection: "Quick", expiry: "10 min", viewOnce: false },
  });

  const counts: Record<Folder, number> = {
    inbox: messages.filter((m) => m.folder === "inbox" && m.status !== "expired").length,
    sent: messages.filter((m) => m.folder === "sent" && m.status !== "expired").length,
    expired: messages.filter((m) => m.status === "expired").length,
    logs: messages
      .filter((m) => m.folder === "sent")
      .reduce((total, m) => total + m.logs.length, 0),
  };

  const filtered = useMemo(() => {
    let list = messages.filter((m) => {
      if (folder === "expired") {
        return m.status === "expired";
      }

      return m.folder === folder && m.status !== "expired";
    });

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.sender.toLowerCase().includes(q) ||
          m.preview.toLowerCase().includes(q) ||
          (m.content && m.content.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [messages, folder, query]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      setMessages((ms) => ms.filter((m) => m.id !== id));
      setSelectedId(null);
      toast.success("Message deleted permanently");
    } catch (err) {
      console.error("Failed to delete message", err);
      toast.error("Failed to delete message from server");
    }
  };

  const handleMarkViewed = async (id: string) => {
    try {
      const res = await api.post(`/messages/${id}/view`);
      setMessages((ms) =>
        ms.map((m) =>
          m.id === id
            ? {
                ...m,
                status: m.status === "expired" ? "expired" : "viewed",
                views: res.data.data.views,
                logs: res.data.data.logs,
              }
            : m,
        ),
      );
    } catch (err) {
      console.error("Failed to mark message as viewed", err);
    }
  };
  const isLoggedIn =
    typeof window !== "undefined" &&
    localStorage.getItem("isLoggedIn") === "true" &&
    !!localStorage.getItem("token");
  if (!isClient || !isLoggedIn) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Toaster position="bottom-right" theme="light" />
      <Sidebar
        active={folder}
        onSelect={(f) => {
          setFolder(f);
          if (f !== "logs") {
            const first = messages.find((m) =>
              f === "expired" ? m.status === "expired" : m.folder === f && m.status !== "expired",
            );
            setSelectedId(first?.id ?? null);
          }
        }}
        onCompose={() => setComposeOpen(true)}
        counts={counts}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        user={user}
      />

      <main className="flex flex-1 overflow-hidden">
        {folder === "logs" ? (
          <div className="flex-1">
            <AccessLogs messages={messages} onToggleSidebar={() => setCollapsed(!collapsed)} />
          </div>
        ) : (
          <>
            <div
              className={
                "shrink-0 border-r border-border lg:w-80 lg:block " +
                (selectedId ? "hidden lg:block" : "block w-full")
              }
            >
              <MessageList
                folder={folder}
                messages={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                query={query}
                onQuery={setQuery}
                onToggleSidebar={() => setCollapsed(!collapsed)}
              />
            </div>
            <div className={"flex-1 overflow-hidden " + (selectedId ? "block" : "hidden lg:block")}>
              <div className="flex h-full flex-col">
                {selectedId && (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to inbox
                  </button>
                )}
                <div className="flex-1 overflow-hidden">
                  <MessageDetail
                    message={selected}
                    onDelete={handleDelete}
                    onMarkViewed={handleMarkViewed}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onEncrypt={async (p) => {
          try {
            // Map frontend payload to backend schema
            const messageData = {
              encryptedData: p.encrypted.encryptedData,
              encryptedAESKey: p.encrypted.encryptedAESKey,
              iv: p.encrypted.iv,
              salt: p.encrypted.salt,
              keyIv: p.encrypted.keyIv,
              encryptionMode: p.encrypted.encryptionMode,
              kdf: p.encrypted.kdf,
              kdfIterations: p.encrypted.kdfIterations,
              aesAlgorithm: p.encrypted.aesAlgorithm,
              rsaAlgorithm: p.encrypted.rsaAlgorithm,
              type: p.type,
              protection: p.protection,
              password: p.password,
              isAnonymous: p.sendMode === "link",
              viewOnce: p.viewOnce,
              expiresAt: p.expiry ? new Date(Date.now() + p.expiry * 60_000).toISOString() : null,
              recipientEmail: p.recipient,
            };

            const res = await api.post("/messages", messageData);

            const newMsg: SecureMessage = {
              id: res.data.data._id || `new-${Date.now()}`,
              folder: "sent",
              sender:
                p.sendMode === "direct" && p.recipient ? `You → ${p.recipient}` : "You → recipient",
              preview:
                p.type === "text"
                  ? p.content.slice(0, 60)
                  : p.type === "file"
                    ? p.attachmentName || "Encrypted file"
                    : p.content,
              content: p.type === "file" ? p.attachmentName || "Encrypted file" : p.content,
              type: p.type,
              protection: p.protection,
              password: p.password,
              expiresAt: messageData.expiresAt,
              viewOnce: p.viewOnce,
              status: "new",
              timestamp: new Date().toISOString(),
              views: 0,
              logs: [],
              encrypted: p.encrypted,
            };

            setMessages((m) => [newMsg, ...m]);
            setComposeOpen(false);
            toast.success("Message encrypted and sent!");

            if (p.sendMode === "link") {
              const hash = p.link.includes("#") ? p.link.substring(p.link.indexOf("#")) : "";
              setShare({
                open: true,
                link: `${window.location.origin}/m/${res.data.data._id}${hash}`, // Preserve key in URL hash if present
                summary: {
                  protection:
                    p.protection === "password"
                      ? "Password"
                      : p.protection === "key"
                        ? "Secret key"
                        : p.protection === "hybrid"
                          ? "Hybrid"
                          : "Quick",
                  expiry:
                    p.expiry === 0
                      ? "Off"
                      : p.expiry < 1
                        ? "10 sec"
                        : p.expiry < 60
                          ? `${p.expiry} min`
                          : `${p.expiry / 60} hr`,
                  viewOnce: p.viewOnce,
                },
              });
            }
          } catch (err: unknown) {
            const errorMsg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              "Failed to send message. Please try again.";
            toast.error(errorMsg);
            throw err;
          }
        }}
      />

      <SharePanel
        open={share.open}
        link={share.link}
        summary={share.summary}
        onClose={() => setShare((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}
