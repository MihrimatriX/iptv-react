"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { ExternalLink, Star } from "lucide-react";
import type { ChannelStream } from "@/types/xtream";

interface ChannelListItemProps {
  stream: ChannelStream;
  onPlay: (stream: ChannelStream) => void;
  isFavorite: boolean;
  onToggleFavorite: (streamId: number) => void;
  isActive: boolean;
}

// Same name→hue hash as mobile's ChannelAvatar, so both apps color channels alike.
const monogramGradient = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  const hue = hash % 360;
  return `linear-gradient(135deg, hsl(${hue} 60% 45%), hsl(${(hue + 40) % 360} 65% 30%))`;
};

export const ChannelListItem = memo(function ChannelListItem({
  stream,
  onPlay,
  isFavorite,
  onToggleFavorite,
  isActive,
}: ChannelListItemProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={clsx(
        // content-visibility: browser skips rendering off-screen rows in huge lists.
        "group flex items-center rounded-xl transition [contain-intrinsic-size:auto_56px] [content-visibility:auto]",
        isActive ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-white/5"
      )}
    >
      <button
        onClick={() => onPlay(stream)}
        className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left"
        aria-current={isActive || undefined}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 to-slate-700 ring-1 ring-white/10">
          {stream.streamIcon && !imageError ? (
            <Image
              src={stream.streamIcon}
              alt=""
              fill
              sizes="40px"
              className="object-contain p-1"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-white"
              style={{ background: monogramGradient(stream.name) }}
            >
              {stream.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={clsx("truncate text-sm font-medium", isActive ? "text-white" : "text-slate-200")}>
            {stream.name}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            {isActive ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Oynatılıyor
              </>
            ) : stream.streamType === "live" ? (
              "Canlı"
            ) : (
              stream.streamType
            )}
          </p>
        </div>
      </button>

      <button
        onClick={() => onToggleFavorite(stream.id)}
        aria-pressed={isFavorite}
        className={clsx(
          "rounded-lg p-2 transition",
          isFavorite
            ? "text-amber-300"
            : "text-slate-600 hover:text-slate-300 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        )}
        title={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      >
        <Star className={clsx("h-4 w-4", isFavorite && "fill-current")} />
      </button>
      <a
        href={stream.streamUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mr-1 hidden rounded-lg p-2 text-slate-500 opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover:opacity-100 lg:block"
        title="Harici oynatıcıda aç (VLC vb.)"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
});
