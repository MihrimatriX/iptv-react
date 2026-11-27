import { test } from "node:test";
import assert from "node:assert/strict";
import { XtreamClient, XtreamError } from "./xtream.ts";
import { epgProgress, normaliseEpg, nowAndNext } from "./epg.ts";
import { normalizeXtreamApiBase } from "./normalizeApiBase.ts";

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

/** A fake panel: routes on the `action` query parameter. */
function fakePanel(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const action = new URL(url).searchParams.get("action") ?? "";
    const body = action in routes ? routes[action] : { user_info: { auth: 0 } };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return { fetch, calls };
}

const creds = { apiBase: "http://panel.example:8080", username: "user", password: "p@ss" };

test("normalizeXtreamApiBase adds the endpoint and a scheme", () => {
  assert.equal(normalizeXtreamApiBase("http://h:80/"), "http://h/player_api.php");
  assert.equal(normalizeXtreamApiBase("panel.example:8080"), "http://panel.example:8080/player_api.php");
  assert.equal(normalizeXtreamApiBase("https://h/x/player_api.php?a=1"), "https://h/x/player_api.php");
});

test("builds stream URLs off the panel origin", () => {
  const client = new XtreamClient(creds);
  assert.equal(client.liveUrl(5), "http://panel.example:8080/live/user/p%40ss/5.m3u8");
  assert.equal(client.liveUrl(5, "ts"), "http://panel.example:8080/live/user/p%40ss/5.ts");
  assert.equal(client.movieUrl(9, "mkv"), "http://panel.example:8080/movie/user/p%40ss/9.mkv");
  assert.equal(client.episodeUrl(3), "http://panel.example:8080/series/user/p%40ss/3.mp4");
});

test("getLiveCatalog groups streams, drops empty categories and sorts", async () => {
  const { fetch, calls } = fakePanel({
    get_live_categories: [
      { category_id: "2", category_name: "Spor", parent_id: 0 },
      { category_id: "1", category_name: "Haber", parent_id: 0 },
      { category_id: "3", category_name: "Boş", parent_id: 0 },
    ],
    get_live_streams: [
      { num: 2, name: "Spor 2", stream_type: "live", stream_id: 20, category_id: "2" },
      { num: 1, name: "Haber 1", stream_type: "live", stream_id: 10, category_id: "1", epg_channel_id: "h1" },
      { num: 3, name: "A Spor", stream_type: "live", stream_id: 21, category_id: "2", stream_icon: "not-a-url" },
    ],
  });
  const catalog = await new XtreamClient(creds, { fetch }).getLiveCatalog();
  assert.deepEqual(catalog.map((c) => c.name), ["Haber", "Spor"]);
  assert.deepEqual(catalog[1].streams.map((s) => s.name), ["A Spor", "Spor 2"]);
  assert.equal(catalog[1].streams[0].streamIcon, null);
  assert.equal(catalog[0].streams[0].epgChannelId, "h1");
  assert.equal(calls.length, 2);
  assert.match(calls[0], /username=user&password=p%40ss/);
});

test("list endpoints turn an auth failure into a 401", async () => {
  const { fetch } = fakePanel({});
  await assert.rejects(new XtreamClient(creds, { fetch }).getVodStreams(), (error: unknown) => {
    return error instanceof XtreamError && error.status === 401;
  });
});

test("getAccount reads user_info", async () => {
  const { fetch } = fakePanel({
    "": {
      user_info: { auth: 1, username: "user", status: "Active", exp_date: "1893456000", max_connections: "2", allowed_output_formats: ["m3u8", "ts"] },
      server_info: { timezone: "Europe/Istanbul" },
    },
  });
  const account = await new XtreamClient(creds, { fetch }).getAccount();
  assert.equal(account.expiresAt, 1893456000 * 1000);
  assert.equal(account.maxConnections, 2);
  assert.deepEqual(account.outputFormats, ["m3u8", "ts"]);
});

