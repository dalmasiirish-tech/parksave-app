const LOCALE = "en-PH";

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function shortDuration(ms: number) {
  const { h, m } = splitDuration(ms);
  if (h === 0) return m <= 1 ? "1 min" : `${m} mins`;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Magandang umaga";
  if (h < 18) return "Magandang hapon";
  return "Magandang gabi";
}

export function spotTitle(spot: { building: string; level: string; slot: string }) {
  if (spot.building) return spot.building;
  if (spot.level || spot.slot) return [spot.level && `Level ${spot.level}`, spot.slot && `Slot ${spot.slot}`].filter(Boolean).join(" · ");
  return "Saved location";
}
