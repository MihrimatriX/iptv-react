# REACT IPTV CLIENT

Modern IPTV streaming application built with Next.js and Xtream Codes API integration.

> A sleek, responsive IPTV player with PWA support, real-time streaming, and smart caching for seamless viewing experience.

## Screenshot

![REACT IPTV CLIENT Interface](screenshot.png)

*Modern dark-themed interface with category browsing, channel list, and live video player*

## Features

- Modern dark theme with glass morphism effects
- Responsive design for desktop, tablet and mobile
- PWA support - installable on mobile devices
- HLS.js for smooth video playback
- Category-based channel browsing
- Real-time search functionality
- Favorites system for channels and categories
- Web-based IPTV configuration
- Demo mode: try the full UI without credentials (public sample HLS streams)
- Built-in proxy system
- 5-minute cache for faster loading
- Keyboard shortcuts: Space play/pause, F fullscreen, M mute

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Navigate to `http://localhost:3000`

4. **Configure IPTV credentials**
   - IPTV configuration form will appear when app opens
   - Enter your API Base URL, username and password
   - Credentials are stored in your browser only
   - No credentials? Click **Demo ile dene** on the login screen

## Commands

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint check

## PWA Features

- Installable as native app on mobile devices
- Fast loading with offline cache
- Fullscreen mode
- Service Worker for static file caching

## Project Structure

```
src/
  app/                  # Next.js App Router
    api/xtream/         # POST: fetch categories + channels
    api/proxy/stream/   # HLS proxy (blocks private/LAN targets)
  components/           # UI (ChannelBrowser, VideoPlayer, LoginForm, ...)
  contexts/             # Auth / credentials (incl. demo session)
  hooks/                # useFavorites (shared store)
  lib/                  # Xtream client, demo catalog, search
  types/                # TypeScript definitions
```

## Docker Deployment

```bash
docker-compose up -d
```

Application will run at `http://localhost:3444`.

## Production Build

```bash
npm run build
npm run start
```

## Troubleshooting

- **Stream not loading**: Check your IPTV credentials
- **Stream from a LAN server won't play**: the proxy refuses private/loopback addresses on purpose (SSRF protection)
- **PWA not installing**: Make sure you're using HTTPS

---

**Note**: This application is designed for personal use with legitimate IPTV services.

---


## Mobile (Flutter)

Native Android + iOS companion lives in `mobile/`. It uses the same Xtream Codes flow as the web app but talks to the panel directly (no Next.js dependency).

```bash
cd mobile
flutter pub get
flutter run
```

See [mobile/README.md](mobile/README.md) for features, structure, and notes. Web app under `src/` is unchanged.

## Tags

`iptv` `streaming` `nextjs` `react` `typescript` `pwa` `hls` `xtream-codes` `video-player` `responsive` `dark-theme` `tailwindcss` `docker` `modern-ui`
