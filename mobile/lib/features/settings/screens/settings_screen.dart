import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/theme_controller.dart';
import '../../auth/providers/auth_provider.dart';
import '../../browse/providers/catalog_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key, this.embedded = false});

  /// When true, omit AppBar (used as bottom-nav tab).
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final themeMode = ref.watch(themeModeProvider);
    final wakeLock = ref.watch(wakeLockEnabledProvider);
    final c = AppColors.of(context);
    final isDemo = auth.isDemo;
    final username =
        isDemo ? 'Demo kullanıcı' : (auth.credentials?.username ?? '—');

    Widget demoPill() => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: c.accentMuted,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            'DEMO',
            style: TextStyle(
              color: c.accent,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        );

    final body = ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        if (embedded)
          Padding(
            padding: const EdgeInsets.only(bottom: 16, top: 4),
            child: Row(
              children: [
                Text('Ayarlar', style: Theme.of(context).textTheme.titleLarge),
                if (isDemo) ...[
                  const SizedBox(width: 10),
                  demoPill(),
                ],
              ],
            ),
          ),
        _GroupedSection(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: c.accentMuted,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      isDemo ? Icons.science_rounded : Icons.person_rounded,
                      color: c.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isDemo ? 'Demo modu' : 'Oturum',
                          style: TextStyle(
                            color: c.textTertiary,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          username,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 17,
                          ),
                        ),
                        if (isDemo)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              'Örnek kanallar ve genel HLS test yayınları',
                              style: TextStyle(
                                color: c.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _GroupedSection(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Text(
                'Görünüm',
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SegmentedButton<ThemeMode>(
                segments: const [
                  ButtonSegment(
                    value: ThemeMode.system,
                    label: Text('Sistem'),
                    icon: Icon(Icons.brightness_auto_rounded, size: 18),
                  ),
                  ButtonSegment(
                    value: ThemeMode.dark,
                    label: Text('Koyu'),
                    icon: Icon(Icons.dark_mode_rounded, size: 18),
                  ),
                  ButtonSegment(
                    value: ThemeMode.light,
                    label: Text('Açık'),
                    icon: Icon(Icons.light_mode_rounded, size: 18),
                  ),
                ],
                selected: {themeMode},
                onSelectionChanged: (set) {
                  ref.read(themeModeProvider.notifier).setMode(set.first);
                },
                style: ButtonStyle(
                  foregroundColor: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return Colors.white;
                    }
                    return c.textSecondary;
                  }),
                  backgroundColor: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return c.accent;
                    }
                    return c.surface;
                  }),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _GroupedSection(
          children: [
            SwitchListTile(
              secondary: const Icon(Icons.screen_lock_portrait_rounded),
              title: const Text('Ekranı açık tut'),
              subtitle: const Text('Oynatma sırasında uyku kilidi (wake lock)'),
              value: wakeLock,
              activeThumbColor: Colors.white,
              activeTrackColor: c.accent,
              onChanged: (v) =>
                  ref.read(wakeLockEnabledProvider.notifier).setEnabled(v),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (!isDemo)
          _GroupedSection(
            children: [
              ListTile(
                leading: const Icon(Icons.cleaning_services_rounded),
                title: const Text('Önbelleği temizle'),
                subtitle: const Text('Kategori ve kanal önbelleğini sil'),
                onTap: () async {
                  await ref.read(catalogProvider.notifier).clearCache();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Önbellek temizlendi')),
                    );
                  }
                },
              ),
            ],
          ),
        if (!isDemo) const SizedBox(height: 16),
        _GroupedSection(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Text(
                'Hakkında',
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                'AFU IPTV Player — Flutter mobil companion.\n'
                'Yalnızca yasal ve kişisel IPTV abonelikleri için tasarlanmıştır.\n'
                'Sürüm 1.0.0',
                style: TextStyle(
                  color: c.textSecondary,
                  height: 1.45,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _GroupedSection(
          children: [
            if (isDemo)
              ListTile(
                title: Text(
                  'Demodan çık',
                  style: TextStyle(
                    color: c.textSecondary,
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                  ),
                ),
                subtitle: const Text(
                  'Demo oturumunu kapatıp Xtream bilgilerinle bağlan',
                ),
                onTap: () async {
                  await ref.read(catalogProvider.notifier).clearCache();
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/login');
                },
              )
            else
              ListTile(
                title: Text(
                  'Çıkış yap',
                  style: TextStyle(
                    color: c.danger,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                subtitle: const Text('Kimlik bilgilerini cihazdan sil'),
                onTap: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) {
                      final dc = AppColors.of(context);
                      return AlertDialog(
                        backgroundColor: dc.surface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: dc.border),
                        ),
                        title: const Text('Çıkış yapılsın mı?'),
                        content: const Text(
                          'Kaydedilmiş API bilgilerin silinecek.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Vazgeç'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: Text(
                              'Çıkış yap',
                              style: TextStyle(color: dc.danger),
                            ),
                          ),
                        ],
                      );
                    },
                  );
                  if (confirm == true) {
                    await ref.read(catalogProvider.notifier).clearCache();
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  }
                },
              ),
          ],
        ),
      ],
    );

    if (embedded) {
      return SafeArea(bottom: false, child: body);
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Ayarlar'),
            if (isDemo) ...[
              const SizedBox(width: 10),
              demoPill(),
            ],
          ],
        ),
      ),
      body: body,
    );
  }
}

class _GroupedSection extends StatelessWidget {
  const _GroupedSection({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    return Material(
      color: c.surface,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(children: children),
      ),
    );
  }
}