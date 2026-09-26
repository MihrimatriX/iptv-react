import 'dart:convert';

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
      : _dio = dio ??
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
    final categories = await _getLiveCategories(normalized);
    if (categories.isEmpty) {
      // Empty list can be valid; success is a parseable JSON response.
      return;
    }
  }

  Future<List<ChannelCategory>> getCategoriesWithStreams(
    IptvCredentials credentials,
  ) async {
    final normalized = credentials.copyWith(
      apiBase: normalizeXtreamApiBase(credentials.apiBase),
    );

    final categories = await _getLiveCategories(normalized);
    final withStreams = <ChannelCategory>[];

    for (var i = 0; i < categories.length; i++) {
      final category = categories[i];
      try {
        final streams =
            await _getLiveStreamsByCategory(category.categoryId, normalized);
        final normalised = ChannelCategory(
          id: category.categoryId,
          name: category.categoryName,
          parentId: category.parentId,
          order: int.tryParse(category.categoryId) ?? i,
          streams: _normaliseStreams(streams, normalized),
        );
        if (normalised.streams.isNotEmpty) {
          withStreams.add(normalised);
        }
      } catch (_) {
        // Skip categories that fail individually.
      }
    }

    withStreams.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    return withStreams;
  }

  Future<List<XtreamCategoryRaw>> _getLiveCategories(
    IptvCredentials credentials,
  ) async {
    final raw = await _request(credentials, {'action': 'get_live_categories'});
    if (raw is! List) {
      throw XtreamApiException('Kategori listesi beklenmeyen formatta.');
    }
    return raw
        .whereType<Map>()
        .map((e) => XtreamCategoryRaw.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<XtreamStreamRaw>> _getLiveStreamsByCategory(
    String categoryId,
    IptvCredentials credentials,
  ) async {
    final raw = await _request(credentials, {
      'action': 'get_live_streams',
      'category_id': categoryId,
    });
    if (raw is! List) {
      return const [];
    }
    return raw
        .whereType<Map>()
        .map((e) => XtreamStreamRaw.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  List<ChannelStream> _normaliseStreams(
    List<XtreamStreamRaw> streams,
    IptvCredentials credentials,
  ) {
    final base = Uri.parse(credentials.apiBase);
    final origin =
        '${base.scheme}://${base.host}${base.hasPort ? ':${base.port}' : ''}';

    final mapped = streams.map((stream) {
      final streamType = stream.streamType.toLowerCase();
      final extension = streamType == 'live' ? 'm3u8' : 'mp4';
      final folder = streamType == 'live' ? 'live' : 'movie';
      final streamUrl =
          '$origin/$folder/${credentials.username}/${credentials.password}/${stream.streamId}.$extension';

      return ChannelStream(
        id: stream.streamId,
        name: stream.name,
        streamType: streamType,
        streamIcon: (stream.streamIcon == null || stream.streamIcon!.isEmpty)
            ? null
            : stream.streamIcon,
        added: stream.added,
        streamUrl: streamUrl,
        categoryId: stream.categoryId,
      );
    }).toList();

    mapped.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    return mapped;
  }

  Future<dynamic> _request(
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
            'Accept':
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
          body: rawBody.length > 500 ? rawBody.substring(0, 500) : rawBody,
        );
      }

      try {
        return jsonDecode(rawBody);
      } catch (_) {
        throw XtreamApiException(
          'Xtream API beklenmedik bir yanıt döndürdü.',
          status: 502,
          body: rawBody.length > 500 ? rawBody.substring(0, 500) : rawBody,
        );
      }
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
