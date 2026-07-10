import { Timer } from "lucide-react";
import { formatCountdown } from "./utils";

interface Props {
  remainingMs: number;
  totalMs: number;
  expired: boolean;
}

export function CircularTimer({ remainingMs, totalMs, expired }: Props) {
  const pct = expired ? 0 : Math.max(0, Math.min(1, remainingMs / Math.max(totalMs, 1)));
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const urgent = !expired && remainingMs < 60_000;
  const warning = !expired && remainingMs < 5 * 60_000;

  const stroke = expired
    ? "var(--color-destructive)"
    : urgent
      ? "var(--color-destructive)"
      : warning
        ? "var(--color-warning)"
        : "var(--color-primary)";

  return (
    <div
      suppressHydrationWarning
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
        expired || urgent
          ? "border-destructive/30 bg-destructive/5"
          : warning
            ? "border-warning/40 bg-warning/10"
            : "border-border bg-surface-muted"
      }`}
    >
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 52 52" className="h-12 w-12 -rotate-90">
          <circle
            cx="26"
            cy="26"
            r={r}
            stroke="currentColor"
            strokeWidth="4"
            className="text-border"
            fill="none"
          />
          <circle
            cx="26"
            cy="26"
            r={r}
            stroke={stroke}
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <Timer
          className={`absolute inset-0 m-auto h-4 w-4 ${
            expired || urgent
              ? "text-destructive"
              : warning
                ? "text-warning-foreground"
                : "text-primary"
          } ${urgent && !expired ? "animate-pulse" : ""}`}
        />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {expired ? "Destroyed" : "Self-destructs"}
        </p>
        <p
          className={`font-mono text-sm font-semibold tabular-nums ${
            expired || urgent
              ? "text-destructive"
              : warning
                ? "text-warning-foreground"
                : "text-foreground"
          }`}
        >
          {expired ? "00:00" : formatCountdown(remainingMs)}
        </p>
      </div>
    </div>
  );
}
