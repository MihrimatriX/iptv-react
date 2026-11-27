import type { ReactNode } from "react";

export const Spinner = ({ label }: { label?: string }) => (
  <div className="state">
    <div className="spinner" />
    {label && <p>{label}</p>}
  </div>
);

export const ErrorState = ({ error, hint }: { error: Error; hint?: ReactNode }) => (
  <div className="state state--error">
    <p className="state__title">Bir sorun oluştu</p>
    <p>{error.message}</p>
    {hint && <p className="muted">{hint}</p>}
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => <div className="state muted">{children}</div>;

export const ProgressBar = ({ value }: { value: number }) => (
  <div className="progress">
    <div className="progress__fill" style={{ width: `${Math.round(value * 1000) / 10}%` }} />
  </div>
);

/** Remote-key legend shown at the bottom of screens. */
export const Hints = ({ items }: { items: Array<[key: string, label: string]> }) => (
  <div className="hints">
    {items.map(([key, label]) => (
      <span key={key + label} className="hints__item">
        <span className={`hints__key hints__key--${key}`}>{key === "red" ? "" : key}</span>
        {label}
      </span>
    ))}
  </div>
);
