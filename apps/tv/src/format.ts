const timeFormat = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export const clock = (ms: number) => timeFormat.format(new Date(ms));
export const longDate = (ms: number) => dateFormat.format(new Date(ms));

/** 3725 → "1:02:05", 125 → "2:05". */
export function duration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 6130 → "1 sa 42 dk". */
export function runtime(totalSeconds?: number) {
  if (!totalSeconds) return null;
  const minutes = Math.round(totalSeconds / 60);
  const h = Math.floor(minutes / 60);
  return h ? `${h} sa ${minutes % 60} dk` : `${minutes} dk`;
}

export const year = (date?: string) => (date ? /\d{4}/.exec(date)?.[0] ?? null : null);
