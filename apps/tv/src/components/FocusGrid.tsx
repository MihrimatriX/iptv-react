import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isPointerActive, useKeys, type KeyAction } from "../keys";
import { remPx } from "../layout";

interface FocusGridProps<T> {
  items: readonly T[];
  columns: number;
  /** Row height in rem (poster + title). */
  rowHeight: number;
  focusedIndex: number;
  active: boolean;
  onFocusIndex(index: number): void;
  onSelect(item: T, index: number): void;
  /** Gets keys the grid doesn't use, e.g. left from the first column. */
  onKey?(action: KeyAction, item: T | undefined, index: number): boolean | void;
  renderItem(item: T, index: number, focused: boolean): ReactNode;
  getKey(item: T): string | number;
  empty?: ReactNode;
}

export function FocusGrid<T>(props: FocusGridProps<T>) {
  const { items, columns, rowHeight, focusedIndex, active, onFocusIndex, onSelect, onKey } = props;
  const viewport = useRef<HTMLDivElement>(null);
  const [viewH, setViewH] = useState(0);
  const [scroll, setScroll] = useState(0);
  const rowPx = rowHeight * remPx();
  const count = items.length;
  const rows = Math.ceil(count / columns);
  const index = Math.min(Math.max(focusedIndex, 0), Math.max(count - 1, 0));
  const row = Math.floor(index / columns);
  const col = index % columns;

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setViewH(element.clientHeight);
    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!viewH) return;
    setScroll((current) => {
      let next = current;
      if (row * rowPx < next) next = row * rowPx;
      if ((row + 1) * rowPx > next + viewH) next = (row + 1) * rowPx - viewH;
      return Math.max(0, next);
    });
  }, [row, rowPx, viewH]);

  useKeys(
    (action) => {
      if (action === "left" && col > 0) return onFocusIndex(index - 1), true;
      if (action === "right" && col < columns - 1 && index < count - 1) return onFocusIndex(index + 1), true;
      if (action === "up" && row > 0) return onFocusIndex(index - columns), true;
      if (action === "down" && row < rows - 1) return onFocusIndex(Math.min(count - 1, index + columns)), true;
      if (action === "chUp" && row > 0) return onFocusIndex(Math.max(col, index - columns * 3)), true;
      if (action === "chDown" && row < rows - 1) return onFocusIndex(Math.min(count - 1, index + columns * 3)), true;
      if (action === "ok" && count) return onSelect(items[index], index), true;
      return onKey ? onKey(action, items[index], index) === true : false;
    },
    0,
    active
  );

  const firstRow = Math.max(0, Math.floor(scroll / (rowPx || 1)) - 2);
  const lastRow = Math.min(rows - 1, Math.ceil((scroll + viewH) / (rowPx || 1)) + 2);
  const cells: ReactNode[] = [];
  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = 0; c < columns; c++) {
      const i = r * columns + c;
      if (i >= count) break;
      const item = items[i];
      cells.push(
        <div
          key={props.getKey(item)}
          className="focus-grid__cell"
          style={{
            left: `${(c * 100) / columns}%`,
            transform: `translateY(${r * rowPx}px)`,
            width: `${100 / columns}%`,
            height: rowPx,
          }}
          onMouseEnter={() => isPointerActive() && i !== index && onFocusIndex(i)}
          onClick={() => {
            onFocusIndex(i);
            onSelect(item, i);
          }}
        >
          {props.renderItem(item, i, active && i === index)}
        </div>
      );
    }
  }

  return (
    <div
      ref={viewport}
      className="focus-grid"
      onWheel={(event) => {
        if (!count) return;
        const step = event.deltaY > 0 ? columns : -columns;
        onFocusIndex(Math.max(0, Math.min(count - 1, index + step)));
      }}
    >
      {count === 0 && props.empty}
      <div className="focus-grid__inner" style={{ transform: `translateY(${-scroll}px)`, height: rows * rowPx }}>
        {cells}
      </div>
    </div>
  );
}
