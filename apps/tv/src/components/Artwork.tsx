import { useState } from "react";

/** Stable hue from a title so placeholder art differs per item. */
const hue = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

const initials = (name: string) =>
  name
    .replace(/^[A-Z]{2,3}\s*[|:-]\s*/, "") // "TR | TRT 1" → "TRT 1"
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (/^\d+$/.test(word) ? word.slice(0, 3) : word[0]))
    .join("")
    .toLocaleUpperCase("tr");

/** Image with a generated fallback; panel artwork URLs are often dead. */
export function Artwork({ src, title, className, variant = "logo" }: {
  src: string | null | undefined;
  title: string;
  className?: string;
  variant?: "logo" | "poster" | "still";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = !!src && failed !== src;
  const h = hue(title);
  return (
    <div
      className={`artwork artwork--${variant} ${className ?? ""}`}
      style={showImage ? undefined : { background: `linear-gradient(135deg, hsl(${h}, 55%, 32%), hsl(${(h + 40) % 360}, 60%, 18%))` }}
    >
      {showImage ? (
        <img src={src!} alt="" loading="lazy" decoding="async" onError={() => setFailed(src!)} />
      ) : variant === "poster" ? (
        <span className="artwork__title">{title}</span>
      ) : (
        <span className="artwork__initials">{initials(title)}</span>
      )}
    </div>
  );
}
