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
import '../widgets/channel_tile.dart';

typedef OpenPlayer = void Function(ChannelStream, List<ChannelStream>);

class BrowseShell extends ConsumerStatefulWidget {
  const BrowseShell({super.key});

  @override
  ConsumerState<BrowseShell> createState() => _BrowseShellState();
}

class _BrowseShellState extends ConsumerState<BrowseShell> {
  int _tab = 0;

  void _openPlayer(ChannelStream stream, List<ChannelStream> playlist) {
    context.push(
      '/player',
      extra: PlayerRouteArgs(stream: stream, playlist: playlist),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      body: IndexedStack(
        index: _tab,
        children: [
          _BrowseTab(onOpenPlayer: _openPlayer),
          _FavoritesTab(onOpenPlayer: _openPlayer),
          const SettingsScreen(embedded: true),
        ],
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: colors.border)),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.live_tv_outlined),
              selectedIcon: Icon(Icons.live_tv_rounded),
              label: 'Kanallar',
            ),
            NavigationDestination(
              icon: Icon(Icons.favorite_border_rounded),
              selectedIcon: Icon(Icons.favorite_rounded),
              label: 'Favoriler',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings_rounded),
              label: 'Ayarlar',
            ),
          ],
        ),
      ),
    );
  }
}

class _BrowseTab extends ConsumerStatefulWidget {
  const _BrowseTab({required this.onOpenPlayer});

  final OpenPlayer onOpenPlayer;

  @override
  ConsumerState<_BrowseTab> createState() => _BrowseTabState();
}

class _BrowseTabState extends ConsumerState<_BrowseTab> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _setQuery(String value) =>
      ref.read(searchQueryProvider.notifier).state = value;

  Future<void> _refresh() => ref.read(catalogProvider.notifier).refresh();

  @override
  Widget build(BuildContext context) {
    final catalog = ref.watch(catalogProvider);
    final query = ref.watch(searchQueryProvider).trim();
    final isDemo = ref.watch(authProvider.select((s) => s.isDemo));
    final savedCategoryId = ref.watch(lastCategoryIdProvider);
    final colors = AppColors.of(context);
    final textTheme = Theme.of(context).textTheme;

    // A saved category that no longer exists falls back to "Tümü".
    ChannelCategory? selected;
    for (final cat in catalog.categories) {
      if (cat.id == savedCategoryId) selected = cat;
    }
    void selectCategory(String? id) =>
        ref.read(lastCategoryIdProvider.notifier).setCategoryId(id);

    final channelCount = catalog.categories.fold<int>(
      0,
      (sum, c) => sum + c.streams.length,
    );

    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Canlı TV', style: textTheme.displayMedium),
                      if (catalog.categories.isNotEmpty)
                        Text(
                          '${catalog.categories.length} kategori · $channelCount kanal',
                          style: textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
                if (isDemo) const _Pill(label: 'DEMO'),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: SearchBar(
              controller: _searchCtrl,
              hintText: 'Kanal ara',
              onChanged: _setQuery,
              leading: const Icon(Icons.search_rounded),
              trailing: [
                if (query.isNotEmpty)
                  IconButton(
                    tooltip: 'Temizle',
                    onPressed: () {
                      _searchCtrl.clear();
                      _setQuery('');
                    },
                    icon: const Icon(Icons.close_rounded),
                  ),
              ],
              elevation: const WidgetStatePropertyAll(0),
              backgroundColor: WidgetStatePropertyAll(colors.surface),
              side: WidgetStatePropertyAll(BorderSide(color: colors.border)),
              padding: const WidgetStatePropertyAll(
                EdgeInsets.symmetric(horizontal: 14),
              ),
            ),
          ),
          if (query.isEmpty && catalog.categories.isNotEmpty)
            SizedBox(
              height: 40,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: catalog.categories.length + 1,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return ChoiceChip(
                      label: const Text('Tümü'),
                      selected: selected == null,
                      onSelected: (_) => selectCategory(null),
                    );
                  }
                  final cat = catalog.categories[index - 1];
                  return ChoiceChip(
                    label: Text(cat.name),
                    selected: selected?.id == cat.id,
                    onSelected: (_) => selectCategory(cat.id),
                  );
                },
              ),
            ),
          SizedBox(
            height: 2,
            child: catalog.isRefreshing
                ? const LinearProgressIndicator(minHeight: 2)
                : null,
          ),
          Expanded(child: _buildBody(catalog, query, selected, selectCategory)),
        ],
      ),
    );
  }

  Widget _buildBody(
    CatalogState catalog,
    String query,
    ChannelCategory? selected,
    ValueChanged<String?> selectCategory,
  ) {
    if (catalog.isLoading && catalog.categories.isEmpty) {
      return const CatalogSkeleton();
    }
    if (catalog.error != null && catalog.categories.isEmpty) {
      return ErrorState(message: catalog.error!, onRetry: _refresh);
    }
    if (catalog.categories.isEmpty) {
      return EmptyState(
        icon: Icons.tv_off_rounded,
        title: 'Kanal bulunamadı',
        message: 'Sunucudan canlı kategori veya kanal gelmedi.',
        actionLabel: 'Yenile',
        onAction: _refresh,
      );
    }

    if (query.isNotEmpty) {
      final results = ref.watch(filteredStreamsProvider);
      if (results.isEmpty) {
        return const EmptyState(
          icon: Icons.search_off_rounded,
          title: 'Sonuç yok',
          message: 'Aramanla eşleşen kanal bulunamadı.',
        );
      }
      return _ChannelList(streams: results, onOpenPlayer: widget.onOpenPlayer);
    }

    final recents = ref.watch(recentStreamsProvider);
    final rails = selected == null
        ? ListView.builder(
            key: const ValueKey('rails'),
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.only(top: 8, bottom: 24),
            itemCount: catalog.categories.length + (recents.isEmpty ? 0 : 1),
            itemBuilder: (context, i) {
              if (recents.isNotEmpty) {
                if (i == 0) {
                  return _Rail(
                    title: 'Son izlenenler',
                    streams: recents,
                    onOpenPlayer: widget.onOpenPlayer,
                  );
                }
                i--;
              }
              final cat = catalog.categories[i];
              return _Rail(
                title: cat.name,
                streams: cat.streams,
                onOpenPlayer: widget.onOpenPlayer,
                onSeeAll: () => selectCategory(cat.id),
              );
            },
          )
        : _ChannelList(
            key: ValueKey(selected.id),
            streams: selected.streams,
            onOpenPlayer: widget.onOpenPlayer,
          );

    return RefreshIndicator(
      onRefresh: _refresh,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        switchInCurve: Curves.easeOut,
        child: rails,
      ),
    );
  }
}

