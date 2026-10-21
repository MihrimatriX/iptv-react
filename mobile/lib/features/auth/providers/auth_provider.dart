import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/storage/prefs_storage.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/xtream/normalize_api_base.dart';
import '../../../core/xtream/xtream_client.dart';
import '../../browse/providers/favorites_provider.dart';
import '../models/credentials.dart';

final credentialStoreProvider = Provider<CredentialStore>((ref) {
  return CredentialStore();
});

final xtreamClientProvider = Provider<XtreamClient>((ref) {
  return XtreamClient();
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({
    required this.status,
    this.credentials,
    this.error,
    this.isBusy = false,
  });

  final AuthStatus status;
  final IptvCredentials? credentials;
  final String? error;
  final bool isBusy;

  bool get isDemo => credentials?.isDemo == true;

  AuthState copyWith({
    AuthStatus? status,
    IptvCredentials? credentials,
    String? error,
    bool? isBusy,
    bool clearError = false,
    bool clearCredentials = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      credentials:
          clearCredentials ? null : (credentials ?? this.credentials),
      error: clearError ? null : (error ?? this.error),
      isBusy: isBusy ?? this.isBusy,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._store, this._client, this._settings)
      : super(const AuthState(status: AuthStatus.unknown)) {
    _bootstrap();
  }

  final CredentialStore _store;
  final XtreamClient _client;
  final SettingsRepository _settings;

  Future<void> _bootstrap() async {
    try {
      // Restore demo session first (no secure credentials).
      if (_settings.readDemoSession()) {
        state = const AuthState(
          status: AuthStatus.authenticated,
          credentials: IptvCredentials.demo,
        );
        return;
      }

      final creds = await _store.read();
      if (creds == null) {
        state = const AuthState(status: AuthStatus.unauthenticated);
      } else {
        state = AuthState(
          status: AuthStatus.authenticated,
          credentials: creds,
        );
      }
    } catch (_) {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  /// Enter UI showcase mode without real Xtream credentials.
  Future<void> enterDemo() async {
    state = state.copyWith(isBusy: true, clearError: true);
    await _store.clear();
    await _settings.writeDemoSession(true);
    state = const AuthState(
      status: AuthStatus.authenticated,
      credentials: IptvCredentials.demo,
      isBusy: false,
    );
  }

  Future<bool> login({
    required String apiBase,
    required String username,
    required String password,
    String? userAgent,
  }) async {
    state = state.copyWith(isBusy: true, clearError: true);

    try {
      final normalized = normalizeXtreamApiBase(apiBase);
      final creds = IptvCredentials(
        apiBase: normalized,
        username: username.trim(),
        password: password,
        userAgent: (userAgent == null || userAgent.trim().isEmpty)
            ? null
            : userAgent.trim(),
      );

      if (!creds.isValid) {
        state = state.copyWith(
          isBusy: false,
          error: 'API Base URL, kullanıcı adı ve şifre gereklidir.',
        );
        return false;
      }

      await _client.validateCredentials(creds);
      await _settings.writeDemoSession(false);
      await _store.save(creds);

      state = AuthState(
        status: AuthStatus.authenticated,
        credentials: creds,
        isBusy: false,
      );
      return true;
    } on FormatException catch (e) {
      state = state.copyWith(
        isBusy: false,
        error: e.message,
      );
      return false;
    } on XtreamApiException catch (e) {
      state = state.copyWith(isBusy: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isBusy: false,
        error: 'Giriş başarısız: $e',
      );
      return false;
    }
  }

  Future<void> logout() async {
    await _store.clear();
    await _settings.writeDemoSession(false);
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(credentialStoreProvider),
    ref.watch(xtreamClientProvider),
    ref.watch(prefsStorageProvider),
  );
});