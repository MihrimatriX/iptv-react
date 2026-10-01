"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { Star } from "lucide-react";
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

  // Favorites first, then the rest (categories arrive already sorted).
  const displayCategories = useMemo(() => {
    const favorites = getFavoriteCategories(categories);
    if (showFavorites) return favorites;
    return [...favorites, ...categories.filter((cat) => !favorites.includes(cat))];
  }, [showFavorites, categories, getFavoriteCategories]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Kategoriler
        </h2>
        <button
          onClick={() => setShowFavorites((v) => !v)}
          aria-pressed={showFavorites}
          className={clsx(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition",
            showFavorites
              ? "bg-amber-400/15 text-amber-300"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
          title={showFavorites ? "Tüm kategorileri göster" : "Sadece favorileri göster"}
        >
          <Star className={clsx("h-3.5 w-3.5", showFavorites && "fill-current")} />
          Favoriler
        </button>
      </div>

      <div className="scrollbar-thin -mr-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-2">
        {displayCategories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-400">
            {showFavorites
              ? "Henüz favori kategori yok. Yıldıza dokunarak ekleyin."
              : "Kategori bulunamadı"}
          </p>
        ) : (
          displayCategories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            const isFavorite = isCategoryFavorite(category.id);

            return (
              <div
                key={category.id}
                className={clsx(
                  "group flex items-center rounded-xl transition",
                  isSelected ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-white/5"
                )}
              >
                <button
                  onClick={() => onCategorySelect(category.id)}
                  className={clsx(
                    "flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm",
                    isSelected ? "font-medium text-white" : "text-slate-300"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate" title={category.name}>
                    {category.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {category.streams.length}
                  </span>
                </button>
                <button
                  onClick={() => toggleCategoryFavorite(category.id)}
                  aria-pressed={isFavorite}
                  className={clsx(
                    "mr-1 rounded-lg p-2 transition",
                    isFavorite
                      ? "text-amber-300"
                      : "text-slate-600 hover:text-slate-300 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                  )}
                  title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
                >
                  <Star className={clsx("h-3.5 w-3.5", isFavorite && "fill-current")} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
