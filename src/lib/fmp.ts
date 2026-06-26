const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/stable";

export interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  price: number;
  industry: string;
  mktCap: number;
  beta: number;
  volAvg: number;
  range: string;
  exchangeShortName: string;
  lastDiv: number;
}

export interface FMPRatios {
  peRatioTTM: number;
  priceToBookRatioTTM: number;
  debtEquityRatioTTM: number;
  currentRatioTTM: number;
  dividendYieldTTM: number;
  payoutRatioTTM: number;
}

export interface FMPTechnical {
  close: number;
  sma: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apikey=${API_KEY}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  return res.json();
}

export async function getProfiles(symbols: string[]): Promise<FMPProfile[]> {
  if (symbols.length === 0) return [];
  const batch = symbols.join(",");
  return fetchJson<FMPProfile[]>(`${BASE_URL}/profile?symbol=${batch}`);
}

export async function getRatiosTTM(symbol: string): Promise<FMPRatios | null> {
  const data = await fetchJson<FMPRatios[]>(`${BASE_URL}/ratios-ttm?symbol=${symbol}`);
  return data[0] ?? null;
}

export interface FMPKeyMetrics {
  peRatioTTM: number;
  epsTTM: number;
}

export async function getKeyMetricsTTM(symbol: string): Promise<FMPKeyMetrics | null> {
  const data = await fetchJson<FMPKeyMetrics[]>(`${BASE_URL}/key-metrics-ttm?symbol=${symbol}`);
  return data[0] ?? null;
}

export async function getDCF(symbol: string): Promise<number | null> {
  try {
    const data = await fetchJson<{ dcf: number }[]>(`${BASE_URL}/discounted-cash-flow?symbol=${symbol}`);
    return data[0]?.dcf ?? null;
  } catch {
    return null;
  }
}

export async function getPEGRatio(symbol: string): Promise<number | null> {
  try {
    const data = await fetchJson<{ pegRatio: number }[]>(`${BASE_URL}/key-metrics-ttm?symbol=${symbol}`);
    return (data[0] as Record<string, number>)?.pegRatioTTM ?? null;
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
  const startYear = years[0] === currentYear ? years[0] : years[0];

  for (let i = 0; i < years.length - 1; i++) {
    const thisYear = years[i];
    const prevYear = years[i + 1];

    if (thisYear - prevYear !== 1) break;

    const thisTotal = yearlyTotals.get(thisYear)!;
    const prevTotal = yearlyTotals.get(prevYear)!;

    // Current year may be partial — skip the comparison but don't break
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

export async function getSMA(symbol: string, period: number): Promise<number | null> {
  const data = await fetchJson<FMPTechnical[]>(
    `${BASE_URL}/technical_indicator/daily?symbol=${symbol}&period=${period}&type=sma`
  );
  return data[0]?.sma ?? null;
}

export const DOW_SYMBOLS = [
  "AAPL", "AMGN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS", "DOW",
  "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
  "MSFT", "NKE", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WBA", "WMT",
];

export const SP500_SAMPLE = [
  ...DOW_SYMBOLS,
  "GOOGL", "AMZN", "META", "TSLA", "NVDA", "BRK-B", "LLY", "AVGO", "XOM",
  "PEP", "COST", "ADBE", "NFLX", "AMD", "QCOM", "INTC", "CMCSA", "TXN",
  "PM", "ABT", "DHR", "NEE", "LIN", "BMY", "ORCL", "ACN", "MDT", "COP",
  "LOW", "T", "SCHW", "MS", "BLK", "GILD", "AMAT", "ADP", "PFE", "C",
  "USB", "SO", "DUK", "EMR", "CL", "APD", "ITW", "MMC", "GD", "FDX",
];
