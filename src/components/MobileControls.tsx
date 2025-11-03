"use client";

import { Menu, X, Tv } from "lucide-react";

interface MobileControlsProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleChannelList: () => void;
}

export const MobileControls = ({
  isSidebarOpen,
  onToggleSidebar,
  onToggleChannelList,
}: MobileControlsProps) => {
  return (
    <div className="fixed top-4 left-4 z-50 lg:hidden flex gap-2">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
      >
        {isSidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      <button
        onClick={onToggleChannelList}
        className="rounded-lg bg-black/60 p-2.5 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
        title="Kanal listesini aç/kapat"
      >
        <Tv className="h-5 w-5" />
      </button>
    </div>
  );
};
