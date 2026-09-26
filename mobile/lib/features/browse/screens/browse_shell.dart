import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_state.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/xtream/xtream_models.dart';
import '../../auth/providers/auth_provider.dart';
import '../../settings/screens/settings_screen.dart';
import '../providers/catalog_provider.dart';
import '../providers/favorites_provider.dart';
import '../widgets/channel_tile.dart';

class BrowseShell extends ConsumerStatefulWidget {
  const BrowseShell({super.key});

  @override
  ConsumerState<BrowseShell> createState() => _BrowseShellState();
}

class _BrowseShellState extends ConsumerState<BrowseShell> {
  int _tab = 0;
  String? _selectedCategoryId;
  bool _categoryRestored = false;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openPlayer(ChannelStream stream, List<ChannelStream> playlist) {
    context.push(
      '/player',
      extra: PlayerRouteArgs(stream: stream, playlist: playlist),
    );
  }

  void _onSelectCategory(String? id) {
    setState(() => _selectedCategoryId = id);
    ref.read(lastCategoryIdProvider.notifier).setCategoryId(id);
  }

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogProvider);
    final isDemo = ref.watch(authProvider.select((s) => s.isDemo));
    final colors = AppColors.of(context);
    final savedCategory = ref.watch(lastCategoryIdProvider);

    if (!_categoryRestored) {
      _categoryRestored = true;
      _selectedCategoryId = savedCategory;
    }

    return Scaffold(
      backgroundColor: colors.background,
      body: IndexedStack(
        index: _tab,
        children: [
          _BrowseTab(
            catalog: catalog,
            selectedCategoryId: _selectedCategoryId,
            searchCtrl: _searchCtrl,
            isDemo: isDemo,
            onSelectCategory: _onSelectCategory,
            onOpenPlayer: _openPlayer,
            onRefresh: () => ref.read(catalogProvider.notifier).refresh(),
          ),
          _FavoritesTab(onOpenPlayer: _openPlayer),
          const SettingsScreen(embedded: true),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: colors.bgElevated,
          border: Border(
            top: BorderSide(color: colors.border, width: 1),
          ),
        ),
        child: NavigationBar(
          backgroundColor: colors.bgElevated,
          indicatorColor: colors.accentMuted,
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.grid_view_rounded),
              selectedIcon: Icon(Icons.grid_view_rounded),
              label: 'Browse',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border_rounded),
              selectedIcon: Icon(Icons.favorite_rounded),
              label: 'Favorites',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings_rounded),
              label: 'Settings',
            ),
          ],
        ),
      ),
    );
  }
}

class _BrowseTab extends ConsumerWidget {
  const _BrowseTab({
    required this.catalog,
    required this.selectedCategoryId,
    required this.searchCtrl,
    required this.isDemo,
    required this.onSelectCategory,
    required this.onOpenPlayer,
    required this.onRefresh,
  });

