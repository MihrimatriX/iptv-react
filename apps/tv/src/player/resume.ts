import { load, save } from "../storage";

interface Resume {
  position: number;
  duration: number;
  at: number;
}

const KEY = "resume";
const MAX_ENTRIES = 200;

export function getResume(key: string): number | null {
  const entry = load<Record<string, Resume>>(KEY, {})[key];
  if (!entry) return null;
  // Not worth resuming the first 30 s, nor something practically finished.
  if (entry.position < 30 || (entry.duration && entry.position > entry.duration - 60)) return null;
  return entry.position;
}

export function setResume(key: string, position: number, duration: number) {
  const all = load<Record<string, Resume>>(KEY, {});
  if (duration && position > duration - 60) delete all[key];
  else all[key] = { position, duration, at: Date.now() };
  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    keys.sort((a, b) => all[a].at - all[b].at);
    for (const old of keys.slice(0, keys.length - MAX_ENTRIES)) delete all[old];
  }
  save(KEY, all);
}
