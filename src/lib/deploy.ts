// Set by the GitHub Pages workflow. Static hosting has no /api routes, so that
// build runs in demo mode only and plays the public test streams directly.
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** Prefix for hand-written asset URLs ("/iptv-react" on Pages, "" elsewhere). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
