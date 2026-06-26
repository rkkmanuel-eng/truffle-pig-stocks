"use client";

import { useState } from "react";
import { EtfDisplay } from "@/lib/etfs";
import { useTheme } from "./ThemeProvider";
import AlertSignup from "./AlertSignup";
import BellIcon from "./BellIcon";

interface Props {
  etfs: EtfDisplay[];
}

function formatAum(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Large Cap Blend": "bg-blue-900/50 text-blue-300",
  "Large Cap Growth": "bg-emerald-900/50 text-emerald-300",
  "Large Cap Value": "bg-amber-900/50 text-amber-300",
  "Total Market": "bg-indigo-900/50 text-indigo-300",
  "International": "bg-violet-900/50 text-violet-300",
  "Emerging Markets": "bg-orange-900/50 text-orange-300",
  "Bond": "bg-sky-900/50 text-sky-300",
  "Dividend": "bg-yellow-900/50 text-yellow-300",
  "Small Cap Blend": "bg-teal-900/50 text-teal-300",
  "Mid Cap Blend": "bg-cyan-900/50 text-cyan-300",
  "Commodity": "bg-rose-900/50 text-rose-300",
  "Sector - Tech": "bg-purple-900/50 text-purple-300",
};

const CATEGORY_COLORS_LIGHT: Record<string, string> = {
  "Large Cap Blend": "bg-blue-100 text-blue-700",
  "Large Cap Growth": "bg-emerald-100 text-emerald-700",
  "Large Cap Value": "bg-amber-100 text-amber-700",
  "Total Market": "bg-indigo-100 text-indigo-700",
  "International": "bg-violet-100 text-violet-700",
  "Emerging Markets": "bg-orange-100 text-orange-700",
  "Bond": "bg-sky-100 text-sky-700",
  "Dividend": "bg-yellow-100 text-yellow-700",
  "Small Cap Blend": "bg-teal-100 text-teal-700",
  "Mid Cap Blend": "bg-cyan-100 text-cyan-700",
  "Commodity": "bg-rose-100 text-rose-700",
  "Sector - Tech": "bg-purple-100 text-purple-700",
};

export default function EtfColumn({ etfs }: Props) {
  const { resolved } = useTheme();
  const [alertTarget, setAlertTarget] = useState<{ symbol?: string } | null>(null);

  const borderClass = resolved === "light" ? "border-indigo-300" : "border-indigo-400/40";
  const bgClass = resolved === "light" ? "bg-indigo-50" : "bg-indigo-950/20";
  const headingClass = resolved === "light" ? "text-indigo-700" : "text-indigo-400";
  const catColors = resolved === "light" ? CATEGORY_COLORS_LIGHT : CATEGORY_COLORS;

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} flex flex-col`}>
      <div className="p-4 border-b border-[var(--th-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-lg ${headingClass}`}>Top ETFs by AUM</h2>
            <span className="text-[10px] text-[var(--th-text-faint)]">{etfs.length} ETFs</span>
          </div>
          <button
            onClick={() => setAlertTarget({})}
            className="text-[var(--th-text-faint)] hover:text-[var(--th-text)] transition-colors p-1"
            title="Alert on Top ETFs"
          >
            <BellIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--th-text-faint)] mb-3">
          The 25 largest exchange-traded funds ranked by assets under management.
        </p>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {etfs.length === 0 && (
          <p className="text-xs text-[var(--th-text-ghost)] text-center py-6">No ETF data</p>
        )}
        {etfs.map((etf, idx) => (
          <div
            key={etf.symbol}
            className="px-3 py-2.5 rounded-lg hover:bg-[var(--th-hover)] transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--th-text-ghost)] font-mono w-4 text-right">
                  {idx + 1}
                </span>
                <span className="font-mono font-semibold text-sm text-[var(--th-text)]">{etf.symbol}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${catColors[etf.category] ?? catColors["Total Market"]}`}>
                  {etf.category}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--th-text-muted)]">
                  {etf.price != null ? `$${etf.price.toFixed(2)}` : "—"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setAlertTarget({ symbol: etf.symbol }); }}
                  className="text-[var(--th-text-ghost)] hover:text-[var(--th-text)] transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                  title={`Set alert for ${etf.symbol}`}
                >
                  <BellIcon />
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--th-text-faint)] truncate ml-6">{etf.name}</div>
            <div className="flex gap-3 mt-1 ml-6">
              <span className="text-[10px] text-[var(--th-text-muted)]">
                AUM: {formatAum(etf.aum)}
              </span>
              {etf.expenseRatio != null && (
                <span className="text-[10px] text-[var(--th-text-muted)]">
                  ER: {(etf.expenseRatio * 100).toFixed(2)}%
                </span>
              )}
              {etf.ytdReturn != null && (
                <span className={`text-[10px] ${etf.ytdReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                  YTD: {etf.ytdReturn >= 0 ? "+" : ""}{etf.ytdReturn.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {alertTarget && (
        <AlertSignup
          strategySlug="top-etfs"
          symbol={alertTarget.symbol}
          onClose={() => setAlertTarget(null)}
        />
      )}
    </div>
  );
}
