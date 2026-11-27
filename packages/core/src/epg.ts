import type { EpgEntry, XtreamEpgListing } from "./types.ts";

/** Xtream sends EPG titles and descriptions as base64 UTF-8. */
export function decodeBase64Utf8(value: string | undefined | null): string {
  if (!value) return "";
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value; // a few panels send plain text
  }
}

const toMs = (timestamp: string | number | undefined, fallback: string | undefined) => {
  const seconds = Number(timestamp);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  if (!fallback) return NaN;
  // "2026-11-27 20:00:00": panel time with no zone; UTC is the least-bad guess.
  return Date.parse(`${fallback.replace(" ", "T")}Z`);
};

export function normaliseEpg(listings: XtreamEpgListing[] | undefined | null): EpgEntry[] {
  if (!Array.isArray(listings)) return [];
  return listings
    .map((listing, index) => ({
      id: String(listing.id ?? `${listing.start_timestamp ?? listing.start}-${index}`),
      title: decodeBase64Utf8(listing.title).trim(),
      description: decodeBase64Utf8(listing.description).trim(),
      start: toMs(listing.start_timestamp, listing.start),
      end: toMs(listing.stop_timestamp, listing.end),
    }))
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end) && entry.end > entry.start)
    .sort((a, b) => a.start - b.start);
}

/** The programme on air at `now` and the one after it. */
export function nowAndNext(entries: readonly EpgEntry[], now = Date.now()) {
  const index = entries.findIndex((entry) => entry.start <= now && now < entry.end);
  if (index === -1) {
    const upcoming = entries.find((entry) => entry.start > now) ?? null;
    return { now: null, next: upcoming };
  }
  return { now: entries[index], next: entries[index + 1] ?? null };
}

/** 0..1 through the programme. */
export function epgProgress(entry: EpgEntry | null | undefined, now = Date.now()): number {
  if (!entry) return 0;
  return Math.min(1, Math.max(0, (now - entry.start) / (entry.end - entry.start)));
}

/** Programmes that have not finished yet, starting with the current one. */
export function upcoming(entries: readonly EpgEntry[], now = Date.now(), limit = 8): EpgEntry[] {
  return entries.filter((entry) => entry.end > now).slice(0, limit);
}
