"use client";

import { useState, useRef, useEffect } from "react";
import AlertSignup from "./AlertSignup";
import BellIcon from "./BellIcon";

interface StockResult {
  symbol: string;
  name: string;
  price: number | null;
}

export default function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockResult[]>([]);
  const [open, setOpen] = useState(false);
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(value.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      }
    }, 200);
  }

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 bg-[var(--th-hover)] border border-[var(--th-border)] rounded-lg px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--th-text-faint)] shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search stock ticker or name..."
            className="bg-transparent text-sm text-[var(--th-text)] placeholder-[var(--th-text-faint)] outline-none w-48"
          />
        </div>

        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 left-0 w-72 bg-[var(--th-bg-sunken)] border border-[var(--th-border)] rounded-lg shadow-xl z-50 overflow-hidden">
            {results.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between px-3 py-2 hover:bg-[var(--th-hover)] transition-colors group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-[var(--th-text)]">{stock.symbol}</span>
                    <span className="text-xs text-[var(--th-text-muted)]">
                      {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--th-text-faint)] truncate">{stock.name}</div>
                </div>
                <button
                  onClick={() => {
                    setAlertSymbol(stock.symbol);
                    setOpen(false);
                  }}
                  className="text-[var(--th-text-ghost)] hover:text-[var(--th-text)] transition-colors p-1 shrink-0"
                  title={`Set alert for ${stock.symbol}`}
                >
                  <BellIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {alertSymbol && (
        <AlertSignup
          symbol={alertSymbol}
          onClose={() => setAlertSymbol(null)}
        />
      )}
    </>
  );
}
