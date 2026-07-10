import React, { useState } from "react";
import { Mail, Tablet, Monitor, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailPreviewProps {
  alias: string | null;
  to: string;
  subject: string;
  header: string;
  message: string;
  attachment?: { filename: string } | null;
}

export function EmailPreview({
  alias,
  to,
  subject,
  header,
  message,
  attachment,
}: EmailPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");

  const fullSenderEmail = alias ? `${alias}@securesend.co.in` : "loading-alias@securesend.co.in";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-surface shadow-elegant overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-muted">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-anon" />
          <span className="text-sm font-semibold text-foreground">Live Email Preview</span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-all",
              deviceMode === "desktop" && "bg-surface text-foreground shadow-xs",
            )}
            title="Desktop view"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-all",
              deviceMode === "mobile" && "bg-surface text-foreground shadow-xs",
            )}
            title="Mobile view"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Workspace */}
      <div className="flex-1 bg-muted/20 p-4 overflow-y-auto flex items-start justify-center min-h-[400px]">
        <div
          className={cn(
            "w-full bg-surface border border-border/80 rounded-xl shadow-xs transition-all duration-300 font-sans",
            deviceMode === "mobile" ? "max-w-[360px]" : "max-w-full",
          )}
        >
          {/* Email Client Header Bar */}
          <div className="border-b border-border/60 bg-surface-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground">From:</span>{" "}
                <span className="font-mono text-[11px] text-anon bg-anon-soft px-1.5 py-0.5 rounded">
                  {fullSenderEmail}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/80 font-medium">
                Anonymous Secure
              </span>
            </div>
            <div>
              <span className="font-semibold text-foreground">To:</span>{" "}
              {to.trim() ? (
                <span className="text-foreground/90">{to.trim()}</span>
              ) : (
                <span className="italic text-muted-foreground/70">(No recipient specified)</span>
              )}
            </div>
            <div className="pt-0.5">
              <span className="font-semibold text-foreground">Subject:</span>{" "}
              {subject.trim() ? (
                <span className="font-medium text-foreground">{subject.trim()}</span>
              ) : (
                <span className="italic text-muted-foreground/70">(No subject)</span>
              )}
            </div>
            {attachment && (
              <div className="pt-1 flex items-center gap-1.5 text-foreground/80">
                <span className="font-semibold text-foreground">Attachment:</span>
                <span className="inline-flex items-center gap-1 bg-muted border border-border/80 px-2 py-0.5 rounded text-[10px] text-foreground font-mono">
                  📎 {attachment.filename}
                </span>
              </div>
            )}
          </div>

          {/* Email Content Frame */}
          <div className="p-5 text-sm text-foreground leading-relaxed space-y-5">
            {/* Professional Department/Sender Header */}
            {header.trim() ? (
              <div className="inline-block rounded bg-anon-soft border border-anon/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-anon">
                {header.trim()}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground border border-dashed border-border w-fit">
                <Info className="h-3.5 w-3.5 text-muted-foreground/75" />
                No header name set. (Optional)
              </div>
            )}

            {/* Main Message Body */}
            <div className="text-foreground/95 leading-relaxed whitespace-pre-wrap min-h-[140px] select-text">
              {message.trim() ? (
                message.trim()
              ) : (
                <span className="italic text-muted-foreground/60 select-none">
                  Write your message contents in the editor on the left. The preview updates
                  automatically in real-time.
                </span>
              )}
            </div>

            {/* Email Footnote / Secure Footer */}
            <div className="border-t border-border/60 pt-4 flex items-center justify-between text-[10px] text-muted-foreground/85 select-none">
              <span>Verified Secure Email</span>
              <span>via SecureSend Platform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
