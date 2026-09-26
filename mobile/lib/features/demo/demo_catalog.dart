import '../../core/xtream/xtream_models.dart';

/// Public sample HLS streams (not pirated IPTV) for Demo mode playback.
abstract final class DemoSampleStreams {
  static const appleBipbop =
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';
  static const appleBipbopClassic =
      'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8';
  static const muxBigBuckBunny =
      'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  static const akamaiSintel =
      'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8';
  static const tearsOfSteel =
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';

  static const List<String> all = [
    appleBipbop,
    appleBipbopClassic,
    muxBigBuckBunny,
    akamaiSintel,
    tearsOfSteel,
  ];
}

/// Rich fake catalog for UI showcase (Turkish TV-ish names).
List<ChannelCategory> buildDemoCatalog() {
  int nextId = 90001;
  String urlFor(int i) =>
      DemoSampleStreams.all[i % DemoSampleStreams.all.length];

  ChannelStream ch({
    required String name,
    required String categoryId,
    required int seed,
  }) {
    final id = nextId++;
    return ChannelStream(
      id: id,
      name: name,
      streamType: 'live',
      streamUrl: urlFor(seed),
      streamIcon: 'https://picsum.photos/seed/iptv$seed/96/96',
      categoryId: categoryId,
    );
  }

  ChannelCategory cat({
    required String id,
    required String name,
    required int order,
    required List<(String, int)> channels,
  }) {
    return ChannelCategory(
      id: id,
      name: name,
      order: order,
      parentId: '0',
      streams: [
        for (final (n, seed) in channels)
          ch(name: n, categoryId: id, seed: seed),
      ],
    );
  }

  return [
    cat(
      id: 'demo-ulusal',
      name: 'Ulusal',
      order: 1,
      channels: const [
        ('TRT 1 Demo', 101),
        ('Kanal Demo', 102),
        ('Show Demo', 103),
        ('Star Demo', 104),
        ('ATV Demo', 105),
        ('FOX Demo', 106),
        ('TV8 Demo', 107),
        ('NOW Demo', 108),
      ],
    ),
    cat(
      id: 'demo-haber',
      name: 'Haber',
      order: 2,
      channels: const [
        ('TRT Haber Demo', 201),
        ('Habertürk Demo', 202),
        ('CNN Türk Demo', 203),
        ('NTV Demo', 204),
        ('A Haber Demo', 205),
        ('Halk TV Demo', 206),
      ],
    ),
    cat(
      id: 'demo-spor',
      name: 'Spor',
      order: 3,
      channels: const [
        ('beIN Sports 1 Demo', 301),
        ('beIN Sports 2 Demo', 302),
        ('S Sport Demo', 303),
        ('TRT Spor Demo', 304),
        ('A Spor Demo', 305),
        ('Sportivo Demo', 306),
        ('Futbol Arena Demo', 307),
      ],
    ),
    cat(
      id: 'demo-belgesel',
      name: 'Belgesel',
      order: 4,
      channels: const [
        ('National Geographic Demo', 401),
        ('Discovery Demo', 402),
        ('History Demo', 403),
        ('TRT Belgesel Demo', 404),
        ('BBC Earth Demo', 405),
      ],
    ),
    cat(
      id: 'demo-cocuk',
      name: 'Çocuk',
      order: 5,
      channels: const [
        ('TRT Çocuk Demo', 501),
        ('Cartoon Network Demo', 502),
        ('Disney Channel Demo', 503),
        ('Minika GO Demo', 504),
        ('Nick Jr. Demo', 505),
      ],
    ),
    cat(
      id: 'demo-muzik',
      name: 'Müzik',
      order: 6,
      channels: const [
        ('Kral TV Demo', 601),
        ('Power Türk Demo', 602),
        ('Number1 Demo', 603),
        ('Dream Türk Demo', 604),
      ],
    ),
    cat(
      id: 'demo-film',
      name: 'Film & Dizi',
      order: 7,
      channels: const [
        ('Sinema Demo 1', 701),
        ('Sinema Demo 2', 702),
        ('Dizi Demo HD', 703),
        ('Komedi Demo', 704),
        ('Aksiyon Demo', 705),
        ('Klasikler Demo', 706),
      ],
    ),
  ];
}
