export function timeAgo(iso: string) {
  if (!iso) return "just now";
  const date = new Date(iso);
  const time = date.getTime();
  if (isNaN(time)) return "just now";

  const diff = Date.now() - time;
  if (diff <= 0) return "just now";

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";

  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;

  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function generateLink() {
  const id = Math.random().toString(36).slice(2, 10);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env.VITE_APP_URL || "https://securesend.co.in";
  return `${origin}/m/${id}`;
}
