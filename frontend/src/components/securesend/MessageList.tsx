import { Lock, KeyRound, Eye, FileText, Paperclip, Search, EyeOff, Sparkles, Zap } from "lucide-react";
import type { Folder, SecureMessage } from "./types";
import { cn } from "@/lib/utils";
import { timeAgo } from "./utils";
import { VoicePreview } from "./VoicePlayer";

interface Props {
  folder: Folder;
  messages: SecureMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
}

const folderTitle: Record<Folder, string> = {
  inbox: "Inbox",
  sent: "Sent",
  expired: "Expired",
  logs: "Access Logs",
};

function TypeIcon({ type }: { type: SecureMessage["type"] }) {
  const I = type === "file" ? FileText : Paperclip;
  return <I className="inline h-3.5 w-3.5" />;
}

function ProtectionBadge({ m }: { m: SecureMessage }) {
  if (m.protection === "password")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
        <Lock className="h-3 w-3" /> Password
      </span>
    );
  if (m.protection === "key")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-key-soft px-2 py-0.5 text-[11px] font-medium text-key ring-1 ring-key/20">
        <KeyRound className="h-3 w-3" /> Secret Key
      </span>
    );
  if (m.protection === "hybrid")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20">
        <KeyRound className="h-3 w-3" /> Hybrid 🔐
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success ring-1 ring-success/20">
      <Sparkles className="h-3 w-3" /> Quick
    </span>
  );
}

export function MessageList({ folder, messages, selectedId, onSelect, query, onQuery }: Props) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{folderTitle[folder]}</h2>
          <span className="text-xs text-muted-foreground">{messages.length} messages</span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-muted px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search secure messages"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground">
            <EyeOff className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">No messages here.</p>
          </div>
        ) : (
          <ul>
            {messages.map((m) => {
              const isActive = m.id === selectedId;
              return (
                <li key={m.id}>
                  <button
                    onClick={() => onSelect(m.id)}
                    className={cn(
                      "group flex w-full gap-3 border-b border-border/60 px-5 py-3.5 text-left transition-all",
                      "hover:translate-x-0.5",
                      isActive
                        ? "bg-primary-soft border-l-2 border-l-primary"
                        : "hover:bg-secondary border-l-2 border-l-transparent",
                      m.status === "new" && "font-medium",
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.65_0.18_240)] text-primary-foreground text-sm font-semibold">
                      {m.sender[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm">{m.sender}</span>
                        <span suppressHydrationWarning className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(m.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {m.type === "voice" ? (
                          <VoicePreview duration={32} />
                        ) : (
                          <>
                            <TypeIcon type={m.type} />{" "}
                            <span className="align-middle">
                              {m.stealth ? "Looks like a routine status update…" : m.preview}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <ProtectionBadge m={m} />
                        {m.viewOnce && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                            <Eye className="h-3 w-3" /> View once
                          </span>
                        )}
                        {m.status === "expired" && (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            Expired
                          </span>
                        )}
                        {m.status === "viewed" && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                            Viewed · {m.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}