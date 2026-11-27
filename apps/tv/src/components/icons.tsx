// Inline SVG icons (no icon font: TVs load nothing from the network for chrome).
const paths = {
  live: "M4 7h16v11H4z M8 3l4 4 4-4",
  movie: "M4 5h16v14H4z M4 9h16 M8 5v4 M12 5v4 M16 5v4",
  series: "M3 6h14v11H3z M7 20h6 M20 9v9",
  search: "M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z M15.5 15.5L20 20",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h4v16H7z M13 4h4v16h-4z",
  back: "M15 5l-7 7 7 7",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  exit: "M14 4h6v16h-6 M10 8l-4 4 4 4 M6 12h10",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, filled = false, className }: { name: IconName; filled?: boolean; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ""}`}
      viewBox="0 0 24 24"
      fill={filled || name === "play" || name === "pause" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
