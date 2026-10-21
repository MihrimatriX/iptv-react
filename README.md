# React IPTV Client

A web player for Xtream Codes IPTV accounts, built with Next.js. You enter your panel address, username and password, and it lists the live channels by category with search and favorites. Streams play in the browser through hls.js.

Live demo: https://mihrimatrix.github.io/iptv-react/ (demo mode only, see below)
How it works, in Turkish: https://mihrimatrix.github.io/iptv-react/docs/

![React IPTV Client](screenshot.png)

## What it does

- Pulls live categories and channels from the panel's `player_api.php` and adds that path if you leave it off
- Search ignores case, spacing and Turkish characters, so "trt1" finds "TR | TRT 1 HD"
- Favorites for channels and categories, stored in the browser
- Keeps the channel list cached for five minutes
- When a live stream freezes, the player recovers on its own and reconnects up to five times with backoff
- Keyboard: Space or K to play and pause, F for fullscreen, M to mute; picture-in-picture is supported
- Installs as a PWA on phones and desktops
- Demo mode fills the UI with sample categories and plays public HLS test streams from Apple, Mux and Unified Streaming, so you can try it without an account

The app does not provide any content. Use it with an IPTV subscription you are allowed to use.

## Why the GitHub Pages version is demo only

GitHub Pages serves static files and can't run server code. Logging in with a real account depends on two Next.js route handlers: `/api/xtream` fetches the channel list from the panel, and `/api/proxy/stream` relays the HLS playlist and segments. Most Xtream panels run over plain http and send no CORS headers, so a browser on an https page can't reach them directly.

The Pages build (`.github/workflows/pages.yml`) leaves the API routes out, exports static HTML with `NEXT_PUBLIC_STATIC_EXPORT=1`, and plays the demo streams directly. To use your own account, run the app yourself.

## Running it

Node.js 20 or newer:

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

With Docker the app listens on port 3444. The compose file joins a network shared with a reverse proxy; create it once:

```bash
docker network create proxy-network
docker compose up -d
```

Credentials normally come from the login screen and stay in the browser's localStorage. You can also set server-side defaults in `.env` (see `.env.example`).

Other commands: `npm run lint` and `npm test`.

## Project structure

```
src/
  app/
    page.tsx            Login form or channel browser
    docs/page.tsx       The "how it works" page
    api/xtream/         POST: fetch categories and channels from the panel
    api/proxy/stream/   HLS proxy that rewrites playlist URLs
  components/           LoginForm, ChannelBrowser, VideoPlayer, ...
  contexts/             Credentials and the demo session
  hooks/                useFavorites (one shared store)
  lib/                  Xtream client, demo catalog, search, deploy flags
public/                 manifest.json, service worker, icons
mobile/                 Flutter app for Android and iOS
```

The proxy rewrites every URL inside a playlist to point back at itself, so segments go through it too and get the right Referer and User-Agent. It refuses loopback and private network addresses, and checks again on every redirect. A panel on your home LAN won't play through it for that reason.

Credentials reach the server in a POST body, not in the URL, so they don't end up in access logs. Every page carries a `noindex` meta tag, and `robots.txt` blocks crawlers.

## Mobile app

`mobile/` holds a Flutter app for Android and iOS that uses the same Xtream flow. It talks to the panel directly, so it doesn't need the Next.js server.

```bash
cd mobile
flutter pub get
flutter run
```

Details are in [mobile/README.md](mobile/README.md).

## Troubleshooting

- A stream won't load: check the panel address and credentials first. Some panels also need the session cookie, User-Agent or Referer from "Gelişmiş ayarlar" on the login screen.
- A stream from a LAN server won't play: the proxy blocks private addresses on purpose.
- The PWA won't install: browsers only offer it over HTTPS.
