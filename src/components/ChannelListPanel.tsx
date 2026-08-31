"use client";

import { useMemo } from "react";
import { Search, Star, StarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { ChannelListItem } from "./ChannelListItem";
import { useFavorites } from "@/hooks/useFavorites";
import type { ChannelCategory, ChannelStream } from "@/types/xtream";

interface ChannelListPanelProps {
  selectedCategory: ChannelCategory | undefined;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showChannelFavorites: boolean;
  onToggleChannelFavorites: () => void;
  isChannelPanelCollapsed: boolean;
  onToggleChannelPanelCollapsed: () => void;
  onPlayStream: (stream: ChannelStream) => void;
  activeStreamId: number | null;
}

export const ChannelListPanel = ({
  selectedCategory,
  searchTerm,
  onSearchChange,
  showChannelFavorites,
  onToggleChannelFavorites,
  isChannelPanelCollapsed,
  onToggleChannelPanelCollapsed,
  onPlayStream,
  activeStreamId,
}: ChannelListPanelProps) => {
  const { isChannelFavorite, toggleChannelFavorite, getFavoriteChannels } =
    useFavorites();

  const filteredStreams = useMemo(() => {
    if (!selectedCategory) return [] as ChannelStream[];

    let streams = selectedCategory.streams;
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      streams = streams.filter((stream) =>
        stream.name.toLowerCase().includes(term)
      );
    }

    const trStreams = streams.filter((stream) =>
      stream.name.toLowerCase().startsWith("tr")
    );
    const otherStreams = streams.filter(
      (stream) => !stream.name.toLowerCase().startsWith("tr")
    );

    const favoriteTrStreams = getFavoriteChannels(trStreams);
    const favoriteOtherStreams = getFavoriteChannels(otherStreams);
    const nonFavoriteTrStreams = trStreams.filter(
      (stream) => !favoriteTrStreams.some((fav) => fav.id === stream.id)
    );
    const nonFavoriteOtherStreams = otherStreams.filter(
      (stream) => !favoriteOtherStreams.some((fav) => fav.id === stream.id)
    );

    if (showChannelFavorites) {
      return [...favoriteTrStreams, ...favoriteOtherStreams];
    }

    return [
      ...favoriteTrStreams,
      ...nonFavoriteTrStreams,
      ...favoriteOtherStreams,
      ...nonFavoriteOtherStreams,
    ];
  }, [selectedCategory, searchTerm, showChannelFavorites, getFavoriteChannels]);

  return (
    <aside
      className={clsx(
        "fixed lg:static inset-y-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-l border-white/10 transition-transform duration-300 ease-in-out shadow-2xl shadow-black/40 lg:shadow-none",
        isChannelPanelCollapsed
          ? "translate-x-full lg:translate-x-0"
          : "translate-x-0",
        isChannelPanelCollapsed ? "w-12" : "w-[85vw] max-w-sm sm:w-80 lg:w-72"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Channel Panel Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/10">
          {!isChannelPanelCollapsed && (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  {selectedCategory?.name || "Kanallar"}
                </h2>
                <button
                  onClick={onToggleChannelFavorites}
                  className={clsx(
                    "rounded-md p-1 sm:p-1.5 transition-colors",
                    showChannelFavorites
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  )}
                  title={
                    showChannelFavorites
                      ? "Tüm kanalları göster"
                      : "Sadece favorileri göster"
                  }
                >
                  {showChannelFavorites ? (
                    <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </button>
              </div>

              {/* Channel Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Kanal ara..."
                  className="w-full rounded-md border border-white/10 bg-slate-950/60 py-1.5 sm:py-2 pl-7 pr-2 text-xs text-white shadow-inner placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <p className="text-xs text-slate-300 mt-1">
                {filteredStreams.length} kanal bulundu
              </p>
            </div>
          )}
          <button
            onClick={onToggleChannelPanelCollapsed}
            className="rounded-md p-1 sm:p-1.5 text-slate-400 hover:text-white transition-colors"
            title={isChannelPanelCollapsed ? "Panel genişlet" : "Panel daralt"}
          >
            {isChannelPanelCollapsed ? (
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>

        {/* Channel List Content */}
        {!isChannelPanelCollapsed && (
          <div className="flex-1 min-h-0 p-2 sm:p-3">
            <div className="h-full overflow-y-auto space-y-1 pr-2 scrollbar-thin">
              {filteredStreams.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-center text-slate-400">
                  <p className="text-xs">
                    Seçili kategori için kanal bulunamadı.
                  </p>
                </div>
              ) : (
                filteredStreams.map((stream) => (
                  <ChannelListItem
                    key={stream.id}
                    stream={stream}
                    onPlay={onPlayStream}
                    isFavorite={isChannelFavorite(stream.id)}
                    onToggleFavorite={() => toggleChannelFavorite(stream.id)}
                    isActive={activeStreamId === stream.id}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Collapsed Panel Icons */}
        {isChannelPanelCollapsed && (
          <div className="flex-1 flex flex-col items-center py-4 space-y-2">
            <div className="rounded-md p-2 bg-white/5 text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <div className="text-xs text-slate-500 text-center">
              {filteredStreams.length}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
