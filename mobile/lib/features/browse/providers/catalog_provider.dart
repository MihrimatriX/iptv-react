import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs_storage.dart';
import '../../../core/xtream/xtream_client.dart';
import '../../../core/xtream/xtream_models.dart';
import '../../auth/providers/auth_provider.dart';
import '../../demo/demo_catalog.dart';
import 'favorites_provider.dart';

const catalogCacheTtl = Duration(minutes: 5);

class CatalogState {
  const CatalogState({
    this.categories = const [],
    this.isLoading = false,
    this.isRefreshing = false,
    this.error,
    this.fromCache = false,
  });

  final List<ChannelCategory> categories;
  final bool isLoading;
  final bool isRefreshing;
  final String? error;
  final bool fromCache;

  List<ChannelStream> get allStreams =>
      categories.expand((c) => c.streams).toList();

  CatalogState copyWith({
    List<ChannelCategory>? categories,
    bool? isLoading,
    bool? isRefreshing,
    String? error,
    bool? fromCache,
    bool clearError = false,
  }) {
    return CatalogState(
      categories: categories ?? this.categories,
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      error: clearError ? null : (error ?? this.error),
      fromCache: fromCache ?? this.fromCache,
    );
  }
}

class CatalogNotifier extends StateNotifier<CatalogState> {
  CatalogNotifier(this._ref) : super(const CatalogState()) {
    _boot();
  }

  final Ref _ref;

  Future<void> _boot() async {
    final auth = _ref.read(authProvider);
    if (auth.credentials == null) return;
    await load(forceRefresh: false);
  }

  Future<void> load({bool forceRefresh = false}) async {
    final auth = _ref.read(authProvider);
    final creds = auth.credentials;
    if (creds == null) {
      state = const CatalogState(error: 'Oturum bulunamadı.');
      return;
    }

    // Demo mode: load rich fake catalog instantly (no network / cache).
    if (creds.isDemo) {
      state = CatalogState(
        categories: buildDemoCatalog(),
        fromCache: false,
      );
      return;
    }

    final prefs = _ref.read(prefsStorageProvider);
    final cached = _readCache(prefs);
    final cacheFresh = cached != null &&
        DateTime.now().difference(cached.$2) < catalogCacheTtl;

    if (!forceRefresh && cacheFresh) {
      state = CatalogState(
        categories: cached.$1,
        fromCache: true,
      );
      return;
    }

    if (cached != null && !forceRefresh) {
      state = CatalogState(
        categories: cached.$1,
        fromCache: true,
        isRefreshing: true,
      );
    } else {
      state = state.copyWith(
        isLoading: state.categories.isEmpty,
        isRefreshing: state.categories.isNotEmpty,
        clearError: true,
      );
    }

    try {
      final client = _ref.read(xtreamClientProvider);
      final categories = await client.getCategoriesWithStreams(creds);
      await _writeCache(prefs, categories);
      state = CatalogState(categories: categories, fromCache: false);
    } on XtreamApiException catch (e) {
      if (state.categories.isNotEmpty) {
        state = state.copyWith(
          isLoading: false,
          isRefreshing: false,
          error: e.message,
        );
      } else {
        state = CatalogState(error: e.message);
      }
    } catch (e) {
      final message = 'Katalog yüklenemedi: $e';
      if (state.categories.isNotEmpty) {
        state = state.copyWith(
          isLoading: false,
          isRefreshing: false,
          error: message,
        );
      } else {
        state = CatalogState(error: message);
      }
    }
  }

  Future<void> refresh() => load(forceRefresh: true);

  Future<void> clearCache() async {
    await _ref.read(prefsStorageProvider).clearCache();
  }

  (List<ChannelCategory>, DateTime)? _readCache(PrefsStorage prefs) {
    final payload = prefs.readCachePayload();
    final atMs = prefs.readCacheAtMs();
    if (payload == null || atMs == null) return null;
    try {
      final decoded = PrefsStorage.decodeJson(payload);
      if (decoded is! List) return null;
      final categories = decoded
          .whereType<Map>()
          .map((e) => ChannelCategory.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      return (categories, DateTime.fromMillisecondsSinceEpoch(atMs));
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(
    PrefsStorage prefs,
    List<ChannelCategory> categories,
  ) async {
    final payload = PrefsStorage.encodeJson(
      categories.map((c) => c.toJson()).toList(),
    );
    await prefs.writeCache(
      payloadJson: payload,
      atMs: DateTime.now().millisecondsSinceEpoch,
    );
  }
}

final catalogProvider =
    StateNotifierProvider<CatalogNotifier, CatalogState>((ref) {
  // Rebuild catalog when auth identity or demo flag changes.
  ref.watch(authProvider.select((s) => '${s.credentials?.username}|${s.isDemo}'));
  return CatalogNotifier(ref);
});

final searchQueryProvider = StateProvider<String>((ref) => '');

final _letterOrDigit = RegExp(r'[\p{L}\p{N}]', unicode: true);
const _foldFrom = 'çğıöşüâîû';
const _foldTo = 'cgiosuaiu';

/// Forgiving search key: lowercase, Turkish accents dropped (ü→u, ı→i),
/// spaces/punctuation removed so "tv 8" finds "TV8". Mirrors web's
/// foldForSearch() in src/lib/search.ts.
String foldForSearch(String text) {
  final out = StringBuffer();
  for (final rune in text.toLowerCase().runes) {
    final char = String.fromCharCode(rune);
    final i = _foldFrom.indexOf(char);
    if (i >= 0) {
      out.write(_foldTo[i]);
    } else if (_letterOrDigit.hasMatch(char)) {
      // Also drops the combining dot left by 'İ'.toLowerCase().
      out.write(char);
    }
  }
  return out.toString();
}

final filteredStreamsProvider = Provider<List<ChannelStream>>((ref) {
  final catalog = ref.watch(catalogProvider);
  final query = foldForSearch(ref.watch(searchQueryProvider));
  final streams = catalog.allStreams;
  if (query.isEmpty) return streams;
  return streams.where((s) => foldForSearch(s.name).contains(query)).toList();
});

final favoriteStreamsProvider = Provider<List<ChannelStream>>((ref) {
  final favorites = ref.watch(favoritesProvider);
  final streams = ref.watch(catalogProvider).allStreams;
  return streams.where((s) => favorites.contains(s.id)).toList()
    ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
});
