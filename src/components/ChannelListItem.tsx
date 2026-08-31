"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { Play, ExternalLink, Heart, HeartOff } from "lucide-react";
import type { ChannelStream } from "@/types/xtream";

interface ChannelListItemProps {
  stream: ChannelStream;
  onPlay: (stream: ChannelStream) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isActive: boolean;
}

export const ChannelListItem = ({
  stream,
  onPlay,
  isFavorite,
  onToggleFavorite,
  isActive,
}: ChannelListItemProps) => {
  const [imageError, setImageError] = useState(false);
  const handlePlayClick = useCallback(() => onPlay(stream), [onPlay, stream]);

  const handleExternalClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(stream.streamUrl, "_blank", "noopener,noreferrer");
    },
    [stream.streamUrl]
  );

  const containerClasses = clsx(
    "group flex items-center gap-2 rounded-md p-2 transition-all hover:border-primary/50 hover:bg-white/10",
    isActive
      ? "border-primary bg-primary/20 shadow-lg shadow-primary/20"
      : "border-white/10 bg-white/5"
  );

  const titleClasses = clsx(
    "truncate text-xs font-semibold transition-colors",
    isActive ? "text-white" : "text-white group-hover:text-primary"
  );

  const subtitleClasses = clsx(
    "text-xs",
    isActive ? "text-white/80" : "text-slate-400"
  );
  const initialClasses = clsx(
    "text-xs font-semibold uppercase",
    isActive ? "text-white/80" : "text-white/60"
  );

  return (
    <div className={containerClasses}>
      {/* Channel Logo */}
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-gradient-to-tr from-slate-800 to-slate-700">
        {stream.streamIcon && !imageError ? (
          <Image
            src={stream.streamIcon}
            alt={stream.name}
            fill
            sizes="32px"
            className="object-contain object-center p-0.5"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className={initialClasses}>{stream.name.charAt(0)}</span>
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="flex-1 min-w-0">
        <h3 className={titleClasses}>{stream.name}</h3>
        <p className={subtitleClasses}>
          {stream.streamType === "live" ? "Canlı" : stream.streamType}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={clsx(
            "group/btn inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition",
            isFavorite
              ? "text-red-400 hover:text-red-300"
              : "text-slate-500 hover:text-slate-300"
          )}
          title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
        >
          {isFavorite ? (
            <Heart className="h-3 w-3" />
          ) : (
            <HeartOff className="h-3 w-3" />
          )}
        </button>
        <button
          type="button"
          onClick={handlePlayClick}
          className={clsx(
            "group/btn inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-white transition hover:bg-primary/80",
            isActive &&
              "ring-2 ring-primary/60 ring-offset-1 ring-offset-slate-900"
          )}
          title="Kanalı oynat"
        >
          <Play className="h-3 w-3 transition-transform group-hover/btn:scale-110" />
        </button>
        <button
          type="button"
          onClick={handleExternalClick}
          className="group/btn inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-1.5 py-1 text-xs font-medium text-white transition hover:bg-white/10"
          title="Yeni sekmede aç"
        >
          <ExternalLink className="h-3 w-3 transition-transform group-hover/btn:scale-110" />
        </button>
      </div>
    </div>
  );
};
