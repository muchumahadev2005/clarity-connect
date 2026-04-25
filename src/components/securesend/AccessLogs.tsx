import { Eye, Globe, Monitor } from "lucide-react";
import type { SecureMessage } from "./types";
import { timeAgo } from "./utils";

export function AccessLogs({ messages }: { messages: SecureMessage[] }) {
  const all = messages
    .flatMap((m) => m.logs.map((l) => ({ ...l, message: m })))
    .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime());

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Access Logs</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every time someone opens one of your messages.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {all.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No access events yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {all.map((entry, i) => (
              <li key={i} className="flex items-start gap-3 px-6 py-4 hover:bg-secondary/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                  <Eye className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.message.preview}</p>
                  <p className="text-xs text-muted-foreground">
                    Opened by {entry.message.sender} · {timeAgo(entry.viewedAt)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {entry.ip}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Monitor className="h-3 w-3" /> {entry.device}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}