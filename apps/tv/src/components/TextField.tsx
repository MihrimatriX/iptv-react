import { forwardRef } from "react";
import { isPointerActive } from "../keys";

interface TextFieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  focused: boolean;
  onHover?(): void;
  type?: "text" | "password" | "url" | "search";
  placeholder?: string;
}

/**
 * TV text input. Highlighted while it has remote focus; OK calls .focus(),
 * which opens the TV's on-screen keyboard (webOS / Tizen IME).
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, value, onChange, focused, onHover, type = "text", placeholder },
  ref
) {
  return (
    <label className={`field ${focused ? "is-focused" : ""}`} onMouseEnter={() => isPointerActive() && onHover?.()}>
      <span className="field__label">{label}</span>
      <input
        ref={ref}
        className="field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        tabIndex={-1}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
});
