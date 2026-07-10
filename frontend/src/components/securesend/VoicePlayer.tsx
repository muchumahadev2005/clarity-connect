import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

export function VoicePlayer({ duration = 32, audioSrc }: { duration?: number; audioSrc?: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (audioSrc && !audioRef.current) {
      audioRef.current = new Audio(audioSrc);
      audioRef.current.onended = () => {
        setPlaying(false);
        setProgress(100);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
    }
  }, [audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) {
      setPlaying(!playing);
      return;
    }

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    if (!audioSrc && playing) {
      timerRef.current = window.setInterval(() => {
        setProgress((p) => {
          const next = p + 100 / (duration * 10);
          if (next >= 100) {
            setPlaying(false);
            return 100;
          }
          return next;
        });
      }, 100);
    } else if (!playing && timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [playing, duration, audioSrc]);

  const mm = (n: number) => {
    const min = Math.floor(n / 60);
    const sec = Math.floor(n % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const displayTime = audioRef.current?.duration ? currentTime : (progress / 100) * duration;
  const displayDuration = audioRef.current?.duration || duration;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted p-4 shadow-elegant">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Mic className="h-3 w-3" /> Encrypted voice note
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-all hover:opacity-90 active:scale-90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="flex-1">
          <div className="flex h-9 items-center gap-0.5">
            {Array.from({ length: 44 }).map((_, i) => {
              const h = 6 + ((i * 13) % 24);
              const active = (i / 44) * 100 <= progress;
              return (
                <span
                  key={i}
                  className="w-1 origin-center rounded-full transition-all"
                  style={{
                    height: `${h}px`,
                    backgroundColor: active ? "var(--color-primary)" : "oklch(0.88 0.01 250)",
                    transform:
                      playing && active ? `scaleY(${0.8 + ((i * 17) % 10) / 30})` : "scaleY(1)",
                    transition: "transform 0.3s ease, background-color 0.2s ease",
                  }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{mm(displayTime)}</span>
            <span>{mm(displayDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline waveform + play preview for list items.
export function VoicePreview({ duration = 32 }: { duration?: number }) {
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Play className="h-2.5 w-2.5 translate-x-[1px]" />
      </span>
      <span className="flex h-4 items-center gap-[2px]">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-primary/60"
            style={{ height: `${4 + ((i * 11) % 12)}px` }}
          />
        ))}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">0:{duration}</span>
    </span>
  );
}
