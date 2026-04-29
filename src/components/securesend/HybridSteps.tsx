import { KeyRound, Lock, ShieldCheck, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type HybridMode = "encrypt" | "decrypt";

interface Props {
  mode: HybridMode;
  /** 0 = idle, 1..3 = step in progress, 4 = complete */
  step: number;
  className?: string;
}

const LABELS: Record<HybridMode, [string, string, string]> = {
  encrypt: ["Generate AES Key", "Encrypt Message", "Secure Key with RSA"],
  decrypt: ["Verify Access", "Decrypt RSA Key", "Decrypt Message"],
};

export function HybridSteps({ mode, step, className }: Props) {
  const labels = LABELS[mode];
  const icons = [KeyRound, Lock, ShieldCheck];
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-r from-primary-soft/60 via-surface-muted to-surface-muted px-3 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {labels.map((label, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          const Icon = icons[i];
          return (
            <div key={label} className="flex flex-1 items-center gap-2 min-w-0">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 transition-all",
                  done
                    ? "bg-success text-white ring-success/40"
                    : active
                      ? "bg-primary text-primary-foreground ring-primary/40 animate-glow-pulse"
                      : "bg-surface text-muted-foreground ring-border",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "truncate text-[11px] font-medium",
                  done || active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < labels.length - 1 && (
                <div
                  className={cn(
                    "ml-1 mr-1 hidden h-px flex-1 sm:block",
                    step > idx ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}