import {
  Inbox,
  Send,
  TimerOff,
  Activity,
  ShieldCheck,
  Plus,
  Menu,
  VenetianMask,
  LogOut,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Folder } from "./types";
import { cn } from "@/lib/utils";
import { clearStoredRSAKeys } from "./crypto";

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
  user: { email: string } | null;
}

export function Sidebar({ active, onSelect, onCompose, counts, collapsed, onToggle, user }: Props) {
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    clearStoredRSAKeys();
    window.location.href = "/landing";
  };

  const handleSelect = (f: Folder) => {
    onSelect(f);
    if (!collapsed && typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  const handleCompose = () => {
    onCompose();
    if (!collapsed && typeof window !== "undefined" && window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Gmail Backdrop Overlay (Only visible when drawer is expanded on mobile) */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out shrink-0 select-none h-full",
          // Mobile: floating overlay drawer when expanded (z-50), narrow in-line rail when collapsed
          // Desktop (lg:): in-line sidebar (w-18 when collapsed, w-64 when expanded)
          !collapsed
            ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl lg:static lg:w-64 lg:shadow-none"
            : "w-16 sm:w-18 z-30",
        )}
      >
        {/* Top Bar: Hamburger + Title */}
        <div
          className={cn(
            "flex items-center py-3.5 border-b border-border/40",
            collapsed ? "justify-center" : "justify-between px-4",
          )}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className="rounded-full p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Toggle sidebar"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
            {!collapsed && (
              <Link
                to="/"
                className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 hover:opacity-90 transition-opacity"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold tracking-tight">SecureSend</span>
              </Link>
            )}
          </div>
        </div>

        {/* New Secure Message Action */}
        <div className="p-2.5">
          <button
            onClick={handleCompose}
            className={cn(
              "group flex items-center gap-3 rounded-2xl bg-primary-soft text-accent-foreground font-medium shadow-elegant hover:shadow-floating transition-all",
              collapsed ? "h-11 w-11 justify-center mx-auto" : "h-12 w-full px-4",
            )}
            aria-label="New secure message"
            title={collapsed ? "New Secure Message" : undefined}
          >
            <Plus className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="font-semibold text-sm">New Secure Message</span>}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => handleSelect(it.key)}
                className={cn(
                  "flex items-center text-sm transition-all",
                  collapsed
                    ? "h-11 w-11 justify-center mx-auto rounded-2xl"
                    : "w-full gap-4 rounded-r-full pl-5 pr-4 py-2.5",
                  isActive
                    ? "bg-primary-soft text-accent-foreground font-bold shadow-sm"
                    : "text-foreground/80 hover:bg-secondary",
                )}
                aria-label={it.label}
                title={collapsed ? `${it.label} (${counts[it.key] || 0})` : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{it.label}</span>
                    {counts[it.key] > 0 && (
                      <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-surface/50">
                        {counts[it.key]}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}

          <Link
            to="/anonymous"
            onClick={() => {
              if (!collapsed && typeof window !== "undefined" && window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className={cn(
              "flex items-center text-sm transition-all text-foreground/80 hover:bg-anon-soft hover:text-anon mt-2",
              collapsed
                ? "h-11 w-11 justify-center mx-auto rounded-2xl"
                : "w-full gap-4 rounded-r-full pl-5 pr-4 py-2.5",
            )}
            aria-label="Anonymous messaging"
            title={collapsed ? "Anonymous 🎭" : undefined}
          >
            <VenetianMask className="h-5 w-5 shrink-0 text-anon" />
            {!collapsed && <span className="flex-1 text-left font-medium">Anonymous 🎭</span>}
          </Link>
        </nav>

        {/* Security Banner (Expanded mode only) */}
        {!collapsed && (
          <div className="m-3 rounded-xl border border-border bg-surface-muted p-3 text-xs text-muted-foreground animate-in fade-in duration-300">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              End-to-end encrypted
            </div>
            <p className="mt-1 leading-relaxed text-[11px]">
              Messages are encrypted on your device. We never see the contents.
            </p>
          </div>
        )}

        {/* Footer Profile & Logout */}
        <div
          className={cn(
            "border-t border-border p-2 space-y-1.5",
            collapsed && "flex flex-col items-center gap-2 px-1 py-3",
          )}
        >
          {user && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl transition-colors",
                collapsed ? "justify-center" : "px-3 py-2",
              )}
              title={collapsed ? `${user.email} (Logged in)` : undefined}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs shadow-sm">
                {user.email.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground">Logged in</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center text-sm transition-colors text-foreground/80 hover:bg-destructive/10 hover:text-destructive",
              collapsed
                ? "h-10 w-10 justify-center mx-auto rounded-xl"
                : "w-full gap-4 rounded-r-full pl-5 pr-4 py-2",
            )}
            aria-label="Log out"
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
