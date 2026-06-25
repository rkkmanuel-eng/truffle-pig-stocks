import { NextResponse } from "next/server";
import { upsertStock, getStockCount } from "@/lib/db";
import { getProfiles, getRatiosTTM, getSMA, SP500_SAMPLE, DOW_SYMBOLS } from "@/lib/fmp";

export async function POST() {
  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const results: string[] = [];
  const batchSize = 5;

  for (let i = 0; i < SP500_SAMPLE.length; i += batchSize) {
    const batch = SP500_SAMPLE.slice(i, i + batchSize);

    try {
      const profiles = await getProfiles(batch);

      for (const profile of profiles) {
        try {
          const [ratios, sma50, sma200] = await Promise.all([
            getRatiosTTM(profile.symbol),
            getSMA(profile.symbol, 50),
            getSMA(profile.symbol, 200),
          ]);

          upsertStock({
            symbol: profile.symbol,
            name: profile.companyName,
            sector: profile.sector,
            price: profile.price,
            pe_ratio: ratios?.peRatioTTM ?? null,
            pb_ratio: ratios?.priceToBookRatioTTM ?? null,
            debt_equity_ratio: ratios?.debtEquityRatioTTM ?? null,
            current_ratio: ratios?.currentRatioTTM ?? null,
            dividend_yield: ratios?.dividendYieldTTM ?? null,
            payout_ratio: ratios?.payoutRatioTTM ?? null,
            sma_50: sma50,
            sma_200: sma200,
            is_dow: DOW_SYMBOLS.includes(profile.symbol) ? 1 : 0,
          });

          results.push(profile.symbol);
        } catch (err) {
          console.error(`Failed to fetch data for ${profile.symbol}:`, err);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch profiles for batch:`, batch, err);
    }
  }

  return NextResponse.json({
    updated: results.length,
    symbols: results,
    total: getStockCount(),
  });
}

export async function GET() {
  return NextResponse.json({ total: getStockCount() });
}
