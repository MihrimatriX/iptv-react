import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/browse/screens/browse_shell.dart';
import '../../features/player/screens/player_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../xtream/xtream_models.dart';

final _rootKey = GlobalKey<NavigatorState>();

class RouterRefresh extends ChangeNotifier {
  RouterRefresh(Ref ref) {
    _sub = ref.listen<AuthState>(authProvider, (_, _) {
      notifyListeners();
    });
  }

  late final ProviderSubscription<AuthState> _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}

final routerRefreshProvider = Provider<RouterRefresh>((ref) {
  final refresh = RouterRefresh(ref);
  ref.onDispose(refresh.dispose);
  return refresh;
});

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(routerRefreshProvider);

  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/browse',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loggingIn = state.matchedLocation == '/login';

      if (auth.status == AuthStatus.unknown) return null;

      if (auth.status == AuthStatus.unauthenticated) {
        return loggingIn ? null : '/login';
      }

      if (loggingIn) return '/browse';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/browse',
        builder: (context, state) => const BrowseShell(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/player',
        builder: (context, state) {
          final extra = state.extra;
          if (extra is! PlayerRouteArgs) {
            return const Scaffold(
              body: Center(child: Text('Kanal bilgisi eksik')),
            );
          }
          return PlayerScreen(args: extra);
        },
      ),
    ],
  );
});

class PlayerRouteArgs {
  const PlayerRouteArgs({
    required this.stream,
    required this.playlist,
  });

  final ChannelStream stream;
  final List<ChannelStream> playlist;
}
