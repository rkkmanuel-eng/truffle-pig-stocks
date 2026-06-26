"use client";

import { useState } from "react";
import { Strategy } from "@/lib/strategies";
import { ScreenedStock } from "@/lib/screener";
import { useTheme } from "./ThemeProvider";
import AlertSignup from "./AlertSignup";
import BellIcon from "./BellIcon";
import StockDetailCard from "./StockDetailCard";

interface Props {
  strategy: Strategy;
  stocks: ScreenedStock[];
}

function formatDuration(since: string | null): string | null {
  if (!since) return null;
  const ms = Date.now() - new Date(since).getTime();
  const days = Math.floor(ms / 86400000);
  if (days < 1) return "<1 day";
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""}`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""}`;
}

type ColorSet = Record<string, { border: string; bg: string; badge: string; text: string }>;

const DARK_COLORS: ColorSet = {
  "value-investing": { border: "border-emerald-400/40", bg: "bg-emerald-950/30", badge: "bg-emerald-900/50 text-emerald-300", text: "text-emerald-400" },
  "dividend-yield": { border: "border-amber-400/40", bg: "bg-amber-950/30", badge: "bg-amber-900/50 text-amber-300", text: "text-amber-400" },
  "momentum": { border: "border-blue-400/40", bg: "bg-blue-950/30", badge: "bg-blue-900/50 text-blue-300", text: "text-blue-400" },
  "dogs-of-the-dow": { border: "border-purple-400/40", bg: "bg-purple-950/30", badge: "bg-purple-900/50 text-purple-300", text: "text-purple-400" },
  "52-week-low": { border: "border-rose-400/40", bg: "bg-rose-950/30", badge: "bg-rose-900/50 text-rose-300", text: "text-rose-400" },
  "low-beta": { border: "border-cyan-400/40", bg: "bg-cyan-950/30", badge: "bg-cyan-900/50 text-cyan-300", text: "text-cyan-400" },
};

const LIGHT_COLORS: ColorSet = {
  "value-investing": { border: "border-emerald-300", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
  "dividend-yield": { border: "border-amber-300", bg: "bg-amber-50", badge: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  "momentum": { border: "border-blue-300", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
  "dogs-of-the-dow": { border: "border-purple-300", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700", text: "text-purple-700" },
  "52-week-low": { border: "border-rose-300", bg: "bg-rose-50", badge: "bg-rose-100 text-rose-700", text: "text-rose-700" },
  "low-beta": { border: "border-cyan-300", bg: "bg-cyan-50", badge: "bg-cyan-100 text-cyan-700", text: "text-cyan-700" },
};

function isNew(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const ms = Date.now() - new Date(createdAt).getTime();
  return ms < 7 * 24 * 60 * 60 * 1000;
}

export default function StrategyColumn({ strategy, stocks }: Props) {
  const { resolved } = useTheme();
  const [alertTarget, setAlertTarget] = useState<{ strategy?: string; symbol?: string } | null>(null);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const palette = resolved === "light" ? LIGHT_COLORS : DARK_COLORS;
  const colors = palette[strategy.slug] ?? palette["value-investing"];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} flex flex-col`}>
      <div className="p-4 border-b border-[var(--th-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-lg ${colors.text}`}>{strategy.name}</h2>
            <span className="text-[10px] text-[var(--th-text-faint)]">{stocks.length} stock{stocks.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={() => setAlertTarget({ strategy: strategy.slug })}
            className="text-[var(--th-text-faint)] hover:text-[var(--th-text)] transition-colors p-1"
            title={`Alert on all ${strategy.name} stocks`}
          >
            <BellIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--th-text-faint)] mb-3">{strategy.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {strategy.criteria.map((c) => (
            <span key={c.metric} className={`text-[10px] px-2 py-0.5 rounded-full ${colors.badge}`}>
              {c.label} {c.operator} {c.threshold}{c.unit ?? ""}
            </span>
          ))}
        </div>
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
                {formatDuration(stock.qualifiedSince) && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--th-active)] text-[var(--th-text-muted)]" title={`Qualified since ${stock.qualifiedSince}`}>
                    {formatDuration(stock.qualifiedSince)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--th-text-muted)]">
                  {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setAlertTarget({ strategy: strategy.slug, symbol: stock.symbol }); }}
                  className="text-[var(--th-text-ghost)] hover:text-[var(--th-text)] transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                  title={`Set alert for ${stock.symbol}`}
                >
                  <BellIcon />
                </button>
              </div>
            </div>
            <div className="text-xs text-[var(--th-text-faint)] truncate">{stock.name}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {strategy.criteria.map((c) => {
                const val = stock.metrics[c.metric];
                const passes = stock.passing[c.metric];
                return (
                  <span
                    key={c.metric}
                    className={`text-[10px] ${passes ? "text-green-400" : "text-red-400"}`}
                  >
                    {c.label.replace(/ *\(.*\)/, "")}: {val != null ? val.toFixed(1) : "—"}{c.unit ?? ""}
                  </span>
                );
              })}
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
