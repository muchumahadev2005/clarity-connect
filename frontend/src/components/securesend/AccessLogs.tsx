import { Eye, Globe, Monitor, Clock, Activity, Menu } from "lucide-react";
import type { SecureMessage } from "./types";
import { timeAgo } from "./utils";

export function AccessLogs({ messages, onToggleSidebar }: { messages: SecureMessage[], onToggleSidebar?: () => void }) {
  const all = messages
    .flatMap((m) => m.logs.map((l) => ({ ...l, message: m })))
    .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleSidebar?.()}
            className="lg:hidden rounded-full p-2 hover:bg-secondary transition-colors -ml-2"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Access Logs</h2>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every time someone opens one of your messages.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
        {all.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No access events yet.
          </div>
        ) : (
          <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-border pl-6">
            {all.map((entry, i) => (
              <li key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="absolute -left-[33px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-surface shadow-elegant">
                  <Eye className="h-3 w-3" />
                </span>
                <div className="rounded-2xl border border-border bg-surface-muted/60 p-4 transition-all hover:border-primary/40 hover:shadow-elegant">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{entry.message.preview}</p>
                    <span suppressHydrationWarning className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeAgo(entry.viewedAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opened by <span className="font-medium text-foreground">{entry.viewer || "Someone"}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] text-foreground/80 ring-1 ring-border">
                      <Globe className="h-3 w-3 text-primary" /> {entry.ip}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] text-foreground/80 ring-1 ring-border">
                      <Monitor className="h-3 w-3 text-primary" /> {entry.device}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
