import type {
  ChannelCategory,
  EpgEntry,
  MediaCategory,
  SeriesDetails,
  SeriesItem,
  VodDetails,
  VodItem,
} from "./types.ts";

// Public sample HLS streams (not IPTV content) so the apps can be tried without
// Xtream credentials. Mirrors mobile/lib/features/demo/demo_catalog.dart.
export const DEMO_STREAMS = [
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8", // real 24/7 live test stream
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
];

const DEMO_VOD_STREAMS = [
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
];

const DEMO_CATEGORIES: Array<[id: string, name: string, channels: string[]]> = [
  ["demo-ulusal", "Ulusal", ["TRT 1 Demo", "Kanal Demo", "Show Demo", "Star Demo", "ATV Demo", "FOX Demo", "TV8 Demo", "NOW Demo"]],
  ["demo-haber", "Haber", ["TRT Haber Demo", "Habertürk Demo", "CNN Türk Demo", "NTV Demo", "A Haber Demo", "Halk TV Demo"]],
  ["demo-spor", "Spor", ["beIN Sports 1 Demo", "beIN Sports 2 Demo", "S Sport Demo", "TRT Spor Demo", "A Spor Demo", "Sportivo Demo", "Futbol Arena Demo"]],
  ["demo-belgesel", "Belgesel", ["National Geographic Demo", "Discovery Demo", "History Demo", "TRT Belgesel Demo", "BBC Earth Demo"]],
  ["demo-cocuk", "Çocuk", ["TRT Çocuk Demo", "Cartoon Network Demo", "Disney Channel Demo", "Minika GO Demo", "Nick Jr. Demo"]],
  ["demo-muzik", "Müzik", ["Kral TV Demo", "Power Türk Demo", "Number1 Demo", "Dream Türk Demo"]],
  ["demo-film", "Film & Dizi", ["Sinema Demo 1", "Sinema Demo 2", "Dizi Demo HD", "Komedi Demo", "Aksiyon Demo", "Klasikler Demo"]],
];

export function buildDemoCatalog(): ChannelCategory[] {
  let nextId = 90001;
  let channelNumber = 1;
  return DEMO_CATEGORIES.map(([id, name, channels], order) => ({
    id,
    name,
    order,
    parentId: "0",
    streams: channels.map((channelName) => {
      const streamId = nextId++;
      return {
        id: streamId,
        name: channelName,
        streamType: "live",
        streamIcon: null,
        streamUrl: DEMO_STREAMS[streamId % DEMO_STREAMS.length],
        num: channelNumber++,
        epgChannelId: `demo.${streamId}`,
      };
    }),
  }));
}

const PROGRAMMES = [
  ["Sabah Haberleri", "Günün öne çıkan gelişmeleri, hava durumu ve trafik."],
  ["Belgesel Kuşağı", "Doğa, bilim ve tarih üzerine seçilmiş belgeseller."],
  ["Öğle Bülteni", "Yurttan ve dünyadan son dakika haberleri."],
  ["Yemek Atölyesi", "Mevsim sebzeleriyle pratik tarifler."],
  ["Spor Masası", "Haftanın maçları, transfer gündemi ve yorumlar."],
  ["Akşam Ana Haber", "Günün özeti ve canlı bağlantılar."],
  ["Prime Time Dizi", "Sevilen dizinin yeni bölümü."],
  ["Gece Sineması", "Ödüllü yapımlardan seçkiler."],
  ["Müzik Listesi", "Haftanın en çok dinlenen klipleri."],
];

/** Deterministic half-hour/hour slots around `now` so EPG UI has data offline. */
export function demoEpg(streamId: number, now = Date.now(), count = 8): EpgEntry[] {
  const slot = 30 * 60 * 1000;
  let start = Math.floor(now / slot) * slot - slot;
  const entries: EpgEntry[] = [];
  for (let i = 0; i < count; i++) {
    const [title, description] = PROGRAMMES[(streamId + i) % PROGRAMMES.length];
    const length = ((streamId + i) % 3 === 0 ? 2 : 1) * slot;
    entries.push({ id: `${streamId}-${start}`, title, description, start, end: start + length });
    start += length;
  }
  return entries;
}

export const DEMO_VOD_CATEGORIES: MediaCategory[] = [
  { id: "demo-aksiyon", name: "Aksiyon" },
  { id: "demo-bilimkurgu", name: "Bilim Kurgu" },
  { id: "demo-animasyon", name: "Animasyon" },
  { id: "demo-belgesel-film", name: "Belgesel" },
];

