import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs_storage.dart';
import 'favorites_provider.dart';

const _maxRecents = 12;

/// Recently watched stream ids, most recent first.
class RecentsNotifier extends StateNotifier<List<int>> {
  RecentsNotifier(this._prefs) : super(_prefs.readRecents());

  final SettingsRepository _prefs;

  Future<void> add(int streamId) async {
    if (state.isNotEmpty && state.first == streamId) return;
    state = [streamId, ...state.where((id) => id != streamId)]
        .take(_maxRecents)
        .toList();
    await _prefs.writeRecents(state);
  }
}

final recentsProvider = StateNotifierProvider<RecentsNotifier, List<int>>((
  ref,
) {
  return RecentsNotifier(ref.watch(prefsStorageProvider));
});
