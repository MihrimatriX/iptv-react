# AFU IPTV Player (Flutter)

Native Android + iOS companion to the Next.js Xtream IPTV web app in this repo.

Display name: **AFU IPTV Player**. Org: `com.mihrimatrix`. Project: `iptv_flutter`.

## Features

- Secure login (API Base URL, username, password, optional User-Agent) via `flutter_secure_storage`
- Standalone Xtream Codes Dart client (`player_api.php` normalize, live categories/streams, HLS URLs)
- ~5 minute catalog cache
- Browse by category, search, favorites, pull-to-refresh
- HLS player with `media_kit` (fullscreen, play/pause, next/prev, auto-hide controls, optional wake lock)
- Dark + Light themes (System / Koyu / Açık) with blue accent `#2F6BFF`
- Settings: theme picker, wake lock, clear cache, logout, about — all persisted on device
- Demo mode for UI showcase without Xtream credentials

## Requirements

- Flutter SDK 3.47+ (`C:\flutter\bin\flutter` on this machine)
- Android SDK / emulator or device for Android
- Xcode + CocoaPods for iOS (macOS only)

## Run

```bash
cd C:\Users\AFU\Desktop\DEV\iptv-react\mobile
flutter pub get
flutter run
```

## Structure

```
lib/
  core/           # theme, router, storage, xtream client, shared widgets
  features/
    auth/         # login + secure credentials
    browse/       # categories, search, favorites
    player/       # media_kit HLS player
    settings/     # theme, cache, logout, about
```

## Persistence

| Data | Store |
|------|--------|
| Credentials | `flutter_secure_storage` |
| Theme mode, last category, wake lock, demo flag, favorites, catalog cache | `shared_preferences` (`SettingsRepository`) |

## Notes

- No IPTV hosts or passwords are hardcoded. Enter your own legitimate subscription.
- The Next.js web app under `src/` is untouched; this mobile app talks to Xtream directly.
- Personal / legitimate IPTV use only.