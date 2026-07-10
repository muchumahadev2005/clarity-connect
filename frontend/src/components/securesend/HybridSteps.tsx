import { KeyRound, Lock, ShieldCheck, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type HybridMode = "encrypt" | "decrypt";

interface Props {
  mode: HybridMode;
  /** 0 = idle, 1..3 = step in progress, 4 = complete */
  step: number;
  className?: string;
  aesKeyPreview?: string;
  rsaWrappedKeyPreview?: string;
}

const LABELS: Record<HybridMode, [string, string, string]> = {
  encrypt: ["Generate AES Key", "Encrypt Message", "Secure Key with RSA"],
  decrypt: ["Verify Access", "Decrypt RSA Key", "Decrypt Message"],
};

export function HybridSteps({ mode, step, className, aesKeyPreview, rsaWrappedKeyPreview }: Props) {
  const labels = LABELS[mode];
  const icons = [KeyRound, Lock, ShieldCheck];
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-r from-primary-soft/60 via-surface-muted to-surface-muted px-4 py-3 flex flex-col gap-3",
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
            <div
              key={label}
              className="flex flex-1 flex-col sm:flex-row items-center sm:items-start gap-2 min-w-0"
            >
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
                  "truncate text-[11px] font-medium sm:mt-1.5",
                  done || active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < labels.length - 1 && (
                <div
                  className={cn(
                    "ml-1 mr-1 hidden h-px flex-1 sm:block mt-4",
                    step > idx ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {(aesKeyPreview || rsaWrappedKeyPreview) && (
        <div className="mt-2 rounded-lg bg-surface border border-border/60 p-2.5 space-y-2">
          {aesKeyPreview && (
            <div>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Raw AES-256 Key (Transient / Exists only in memory)
              </p>
              <p className="font-mono text-[9px] break-all leading-tight text-muted-foreground mt-0.5 bg-background p-1.5 rounded border border-border/40">
                {aesKeyPreview}
              </p>
            </div>
          )}
          {rsaWrappedKeyPreview && (
            <div>
              <p className="text-[10px] font-semibold text-success uppercase tracking-wider">
                RSA Wrapped AES Key (Final Encrypted Form)
              </p>
              <p className="font-mono text-[9px] break-all leading-tight text-muted-foreground mt-0.5 bg-background p-1.5 rounded border border-border/40">
                {rsaWrappedKeyPreview}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
