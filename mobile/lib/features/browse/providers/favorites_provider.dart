import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/storage/prefs_storage.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('sharedPreferencesProvider must be overridden');
});

final prefsStorageProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(sharedPreferencesProvider));
});

class FavoritesNotifier extends StateNotifier<Set<int>> {
  FavoritesNotifier(this._prefs) : super(_prefs.readFavorites());

  final SettingsRepository _prefs;

  Future<void> toggle(int streamId) async {
    final next = Set<int>.from(state);
    if (next.contains(streamId)) {
      next.remove(streamId);
    } else {
      next.add(streamId);
    }
    state = next;
    await _prefs.writeFavorites(next);
  }

  bool isFavorite(int streamId) => state.contains(streamId);
}

final favoritesProvider =
    StateNotifierProvider<FavoritesNotifier, Set<int>>((ref) {
  return FavoritesNotifier(ref.watch(prefsStorageProvider));
});