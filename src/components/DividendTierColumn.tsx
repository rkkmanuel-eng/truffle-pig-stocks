"use client";

import { useState } from "react";
import { DividendTierMeta, DividendStock } from "@/lib/dividends";
import { useTheme } from "./ThemeProvider";
import AlertSignup from "./AlertSignup";
import BellIcon from "./BellIcon";
import StockDetailCard from "./StockDetailCard";

interface Props {
  meta: DividendTierMeta;
  stocks: DividendStock[];
}

function isNew(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const ms = Date.now() - new Date(createdAt).getTime();
  return ms < 7 * 24 * 60 * 60 * 1000;
}

type ColorSet = Record<string, { border: string; bg: string; badge: string; text: string }>;

const DARK_COLORS: ColorSet = {
  king: { border: "border-yellow-400/40", bg: "bg-yellow-950/20", badge: "bg-yellow-900/50 text-yellow-300", text: "text-yellow-400" },
  aristocrat: { border: "border-violet-400/40", bg: "bg-violet-950/20", badge: "bg-violet-900/50 text-violet-300", text: "text-violet-400" },
  challenger: { border: "border-teal-400/40", bg: "bg-teal-950/20", badge: "bg-teal-900/50 text-teal-300", text: "text-teal-400" },
};

const LIGHT_COLORS: ColorSet = {
  king: { border: "border-yellow-300", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-700", text: "text-yellow-700" },
  aristocrat: { border: "border-violet-300", bg: "bg-violet-50", badge: "bg-violet-100 text-violet-700", text: "text-violet-700" },
  challenger: { border: "border-teal-300", bg: "bg-teal-50", badge: "bg-teal-100 text-teal-700", text: "text-teal-700" },
};

export default function DividendTierColumn({ meta, stocks }: Props) {
  const { resolved } = useTheme();
  const [alertTarget, setAlertTarget] = useState<{ strategy?: string; symbol?: string } | null>(null);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const palette = resolved === "light" ? LIGHT_COLORS : DARK_COLORS;
  const colors = palette[meta.slug] ?? palette.challenger;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} flex flex-col`}>
      <div className="p-4 border-b border-[var(--th-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-lg ${colors.text}`}>{meta.name}</h2>
            <span className="text-[10px] text-[var(--th-text-faint)]">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={() => setAlertTarget({ strategy: `dividend-${meta.slug}` })}
            className="text-[var(--th-text-faint)] hover:text-[var(--th-text)] transition-colors p-1"
            title={`Alert on all ${meta.name}`}
          >
            <BellIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--th-text-faint)] mb-3">{meta.description}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.badge}`}>
          {meta.yearsLabel} of increases
        </span>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {stocks.length === 0 && (
          <p className="text-xs text-[var(--th-text-ghost)] text-center py-6">No stocks match</p>
        )}
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className="px-3 py-2.5 rounded-lg hover:bg-[var(--th-hover)] transition-colors group cursor-pointer"
            onClick={() => setDetailSymbol(stock.symbol)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-sm text-[var(--th-text)]">{stock.symbol}</span>
                {isNew(stock.createdAt) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase tracking-wider">New</span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                  {stock.streakYears}yr
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--th-text-muted)]">
                  {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setAlertTarget({ strategy: `dividend-${meta.slug}`, symbol: stock.symbol }); }}
                  className="text-[var(--th-text-ghost)] hover:text-[var(--th-text)] transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                  title={`Set alert for ${stock.symbol}`}
                >
                  <BellIcon />
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--th-text-faint)] truncate">{stock.name}</div>
            <div className="flex gap-3 mt-1">
              {stock.dividendYield != null && (
                <span className="text-[10px] text-green-400">
                  Yield: {(stock.dividendYield * 100).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {detailSymbol && (
        <StockDetailCard symbol={detailSymbol} onClose={() => setDetailSymbol(null)} />
      )}

      {alertTarget && (
        <AlertSignup
          strategySlug={alertTarget.strategy}
          symbol={alertTarget.symbol}
          onClose={() => setAlertTarget(null)}
        />
      )}
    </div>
  );
}
