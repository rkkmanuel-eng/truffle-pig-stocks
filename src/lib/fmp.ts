const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/stable";

export interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  price: number;
  industry: string;
  marketCap: number;
  beta: number;
  averageVolume: number;
  range: string;
  exchange: string;
  lastDividend: number;
  isEtf: boolean;
  isFund: boolean;
  isAdr: boolean;
  isActivelyTrading: boolean;
}

export interface FMPRatios {
  priceToEarningsRatioTTM: number;
  priceToBookRatioTTM: number;
  debtToEquityRatioTTM: number;
  currentRatioTTM: number;
  dividendYieldTTM: number;
  dividendPayoutRatioTTM: number;
  priceToEarningsGrowthRatioTTM: number;
  netIncomePerShareTTM: number;
}

export interface FMPQuote {
  symbol: string;
  price: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  yearHigh: number;
  yearLow: number;
  volume: number;
}

async function fetchJson<T>(url: string, noCache = false): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apikey=${API_KEY}`, {
    cache: noCache ? "no-store" : undefined,
    next: noCache ? undefined : { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  return res.json();
}

export async function getProfile(symbol: string, noCache = false): Promise<FMPProfile | null> {
  const data = await fetchJson<FMPProfile[]>(`${BASE_URL}/profile?symbol=${symbol}`, noCache);
  return data[0] ?? null;
}

export async function getQuote(symbol: string, noCache = false): Promise<FMPQuote | null> {
  const data = await fetchJson<FMPQuote[]>(`${BASE_URL}/quote?symbol=${symbol}`, noCache);
  return data[0] ?? null;
}

export async function getRatiosTTM(symbol: string, noCache = false): Promise<FMPRatios | null> {
  const data = await fetchJson<FMPRatios[]>(`${BASE_URL}/ratios-ttm?symbol=${symbol}`, noCache);
  return data[0] ?? null;
}

export async function getDCF(symbol: string, noCache = false): Promise<number | null> {
  try {
    const data = await fetchJson<{ dcf: number }[]>(`${BASE_URL}/discounted-cash-flow?symbol=${symbol}`, noCache);
    return data[0]?.dcf ?? null;
  } catch {
    return null;
  }
}

export interface FMPDividendEntry {
  date: string;
  adjDividend: number;
  dividend: number;
}

export async function getDividendHistory(symbol: string): Promise<FMPDividendEntry[]> {
  try {
    const data = await fetchJson<{ historical: FMPDividendEntry[] }>(
      `${BASE_URL}/historical-price-full/stock_dividend?symbol=${symbol}`
    );
    return data.historical ?? [];
  } catch {
    return [];
  }
}

export function calculateDividendStreak(history: FMPDividendEntry[]): number {
  if (history.length === 0) return 0;

  const yearlyTotals = new Map<number, number>();
  for (const entry of history) {
    const year = new Date(entry.date).getFullYear();
    yearlyTotals.set(year, (yearlyTotals.get(year) ?? 0) + (entry.adjDividend ?? entry.dividend));
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from(yearlyTotals.keys()).sort((a, b) => b - a);

  if (years.length < 2) return 0;

  let streak = 0;

  for (let i = 0; i < years.length - 1; i++) {
    const thisYear = years[i];
    const prevYear = years[i + 1];

    if (thisYear - prevYear !== 1) break;

    const thisTotal = yearlyTotals.get(thisYear)!;
    const prevTotal = yearlyTotals.get(prevYear)!;

    if (thisYear === currentYear && i === 0) {
      continue;
    }

    if (thisTotal > prevTotal) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function searchSymbols(query: string, exchange: string): Promise<{ symbol: string; name: string }[]> {
  try {
    const data = await fetchJson<{ symbol: string; name: string }[]>(
      `${BASE_URL}/search-symbol?query=${query}&exchange=${exchange}&limit=500`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function discoverUSStocks(): Promise<string[]> {
  const allSymbols = new Set<string>();
  const exchanges = ["NYSE", "NASDAQ", "AMEX"];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (const exchange of exchanges) {
    for (const letter of letters) {
      const results = await searchSymbols(letter, exchange);
      for (const r of results) {
        if (!r.symbol.includes(".") && !r.symbol.includes("-") && !r.symbol.startsWith("^")) {
          allSymbols.add(r.symbol);
        }
      }
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return [...allSymbols].sort();
}

export const DOW_SYMBOLS = [
  "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
  "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
  "MSFT", "NKE", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
];

import { STOCK_UNIVERSE } from "./stock-universe";

export const SP500_SAMPLE = STOCK_UNIVERSE;

export async function getAllTrackedSymbols(): Promise<string[]> {
  return STOCK_UNIVERSE;
}
