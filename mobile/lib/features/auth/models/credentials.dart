class IptvCredentials {
  const IptvCredentials({
    required this.apiBase,
    required this.username,
    required this.password,
    this.userAgent,
    this.isDemo = false,
  });

  /// Session-only demo credentials (never persisted to secure storage).
  static const demo = IptvCredentials(
    apiBase: 'demo://local',
    username: 'demo',
    password: 'demo',
    isDemo: true,
  );

  final String apiBase;
  final String username;
  final String password;
  final String? userAgent;
  final bool isDemo;

  bool get isValid =>
      isDemo ||
      (apiBase.trim().isNotEmpty &&
          username.trim().isNotEmpty &&
          password.trim().isNotEmpty);

  IptvCredentials copyWith({
    String? apiBase,
    String? username,
    String? password,
    String? userAgent,
    bool? isDemo,
  }) {
    return IptvCredentials(
      apiBase: apiBase ?? this.apiBase,
      username: username ?? this.username,
      password: password ?? this.password,
      userAgent: userAgent ?? this.userAgent,
      isDemo: isDemo ?? this.isDemo,
    );
  }
}
