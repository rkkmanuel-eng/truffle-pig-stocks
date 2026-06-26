"use client";

import { useState, useEffect } from "react";

interface StockData {
  symbol: string;
  name: string;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  price: number | null;
  week52_high: number | null;
  week52_low: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  eps: number | null;
  dividend_yield: number | null;
  beta: number | null;
  volume_avg: number | null;
  sma_50: number | null;
  sma_200: number | null;
  pb_ratio: number | null;
  debt_equity_ratio: number | null;
  current_ratio: number | null;
  peg_ratio: number | null;
  dcf_value: number | null;
}

interface Props {
  symbol: string;
  onClose: () => void;
}

function formatLargeNumber(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function formatVolume(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmt(n: number | null, decimals = 2, prefix = ""): string {
  if (n == null) return "—";
  return `${prefix}${n.toFixed(decimals)}`;
}

function pctFmt(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

function Week52Bar({ price, low, high }: { price: number | null; low: number | null; high: number | null }) {
  if (price == null || low == null || high == null || high === low) return null;
  const pct = Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] text-[var(--th-text-faint)] mb-1">
        <span>52W Low: ${low.toFixed(2)}</span>
        <span>52W High: ${high.toFixed(2)}</span>
      </div>
      <div className="relative h-2 bg-[var(--th-active)] rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" style={{ width: "100%" }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-400 shadow"
          style={{ left: `calc(${pct}% - 6px)` }}
        />
      </div>
    </div>
  );
}

export default function StockDetailCard({ symbol, onClose }: Props) {
  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stocks/${symbol}`)
      .then((r) => r.json())
      .then((data) => { setStock(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  return (
    <div className="fixed inset-0 bg-[var(--th-overlay)] backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--th-bg-raised)] border border-[var(--th-border)] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="text-center py-8 text-[var(--th-text-faint)] text-sm">Loading...</div>
        ) : !stock ? (
          <div className="text-center py-8 text-[var(--th-text-faint)] text-sm">Stock not found</div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-[var(--th-text)]">{stock.symbol}</h3>
                  {stock.exchange && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--th-active)] text-[var(--th-text-muted)]">{stock.exchange}</span>
                  )}
                </div>
                <p className="text-sm text-[var(--th-text-muted)] mt-0.5">{stock.name}</p>
                {(stock.sector || stock.industry) && (
                  <p className="text-xs text-[var(--th-text-ghost)] mt-0.5">
                    {[stock.sector, stock.industry].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)] text-2xl leading-none">&times;</button>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-[var(--th-text)]">{fmt(stock.price, 2, "$")}</span>
            </div>

            <Week52Bar price={stock.price} low={stock.week52_low} high={stock.week52_high} />

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-5">
              <Stat label="Market Cap" value={formatLargeNumber(stock.market_cap)} />
              <Stat label="P/E Ratio" value={fmt(stock.pe_ratio)} />
              <Stat label="EPS (TTM)" value={fmt(stock.eps, 2, "$")} />
              <Stat label="P/B Ratio" value={fmt(stock.pb_ratio)} />
              <Stat label="Div Yield" value={pctFmt(stock.dividend_yield)} />
              <Stat label="Beta" value={fmt(stock.beta)} />
              <Stat label="Avg Volume" value={formatVolume(stock.volume_avg)} />
              <Stat label="PEG Ratio" value={fmt(stock.peg_ratio)} />
              <Stat label="D/E Ratio" value={fmt(stock.debt_equity_ratio)} />
              <Stat label="Current Ratio" value={fmt(stock.current_ratio)} />
              <Stat label="SMA 50" value={fmt(stock.sma_50, 2, "$")} />
              <Stat label="SMA 200" value={fmt(stock.sma_200, 2, "$")} />
            </div>

            {stock.dcf_value != null && stock.price != null && (
              <FairValueChart price={stock.price} fairValue={stock.dcf_value} symbol={stock.symbol} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--th-text-faint)] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-[var(--th-text)]">{value}</div>
    </div>
  );
}

function FairValueChart({ price, fairValue }: { price: number; fairValue: number; symbol: string }) {
  const [showInfo, setShowInfo] = useState(false);

  const rangeLow = fairValue * 0.80;
  const rangeHigh = fairValue * 1.20;

  const pctDiff = ((price - fairValue) / fairValue) * 100;
  const isOvervalued = price > fairValue;
  const absPct = Math.abs(pctDiff);

  let statusLabel: string;
  let statusColor: string;
  if (isOvervalued) {
    statusLabel = `${absPct.toFixed(1)}% Overvalued`;
    statusColor = absPct > 20 ? "#ef4444" : "#eab308";
  } else {
    statusLabel = `${absPct.toFixed(1)}% Undervalued`;
    statusColor = absPct > 20 ? "#4ade80" : "#eab308";
  }

  const W = 400;
  const zoneW = W / 3;

  const toX = (val: number) => {
    if (val <= rangeLow) return (val / rangeLow) * zoneW;
    if (val <= rangeHigh) return zoneW + ((val - rangeLow) / (rangeHigh - rangeLow)) * zoneW;
    return zoneW * 2 + ((val - rangeHigh) / (rangeHigh * 0.5)) * zoneW;
  };

  const pricePx = Math.max(0, Math.min(toX(price), W));
  const fairPx = toX(fairValue);
  const barH = 30;
  const priceBarY = 28;
  const fairBarY = 68;

  return (
    <div className="mt-5 rounded-lg overflow-hidden border border-[var(--th-border)] bg-[var(--th-bg-chart)] relative">
      <div className="px-5 pt-4 pb-1 flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--th-text-muted)] font-semibold">Valuation Status</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: statusColor }}>
            {statusLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--th-text-muted)] font-semibold">Fair Value Range</div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-3.5 h-3.5 rounded-full border border-[var(--th-text-faint)] text-[var(--th-text-faint)] hover:border-[var(--th-text)] hover:text-[var(--th-text)] transition-colors flex items-center justify-center text-[9px] font-bold leading-none"
              title="How is this calculated?"
            >
              ?
            </button>
          </div>
          <div className="text-sm font-bold text-[var(--th-text)] font-mono mt-0.5">
            ${rangeLow.toFixed(0)} – ${rangeHigh.toFixed(0)}
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="mx-5 mb-2 p-3 rounded-lg bg-[var(--th-hover)] border border-[var(--th-border)] text-xs text-[var(--th-text-secondary)] space-y-2">
          <div className="font-semibold text-[var(--th-text)] text-[11px]">How Fair Value Is Calculated</div>
          <p>
            The fair value estimate of <span className="text-[var(--th-text)] font-mono font-semibold">${fairValue.toFixed(2)}</span> is
            derived from a <span className="text-[var(--th-text)]">Discounted Cash Flow (DCF)</span> model, which projects a
            company&apos;s future free cash flows and discounts them back to present value using a
            weighted average cost of capital (WACC).
          </p>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-green-400">Undervalued</span>
              <span className="text-[var(--th-text-muted)]">Price more than 20% below DCF (&lt; ${rangeLow.toFixed(0)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">Fair Value</span>
              <span className="text-[var(--th-text-muted)]">Within ±20% of DCF (${rangeLow.toFixed(0)} – ${rangeHigh.toFixed(0)})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">Overvalued</span>
              <span className="text-[var(--th-text-muted)]">Price more than 20% above DCF (&gt; ${rangeHigh.toFixed(0)})</span>
            </div>
          </div>
          <p className="text-[10px] text-[var(--th-text-faint)] italic">
            A stock is considered undervalued or overvalued once its price crosses the ±20% threshold from the DCF estimate. Within that band, the price is considered fairly valued.
          </p>
        </div>
      )}

      <div className="px-5 pt-2 pb-1">
        <svg width="100%" viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" className="block overflow-visible">
          <defs>
            <clipPath id="chartClip"><rect x="0" y="20" width={W} height="90" rx="4" /></clipPath>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#7f1d1d" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" strokeWidth="2.5" />
            </pattern>
          </defs>

          {/* Percentage callout above */}
          <text x={pricePx} y="16" textAnchor="middle" fill={statusColor} fontSize="9" fontWeight="bold">
            {statusLabel}
          </text>

          {/* Zone backgrounds */}
          <g clipPath="url(#chartClip)">
            <rect x="0" y="20" width={zoneW} height="90" fill="#166534" />
            <rect x={zoneW} y="20" width={zoneW} height="90" fill="#a16207" />
            <rect x={zoneW * 2} y="20" width={zoneW} height="90" fill="url(#hatch)" />
          </g>
          <rect x="0" y="20" width={W} height="90" rx="4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Price bar - green */}
          <rect x="4" y={priceBarY} width={Math.max(pricePx - 8, 24)} height={barH} rx="2" fill="#4ade80" />
          <rect x="4" y={priceBarY} width={Math.max(pricePx - 8, 24)} height={barH} rx="2" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          {/* Price label */}
          <text x={Math.min(pricePx - 12, W - 60)} y={priceBarY + 12} textAnchor="end" fill="white" fontSize="8" fontWeight="600">Current Price</text>
          <text x={Math.min(pricePx - 12, W - 60)} y={priceBarY + 24} textAnchor="end" fill="white" fontSize="12" fontWeight="bold" fontFamily="monospace">${price.toFixed(2)}</text>
          {/* Price endpoint line */}
          <line x1={pricePx} y1={priceBarY - 4} x2={pricePx} y2={priceBarY + barH + 4} stroke="white" strokeWidth="1.5" />

          {/* Fair Value bar - dark green */}
          <rect x="4" y={fairBarY} width={Math.max(fairPx - 8, 24)} height={barH} rx="2" fill="#15803d" />
          <rect x="4" y={fairBarY} width={Math.max(fairPx - 8, 24)} height={barH} rx="2" fill="none" stroke="#22c55e" strokeWidth="1.5" />
          {/* Fair value label */}
          <text x={Math.min(fairPx - 12, W - 60)} y={fairBarY + 12} textAnchor="end" fill="white" fontSize="8" fontWeight="600">Fair Value</text>
          <text x={Math.min(fairPx - 12, W - 60)} y={fairBarY + 24} textAnchor="end" fill="white" fontSize="12" fontWeight="bold" fontFamily="monospace">${fairValue.toFixed(2)}</text>
          {/* Fair value endpoint line */}
          <line x1={fairPx} y1={fairBarY - 4} x2={fairPx} y2={fairBarY + barH + 4} stroke="#67e8f9" strokeWidth="1.5" />

          {/* Zone boundary lines */}
          <line x1={zoneW} y1="20" x2={zoneW} y2="110" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1={zoneW * 2} y1="20" x2={zoneW * 2} y2="110" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

          {/* Zone labels */}
          <text x={zoneW / 2} y="126" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="600" letterSpacing="0.08em">UNDERVALUED</text>
          <text x={zoneW * 1.5} y="126" textAnchor="middle" fill="#eab308" fontSize="8" fontWeight="600" letterSpacing="0.08em">FAIR VALUE</text>
          <text x={zoneW * 2.5} y="126" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="600" letterSpacing="0.08em">OVERVALUED</text>
        </svg>
      </div>
    </div>
  );
}
