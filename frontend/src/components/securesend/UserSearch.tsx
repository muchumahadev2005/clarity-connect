import { useState, useEffect } from "react";
import { Search, User, Clock, Loader2 } from "lucide-react";
import api from "@/lib/api";
import type { ProtectionMode } from "./types";

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

interface UserResult {
  email: string;
  publicKey: string | null;
}

interface Props {
  selected: string | null;
  onSelect: (email: string | null, publicKey?: string | null) => void;
  protection?: ProtectionMode;
}

export function UserSearch({ selected, onSelect, protection }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserResult[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Pass protection mode to API - only fetch publicKey for hybrid mode
        const query = new URLSearchParams({ q });
        if (protection) {
          query.append("protection", protection);
        }
        const res = await api.get(`/users/search?${query.toString()}`);
        setResults(res.data.data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [q, protection]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {selected[0].toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-medium text-primary">Sending directly to</p>
            <p className="font-mono text-xs">{maskEmail(selected)}</p>
          </div>
        </div>
        <button
          onClick={() => onSelect(null)}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-surface"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search user by email"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-floating animate-fade-in">
          {results.length > 0 && (
            <ul className="max-h-56 overflow-y-auto py-1">
              {results.map((c) => (
                <li key={c.email}>
                  <button
                    onMouseDown={() => onSelect(c.email, c.publicKey)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-semibold uppercase">
                      {c.email[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.email}</p>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {c.publicKey ? "🔑 Encryption Active" : "🔓 Plaintext only"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && q && results.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No users found.</p>
          )}
          {!loading && !q && (
            <p className="px-3 py-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Type to search users...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
