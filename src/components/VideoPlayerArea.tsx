"use client";

import { ListVideo, Tv } from "lucide-react";
import { VideoPlayer } from "./VideoPlayer";
import type { ChannelStream } from "@/types/xtream";

interface VideoPlayerAreaProps {
  selectedStream: ChannelStream | null;
  referer?: string;
  onBrowse: () => void;
}

export const VideoPlayerArea = ({ selectedStream, referer, onBrowse }: VideoPlayerAreaProps) => (
  <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-black/40">
    {selectedStream ? (
      <VideoPlayer
        streamUrl={selectedStream.streamUrl}
        channelName={selectedStream.name}
        referer={referer}
      />
    ) : (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Tv className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-white">Bir kanal seçin</h3>
          <p className="text-sm text-slate-400">
            Listeden bir kanala dokunun; yayın burada başlayacak.
          </p>
          <p className="mt-4 hidden text-xs text-slate-500 lg:block">
            Kısayollar: Space oynat/duraklat · F tam ekran · M ses
          </p>
          <button
            onClick={onBrowse}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:brightness-110 lg:hidden"
          >
            <ListVideo className="h-4 w-4" />
            Kanallara göz at
          </button>
        </div>
      </div>
    )}
  </main>
);
