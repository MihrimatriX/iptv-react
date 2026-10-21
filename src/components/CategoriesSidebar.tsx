"use client";

import { ChevronLeft, ChevronRight, LogOut, RefreshCw, Tv } from "lucide-react";
import { clsx } from "clsx";
import { CascaderMenu } from "./CascaderMenu";
import type { ChannelCategory } from "@/types/xtream";

interface CategoriesSidebarProps {
  categories: ChannelCategory[];
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  totals: { totalStreams: number; totalCategories: number };
  isDemo: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

const iconButton =
  "rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50";

export const CategoriesSidebar = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  isOpen,
  isCollapsed,
  onToggleCollapsed,
  totals,
  isDemo,
  isRefreshing,
  onRefresh,
  onLogout,
}: CategoriesSidebarProps) => {
  const actions = (
    <>
      {!isDemo && (
        <button onClick={onRefresh} disabled={isRefreshing} className={iconButton} title="Listeyi yenile">
          <RefreshCw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
        </button>
      )}
      <button
        onClick={onLogout}
        className={clsx(iconButton, "hover:text-red-300")}
        title={isDemo ? "Demodan çık" : "Çıkış yap / ayarları değiştir"}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col border-r border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-300 ease-out",
        "lg:static lg:z-auto lg:translate-x-0 lg:bg-slate-950/60 lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-14" : "lg:w-72"
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Tv className="h-4 w-4 text-white" />
        </div>
        <div className={clsx("min-w-0 flex-1", isCollapsed && "lg:hidden")}>
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-sm font-semibold text-white">IPTV Client</p>
              {isDemo && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent">
                  DEMO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {totals.totalCategories} kategori · {totals.totalStreams} kanal
            </p>
        </div>
        <div className={clsx("flex", isCollapsed && "lg:hidden")}>{actions}</div>
        <button
          onClick={onToggleCollapsed}
          className={clsx(iconButton, "hidden lg:block")}
          title={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {isCollapsed && (
        <div className="hidden flex-col items-center gap-1 py-3 lg:flex">{actions}</div>
      )}
      <div className={clsx("min-h-0 flex-1 p-3", isCollapsed && "lg:hidden")}>
        <CascaderMenu
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={onCategorySelect}
        />
      </div>
    </aside>
  );
};
