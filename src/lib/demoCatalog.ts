import type { ChannelCategory } from "@/types/xtream";

// Public sample HLS streams (not IPTV content) so the UI can be tried without
// Xtream credentials. Mirrors mobile/lib/features/demo/demo_catalog.dart.
const SAMPLE_STREAMS = [
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://demo.unified-streaming.com/k8s/live/stable/live.isml/.m3u8", // real 24/7 live test stream
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
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
        streamUrl: SAMPLE_STREAMS[streamId % SAMPLE_STREAMS.length],
      };
    }),
  }));
}
