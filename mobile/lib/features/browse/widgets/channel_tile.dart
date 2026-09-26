import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/xtream/xtream_models.dart';
import '../providers/favorites_provider.dart';

class ChannelTile extends ConsumerWidget {
  const ChannelTile({
    super.key,
    required this.stream,
    required this.onTap,
  });

  final ChannelStream stream;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = AppColors.of(context);
    final isFav = ref.watch(favoritesProvider).contains(stream.id);

    return Material(
      color: c.surface,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        hoverColor: c.surfaceHover,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: c.border),
          ),
          child: Row(
            children: [
              _ChannelAvatar(iconUrl: stream.streamIcon),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  stream.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: c.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
              IconButton(
                tooltip: isFav ? 'Favorilerden çıkar' : 'Favorilere ekle',
                onPressed: () =>
                    ref.read(favoritesProvider.notifier).toggle(stream.id),
                icon: Icon(
                  isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  color: isFav ? c.accent : c.textTertiary,
                  size: 22,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChannelAvatar extends StatelessWidget {
  const _ChannelAvatar({this.iconUrl});

  final String? iconUrl;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final placeholder = Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: c.bgElevated,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: c.border),
      ),
      child: Icon(Icons.tv_rounded, color: c.textTertiary, size: 22),
    );

    if (iconUrl == null || iconUrl!.isEmpty) return placeholder;

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: CachedNetworkImage(
        imageUrl: iconUrl!,
        width: 48,
        height: 48,
        fit: BoxFit.cover,
        placeholder: (_, _) => placeholder,
        errorWidget: (_, _, _) => placeholder,
      ),
    );
  }
}