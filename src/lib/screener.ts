import { StockRow, getAllStocks, getDowStocks, recordQualification, removeQualification, getQualifications } from "./db";
import { Strategy, StrategyCriterion, meetsThreshold } from "./strategies";

export interface ScreenedStock {
  symbol: string;
  name: string;
  sector: string | null;
  price: number | null;
  metrics: Record<string, number | null>;
  passing: Record<string, boolean>;
  passesAll: boolean;
  qualifiedSince: string | null;
  createdAt: string | null;
}

function getMetricValue(stock: StockRow, metric: string): number | null {
  switch (metric) {
    case "peRatio":
      return stock.pe_ratio;
    case "pbRatio":
      return stock.pb_ratio;
    case "debtEquityRatio":
      return stock.debt_equity_ratio;
    case "currentRatio":
      return stock.current_ratio;
    case "dividendYield":
      return stock.dividend_yield != null ? stock.dividend_yield * 100 : null;
    case "payoutRatio":
      return stock.payout_ratio != null ? stock.payout_ratio * 100 : null;
    case "priceAbove200SMA":
      if (stock.price == null || stock.sma_200 == null) return null;
      return stock.price > stock.sma_200 ? 1 : 0;
    case "sma50Above200":
      if (stock.sma_50 == null || stock.sma_200 == null) return null;
      return stock.sma_50 > stock.sma_200 ? 1 : 0;
    case "pctFrom52Low":
      if (stock.price == null || stock.week52_low == null || stock.week52_low === 0) return null;
      return ((stock.price - stock.week52_low) / stock.week52_low) * 100;
    case "pctBelow52High":
      if (stock.price == null || stock.week52_high == null || stock.week52_high === 0) return null;
      return ((stock.week52_high - stock.price) / stock.week52_high) * 100;
    case "beta":
      return stock.beta;
    default:
      return null;
  }
}

export function screenStocks(strategy: Strategy, bufferPercent: number = 0, minMarketCap?: number): ScreenedStock[] {
  const stocks = strategy.slug === "dogs-of-the-dow" ? getDowStocks(minMarketCap) : getAllStocks(minMarketCap);
  const qualifications = getQualifications(strategy.slug);

  const screened: ScreenedStock[] = stocks.map((stock) => {
    const metrics: Record<string, number | null> = {};
    const passing: Record<string, boolean> = {};

    for (const criterion of strategy.criteria) {
      const value = getMetricValue(stock, criterion.metric);
      metrics[criterion.metric] = value;
      passing[criterion.metric] = value != null && meetsThreshold(value, criterion, bufferPercent);
    }

    const passesAll = Object.values(passing).every(Boolean);

    if (passesAll && !qualifications[stock.symbol]) {
      recordQualification(stock.symbol, strategy.slug);
      qualifications[stock.symbol] = new Date().toISOString();
    } else if (!passesAll && qualifications[stock.symbol]) {
      removeQualification(stock.symbol, strategy.slug);
      delete qualifications[stock.symbol];
    }

    return {
      symbol: stock.symbol,
      name: stock.name,
      sector: stock.sector,
      price: stock.price,
      metrics,
      passing,
      passesAll,
      qualifiedSince: qualifications[stock.symbol] ?? null,
      createdAt: stock.created_at ?? null,
    };
  });

  if (strategy.slug === "dogs-of-the-dow") {
    return screened.slice(0, 10);
  }

  return screened
    .filter((s) => s.passesAll)
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function checkAlertCondition(
  stock: StockRow,
  criteria: StrategyCriterion[],
  bufferPercent: number
): { triggered: boolean; details: string[] } {
  const details: string[] = [];
  let triggered = true;

  for (const criterion of criteria) {
    const value = getMetricValue(stock, criterion.metric);
    if (value == null) {
      triggered = false;
      continue;
    }
    const passes = meetsThreshold(value, criterion, bufferPercent);
    if (passes) {
      details.push(`${criterion.label}: ${value.toFixed(2)} (threshold: ${criterion.threshold})`);
    } else {
      triggered = false;
    }
  }

  return { triggered, details };
}
