import 'dart:convert';
import 'dart:isolate';

import 'package:dio/dio.dart';

import '../../features/auth/models/credentials.dart';
import 'normalize_api_base.dart';
import 'xtream_models.dart';

class XtreamApiException implements Exception {
  XtreamApiException(this.message, {this.status, this.body});

  final String message;
  final int? status;
  final String? body;

  @override
  String toString() => message;
}

class XtreamClient {
  XtreamClient({Dio? dio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 20),
              receiveTimeout: const Duration(seconds: 45),
              responseType: ResponseType.plain,
              validateStatus: (_) => true,
            ),
          );

  final Dio _dio;

  static const _defaultUserAgent =
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

  /// Lightweight auth check — only hits get_live_categories.
  Future<void> validateCredentials(IptvCredentials credentials) async {
    final normalized = credentials.copyWith(
      apiBase: normalizeXtreamApiBase(credentials.apiBase),
    );
    // Empty list can be valid; success is a parseable JSON list.
    parseCategories(
      await _fetch(normalized, {'action': 'get_live_categories'}),
    );
  }

  Future<List<ChannelCategory>> getCategoriesWithStreams(
    IptvCredentials credentials,
  ) async {
    final normalized = credentials.copyWith(
      apiBase: normalizeXtreamApiBase(credentials.apiBase),
    );

    // One get_live_streams call (no category_id) instead of one per category.
    // Future.wait, not record `.wait`: the latter wraps failures in a
    // ParallelWaitError and the user saw that instead of the real message.
    final bodies = await Future.wait([
      _fetch(normalized, {'action': 'get_live_categories'}),
      _fetch(normalized, {'action': 'get_live_streams'}),
    ]);
    final categoriesBody = bodies[0];
    final streamsBody = bodies[1];
    // Big panels return megabytes of JSON; parsing on the UI isolate froze
    // the whole app (player controls included) during background refreshes.
    return Isolate.run(
      () => buildCatalog(
        parseCategories(categoriesBody),
        parseStreams(streamsBody),
        normalized,
      ),
    );
  }

  Future<String> _fetch(
    IptvCredentials credentials,
    Map<String, String> params,
  ) async {
    final apiBase = normalizeXtreamApiBase(credentials.apiBase);
    final uri = Uri.parse(apiBase).replace(
      queryParameters: {
        'username': credentials.username,
        'password': credentials.password,
        ...params,
      },
    );

    try {
      final response = await _dio.getUri(
        uri,
        options: Options(
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'tr,en-US;q=0.9,en;q=0.8',
            'User-Agent': (credentials.userAgent?.trim().isNotEmpty ?? false)
                ? credentials.userAgent!.trim()
                : _defaultUserAgent,
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        ),
      );

      final status = response.statusCode ?? 0;
      final rawBody = '${response.data ?? ''}';

      if (status < 200 || status >= 300) {
        throw XtreamApiException(
          'Xtream API isteği başarısız oldu ($status)',
          status: status,
          body: _snippet(rawBody),
        );
      }
      return rawBody;
    } on XtreamApiException {
      rethrow;
    } on DioException catch (e) {
      throw XtreamApiException(
        'Xtream API çağrısında bağlantı kurulamadı: ${e.message ?? e.type.name}',
        status: 503,
      );
    } catch (e) {
      throw XtreamApiException(
        'Xtream API çağrısında bağlantı kurulamadı: $e',
        status: 503,
      );
    }
  }
}

String _snippet(String body) =>
    body.length > 500 ? body.substring(0, 500) : body;

dynamic _decode(String body) {
  try {
    return jsonDecode(body);
  } catch (_) {
    throw XtreamApiException(
      'Xtream API beklenmedik bir yanıt döndürdü.',
      status: 502,
      body: _snippet(body),
    );
  }
}

List<XtreamCategoryRaw> parseCategories(String body) {
  final raw = _decode(body);
  if (raw is! List) {
    // Bad credentials: panels answer 200 with {user_info: {auth: 0}}.
    throw XtreamApiException(
      'Kimlik doğrulama başarısız. Sunucu adresi, kullanıcı adı ve şifreyi kontrol edin.',
      status: 401,
    );
  }
  return raw
      .whereType<Map>()
      .map((e) => XtreamCategoryRaw.fromJson(Map<String, dynamic>.from(e)))
      .toList();
}

List<XtreamStreamRaw> parseStreams(String body) {
  final raw = _decode(body);
  if (raw is! List) return const [];
  return raw
      .whereType<Map>()
      .map((e) => XtreamStreamRaw.fromJson(Map<String, dynamic>.from(e)))
      .toList();
}

/// Groups raw streams under their categories, drops empty categories and
/// builds playable HLS URLs. Pure, so it is unit-tested directly.
List<ChannelCategory> buildCatalog(
  List<XtreamCategoryRaw> categories,
  List<XtreamStreamRaw> streams,
  IptvCredentials credentials,
) {
  final base = Uri.parse(credentials.apiBase);
  final origin =
      '${base.scheme}://${base.host}${base.hasPort ? ':${base.port}' : ''}';
  int byName(String a, String b) => a.toLowerCase().compareTo(b.toLowerCase());

  final byCategory = <String, List<ChannelStream>>{};
  for (final stream in streams) {
    final streamType = stream.streamType.toLowerCase();
    final isLive = streamType == 'live';
    byCategory
        .putIfAbsent(stream.categoryId, () => [])
        .add(
          ChannelStream(
            id: stream.streamId,
            name: stream.name,
            streamType: streamType,
            streamIcon: (stream.streamIcon?.isEmpty ?? true)
                ? null
                : stream.streamIcon,
            added: stream.added,
            streamUrl:
                '$origin/${isLive ? 'live' : 'movie'}/${credentials.username}/${credentials.password}/${stream.streamId}.${isLive ? 'm3u8' : 'mp4'}',
            categoryId: stream.categoryId,
          ),
        );
  }

  final result = <ChannelCategory>[];
  for (var i = 0; i < categories.length; i++) {
    final category = categories[i];
    final channels = byCategory[category.categoryId];
    if (channels == null || channels.isEmpty) continue;
    channels.sort((a, b) => byName(a.name, b.name));
    result.add(
      ChannelCategory(
        id: category.categoryId,
        name: category.categoryName,
        parentId: category.parentId,
        order: int.tryParse(category.categoryId) ?? i,
        streams: channels,
      ),
    );
  }
  result.sort((a, b) => byName(a.name, b.name));
  return result;
}
