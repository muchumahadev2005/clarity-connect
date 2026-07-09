import { Inbox, Send, TimerOff, Activity, ShieldCheck, Plus, Menu, VenetianMask, LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    clearStoredRSAKeys();
    navigate({ to: "/landing" });
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        onClick={onToggle}
      />

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out z-50",
          "fixed inset-y-0 left-0 lg:static",
          collapsed 
            ? "-translate-x-full lg:translate-x-0 lg:w-18" 
            : "translate-x-0 w-70",
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
          {(!collapsed || (collapsed && typeof window !== "undefined" && window.innerWidth < 1024)) && (
            <Link to="/" className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 hover:opacity-90 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">SecureSend</span>
            </Link>
          )}
        </div>

        <div className={cn("px-3 pb-3", collapsed && "lg:px-2")}>
          <button
            onClick={() => {
              onCompose();
              if (window.innerWidth < 1024) onToggle();
            }}
            className={cn(
              "group flex items-center gap-3 rounded-2xl bg-primary-soft text-accent-foreground font-medium shadow-elegant hover:shadow-floating transition-all",
              collapsed ? "lg:h-12 lg:w-12 lg:justify-center h-14 w-full px-4" : "h-14 w-full px-4",
            )}
          >
            <Plus className="h-5 w-5 shrink-0" />
            {( !collapsed || (collapsed && window.innerWidth < 1024)) && <span>New Secure Message</span>}
          </button>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.key;
            return (
              <button
                key={it.key}
                onClick={() => {
                  onSelect(it.key);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={cn(
                  "flex w-full items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors",
                  collapsed && "lg:justify-center lg:pl-0 lg:pr-0 lg:py-3 lg:rounded-full lg:mx-auto lg:w-12",
                  isActive
                    ? "bg-primary-soft text-accent-foreground font-semibold"
                    : "text-foreground/80 hover:bg-secondary",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(!collapsed || (collapsed && window.innerWidth < 1024)) && (
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

        {(!collapsed || (collapsed && window.innerWidth < 1024)) && (
          <div className="m-3 rounded-xl border border-border bg-surface-muted p-3 text-xs text-muted-foreground animate-in fade-in duration-500">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              End-to-end encrypted
            </div>
            <p className="mt-1 leading-relaxed">
              Messages are encrypted on your device. We never see the contents.
            </p>
          </div>
        )}

        <div className={cn("border-t border-border px-2 py-2", collapsed && "lg:px-1")}>
          {user && (
            <div className={cn(
              "mb-2 flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
              collapsed ? "lg:justify-center lg:px-0" : ""
            )}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-xs">
                {user.email.charAt(0).toUpperCase()}
              </div>
              {(!collapsed || (collapsed && window.innerWidth < 1024)) && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground">Logged in</p>
                </div>
              )}
            </div>
          )}

          <Link
            to="/anonymous"
            onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
            className={cn(
              "flex items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors text-foreground/80 hover:bg-anon-soft hover:text-anon",
              collapsed && "lg:justify-center lg:pl-0 lg:pr-0 lg:py-3 lg:rounded-full lg:mx-auto lg:w-12",
            )}
          >
            <VenetianMask className="h-5 w-5 shrink-0 text-anon" />
            {(!collapsed || (collapsed && window.innerWidth < 1024)) && <span className="flex-1 text-left">Anonymous 🎭</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-4 rounded-r-full pl-6 pr-4 py-2 text-sm transition-colors text-foreground/80 hover:bg-destructive/10 hover:text-destructive mt-1",
              collapsed && "lg:justify-center lg:pl-0 lg:pr-0 lg:py-3 lg:rounded-full lg:mx-auto lg:w-12",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {(!collapsed || (collapsed && window.innerWidth < 1024)) && <span className="flex-1 text-left">Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}