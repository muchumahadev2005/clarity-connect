import { useState } from "react";
import { Play, Pause } from "lucide-react";

export function VoicePlayer({ duration = 32 }: { duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="rounded-2xl border border-border bg-surface-muted p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setPlaying((p) => !p);
            if (!playing) setProgress((p) => Math.min(100, p + 25));
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <div className="flex h-8 items-center gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => {
              const h = 6 + ((i * 13) % 22);
              const active = (i / 40) * 100 <= progress;
              return (
                <span
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: `${h}px`,
                    backgroundColor: active
                      ? "var(--color-primary)"
                      : "oklch(0.85 0.01 250)",
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>0:{Math.floor((progress / 100) * duration).toString().padStart(2, "0")}</span>
            <span>0:{duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}