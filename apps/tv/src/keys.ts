import { useEffect, useRef } from "react";

export type KeyAction =
  | "up" | "down" | "left" | "right" | "ok" | "back"
  | "play" | "pause" | "playPause" | "stop" | "ff" | "rw"
  | "chUp" | "chDown" | "red" | "green" | "yellow" | "blue" | "info"
  | `digit${number}`;

// webOS and Tizen remotes send DOM keyCodes; desktop keyboards mostly `key`.
const KEY_CODES: Record<number, KeyAction> = {
  37: "left", 38: "up", 39: "right", 40: "down", 13: "ok",
  461: "back", // webOS Back (with disableBackHistoryAPI)
  10009: "back", // Tizen Return
  27: "back",
  415: "play", 19: "pause", 10252: "playPause", 179: "playPause", 413: "stop",
  417: "ff", 412: "rw",
  427: "chUp", 428: "chDown", // Tizen
  33: "chUp", 34: "chDown", // webOS CH+/CH- arrive as PageUp/PageDown
  403: "red", 404: "green", 405: "yellow", 406: "blue",
  457: "info",
};

function toAction(event: KeyboardEvent, typing: boolean): KeyAction | null {
  const code = event.keyCode || event.which;
  if (typing) {
    // Let the field keep arrows, digits and Backspace; only navigation escapes.
    if (code === 38 || code === 40 || code === 13 || code === 27 || code === 461 || code === 10009) {
      return KEY_CODES[code];
    }
    if (code === 65376 || code === 65385) return "ok"; // Tizen IME Done / Cancel
    return null;
  }
  if (code in KEY_CODES) return KEY_CODES[code];
  if (code === 8) return "back";
  if (code >= 48 && code <= 57) return `digit${code - 48}`;
  if (code >= 96 && code <= 105) return `digit${code - 96}`;
  if (event.key === " ") return "playPause";
  if (event.key === "i") return "info";
  if (event.key === "r") return "red";
  return null;
}

/** Higher layers get keys first: overlays above screens. */
export const Layer = { screen: 0, detail: 10, player: 20, modal: 30 } as const;

type Handler = (action: KeyAction, event: KeyboardEvent) => boolean | void;
interface Entry {
  layer: number;
  order: number;
  handler: { current: Handler };
}

const entries: Entry[] = [];
let order = 0;
let pointerActive = false;

/** Hover should only steal focus after the pointer really moved (Magic Remote, mouse). */
export const isPointerActive = () => pointerActive;

if (typeof window !== "undefined") {
  window.addEventListener("mousemove", () => {
    pointerActive = true;
  });
  window.addEventListener(
    "keydown",
    (event) => {
      pointerActive = false;
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      const action = toAction(event, typing);
      if (!action) return;
      const sorted = entries.slice().sort((a, b) => b.layer - a.layer || b.order - a.order);
      for (const entry of sorted) {
        if (entry.handler.current(action, event) === true) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      // Arrow keys would otherwise scroll the page on some engines.
      if (!typing && /^(up|down|left|right)$/.test(action)) event.preventDefault();
    },
    true
  );
}

/** Subscribes to remote keys while `enabled`; return true from the handler to consume a key. */
export function useKeys(handler: Handler, layer: number = Layer.screen, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const entry: Entry = { layer, order: ++order, handler: ref };
    entries.push(entry);
    return () => {
      const index = entries.indexOf(entry);
      if (index !== -1) entries.splice(index, 1);
    };
  }, [layer, enabled]);
}
