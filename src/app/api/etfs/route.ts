import { NextResponse } from "next/server";
import { ETF_SYMBOLS, ETF_META, upsertEtf } from "@/lib/etfs";

const API_KEY = process.env.FMP_API_KEY || "";
const BASE_URL = "https://financialmodelingprep.com/stable";

async function fetchJson<T>(url: string): Promise<T> {
  const separator = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${separator}apikey=${API_KEY}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  if (!API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const metaMap = new Map(ETF_META.map((e) => [e.symbol, e]));
  const results: string[] = [];

  for (let i = 0; i < ETF_SYMBOLS.length; i++) {
    const symbol = ETF_SYMBOLS[i];
    try {
      const profiles = await fetchJson<any[]>(
        `${BASE_URL}/profile?symbol=${symbol}`
      );
      const profile = profiles[0];
      if (!profile) continue;

      let ytdReturn: number | null = null;

      try {
        const perf = await fetchJson<any[]>(
          `${BASE_URL}/stock-price-change?symbol=${symbol}`
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
        aum: profile.marketCap ?? null,
        expense_ratio: null,
        ytd_return: ytdReturn,
        avg_volume: profile.averageVolume ?? null,
      });

      results.push(profile.symbol);
    } catch (err) {
      console.error(`Failed to fetch ETF data for ${symbol}:`, err);
    }

    if (i + 1 < ETF_SYMBOLS.length) await sleep(600);
  }

  return NextResponse.json({ updated: results.length, symbols: results });
}
