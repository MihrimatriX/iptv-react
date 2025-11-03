"use client";

import { Tv, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { CascaderMenu } from "./CascaderMenu";
import type { ChannelCategory } from "@/types/xtream";

interface CategoriesSidebarProps {
  categories: ChannelCategory[];
  selectedCategoryId: string;
  onCategorySelect: (categoryId: string) => void;
  isSidebarOpen: boolean;
  isMenuCollapsed: boolean;
  onToggleMenuCollapsed: () => void;
  totals: { totalStreams: number; totalCategories: number };
}

export const CategoriesSidebar = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  isSidebarOpen,
  isMenuCollapsed,
  onToggleMenuCollapsed,
  totals,
}: CategoriesSidebarProps) => {
  return (
    <aside
      className={clsx(
        "fixed lg:static inset-y-0 left-0 z-50 bg-slate-900/95 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out shadow-2xl shadow-black/40 lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isMenuCollapsed ? "w-12" : "w-[85vw] max-w-sm sm:w-80 lg:w-72"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Collapse Toggle */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-white/10">
          {!isMenuCollapsed && (
            <div className="flex gap-1 text-xs text-slate-300">
              <div className="flex items-center gap-1 rounded-full bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1">
                <Tv className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                <span className="font-medium text-white text-xs">
                  {totals.totalStreams}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1">
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-400" />
                <span className="font-medium text-white text-xs">
                  {totals.totalCategories}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={onToggleMenuCollapsed}
            className="rounded-md p-1 sm:p-1.5 text-slate-400 hover:text-white transition-colors"
            title={isMenuCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
          >
            {isMenuCollapsed ? (
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>

        {/* Menu Content */}
        {!isMenuCollapsed && (
          <div className="flex-1 min-h-0 p-2 sm:p-3">
            <CascaderMenu
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={onCategorySelect}
            />
          </div>
        )}

        {/* Collapsed Menu Icons */}
        {isMenuCollapsed && (
          <div className="flex-1 flex flex-col items-center py-4 space-y-2">
            <div className="rounded-md p-2 bg-white/5 text-slate-400">
              <Tv className="h-4 w-4" />
            </div>
            <div className="rounded-md p-2 bg-white/5 text-slate-400">
              <Tv className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