test("getVodStreams and getVodDetails normalise panel quirks", async () => {
  const { fetch } = fakePanel({
    get_vod_streams: [
      { stream_id: "7", name: "Film", category_id: "4", stream_icon: "http://img/p.jpg", rating: "", rating_5based: 4, container_extension: "mkv" },
    ],
    get_vod_info: {
      info: { name: "Film", plot: "Özet", backdrop_path: ["https://img/b.jpg"], duration: "01:42:10", rating: "7.5" },
      movie_data: { stream_id: 7, name: "Film", container_extension: "mkv" },
    },
  });
  const client = new XtreamClient(creds, { fetch });
  const [movie] = await client.getVodStreams();
  assert.equal(movie.id, 7);
  assert.equal(movie.rating, 8);
  assert.equal(movie.extension, "mkv");
  const details = await client.getVodDetails(7);
  assert.equal(details.duration, 6130);
  assert.equal(details.backdrop, "https://img/b.jpg");
  assert.equal(details.rating, 7.5);
});

test("getVodDetails tolerates info: []", async () => {
  const { fetch } = fakePanel({ get_vod_info: { info: [], movie_data: { stream_id: 1, name: "X" } } });
  const details = await new XtreamClient(creds, { fetch }).getVodDetails(1);
  assert.equal(details.title, "X");
  assert.equal(details.extension, "mp4");
});

test("getSeriesDetails groups episodes keyed by season or flat", async () => {
  const keyed = fakePanel({
    get_series_info: {
      seasons: [{ season_number: 1, name: "Sezon 1" }, { season_number: 3, name: "Boş" }],
      info: { name: "Dizi", rating_5based: 3 },
      episodes: {
        "1": [
          { id: "102", episode_num: 2, title: "B", container_extension: "mp4", info: { duration_secs: 1500 } },
          { id: "101", episode_num: 1, title: "A", container_extension: "mp4", info: [] },
        ],
        "2": [{ id: "201", episode_num: 1, title: "C", container_extension: "mkv" }],
      },
    },
  });
  const details = await new XtreamClient(creds, { fetch: keyed.fetch }).getSeriesDetails(1);
  assert.deepEqual(details.seasons.map((s) => s.number), [1, 2]);
  assert.deepEqual(details.seasons[0].episodes.map((e) => e.title), ["A", "B"]);
  assert.equal(details.seasons[0].episodes[1].duration, 1500);
  assert.equal(details.seasons[1].name, "2. Sezon");
  assert.equal(details.rating, 6);

  const flat = fakePanel({
    get_series_info: { info: { name: "Düz" }, episodes: [{ id: 5, episode_num: 1, season: 1, title: "Tek" }] },
  });
  const flatDetails = await new XtreamClient(creds, { fetch: flat.fetch }).getSeriesDetails(2);
  assert.equal(flatDetails.seasons[0].episodes[0].id, 5);
});

test("EPG: base64 titles, timestamps, now/next and progress", async () => {
  const { fetch } = fakePanel({
    get_short_epg: {
      epg_listings: [
        { id: "2", title: b64("Akşam Haberleri"), description: b64("Gündem"), start_timestamp: "2000", stop_timestamp: "3000" },
        { id: "1", title: b64("Öğle"), start_timestamp: "1000", stop_timestamp: "2000" },
        { id: "bad", title: "plain text", start_timestamp: "5000", stop_timestamp: "4000" },
      ],
    },
  });
  const epg = await new XtreamClient(creds, { fetch }).getShortEpg(1);
  assert.deepEqual(epg.map((e) => e.title), ["Öğle", "Akşam Haberleri"]);
  const { now, next } = nowAndNext(epg, 1_500_000);
  assert.equal(now?.title, "Öğle");
  assert.equal(next?.title, "Akşam Haberleri");
  assert.equal(epgProgress(now, 1_500_000), 0.5);
});

test("normaliseEpg falls back to the start/end strings", () => {
  const [entry] = normaliseEpg([{ title: b64("X"), start: "2026-01-01 10:00:00", end: "2026-01-01 11:00:00" }]);
  assert.equal(entry.start, Date.UTC(2026, 0, 1, 10));
  assert.equal(entry.end - entry.start, 3_600_000);
});
