import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Typed on-device settings + browse/player prefs (shared_preferences).
/// Credentials stay in [CredentialStore] / flutter_secure_storage.
class SettingsRepository {
  SettingsRepository(this._prefs);

  final SharedPreferences _prefs;

  static const _kThemeMode = 'iptv_theme_mode';
  static const _kLastCategoryId = 'iptv_last_category_id';
  static const _kSearchHistory = 'iptv_search_history';
  static const _kWakeLock = 'iptv_player_wake_lock';
  static const _kDemoSession = 'iptv_demo_session';
  static const _kFavorites = 'iptv_favorite_stream_ids';
  static const _kCachePayload = 'iptv_catalog_cache_payload';
  static const _kCacheAt = 'iptv_catalog_cache_at';

  // --- Theme ---

  ThemeMode readThemeMode() {
    switch (_prefs.getString(_kThemeMode)) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  Future<void> writeThemeMode(ThemeMode mode) async {
    final value = switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    };
    await _prefs.setString(_kThemeMode, value);
  }

  // --- Browse ---

  String? readLastCategoryId() => _prefs.getString(_kLastCategoryId);

  Future<void> writeLastCategoryId(String? id) async {
    if (id == null || id.isEmpty) {
      await _prefs.remove(_kLastCategoryId);
    } else {
      await _prefs.setString(_kLastCategoryId, id);
    }
  }

  List<String> readSearchHistory({int max = 20}) {
    final raw = _prefs.getStringList(_kSearchHistory) ?? const [];
    if (raw.length <= max) return List.unmodifiable(raw);
    return List.unmodifiable(raw.take(max));
  }

  Future<void> pushSearchHistory(String query, {int max = 20}) async {
    final q = query.trim();
    if (q.isEmpty) return;
    final next = <String>[q, ...readSearchHistory().where((e) => e != q)];
    await _prefs.setStringList(
      _kSearchHistory,
      next.take(max).toList(),
    );
  }

  Future<void> clearSearchHistory() async {
    await _prefs.remove(_kSearchHistory);
  }

  // --- Player ---

  bool readWakeLockEnabled() => _prefs.getBool(_kWakeLock) ?? true;

  Future<void> writeWakeLockEnabled(bool enabled) async {
    await _prefs.setBool(_kWakeLock, enabled);
  }

  // --- Demo flag (session restore hint; not credentials) ---

  bool readDemoSession() => _prefs.getBool(_kDemoSession) ?? false;

  Future<void> writeDemoSession(bool active) async {
    await _prefs.setBool(_kDemoSession, active);
  }

  // --- Favorites (also used by FavoritesNotifier) ---

  Set<int> readFavorites() {
    final raw = _prefs.getStringList(_kFavorites) ?? const [];
    return raw.map(int.tryParse).whereType<int>().toSet();
  }

  Future<void> writeFavorites(Set<int> ids) async {
    await _prefs.setStringList(
      _kFavorites,
      ids.map((e) => e.toString()).toList()..sort(),
    );
  }

  // --- Catalog cache ---

  String? readCachePayload() => _prefs.getString(_kCachePayload);

  int? readCacheAtMs() => _prefs.getInt(_kCacheAt);

  Future<void> writeCache({
    required String payloadJson,
    required int atMs,
  }) async {
    await _prefs.setString(_kCachePayload, payloadJson);
    await _prefs.setInt(_kCacheAt, atMs);
  }

  Future<void> clearCache() async {
    await _prefs.remove(_kCachePayload);
    await _prefs.remove(_kCacheAt);
  }

  static String encodeJson(Object value) => jsonEncode(value);

  static dynamic decodeJson(String raw) => jsonDecode(raw);
}

/// Back-compat alias used by existing catalog/favorites code.
typedef PrefsStorage = SettingsRepository;