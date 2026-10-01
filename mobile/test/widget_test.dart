import 'package:flutter_test/flutter_test.dart';
import 'package:iptv_flutter/core/xtream/xtream_client.dart';
import 'package:iptv_flutter/core/xtream/xtream_models.dart';
import 'package:iptv_flutter/features/auth/models/credentials.dart';
import 'package:iptv_flutter/features/browse/providers/catalog_provider.dart';

void main() {
  test(
    'buildCatalog groups streams, drops empty categories, sorts by name',
    () {
      const creds = IptvCredentials(
        apiBase: 'http://panel.test:8080/player_api.php',
        username: 'u',
        password: 'p',
      );
      final catalog = buildCatalog(
        const [
          XtreamCategoryRaw(
            categoryId: '2',
            categoryName: 'Spor',
            parentId: '0',
          ),
          XtreamCategoryRaw(
            categoryId: '1',
            categoryName: 'Haber',
            parentId: '0',
          ),
          XtreamCategoryRaw(
            categoryId: '3',
            categoryName: 'Boş',
            parentId: '0',
          ),
        ],
        const [
          XtreamStreamRaw(
            streamId: 11,
            name: 'Zeta',
            streamType: 'live',
            categoryId: '2',
          ),
          XtreamStreamRaw(
            streamId: 10,
            name: 'alfa',
            streamType: 'live',
            categoryId: '2',
          ),
          XtreamStreamRaw(
            streamId: 20,
            name: 'NTV',
            streamType: 'live',
            categoryId: '1',
            streamIcon: '',
          ),
        ],
        creds,
      );

      expect(catalog.map((c) => c.name), ['Haber', 'Spor']);
      expect(catalog[1].streams.map((s) => s.name), ['alfa', 'Zeta']);
      expect(catalog[0].streams.single.streamIcon, isNull);
      expect(
        catalog[0].streams.single.streamUrl,
        'http://panel.test:8080/live/u/p/20.m3u8',
      );
    },
  );

  test('foldForSearch is Turkish- and separator-tolerant', () {
    bool matches(String name, String q) =>
        foldForSearch(name).contains(foldForSearch(q));
    expect(matches('Habertürk Demo', 'haberturk'), isTrue);
    expect(matches('İzmir TV', 'izmir'), isTrue);
    expect(matches('ISTANBUL', 'istanbul'), isTrue);
    expect(matches('Çocuk Kanalı', 'COCUK KANALI'), isTrue);
    expect(matches('TR | TRT 1 HD', 'trt1'), isTrue);
    expect(matches('TV8 Demo', 'tv 8'), isTrue);
    expect(matches('NTV Demo', 'trt'), isFalse);
  });
}
