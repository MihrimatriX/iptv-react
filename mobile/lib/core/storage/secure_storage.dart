import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/models/credentials.dart';

class CredentialStore {
  CredentialStore({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  static const _kApiBase = 'iptv_api_base';
  static const _kUsername = 'iptv_username';
  static const _kPassword = 'iptv_password';
  static const _kUserAgent = 'iptv_user_agent';

  final FlutterSecureStorage _storage;

  Future<IptvCredentials?> read() async {
    final apiBase = await _storage.read(key: _kApiBase);
    final username = await _storage.read(key: _kUsername);
    final password = await _storage.read(key: _kPassword);
    final userAgent = await _storage.read(key: _kUserAgent);

    if (apiBase == null ||
        username == null ||
        password == null ||
        apiBase.isEmpty ||
        username.isEmpty ||
        password.isEmpty) {
      return null;
    }

    return IptvCredentials(
      apiBase: apiBase,
      username: username,
      password: password,
      userAgent: (userAgent == null || userAgent.isEmpty) ? null : userAgent,
    );
  }

  Future<void> save(IptvCredentials credentials) async {
    await _storage.write(key: _kApiBase, value: credentials.apiBase.trim());
    await _storage.write(key: _kUsername, value: credentials.username.trim());
    await _storage.write(key: _kPassword, value: credentials.password);
    if (credentials.userAgent != null && credentials.userAgent!.trim().isNotEmpty) {
      await _storage.write(
        key: _kUserAgent,
        value: credentials.userAgent!.trim(),
      );
    } else {
      await _storage.delete(key: _kUserAgent);
    }
  }

  Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _kApiBase),
      _storage.delete(key: _kUsername),
      _storage.delete(key: _kPassword),
      _storage.delete(key: _kUserAgent),
    ]);
  }
}
