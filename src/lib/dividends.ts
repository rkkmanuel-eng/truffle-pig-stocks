import { StockRow, getAllStocks, getAllDividendStreaks } from "./db";

export type DividendTier = "king" | "aristocrat" | "challenger";

export interface DividendTierMeta {
  slug: DividendTier;
  name: string;
  description: string;
  yearsLabel: string;
}

export const DIVIDEND_TIERS: DividendTierMeta[] = [
  {
    slug: "king",
    name: "Dividend Kings",
    description: "50+ consecutive years of dividend increases — the most elite dividend track records.",
    yearsLabel: "50+ years",
  },
  {
    slug: "aristocrat",
    name: "Dividend Aristocrats",
    description: "25–49 consecutive years of dividend increases — S&P 500 members with proven staying power.",
    yearsLabel: "25–49 years",
  },
  {
    slug: "challenger",
    name: "Dividend Challengers",
    description: "10–24 consecutive years of dividend increases — building a track record of reliable growth.",
    yearsLabel: "10–24 years",
  },
];

// Fallback data used when DB has no streak records yet
const FALLBACK_STREAKS: Record<string, number> = {
  PG: 68, EMR: 67, MMM: 65, KO: 62, JNJ: 62, CL: 61,
  LOW: 52, ABT: 52, ITW: 51, PEP: 52, WMT: 51,
  MCD: 48, ADP: 49, SHW: 46, MDT: 46, XOM: 41, APD: 41,
  CVX: 37, NEE: 29, GD: 32, CAT: 30, LIN: 31, BDX: 28,
  MSFT: 22, HD: 16, CSCO: 13, TXN: 21, AMGN: 13, BLK: 15,
  USB: 14, SO: 23, DUK: 19, HON: 14, ACN: 19, MMC: 15,
  COST: 20, AVGO: 14, QCOM: 21, NKE: 22, V: 16, UNH: 15,
  TRV: 20, PM: 16, JPM: 14, MRK: 13,
};

function getStreakData(): Record<string, number> {
  const dbStreaks = getAllDividendStreaks();
  if (Object.keys(dbStreaks).length > 0) return dbStreaks;
  return FALLBACK_STREAKS;
}

export function getDividendStreak(symbol: string): number {
  return getStreakData()[symbol] ?? 0;
}

function getTier(years: number): DividendTier | null {
  if (years >= 50) return "king";
  if (years >= 25) return "aristocrat";
  if (years >= 10) return "challenger";
  return null;
}

export interface DividendStock {
  symbol: string;
  name: string;
  price: number | null;
  dividendYield: number | null;
  streakYears: number;
  createdAt: string | null;
}

export interface DividendTierResult {
  meta: DividendTierMeta;
  stocks: DividendStock[];
}

export function getDividendTiers(): DividendTierResult[] {
  const allStocks = getAllStocks();
  const stockMap = new Map<string, StockRow>();
  for (const s of allStocks) stockMap.set(s.symbol, s);

  const streakData = getStreakData();

  return DIVIDEND_TIERS.map((meta) => {
    const stocks: DividendStock[] = [];

    for (const [symbol, years] of Object.entries(streakData)) {
      if (getTier(years) !== meta.slug) continue;
      const stock = stockMap.get(symbol);
      if (!stock) continue;
      stocks.push({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        dividendYield: stock.dividend_yield,
        streakYears: years,
        createdAt: stock.created_at ?? null,
      });
    }

    stocks.sort((a, b) => b.streakYears - a.streakYears);
    return { meta, stocks };
  });
}
