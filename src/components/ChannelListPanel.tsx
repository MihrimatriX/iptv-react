"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, Star, X } from "lucide-react";
import { clsx } from "clsx";
import { ChannelListItem } from "./ChannelListItem";
import { useFavorites } from "@/hooks/useFavorites";
import { matchesSearch } from "@/lib/search";
import type { ChannelCategory, ChannelStream } from "@/types/xtream";

interface ChannelListPanelProps {
  selectedCategory: ChannelCategory | undefined;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showChannelFavorites: boolean;
  onToggleChannelFavorites: () => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onPlayStream: (stream: ChannelStream) => void;
  activeStreamId: number | null;
}

export const ChannelListPanel = ({
  selectedCategory,
  searchTerm,
  onSearchChange,
  showChannelFavorites,
  onToggleChannelFavorites,
  isOpen,
  isCollapsed,
  onToggleCollapsed,
  onPlayStream,
  activeStreamId,
}: ChannelListPanelProps) => {
  const { isChannelFavorite, toggleChannelFavorite } = useFavorites();

  const filteredStreams = useMemo(() => {
    if (!selectedCategory) return [];
    const term = searchTerm.trim();
    // Order: TR favorites, TR, other favorites, others (sort is stable, keeps A-Z).
    const rank = (stream: ChannelStream) =>
      (stream.name.toLowerCase().startsWith("tr") ? 0 : 2) +
      (isChannelFavorite(stream.id) ? 0 : 1);
    return selectedCategory.streams
      .filter(
        (stream) =>
          (!term || matchesSearch(stream.name, term)) &&
          (!showChannelFavorites || isChannelFavorite(stream.id))
      )
      .sort((a, b) => rank(a) - rank(b));
  }, [selectedCategory, searchTerm, showChannelFavorites, isChannelFavorite]);

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 right-0 z-50 flex w-[90vw] max-w-sm flex-col border-l border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-300 ease-out",
        "lg:static lg:z-auto lg:translate-x-0 lg:border-l-0 lg:border-r lg:bg-slate-950/40 lg:shadow-none",
        isOpen ? "translate-x-0" : "translate-x-full",
        isCollapsed ? "lg:w-14" : "lg:w-80"
      )}
    >
      <div className="flex items-start gap-2 border-b border-white/10 p-3">
        <div className={clsx("min-w-0 flex-1 space-y-2", isCollapsed && "lg:hidden")}>
          <div className="flex items-center gap-2">
            <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold text-white">
              {selectedCategory?.name ?? "Kanallar"}
            </h2>
            <button
              onClick={onToggleChannelFavorites}
              aria-pressed={showChannelFavorites}
              className={clsx(
                "rounded-lg p-2 transition",
                showChannelFavorites
                  ? "bg-amber-400/15 text-amber-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
              title={showChannelFavorites ? "Tüm kanalları göster" : "Sadece favorileri göster"}
            >
              <Star className={clsx("h-4 w-4", showChannelFavorites && "fill-current")} />
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Kanal ara…"
              aria-label="Kanal ara"
              className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:text-white"
                aria-label="Aramayı temizle"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-500">{filteredStreams.length} kanal</p>
        </div>

        <button
          onClick={onToggleCollapsed}
          className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:block"
          title={isCollapsed ? "Paneli genişlet" : "Paneli daralt"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className={clsx("min-h-0 flex-1 p-2", isCollapsed && "lg:hidden")}>
        <div className="scrollbar-thin h-full space-y-1 overflow-y-auto pr-1">
          {filteredStreams.length === 0 ? (
            <p className="m-1 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-400">
              {showChannelFavorites
                ? "Bu kategoride favori kanal yok."
                : searchTerm
                  ? "Aramanızla eşleşen kanal yok."
                  : "Seçili kategoride kanal bulunamadı."}
            </p>
          ) : (
            filteredStreams.map((stream) => (
              <ChannelListItem
                key={stream.id}
                stream={stream}
                onPlay={onPlayStream}
                isFavorite={isChannelFavorite(stream.id)}
                onToggleFavorite={toggleChannelFavorite}
                isActive={activeStreamId === stream.id}
              />
            ))
          )}
        </div>
      </div>

      {isCollapsed && (
        <p className="hidden py-3 text-center text-xs tabular-nums text-slate-500 lg:block">
          {filteredStreams.length}
        </p>
      )}
    </aside>
  );
};
