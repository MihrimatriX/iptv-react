// The UI is drawn on a 120rem x 67.5rem canvas (16px rem at 1920x1080), and
// the root font size scales it to the screen. CSS min()/clamp() would do this
// but need Chromium 79; webOS 5 has 68.
const CANVAS_W = 120;
const CANVAS_H = 67.5;
let rem = 16;

export function fitRootFontSize() {
  const apply = () => {
    rem = Math.max(6, Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H));
    document.documentElement.style.fontSize = `${rem}px`;
  };
  apply();
  window.addEventListener("resize", apply);
}

export const remPx = () => rem;
