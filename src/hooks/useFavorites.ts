"use client";

import { useState, useEffect } from "react";
import type { ChannelCategory, ChannelStream } from "@/types/xtream";

interface FavoritesData {
  categories: string[];
  channels: number[];
}

const FAVORITES_KEY = "react-iptv-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritesData>({
    categories: [],
    channels: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(parsed);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;

    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  }, [favorites, isLoaded]);

  const toggleCategoryFavorite = (categoryId: string) => {
    setFavorites((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const toggleChannelFavorite = (channelId: number) => {
    setFavorites((prev) => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter((id) => id !== channelId)
        : [...prev.channels, channelId],
    }));
  };

  const isCategoryFavorite = (categoryId: string) => {
    return favorites.categories.includes(categoryId);
  };

  const isChannelFavorite = (channelId: number) => {
    return favorites.channels.includes(channelId);
  };

  const getFavoriteCategories = (categories: ChannelCategory[]) => {
    return categories.filter((cat) => favorites.categories.includes(cat.id));
  };

  const getFavoriteChannels = (channels: ChannelStream[]) => {
    return channels.filter((channel) =>
      favorites.channels.includes(channel.id)
    );
  };

  const clearFavorites = () => {
    setFavorites({ categories: [], channels: [] });
  };

  return {
    favorites,
    toggleCategoryFavorite,
    toggleChannelFavorite,
    isCategoryFavorite,
    isChannelFavorite,
    getFavoriteCategories,
    getFavoriteChannels,
    clearFavorites,
  };
}
