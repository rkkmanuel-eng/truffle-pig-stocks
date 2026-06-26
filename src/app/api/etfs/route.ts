import { NextResponse } from "next/server";
import { ETF_SYMBOLS, ETF_META, upsertEtf } from "@/lib/etfs";

const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/api/v3";

async function fetchJson<T>(url: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apikey=${API_KEY}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  return res.json();
}

interface FMPEtfProfile {
  symbol: string;
  companyName: string;
  price: number;
  mktCap: number;
  volAvg: number;
}

interface FMPEtfHolder {
  symbol: string;
  totalAssets: number;
  expenseRatio: number;
}

interface FMPEtfPerformance {
  ytd: number;
}

export async function POST() {
  if (!API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const metaMap = new Map(ETF_META.map((e) => [e.symbol, e]));
  const results: string[] = [];
  const batchSize = 5;

  for (let i = 0; i < ETF_SYMBOLS.length; i += batchSize) {
    const batch = ETF_SYMBOLS.slice(i, i + batchSize);

    try {
      const profiles = await fetchJson<FMPEtfProfile[]>(
        `${BASE_URL}/profile/${batch.join(",")}`
      );

      for (const profile of profiles) {
        try {
          let totalAssets: number | null = null;
          let expenseRatio: number | null = null;
          let ytdReturn: number | null = null;

          try {
            const holders = await fetchJson<FMPEtfHolder[]>(
              `${BASE_URL}/etf-holder/${profile.symbol}`
            );
            if (holders[0]) {
              totalAssets = holders[0].totalAssets ?? null;
              expenseRatio = holders[0].expenseRatio ?? null;
            }
          } catch {}

          try {
            const perf = await fetchJson<FMPEtfPerformance[]>(
              `${BASE_URL}/stock-price-change/${profile.symbol}`
            );
            if (perf[0]) {
              ytdReturn = perf[0].ytd ?? null;
            }
          } catch {}

          const meta = metaMap.get(profile.symbol);

          upsertEtf({
            symbol: profile.symbol,
            name: profile.companyName || meta?.name || profile.symbol,
            category: meta?.category || "Other",
            price: profile.price ?? null,
            aum: totalAssets ?? profile.mktCap ?? null,
            expense_ratio: expenseRatio,
            ytd_return: ytdReturn,
            avg_volume: profile.volAvg ?? null,
          });

          results.push(profile.symbol);
        } catch (err) {
          console.error(`Failed to fetch ETF data for ${profile.symbol}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ETF profiles for batch:`, batch, err);
    }
  }

  return NextResponse.json({ updated: results.length, symbols: results });
}