class _ChannelList extends StatelessWidget {
  const _ChannelList({
    super.key,
    required this.streams,
    required this.onOpenPlayer,
  });

  final List<ChannelStream> streams;
  final OpenPlayer onOpenPlayer;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: streams.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) => ChannelTile(
        stream: streams[i],
        onTap: () => onOpenPlayer(streams[i], streams),
      ),
    );
  }
}

class _Rail extends StatelessWidget {
  const _Rail({
    required this.title,
    required this.streams,
    required this.onOpenPlayer,
    this.onSeeAll,
  });

  final String title;
  final List<ChannelStream> streams;
  final OpenPlayer onOpenPlayer;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 8, 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (onSeeAll == null)
                  const SizedBox(height: 48)
                else
                  TextButton(
                    onPressed: onSeeAll,
                    child: Text(
                      'Tümü (${streams.length})',
                      style: TextStyle(color: colors.accent, fontSize: 13),
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(
            height: ChannelCard.width + 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: streams.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) => ChannelCard(
                stream: streams[i],
                onTap: () => onOpenPlayer(streams[i], streams),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colors = AppColors.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: colors.accentMuted,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: colors.accent,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _FavoritesTab extends ConsumerWidget {
  const _FavoritesTab({required this.onOpenPlayer});

  final OpenPlayer onOpenPlayer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoriteStreamsProvider);
    return SafeArea(
      bottom: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 8),
            child: Text(
              'Favoriler',
              style: Theme.of(context).textTheme.displayMedium,
            ),
          ),
          Expanded(
            child: favorites.isEmpty
                ? const EmptyState(
                    icon: Icons.favorite_border_rounded,
                    title: 'Henüz favori yok',
                    message:
                        'Kanal satırındaki kalbe dokun ya da karta uzun bas.',
                  )
                : _ChannelList(streams: favorites, onOpenPlayer: onOpenPlayer),
          ),
        ],
      ),
    );
  }
}