  final CatalogState catalog;
  final String? selectedCategoryId;
  final TextEditingController searchCtrl;
  final bool isDemo;
  final ValueChanged<String?> onSelectCategory;
  final void Function(ChannelStream, List<ChannelStream>) onOpenPlayer;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = ref.watch(searchQueryProvider);
    final colors = AppColors.of(context);

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Kanallar',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (isDemo)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: colors.accentMuted,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      'DEMO',
                      style: TextStyle(
                        color: colors.accent,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: SizedBox(
              height: 44,
              child: TextField(
                controller: searchCtrl,
                onChanged: (v) {
                  ref.read(searchQueryProvider.notifier).state = v;
                },
                onSubmitted: (v) {
                  ref.read(prefsStorageProvider).pushSearchHistory(v);
                },
                style: const TextStyle(fontSize: 15),
                decoration: InputDecoration(
                  hintText: 'Kanal ara…',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                  suffixIcon: query.isEmpty
                      ? null
                      : IconButton(
                          onPressed: () {
                            searchCtrl.clear();
                            ref.read(searchQueryProvider.notifier).state = '';
                          },
                          icon: const Icon(Icons.clear_rounded, size: 18),
                        ),
                ),
              ),
            ),
          ),
          Expanded(child: _buildBody(context, ref, query, colors)),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    WidgetRef ref,
    String query,
    AppColors colors,
  ) {
    if (catalog.isLoading && catalog.categories.isEmpty) {
      return const CatalogSkeleton();
    }
    if (catalog.error != null && catalog.categories.isEmpty) {
      return ErrorState(message: catalog.error!, onRetry: onRefresh);
    }
    if (catalog.categories.isEmpty) {
      return EmptyState(
        icon: Icons.tv_off_rounded,
        title: 'Kanal bulunamadı',
        message: 'Sunucudan canlı kategori veya kanal gelmedi.',
        actionLabel: 'Yenile',
        onAction: onRefresh,
      );
    }

    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      final results = catalog.allStreams
          .where((s) => s.name.toLowerCase().contains(q))
          .toList();
      if (results.isEmpty) {
        return const EmptyState(
          icon: Icons.search_off_rounded,
          title: 'Sonuç yok',
          message: 'Aramanla eşleşen kanal bulunamadı.',
        );
      }
      return ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: results.length,
        separatorBuilder: (_, _) => const SizedBox(height: 8),
        itemBuilder: (context, i) {
          final stream = results[i];
          return ChannelTile(
            stream: stream,
            onTap: () => onOpenPlayer(stream, results),
          );
        },
      );
    }

    ChannelCategory? selected;
    if (selectedCategoryId != null) {
      for (final cat in catalog.categories) {
        if (cat.id == selectedCategoryId) {
          selected = cat;
          break;
        }
      }
    }

    return RefreshIndicator(
      color: colors.accent,
      backgroundColor: colors.surface,
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          SizedBox(
            height: 40,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: catalog.categories.length + 1,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _Chip(
                    label: 'Tümü',
                    active: selectedCategoryId == null,
                    onTap: () => onSelectCategory(null),
                  );
                }
                final cat = catalog.categories[index - 1];
                return _Chip(
                  label: cat.name,
                  active: selectedCategoryId == cat.id,
                  onTap: () => onSelectCategory(cat.id),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          if (selectedCategoryId == null)
            ...catalog.categories.expand((cat) {
              final preview = cat.streams.take(8).toList();
              return [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          cat.name,
                          style: TextStyle(
                            color: colors.textPrimary,
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Text(
                        '${cat.streams.length}',
                        style: TextStyle(
                          color: colors.textTertiary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                ...preview.map(
                  (stream) => Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: ChannelTile(
                      stream: stream,
                      onTap: () => onOpenPlayer(stream, cat.streams),
                    ),
                  ),
                ),
                if (cat.streams.length > 8)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: TextButton(
                      onPressed: () => onSelectCategory(cat.id),
                      child: Text(
                        'Tümünü gör (${cat.streams.length})',
                        style: TextStyle(color: colors.accent),
                      ),
                    ),
                  ),
              ];
            })
          else if (selected != null) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Text(
                selected.name,
                style: TextStyle(
                  color: colors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            ...selected.streams.map(
              (stream) => Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: ChannelTile(
                  stream: stream,
                  onTap: () => onOpenPlayer(stream, selected!.streams),
                ),
              ),
            ),
          ] else
            const EmptyState(
              icon: Icons.category_outlined,
              title: 'Kategori yok',
              message: 'Seçilen kategori bulunamadı.',
            ),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? colors.accentMuted : colors.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active
                ? colors.accent.withValues(alpha: 0.35)
                : colors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? colors.accent : colors.textSecondary,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _FavoritesTab extends ConsumerWidget {
  const _FavoritesTab({required this.onOpenPlayer});

  final void Function(ChannelStream, List<ChannelStream>) onOpenPlayer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoriteStreamsProvider);
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'Favoriler',
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          Expanded(
            child: favorites.isEmpty
                ? const EmptyState(
                    icon: Icons.favorite_border_rounded,
                    title: 'Henüz favori yok',
                    message:
                        'Kanalların yanındaki kalp ikonuyla favorilere ekleyebilirsin.',
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: favorites.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, i) {
                      final stream = favorites[i];
                      return ChannelTile(
                        stream: stream,
                        onTap: () => onOpenPlayer(stream, favorites),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}