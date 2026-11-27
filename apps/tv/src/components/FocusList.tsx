import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isPointerActive, useKeys, type KeyAction } from "../keys";
import { remPx } from "../layout";

interface FocusListProps<T> {
  items: readonly T[];
  /** Row height in rem; rows are fixed-height so only the visible window is rendered. */
  itemHeight: number;
  focusedIndex: number;
  active: boolean;
  onFocusIndex(index: number): void;
  onSelect?(item: T, index: number): void;
  /** Gets keys the list doesn't use (left/right, colours…). */
  onKey?(action: KeyAction, item: T | undefined, index: number): boolean | void;
  renderItem(item: T, index: number, focused: boolean): ReactNode;
  getKey(item: T, index: number): string | number;
  className?: string;
  empty?: ReactNode;
  layer?: number;
}

const OVERSCAN = 4;

export function FocusList<T>(props: FocusListProps<T>) {
  const { items, itemHeight, focusedIndex, active, onFocusIndex, onSelect, onKey, renderItem, getKey } = props;
  const viewport = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(0);
  const [scroll, setScroll] = useState(0);
  const rowPx = itemHeight * remPx();
  const count = items.length;
  const index = Math.min(Math.max(focusedIndex, 0), Math.max(count - 1, 0));

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setViewH(element.clientHeight);
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Keep one row of context above/below the focused row.
  useEffect(() => {
    if (!viewH || !rowPx) return;
    const total = count * rowPx;
    setScroll((current) => {
      const top = (index - 1) * rowPx;
      const bottom = (index + 2) * rowPx;
      let next = current;
      if (top < next) next = top;
      if (bottom > next + viewH) next = bottom - viewH;
      return Math.max(0, Math.min(next, Math.max(0, total - viewH)));
    });
  }, [index, viewH, rowPx, count]);

  useKeys(
    (action) => {
      const page = Math.max(1, Math.floor(viewH / rowPx) - 1);
      if (action === "up" && index > 0) return onFocusIndex(index - 1), true;
      if (action === "down" && index < count - 1) return onFocusIndex(index + 1), true;
      if (action === "chUp" && count) return onFocusIndex(Math.max(0, index - page)), true;
      if (action === "chDown" && count) return onFocusIndex(Math.min(count - 1, index + page)), true;
      if (action === "ok" && count && onSelect) return onSelect(items[index], index), true;
      return onKey ? onKey(action, items[index], index) === true : false;
    },
    props.layer,
    active
  );

  const first = Math.max(0, Math.floor(scroll / (rowPx || 1)) - OVERSCAN);
  const last = Math.min(count - 1, Math.ceil((scroll + viewH) / (rowPx || 1)) + OVERSCAN);
  const rows: ReactNode[] = [];
  for (let i = first; i <= last; i++) {
    const item = items[i];
    rows.push(
      <div
        key={getKey(item, i)}
        className="focus-list__row"
        style={{ transform: `translateY(${i * rowPx}px)`, height: rowPx }}
        onMouseEnter={() => isPointerActive() && i !== index && onFocusIndex(i)}
        onClick={() => {
          onFocusIndex(i);
          onSelect?.(item, i);
        }}
      >
        {renderItem(item, i, active && i === index)}
      </div>
    );
  }

  return (
    <div
      ref={viewport}
      className={`focus-list ${props.className ?? ""}`}
      onWheel={(event) => {
        if (!count) return;
        onFocusIndex(Math.max(0, Math.min(count - 1, index + (event.deltaY > 0 ? 1 : -1))));
      }}
    >
      {count === 0 && props.empty}
      <div className="focus-list__inner" style={{ transform: `translateY(${-scroll}px)`, height: count * rowPx }}>
        {rows}
      </div>
    </div>
  );
}
