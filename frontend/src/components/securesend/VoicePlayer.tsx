import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

export function VoicePlayer({
  duration = 32,
  audioSrc,
}: {
  duration?: number;
  audioSrc?: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let createdUrl: string | null = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);

    if (audioSrc) {
      let finalUrl = audioSrc;
      if (audioSrc.startsWith("data:")) {
        try {
          const arr = audioSrc.split(",");
          const mimeMatch = arr[0].match(/data:(.*?);base64/i) || arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "audio/webm";
          const bstr = atob(arr[1].trim());
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          createdUrl = URL.createObjectURL(blob);
          finalUrl = createdUrl;
        } catch (e) {
          console.error("Failed to convert base64 to blob URL", e);
        }
      }

      const audio = new Audio(finalUrl);

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setPlaying(false);
        setProgress(100);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onerror = (e) => {
        console.error("Audio player error:", e);
        setPlaying(false);
      };

      audioRef.current = audio;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [audioSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          setPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(pct * 100);
  };

  const mm = (n: number) => {
    if (isNaN(n) || !isFinite(n) || n < 0) return "0:00";
    const min = Math.floor(n / 60);
    const sec = Math.floor(n % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const displayTime = currentTime;
  const displayDuration = audioDuration || duration;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted p-4 shadow-elegant">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Mic className="h-3 w-3" /> Voice Note
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioSrc}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-all hover:opacity-90 active:scale-90 disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
        </button>
        <div className="flex-1">
          <div
            onClick={handleSeek}
            className="flex h-9 cursor-pointer items-center gap-0.5 py-1"
            title="Click to seek"
          >
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
