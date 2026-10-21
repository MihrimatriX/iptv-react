/** Xtream panel host → player_api.php endpoint. Bare host:port returns 401. */
export function normalizeXtreamApiBase(apiBase: string): string {
  const url = new URL(apiBase.trim());
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
