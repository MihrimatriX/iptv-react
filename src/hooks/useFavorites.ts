"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ChannelCategory } from "@/types/xtream";

interface FavoritesData {
  categories: string[];
  channels: number[];
}

const FAVORITES_KEY = "react-iptv-favorites";
const EMPTY: FavoritesData = { categories: [], channels: [] };

// One module-level store shared by every component. Separate useState copies
// used to overwrite each other's localStorage writes.
let current: FavoritesData | null = null;
const listeners = new Set<() => void>();

const read = (): FavoritesData => {
  if (current) return current;
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "null");
    current = {
      categories: Array.isArray(parsed?.categories) ? parsed.categories : [],
      channels: Array.isArray(parsed?.channels) ? parsed.channels : [],
    };
  } catch {
    current = EMPTY;
  }
  return current;
};

const write = (next: FavoritesData) => {
  current = next;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((notify) => notify());
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const toggleCategoryFavorite = (categoryId: string) =>
  write({ ...read(), categories: toggle(read().categories, categoryId) });

const toggleChannelFavorite = (channelId: number) =>
  write({ ...read(), channels: toggle(read().channels, channelId) });

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => EMPTY);

  const isCategoryFavorite = useCallback(
    (categoryId: string) => favorites.categories.includes(categoryId),
    [favorites]
  );
  const isChannelFavorite = useCallback(
    (channelId: number) => favorites.channels.includes(channelId),
    [favorites]
  );
  const getFavoriteCategories = useCallback(
    (categories: ChannelCategory[]) =>
      categories.filter((category) => favorites.categories.includes(category.id)),
    [favorites]
  );

  return {
    toggleCategoryFavorite,
    toggleChannelFavorite,
    isCategoryFavorite,
    isChannelFavorite,
    getFavoriteCategories,
  };
}
