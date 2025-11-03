"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { Heart, HeartOff, Star, StarOff } from "lucide-react";
import type { ChannelCategory } from "@/types/xtream";
import { useFavorites } from "@/hooks/useFavorites";

interface CascaderMenuProps {
  categories: ChannelCategory[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
}

export function CascaderMenu({
  categories,
  selectedCategoryId,
  onCategorySelect,
}: CascaderMenuProps) {
  const [showFavorites, setShowFavorites] = useState(false);
  const { isCategoryFavorite, toggleCategoryFavorite, getFavoriteCategories } =
    useFavorites();

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, "tr", { sensitivity: "base" })
      ),
    [categories]
  );

  const favoriteCategories = useMemo(
    () => getFavoriteCategories(orderedCategories),
    [orderedCategories, getFavoriteCategories]
  );

  const displayCategories = useMemo(() => {
    if (showFavorites) {
      return favoriteCategories;
    }

    const favorites = favoriteCategories;
    const others = orderedCategories.filter(
      (cat) => !favorites.some((fav) => fav.id === cat.id)
    );

    return [...favorites, ...others];
  }, [showFavorites, favoriteCategories, orderedCategories]);

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            Kategoriler
          </h2>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={clsx(
              "rounded-md p-1 sm:p-1.5 transition-colors",
              showFavorites
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-white/5 text-slate-400 hover:text-white"
            )}
            title={
              showFavorites
                ? "Tüm kategorileri göster"
                : "Sadece favorileri göster"
            }
          >
            {showFavorites ? (
              <Star className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-2 scrollbar-thin">
        {displayCategories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-4 text-center text-slate-400">
            <p className="text-xs">
              {showFavorites
                ? "Henüz favori kategori yok"
                : "Kategori bulunamadı"}
            </p>
          </div>
        ) : (
          displayCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const isFavorite = isCategoryFavorite(category.id);

            return (
              <div
                key={category.id}
                className="flex items-center gap-1 min-w-0"
              >
                <button
                  onClick={() => onCategorySelect(category.id)}
                  className={clsx(
                    "flex-1 flex items-center gap-1 sm:gap-2 rounded-md border px-1.5 sm:px-2 py-1 sm:py-1.5 text-left text-xs font-medium transition-all min-w-0 overflow-hidden",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-primary/60 hover:text-primary"
                  )}
                >
                  <span
                    className="truncate flex-1 min-w-0"
                    title={category.name}
                  >
                    {category.name}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto flex-shrink-0">
                    ({category.streams.length})
                  </span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategoryFavorite(category.id);
                  }}
                  className={clsx(
                    "rounded-md p-0.5 sm:p-1 transition-colors",
                    isFavorite
                      ? "text-red-400 hover:text-red-300"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                  title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
                >
                  {isFavorite ? (
                    <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <HeartOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
