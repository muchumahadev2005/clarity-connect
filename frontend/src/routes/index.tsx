import { createFileRoute, redirect } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") !== "true") {
      throw redirect({ to: "/landing" });
    }
  },
  component: SecureSendApp,
});

function SecureSendApp() {
  const [messages, setMessages] = useState<SecureMessage[]>(initialMessages);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<{ email: string } | null>(null);

  // Fetch real messages and user profile from backend
  useEffect(() => {
    const fetchAppContent = async () => {
      try {
        const [inRes, outRes, userRes] = await Promise.all([
          api.get("/messages/inbox"),
          api.get("/messages/outbox"),
          api.get("/auth/me"),
        ]);

        setUser(userRes.data.user);

        const mapMsg = (m: any, folder: "inbox" | "sent") => ({
          id: m._id,
          folder,
          sender:
            folder === "inbox"
              ? m.senderId?.email || "Anonymous"
              : `You → ${m.receiverId?.email || "Link"}`,
          preview: m.type === "text" ? "Encrypted Message" : `Encrypted ${m.type}`,
          content: "[Secure Message Content]", // Placeholder until decrypted
          type: m.type,
          protection: m.protection || "quick",
          password: m.password || "",
          expiresAt: m.expiresAt,
          viewOnce: m.viewOnce,
          status: m.expiresAt && new Date(m.expiresAt) < new Date() ? "expired" : "new",
          timestamp: m.createdAt,
          views: m.views || 0,
          logs: m.logs || [],
          encrypted: {
            encryptedData: m.encryptedData,
            encryptedAESKey: m.encryptedAESKey,
            iv: m.iv,
          },
        });

        const allMessages = [
          ...inRes.data.data.map((m: any) => mapMsg(m, "inbox")),
          ...outRes.data.data.map((m: any) => mapMsg(m, "sent")),
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
            return { ...m, status: "expired" as const };
          }
          return m;
        });
        return changed ? next : prev;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-collapse sidebar on small screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
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
    inbox: messages.filter((m) => m.folder === "inbox").length,
    sent: messages.filter((m) => m.folder === "sent").length,
    expired: messages.filter((m) => m.status === "expired").length,
    logs: 0,
  };

  const filtered = useMemo(() => {
    let list = messages.filter((m) => {
      // Changed: Don't separate expired messages to different folder
      // They stay in inbox/sent and show "Expired" badge
      // Only show truly deleted messages out of the list
      return m.folder === folder;
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
                status: "viewed",
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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Toaster position="bottom-right" theme="light" />
      <Sidebar
        active={folder}
        onSelect={(f) => {
          setFolder(f);
          if (f !== "logs") {
            const first = messages.find((m) =>
              f === "expired" ? m.status === "expired" : m.folder === f,
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
                "shrink-0 border-r border-border md:w-100 md:block " +
                (selectedId ? "hidden md:block" : "block w-full")
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
            <div className={"flex-1 overflow-hidden " + (selectedId ? "block" : "hidden md:block")}>
              <div className="flex h-full flex-col">
                {selectedId && (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary md:hidden"
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
              setShare({
                open: true,
                link: `${window.location.origin}/m/${res.data.data._id}`, // Use real ID from backend
                summary: {
                  protection:
                    p.protection === "password"
                      ? "Password"
                      : p.protection === "key"
                        ? "Secret key"
                        : p.protection === "hybrid"
                          ? "Hybrid 🔐"
                          : "Quick",
                  expiry:
                    p.expiry < 1
                      ? "10 sec"
                      : p.expiry < 60
                        ? `${p.expiry} min`
                        : `${p.expiry / 60} hr`,
                  viewOnce: p.viewOnce,
                },
              });
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to send message. Please try again.");
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
