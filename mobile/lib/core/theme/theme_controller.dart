import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/browse/providers/favorites_provider.dart';
import '../storage/prefs_storage.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return ref.watch(prefsStorageProvider);
});

final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier(ref.watch(settingsRepositoryProvider));
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier(this._repo) : super(_repo.readThemeMode());

  final SettingsRepository _repo;

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _repo.writeThemeMode(mode);
  }
}

final wakeLockEnabledProvider =
    StateNotifierProvider<WakeLockNotifier, bool>((ref) {
  return WakeLockNotifier(ref.watch(settingsRepositoryProvider));
});

class WakeLockNotifier extends StateNotifier<bool> {
  WakeLockNotifier(this._repo) : super(_repo.readWakeLockEnabled());

  final SettingsRepository _repo;

  Future<void> setEnabled(bool enabled) async {
    state = enabled;
    await _repo.writeWakeLockEnabled(enabled);
  }
}

final lastCategoryIdProvider =
    StateNotifierProvider<LastCategoryNotifier, String?>((ref) {
  return LastCategoryNotifier(ref.watch(settingsRepositoryProvider));
});

class LastCategoryNotifier extends StateNotifier<String?> {
  LastCategoryNotifier(this._repo) : super(_repo.readLastCategoryId());

  final SettingsRepository _repo;

  Future<void> setCategoryId(String? id) async {
    state = id;
    await _repo.writeLastCategoryId(id);
  }
}