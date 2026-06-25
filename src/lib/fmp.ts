const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/api/v3";

export interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  price: number;
  industry: string;
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
  return fetchJson<FMPProfile[]>(`${BASE_URL}/profile/${batch}`);
}

export async function getRatiosTTM(symbol: string): Promise<FMPRatios | null> {
  const data = await fetchJson<FMPRatios[]>(`${BASE_URL}/ratios-ttm/${symbol}`);
  return data[0] ?? null;
}

export async function getSMA(symbol: string, period: number): Promise<number | null> {
  const data = await fetchJson<FMPTechnical[]>(
    `${BASE_URL}/technical_indicator/daily/${symbol}?period=${period}&type=sma`
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
