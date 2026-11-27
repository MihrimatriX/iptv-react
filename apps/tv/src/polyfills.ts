// Old TV engines (Chromium 68/69) lack many ES2019+ built-ins that React 19,
// hls.js and our code use. Syntax is lowered by Vite; built-ins come from here.
import "core-js/stable";
