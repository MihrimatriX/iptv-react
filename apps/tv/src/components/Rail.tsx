import { Icon, type IconName } from "./icons";
import { useKeys, isPointerActive } from "../keys";

export type Section = "live" | "movies" | "series" | "search" | "settings";

export const SECTIONS: Array<{ id: Section; label: string; icon: IconName }> = [
  { id: "live", label: "Canlı TV", icon: "live" },
  { id: "movies", label: "Filmler", icon: "movie" },
  { id: "series", label: "Diziler", icon: "series" },
  { id: "search", label: "Ara", icon: "search" },
  { id: "settings", label: "Ayarlar", icon: "settings" },
];

interface RailProps {
  section: Section;
  focused: number;
  active: boolean;
  onFocus(index: number): void;
  onOpen(section: Section): void;
  onBack(): void;
  onEnterContent(): void;
}

/** Left navigation; collapses to icons and expands over the content while focused. */
export function Rail({ section, focused, active, onFocus, onOpen, onBack, onEnterContent }: RailProps) {
  useKeys(
    (action) => {
      if (action === "up") return onFocus(Math.max(0, focused - 1)), true;
      if (action === "down") return onFocus(Math.min(SECTIONS.length - 1, focused + 1)), true;
      if (action === "ok") return onOpen(SECTIONS[focused].id), true;
      if (action === "right") return onEnterContent(), true;
      if (action === "back") return onBack(), true;
      return false;
    },
    0,
    active
  );

  return (
    <nav className={`rail ${active ? "rail--open" : ""}`}>
      <div className="rail__brand">
        <span className="rail__logo">A</span>
        <span className="rail__label">AFU IPTV</span>
      </div>
      {SECTIONS.map((entry, index) => (
        <div
          key={entry.id}
          className={`rail__item ${entry.id === section ? "rail__item--current" : ""} ${active && index === focused ? "is-focused" : ""}`}
          onMouseEnter={() => isPointerActive() && onFocus(index)}
          onClick={() => onOpen(entry.id)}
        >
          <Icon name={entry.icon} />
          <span className="rail__label">{entry.label}</span>
        </div>
      ))}
    </nav>
  );
}
