/// Xtream panel host → player_api.php endpoint. Bare host:port often returns 401.
String normalizeXtreamApiBase(String apiBase) {
  final trimmed = apiBase.trim();
  final uri = Uri.parse(trimmed);
  if (!uri.hasScheme || uri.host.isEmpty) {
    throw FormatException('Geçersiz API Base URL', apiBase);
  }
  var path = uri.path.replaceAll(RegExp(r'/+$'), '');
  if (!RegExp(r'\.php$', caseSensitive: false).hasMatch(path)) {
    path = '$path/player_api.php';
  }
  return uri.replace(path: path, query: '', fragment: '').toString();
}
