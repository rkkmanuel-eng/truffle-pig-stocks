"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ColumnDef {
  id: string;
  label: string;
  group: string;
}

const STORAGE_KEY = "truffle-pig-visible-columns";

export function useVisibleColumns(allColumns: ColumnDef[]) {
  const [visible, setVisible] = useState<Set<string>>(() => {
    return new Set(allColumns.map((c) => c.id));
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const ids: string[] = JSON.parse(stored);
        const valid = ids.filter((id) => allColumns.some((c) => c.id === id));
        if (valid.length > 0) {
          setVisible(new Set(valid));
        }
      } catch {}
    }
    setLoaded(true);
  }, [allColumns]);

  function toggle(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function showAll() {
    const all = new Set(allColumns.map((c) => c.id));
    setVisible(all);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...all]));
  }

  function hideAll() {
    const first = new Set([allColumns[0].id]);
    setVisible(first);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...first]));
  }

  return { visible, loaded, toggle, showAll, hideAll };
}

export default function ColumnPicker({
  columns,
  visible,
  onToggle,
  onShowAll,
  onHideAll,
}: {
  columns: ColumnDef[];
  visible: Set<string>;
  onToggle: (id: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(checkScroll);
  }, [open, checkScroll]);

  const groups = columns.reduce<Record<string, ColumnDef[]>>((acc, col) => {
    (acc[col.group] ??= []).push(col);
    return acc;
  }, {});

  const allVisible = visible.size === columns.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-[var(--th-hover)] border border-[var(--th-border)]
          text-[var(--th-text-muted)] hover:text-[var(--th-text)]
          hover:bg-[var(--th-active)] transition-colors cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Columns
        <span className="text-[var(--th-text-ghost)]">
          {visible.size}/{columns.length}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-[var(--th-border)]
            bg-[var(--th-bg)] shadow-xl shadow-[var(--th-shadow)] z-50 overflow-hidden"
        >
          <div className="p-2 border-b border-[var(--th-border)] flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--th-text-muted)]">Show columns</span>
            <button
              onClick={allVisible ? onHideAll : onShowAll}
              className="text-[10px] text-[var(--th-accent)] hover:underline cursor-pointer"
            >
              {allVisible ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="relative">
            <div
              ref={listRef}
              onScroll={checkScroll}
              className="max-h-72 overflow-y-auto p-1"
            >
              {Object.entries(groups).map(([group, cols]) => (
                <div key={group}>
                  <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--th-text-ghost)] font-semibold">
                    {group}
                  </div>
                  {cols.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--th-hover)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visible.has(col.id)}
                        onChange={() => onToggle(col.id)}
                        className="accent-[var(--th-accent)] cursor-pointer"
                      />
                      <span className="text-xs text-[var(--th-text)]">{col.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            {canScrollDown && (
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <div className="h-8 bg-gradient-to-t from-[var(--th-bg)] to-transparent" />
                <div className="bg-[var(--th-bg)] text-center pb-1.5">
                  <span className="text-[10px] text-[var(--th-text-ghost)] pointer-events-auto flex items-center justify-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                    Scroll for more
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
