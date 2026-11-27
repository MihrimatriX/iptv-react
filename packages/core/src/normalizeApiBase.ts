/** Xtream panel host → player_api.php endpoint. Bare host:port returns 401. */
export function normalizeXtreamApiBase(apiBase: string): string {
  let raw = apiBase.trim();
  // TV keyboards make "http://" tedious; accept "host:port" as well.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) raw = `http://${raw}`;
  const url = new URL(raw);
  const path = url.pathname.replace(/\/+$/, "");
  if (!/\.php$/i.test(path)) {
    url.pathname = `${path}/player_api.php`;
  } else {
    url.pathname = path;
  }
  url.search = "";
  url.hash = "";
  return url.href;
}
