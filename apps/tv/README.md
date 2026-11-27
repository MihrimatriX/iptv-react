# AFU IPTV for TVs and desktop

One Vite + React app with a 10-foot, remote-first UI. It runs in four shells:

| Target | Package | How it talks to the panel |
| --- | --- | --- |
| Samsung Tizen 5.5+ (2020+) | `.wgt` | Directly (`<access origin="*">` in `config.xml`) |
| LG webOS 5+ (2020+) | `.ipk` | Directly, falling back to the bundled JS service when CORS blocks it |
| Windows / macOS / Linux | Tauri 2 installers | Rust HTTP plugin, no CORS |
| Browser (`npm run dev`) | – | Vite dev proxy (`/__api`, `/__stream`) |

Shared logic (Xtream client for live, movies, series and EPG; search; demo data)
lives in [`packages/core`](../../packages/core) and is also used by the Next.js web app.

## Features

- Xtream Codes sign-in (an M3U `get.php?username=…&password=…` link fills the form) and a demo mode
- Live TV: categories, favourites, channel numbers, preview after the focus rests, now/next EPG with progress and the next programmes
- Full-screen player: ▲▼ / CH± zapping, info bar, red key for favourites, automatic reconnect with back-off and a stall watchdog
- Movies and series: poster grid, detail page, seasons and episodes, resume where you left off, next episode starts on its own
- Search across channels, movies and series (Turkish-aware: "trt1" finds "TR | TRT 1 HD")
- Settings: player engine (auto / device player / hls.js), live format (HLS or MPEG-TS), preview on/off, optional proxy, account expiry

## Remote keys

| Key | Action |
| --- | --- |
| Arrows, OK | Move, select |
| Back (webOS 461, Tizen 10009, Esc) | Back; on the menu, exit |
| CH+ / CH− (PageUp / PageDown) | Page through lists, zap in the player |
| Red (R on a keyboard) | Add/remove favourite |
| 0–9 | Type a channel number |
| Play/Pause, FF/RW | Player control; ◀ ▶ seek 10 s in movies |

LG Magic Remote and a mouse work too: hover moves the focus, click selects, the wheel scrolls.

## Develop

```bash
cd apps/tv
npm install
npm run dev            # http://localhost:5180, use the arrow keys and Enter
npm run build          # dist/ for every shell (Chromium 68 target, ES2019 check)
npm run smoke          # drives the built app from file:// and saves screenshots
```

### Old TV engines

webOS 5 runs Chromium 68 and Tizen 5.5 Chromium 69, and packaged apps load from
`file://`. So the build:

- lowers syntax to `chrome68` and adds `core-js` polyfills (`src/polyfills.ts`),
- ships one classic IIFE script instead of `type="module"` (blocked on `file://`),
- avoids CSS those engines lack: flex `gap`, `inset`, `aspect-ratio`, `min()`/`clamp()`, `:focus-visible`.
  The UI is drawn on a 120 × 67.5 rem canvas and `layout.ts` scales the root font size.

## LG webOS

```bash
npm run build && npm run package:webos     # out/com.afu.iptv_<version>_all.ipk
npx ares-setup-device                      # add your TV (Developer Mode app → IP + passphrase)
npx ares-install --device tv out/com.afu.iptv_*_all.ipk
npx ares-launch --device tv com.afu.iptv
```

Packaged webOS apps follow CORS and have no origin, so a panel that doesn't send
`Access-Control-Allow-Origin` refuses them. The `.ipk` therefore includes a small
JS service (`platforms/webos-service`, `luna://com.afu.iptv.service/fetch`) that
makes the API request instead. Playback uses the TV's own player (`<video src>`),
which CORS doesn't apply to.

## Samsung Tizen

```bash
npm run build && npm run package:tizen     # out/AfuIptv_<version>_unsigned.wgt
```

TVs only install signed packages. Create a Samsung certificate profile in Tizen
Studio's Certificate Manager (include your TV's DUID), then either sign with the
Tizen CLI on your PATH:

```bash
TIZEN_PROFILE=<profile> npm run package:tizen   # signed .wgt in out/
sdb connect <tv-ip> && tizen install -n "out/AFU IPTV.wgt" -t <tv-name>
```

or open `build/tizen` as a project in Tizen Studio and run it on the TV.

## Desktop (Tauri 2)

```bash
npm run desktop:dev      # window with hot reload
npm run desktop:build    # installers in src-tauri/target/release/bundle
```

Needs Rust and, on Linux, `libwebkit2gtk-4.1-dev` plus GStreamer plugins for
media. CI builds Windows, macOS and Linux installers on `v*` tags or when the
workflow is run by hand with "desktop" ticked.

## Optional proxy

If a panel still refuses the app (or for hls.js on webOS), run this repository's
web app on your own server with `STREAM_PROXY_CORS_ORIGIN=*` and enter its
address under "Proxy sunucusu" on the sign-in screen. API calls and streams then
go through its `/api/proxy/stream`.
