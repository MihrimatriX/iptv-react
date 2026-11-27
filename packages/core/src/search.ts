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

/**
 * Folds every name once so a search over tens of thousands of VOD titles
 * only folds the term per keystroke. Worth it on TV CPUs.
 */
export function createSearchIndex<T>(items: readonly T[], getName: (item: T) => string) {
  const folded = items.map((item) => foldForSearch(getName(item)));
  return (term: string, limit = Infinity): T[] => {
    const needle = foldForSearch(term);
    if (!needle) return [];
    const results: T[] = [];
    for (let i = 0; i < items.length && results.length < limit; i++) {
      if (folded[i].indexOf(needle) !== -1) results.push(items[i]);
    }
    return results;
  };
}
