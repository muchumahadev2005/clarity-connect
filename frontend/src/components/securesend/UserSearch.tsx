import { useState, useMemo } from "react";
import { Search, User, Clock } from "lucide-react";

const CONTACTS = [
  { name: "Aanya Sharma", email: "aanya.sharma@acme.co" },
  { name: "Marcus Lee", email: "marcus.lee@northwind.io" },
  { name: "Priya Nair", email: "priya@legalpartners.com" },
  { name: "Finance Team", email: "finance@acme.co" },
  { name: "Devin Park", email: "devin.park@hooli.dev" },
  { name: "Ops Bot", email: "ops-bot@internal.local" },
];

const RECENT = ["aanya.sharma@acme.co", "finance@acme.co", "marcus.lee@northwind.io"];

function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

interface Props {
  selected: string | null;
  onSelect: (email: string | null) => void;
}

export function UserSearch({ selected, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    if (!q) return [];
    const v = q.toLowerCase();
    return CONTACTS.filter((c) => c.name.toLowerCase().includes(v) || c.email.toLowerCase().includes(v)).slice(0, 5);
  }, [q]);

  const recent = CONTACTS.filter((c) => RECENT.includes(c.email));

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
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-floating animate-fade-in">
          {q && matches.length > 0 && (
            <ul className="max-h-56 overflow-y-auto py-1">
              {matches.map((c) => (
                <li key={c.email}>
                  <button
                    onMouseDown={() => onSelect(c.email)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary text-xs font-semibold">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{maskEmail(c.email)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!q && (
            <div className="py-1">
              <p className="flex items-center gap-1.5 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" /> Recent contacts
              </p>
              <ul className="mt-1">
                {recent.map((c) => (
                  <li key={c.email}>
                    <button
                      onMouseDown={() => onSelect(c.email)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-secondary"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm">{c.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">{maskEmail(c.email)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {q && matches.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No contacts found.</p>
          )}
        </div>
      )}
    </div>
  );
}