const MOVIE_TITLES: Record<string, string[]> = {
  "demo-aksiyon": ["Gece Operasyonu", "Son Kurşun", "Kırmızı Hat", "Sınırda", "Kuzey Rüzgarı", "Hedef 7"],
  "demo-bilimkurgu": ["Çelik Gözyaşları", "Yörünge", "Kayıp Gezegen", "Zaman Kapısı", "Mars 2099"],
  "demo-animasyon": ["Büyük Tavşan", "Sintel", "Küçük Kaşif", "Ormanın Sesi"],
  "demo-belgesel-film": ["Derin Mavi", "Buzulların Sırrı", "Anadolu'nun Kalbi"],
};

export function buildDemoMovies(): VodItem[] {
  let id = 70001;
  const items: VodItem[] = [];
  for (const category of DEMO_VOD_CATEGORIES) {
    for (const name of MOVIE_TITLES[category.id] ?? []) {
      items.push({
        kind: "movie",
        id: id++,
        name,
        categoryId: category.id,
        poster: null,
        rating: 5 + ((id * 7) % 45) / 10,
        extension: "m3u8",
      });
    }
  }
  return items;
}

export function demoMovieUrl(id: number) {
  return DEMO_VOD_STREAMS[id % DEMO_VOD_STREAMS.length];
}

export function demoVodDetails(item: VodItem): VodDetails {
  return {
    id: item.id,
    title: item.name,
    plot: "Bu bir demo içeriktir. Gerçek film bilgileri Xtream panelinden gelir: özet, oyuncular, yönetmen ve süre.",
    cast: "Demo Oyuncu, Örnek Oyuncu",
    director: "Demo Yönetmen",
    genre: DEMO_VOD_CATEGORIES.find((c) => c.id === item.categoryId)?.name,
    releaseDate: "2024",
    duration: 734,
    rating: item.rating,
    poster: null,
    backdrop: null,
    extension: item.extension,
  };
}

export const DEMO_SERIES_CATEGORIES: MediaCategory[] = [
  { id: "demo-yerli", name: "Yerli Diziler" },
  { id: "demo-yabanci", name: "Yabancı Diziler" },
];

const SERIES_TITLES: Record<string, string[]> = {
  "demo-yerli": ["Mahalle", "Boğaz Işıkları", "Eski Kasaba", "Kayıp Mektuplar"],
  "demo-yabanci": ["Northern Line", "The Archive", "Signal", "Harbor"],
};

export function buildDemoSeries(): SeriesItem[] {
  let id = 80001;
  const items: SeriesItem[] = [];
  for (const category of DEMO_SERIES_CATEGORIES) {
    for (const name of SERIES_TITLES[category.id] ?? []) {
      items.push({
        kind: "series",
        id: id++,
        name,
        categoryId: category.id,
        poster: null,
        rating: 6 + ((id * 3) % 35) / 10,
        genre: "Dram",
        releaseDate: "2023",
      });
    }
  }
  return items;
}

const EPISODE_NAMES = ["Başlangıç", "Eski Dostlar", "Sır", "Fırtına", "Dönüş", "Final"];

export function demoSeriesDetails(item: SeriesItem): SeriesDetails {
  const seasons = [1, 2].map((number) => ({
    number,
    name: `${number}. Sezon`,
    cover: null,
    episodes: Array.from({ length: number === 1 ? 6 : 4 }, (_, index) => ({
      id: item.id * 100 + number * 10 + index + 1,
      title: `${index + 1}. Bölüm · ${EPISODE_NAMES[index % EPISODE_NAMES.length]}`,
      season: number,
      episode: index + 1,
      extension: "m3u8",
      plot: "Demo bölüm açıklaması.",
      duration: 734,
      still: null,
    })),
  }));
  return {
    id: item.id,
    title: item.name,
    plot: "Bu bir demo dizidir. Sezonlar ve bölümler Xtream panelinin get_series_info yanıtından gelir.",
    cast: "Demo Oyuncu, Örnek Oyuncu",
    director: "Demo Yönetmen",
    genre: item.genre,
    releaseDate: item.releaseDate,
    rating: item.rating,
    poster: null,
    backdrop: null,
    seasons,
  };
}
