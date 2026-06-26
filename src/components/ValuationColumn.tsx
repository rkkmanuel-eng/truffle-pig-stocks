"use client";

import { useState } from "react";
import { ValuationMethodMeta, ValuatedStock, ValuationBucket } from "@/lib/valuations";
import { useTheme } from "./ThemeProvider";
import AlertSignup from "./AlertSignup";
import BellIcon from "./BellIcon";
import StockDetailCard from "./StockDetailCard";

interface Props {
  meta: ValuationMethodMeta;
  buckets: Record<ValuationBucket, ValuatedStock[]>;
}

type BucketStyle = Record<ValuationBucket, { label: string; text: string; dot: string }>;

const DARK_BUCKET_STYLES: BucketStyle = {
  undervalued: { label: "Undervalued", text: "text-green-400", dot: "bg-green-400" },
  fair: { label: "Fair Value", text: "text-yellow-400", dot: "bg-yellow-400" },
  overvalued: { label: "Overvalued", text: "text-red-400", dot: "bg-red-400" },
};

const LIGHT_BUCKET_STYLES: BucketStyle = {
  undervalued: { label: "Undervalued", text: "text-green-700", dot: "bg-green-500" },
  fair: { label: "Fair Value", text: "text-yellow-700", dot: "bg-yellow-500" },
  overvalued: { label: "Overvalued", text: "text-red-700", dot: "bg-red-500" },
};

const BUCKET_ORDER: ValuationBucket[] = ["undervalued", "fair", "overvalued"];

function isNew(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const ms = Date.now() - new Date(createdAt).getTime();
  return ms < 7 * 24 * 60 * 60 * 1000;
}

export default function ValuationColumn({ meta, buckets }: Props) {
  const { resolved } = useTheme();
  const [alertTarget, setAlertTarget] = useState<{ strategy?: string; symbol?: string } | null>(null);
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const bucketStyles = resolved === "light" ? LIGHT_BUCKET_STYLES : DARK_BUCKET_STYLES;

  const columnBorder = resolved === "light" ? "border-cyan-300" : "border-cyan-400/40";
  const columnBg = resolved === "light" ? "bg-cyan-50" : "bg-cyan-950/20";
  const headingText = resolved === "light" ? "text-cyan-700" : "text-cyan-400";
  const underBadge = resolved === "light" ? "bg-green-100 text-green-700" : "bg-green-900/50 text-green-300";
  const fairBadge = resolved === "light" ? "bg-yellow-100 text-yellow-700" : "bg-yellow-900/50 text-yellow-300";
  const overBadge = resolved === "light" ? "bg-red-100 text-red-700" : "bg-red-900/50 text-red-300";

  return (
    <div className={`rounded-xl border ${columnBorder} ${columnBg} flex flex-col`}>
      <div className="p-4 border-b border-[var(--th-border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className={`font-semibold text-lg ${headingText}`}>{meta.name}</h2>
            <span className="text-[10px] text-[var(--th-text-faint)]">{BUCKET_ORDER.reduce((sum, b) => sum + buckets[b].length, 0)} stocks</span>
          </div>
          <button
            onClick={() => setAlertTarget({ strategy: meta.slug })}
            className="text-[var(--th-text-faint)] hover:text-[var(--th-text)] transition-colors p-1"
            title={`Alert on all ${meta.name} stocks`}
          >
            <BellIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--th-text-faint)] mb-3">{meta.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${underBadge}`}>{meta.undervaluedLabel}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${fairBadge}`}>{meta.fairLabel}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${overBadge}`}>{meta.overvaluedLabel}</span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-1">
        {BUCKET_ORDER.map((bucket) => {
          const stocks = buckets[bucket];
          const style = bucketStyles[bucket];
          if (stocks.length === 0) return null;
          return (
            <div key={bucket}>
              <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>
                  {style.label}
                </span>
                <span className="text-[10px] text-[var(--th-text-ghost)]">{stocks.length}</span>
              </div>
              {stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  className="px-3 py-2 rounded-lg hover:bg-[var(--th-hover)] transition-colors group cursor-pointer"
                  onClick={() => setDetailSymbol(stock.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm text-[var(--th-text)]">{stock.symbol}</span>
                      {isNew(stock.createdAt) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase tracking-wider">New</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--th-text-muted)]">
                        {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAlertTarget({ strategy: meta.slug, symbol: stock.symbol }); }}
                        className="text-[var(--th-text-ghost)] hover:text-[var(--th-text)] transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                        title={`Set alert for ${stock.symbol}`}
                      >
                        <BellIcon />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--th-text-faint)] truncate">{stock.name}</div>
                  <div className={`text-[10px] mt-0.5 ${style.text}`}>{stock.displayValue}</div>
                </div>
              ))}
            </div>
          );
        })}
        {BUCKET_ORDER.every((b) => buckets[b].length === 0) && (
          <p className="text-xs text-[var(--th-text-ghost)] text-center py-6">No data available</p>
        )}
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
