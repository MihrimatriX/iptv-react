/**
 * Folds text for forgiving search: Turkish-aware lowercase, accents dropped
 * (ü→u, ş→s, ı→i), and spaces/punctuation removed so "tv 8" finds "TV8" and
 * "trt1" finds "TR | TRT 1 HD". Mirrors foldForSearch() in the mobile app.
 */
export const foldForSearch = (text: string) =>
  text
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]/gu, "");

let lastTerm = "";
let lastFolded = "";

/** Called once per channel on every keystroke; the folded term is reused. */
export function matchesSearch(channelName: string, term: string): boolean {
  if (term !== lastTerm) {
    lastTerm = term;
    lastFolded = foldForSearch(term);
  }
  return foldForSearch(channelName).includes(lastFolded);
}
