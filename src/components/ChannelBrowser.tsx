"use client";

import { useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import { AlertCircle, ListVideo, LogOut, Menu, RefreshCw, Tv } from "lucide-react";
import { VideoPlayerArea } from "./VideoPlayerArea";
import { CategoriesSidebar } from "./CategoriesSidebar";
import { ChannelListPanel } from "./ChannelListPanel";
import { useAuth } from "@/contexts/AuthContext";
import { buildDemoCatalog } from "@/lib/demoCatalog";
import type { ChannelCategory, ChannelStream } from "@/types/xtream";

const CACHE_KEY = "react-iptv-categories-cache";
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheData {
  categories: ChannelCategory[];
  timestamp: number;
  credentialsHash: string;
}

const readCache = (hash: string): ChannelCategory[] | null => {
  try {
    const cache: CacheData = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
    const fresh = cache && Date.now() - cache.timestamp < CACHE_DURATION;
    return fresh && cache.credentialsHash === hash && cache.categories.length > 0
      ? cache.categories
      : null;
  } catch {
    return null;
  }
};

function FullScreenMessage({
  icon,
  title,
  message,
  actions,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex h-dvh w-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 w-fit rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">{icon}</div>
        <h2 className="mb-3 font-display text-xl font-semibold text-white">{title}</h2>
        <p className="mb-6 leading-relaxed text-slate-300">{message}</p>
        <div className="flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </div>
  );
}

const primaryButton =
  "flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:brightness-110";
const secondaryButton =
  "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10";

export function ChannelBrowser() {
  const { credentials, isDemo, clearConfiguration } = useAuth();
  const [categories, setCategories] = useState<ChannelCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showChannelFavorites, setShowChannelFavorites] = useState(false);
  const [selectedStream, setSelectedStream] = useState<ChannelStream | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChannelListOpen, setIsChannelListOpen] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isChannelPanelCollapsed, setIsChannelPanelCollapsed] = useState(false);

  // Password stays out of the key; btoa() also threw on non-Latin1 passwords.
  const credentialsHash = credentials
    ? `${credentials.apiBase}|${credentials.username}`
    : "";

  const loadCategories = useCallback(
    async (forceRefresh = false) => {
      if (!credentials) return;
      setError(null);

      if (credentials.demo) {
        setCategories(buildDemoCatalog());
        setIsLoading(false);
        return;
      }

      const cached = forceRefresh ? null : readCache(credentialsHash);
      if (cached) {
        setCategories(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch("/api/xtream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "API isteği başarısız");
        }
        const next: ChannelCategory[] = data.categories ?? [];
        try {
          const cache: CacheData = {
            categories: next,
            timestamp: Date.now(),
            credentialsHash,
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch {
          // Quota exceeded on huge catalogs: just skip caching.
        }
        setCategories(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kategoriler yüklenirken hata oluştu");
      } finally {
        setIsLoading(false);
      }
    },
    [credentials, credentialsHash]
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" })),
    [categories]
  );

  const selectedCategory =
    orderedCategories.find((category) => category.id === selectedCategoryId) ??
    orderedCategories[0];

  const totals = useMemo(
    () => ({
      totalStreams: categories.reduce((acc, category) => acc + category.streams.length, 0),
      totalCategories: categories.length,
    }),
    [categories]
  );

  const handlePlayStream = useCallback((stream: ChannelStream) => {
    setSelectedStream(stream);
    setIsChannelListOpen(false);
  }, []);

  const closePanels = () => {
    setIsSidebarOpen(false);
    setIsChannelListOpen(false);
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-slate-400">Kanal listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  const settingsButton = (
    <button onClick={clearConfiguration} className={secondaryButton}>
      <LogOut className="h-4 w-4" />
      Ayarları değiştir
    </button>
  );

  if (error && categories.length === 0) {
    return (
      <FullScreenMessage
        icon={<AlertCircle className="h-10 w-10 text-red-400" />}
        title="IPTV verileri yüklenemedi"
        message={error}
        actions={
          <>
            <button onClick={() => loadCategories(true)} className={primaryButton}>
              <RefreshCw className="h-4 w-4" />
              Tekrar dene
            </button>
            {settingsButton}
          </>
        }
      />
    );
  }

  if (categories.length === 0) {
    return (
      <FullScreenMessage
        icon={<Tv className="h-10 w-10 text-slate-400" />}
        title="Kategori bulunamadı"
        message="IPTV servisinizde henüz canlı kategori yok veya erişim izniniz bulunmuyor."
        actions={
          <>
            <button onClick={() => loadCategories(true)} className={primaryButton}>
              <RefreshCw className="h-4 w-4" />
              Yenile
            </button>
            {settingsButton}
          </>
        }
      />
    );
  }

  return (
    <div className="flex h-dvh w-screen flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/80 px-2 backdrop-blur-xl lg:hidden">
        <button
          onClick={() => {
            setIsChannelListOpen(false);
            setIsSidebarOpen((open) => !open);
          }}
          className="rounded-xl p-2.5 text-slate-200 transition hover:bg-white/10"
          aria-label="Kategoriler"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {selectedStream?.name ?? selectedCategory?.name ?? "Kanallar"}
          </p>
          {selectedStream && (
            <p className="truncate text-xs text-slate-400">{selectedCategory?.name}</p>
          )}
        </div>
        {isDemo && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-accent">
            DEMO
          </span>
        )}
        <button
          onClick={() => {
            setIsSidebarOpen(false);
            setIsChannelListOpen((open) => !open);
          }}
          className="rounded-xl p-2.5 text-slate-200 transition hover:bg-white/10"
          aria-label="Kanal listesi"
        >
          <ListVideo className="h-5 w-5" />
        </button>
      </header>

      {(isSidebarOpen || isChannelListOpen) && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closePanels} />
      )}

      <CategoriesSidebar
        categories={orderedCategories}
        selectedCategoryId={selectedCategory?.id ?? ""}
        onCategorySelect={(categoryId) => {
          setSelectedCategoryId(categoryId);
          setSearchTerm("");
          setIsSidebarOpen(false);
          setIsChannelListOpen(true);
        }}
        isOpen={isSidebarOpen}
        isCollapsed={isMenuCollapsed}
        onToggleCollapsed={() => setIsMenuCollapsed((v) => !v)}
        totals={totals}
        isDemo={isDemo}
        isRefreshing={isLoading}
        onRefresh={() => loadCategories(true)}
        onLogout={clearConfiguration}
      />

      <ChannelListPanel
        selectedCategory={selectedCategory}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        showChannelFavorites={showChannelFavorites}
        onToggleChannelFavorites={() => setShowChannelFavorites((v) => !v)}
        isOpen={isChannelListOpen}
        isCollapsed={isChannelPanelCollapsed}
        onToggleCollapsed={() => setIsChannelPanelCollapsed((v) => !v)}
        onPlayStream={handlePlayStream}
        activeStreamId={selectedStream?.id ?? null}
      />

      <VideoPlayerArea
        selectedStream={selectedStream}
        referer={credentials?.streamReferer}
        onBrowse={() => setIsChannelListOpen(true)}
      />
    </div>
  );
}
