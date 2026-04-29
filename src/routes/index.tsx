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

export const Route = createFileRoute("/")({
  component: SecureSendApp,
});

function SecureSendApp() {
  const [messages, setMessages] = useState<SecureMessage[]>(initialMessages);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(initialMessages[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState("");

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
  }>({ open: false, link: "", summary: { protection: "Quick", expiry: "10 min", viewOnce: false } });

  const counts = useMemo<Record<Folder, number>>(
    () => ({
      inbox: messages.filter((m) => m.folder === "inbox" && m.status !== "expired").length,
      sent: messages.filter((m) => m.folder === "sent").length,
      expired: messages.filter((m) => m.status === "expired").length,
      logs: messages.reduce((n, m) => n + m.logs.length, 0),
    }),
    [messages],
  );

  const filtered = useMemo(() => {
    if (folder === "logs") return [];
    return messages
      .filter((m) =>
        folder === "expired" ? m.status === "expired" : m.folder === folder && m.status !== "expired",
      )
      .filter(
        (m) =>
          !query ||
          m.sender.toLowerCase().includes(query.toLowerCase()) ||
          m.preview.toLowerCase().includes(query.toLowerCase()),
      );
  }, [messages, folder, query]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const handleDelete = (id: string) => {
    setMessages((ms) => ms.filter((m) => m.id !== id));
    setSelectedId(null);
  };

  const handleMarkViewed = (id: string) => {
    setMessages((ms) =>
      ms.map((m) =>
        m.id === id
          ? {
              ...m,
              status: "viewed",
              views: m.views + 1,
              logs: [
                ...m.logs,
                {
                  viewedAt: new Date().toISOString(),
                  ip: "127.0.0.1",
                  device: "Chrome · this device",
                },
              ],
            }
          : m,
      ),
    );
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
      />

      <main className="flex flex-1 overflow-hidden">
        {folder === "logs" ? (
          <div className="flex-1">
            <AccessLogs messages={messages} />
          </div>
        ) : (
          <>
            <div
              className={
                "shrink-0 border-r border-border md:w-[400px] md:block " +
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
              />
            </div>
            <div
              className={
                "flex-1 overflow-hidden " + (selectedId ? "block" : "hidden md:block")
              }
            >
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
        onEncrypt={(p) => {
          const expiryLabel =
            p.expiry < 1 ? "10 sec" : p.expiry < 60 ? `${p.expiry} min` : `${p.expiry / 60} hr`;
          const newMsg: SecureMessage = {
            id: `new-${Date.now()}`,
            folder: "sent",
            sender: p.sendMode === "direct" && p.recipient ? `You → ${p.recipient}` : "You → recipient",
            preview: p.type === "text" ? p.content.slice(0, 60) : p.content,
            content: p.content,
            type: p.type,
            protection: p.protection,
            password: p.password,
            expiresAt: new Date(Date.now() + p.expiry * 60_000).toISOString(),
            viewOnce: p.viewOnce,
            status: "new",
            timestamp: new Date().toISOString(),
            views: 0,
            logs: [],
            encrypted: p.encrypted,
          };
          setMessages((m) => [newMsg, ...m]);
          setComposeOpen(false);
          if (p.sendMode === "link") {
            setShare({
              open: true,
              link: p.link,
              summary: {
                protection:
                  p.protection === "password" ? "Password" : p.protection === "key" ? "Secret key" : "Quick",
                expiry: expiryLabel,
                viewOnce: p.viewOnce,
              },
            });
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
