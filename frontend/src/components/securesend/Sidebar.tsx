import { Inbox, Send, TimerOff, Activity, ShieldCheck, Plus, Menu, VenetianMask, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Folder } from "./types";
import { cn } from "@/lib/utils";

const items: { key: Folder; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "sent", label: "Sent", icon: Send },
  { key: "expired", label: "Expired", icon: TimerOff },
  { key: "logs", label: "Access Logs", icon: Activity },
];

interface Props {
  active: Folder;
  onSelect: (f: Folder) => void;
  onCompose: () => void;
  counts: Record<Folder, number>;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ active, onSelect, onCompose, counts, collapsed, onToggle }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate({ to: "/landing" });
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-surface transition-all duration-200",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <button
          onClick={onToggle}
          className="rounded-full p-2 hover:bg-secondary transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">SecureSend</span>
          </div>
        )}
      </div>

      <div className={cn("px-3 pb-3", collapsed && "px-2")}>
        <button
          onClick={onCompose}
          className={cn(
            "group flex items-center gap-3 rounded-2xl bg-primary-soft text-accent-foreground font-medium shadow-elegant hover:shadow-floating transition-all",
            collapsed ? "h-12 w-12 justify-center" : "h-14 w-full px-4",
          )}
        >
          <Plus className="h-5 w-5 shrink-0" />
          {!collapsed && <span>New Secure Message</span>}
        </button>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              className={cn(
                "flex w-full items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors",
                collapsed && "justify-center pl-0 pr-0 py-3 rounded-full mx-auto w-12",
                isActive
                  ? "bg-primary-soft text-accent-foreground font-semibold"
                  : "text-foreground/80 hover:bg-secondary",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{it.label}</span>
                  {counts[it.key] > 0 && (
                    <span className="text-xs font-medium tabular-nums">{counts[it.key]}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="m-3 rounded-xl border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            End-to-end encrypted
          </div>
          <p className="mt-1 leading-relaxed">
            Messages are encrypted on your device. We never see the contents.
          </p>
        </div>
      )}

      <div className={cn("border-t border-border px-2 py-2", collapsed && "px-1")}>
        <Link
          to="/anonymous"
          className={cn(
            "flex items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors text-foreground/80 hover:bg-anon-soft hover:text-anon",
            collapsed && "justify-center pl-0 pr-0 py-3 rounded-full mx-auto w-12",
          )}
        >
          <VenetianMask className="h-5 w-5 shrink-0 text-anon" />
          {!collapsed && <span className="flex-1 text-left">Anonymous 🎭</span>}
        </Link>
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors text-foreground/80 hover:bg-destructive/10 hover:text-destructive mt-1",
            collapsed && "justify-center pl-0 pr-0 py-3 rounded-full mx-auto w-12",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="flex-1 text-left">Log out</span>}
        </button>
      </div>
    </aside>
  );
}