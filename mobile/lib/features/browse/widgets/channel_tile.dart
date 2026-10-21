import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/xtream/xtream_models.dart';
import '../providers/favorites_provider.dart';

/// Full-width row used in category lists, search results and favorites.
class ChannelTile extends ConsumerWidget {
  const ChannelTile({
    super.key,
    required this.stream,
    required this.onTap,
    this.selected = false,
  });

  final ChannelStream stream;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = AppColors.of(context);
    final isFav = ref.watch(
      favoritesProvider.select((f) => f.contains(stream.id)),
    );

    return Material(
      color: selected ? c.accentMuted : c.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 8, 4, 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? c.accent.withValues(alpha: 0.5) : c.border,
            ),
          ),
          child: Row(
            children: [
              ChannelAvatar(name: stream.name, iconUrl: stream.streamIcon),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      stream.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: c.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      selected ? 'Oynatılıyor' : 'Canlı yayın',
                      style: TextStyle(
                        color: selected ? c.accent : c.textTertiary,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: isFav ? 'Favorilerden çıkar' : 'Favorilere ekle',
                onPressed: () {
                  HapticFeedback.lightImpact();
                  ref.read(favoritesProvider.notifier).toggle(stream.id);
                },
                icon: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  transitionBuilder: (child, a) =>
                      ScaleTransition(scale: a, child: child),
                  child: Icon(
                    isFav
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    key: ValueKey(isFav),
                    color: isFav ? c.danger : c.textTertiary,
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Poster-style card for the horizontal category rails.
class ChannelCard extends ConsumerWidget {
  const ChannelCard({super.key, required this.stream, required this.onTap});

  static const double width = 112;

  final ChannelStream stream;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = AppColors.of(context);
    final isFav = ref.watch(
      favoritesProvider.select((f) => f.contains(stream.id)),
    );

    return SizedBox(
      width: width,
      child: InkWell(
        onTap: onTap,
        onLongPress: () {
          HapticFeedback.mediumImpact();
          ref.read(favoritesProvider.notifier).toggle(stream.id);
          ScaffoldMessenger.of(context)
            ..hideCurrentSnackBar()
            ..showSnackBar(
              SnackBar(
                duration: const Duration(seconds: 2),
                content: Text(
                  isFav
                      ? '${stream.name} favorilerden çıkarıldı'
                      : '${stream.name} favorilere eklendi',
                ),
              ),
            );
        },
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ChannelAvatar(
                  name: stream.name,
                  iconUrl: stream.streamIcon,
                  size: width,
                  radius: 20,
                ),
                if (isFav)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: c.overlay,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.favorite_rounded,
                        size: 14,
                        color: c.danger,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              stream.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: c.textPrimary,
                fontWeight: FontWeight.w600,
                fontSize: 13,
                height: 1.25,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Channel logo, or a gradient monogram derived from the name when there is
/// no logo (or it fails to load).
class ChannelAvatar extends StatelessWidget {
  const ChannelAvatar({
    super.key,
    required this.name,
    this.iconUrl,
    this.size = 48,
    this.radius = 12,
  });

  final String name;
  final String? iconUrl;
  final double size;
  final double radius;

  @override
  Widget build(BuildContext context) {
    // String.hashCode isn't stable across runs; this keeps colors consistent.
    final hue =
        (name.codeUnits.fold(0, (h, c) => (h * 31 + c) & 0x7fffffff) % 360)
            .toDouble();
    final initials = name
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w.characters.first.toUpperCase())
        .join();

    final monogram = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            HSLColor.fromAHSL(1, hue, 0.6, 0.45).toColor(),
            HSLColor.fromAHSL(1, (hue + 40) % 360, 0.65, 0.3).toColor(),
          ],
        ),
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: Colors.white,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.32,
          letterSpacing: -0.5,
        ),
      ),
    );

    if (iconUrl == null || iconUrl!.isEmpty) return monogram;

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: Container(
        width: size,
        height: size,
        color: AppColors.of(context).bgElevated,
        padding: EdgeInsets.all(size * 0.1),
        child: CachedNetworkImage(
          imageUrl: iconUrl!,
          fit: BoxFit.contain,
          memCacheWidth: (size * 3).round(),
          placeholder: (_, _) => const SizedBox.shrink(),
          errorWidget: (_, _, _) => monogram,
        ),
      ),
    );
  }
}
