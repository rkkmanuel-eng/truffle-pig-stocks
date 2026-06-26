import { NextResponse } from "next/server";
import { upsertStock, getStockCount, getAllStockSymbols } from "@/lib/db";
import { getProfile, getQuote, getRatiosTTM, getDCF, SP500_SAMPLE, DOW_SYMBOLS } from "@/lib/fmp";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const dbSymbols = getAllStockSymbols();
  const symbols = dbSymbols.length > 0 ? dbSymbols : SP500_SAMPLE;
  const results: string[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      const [profile, quote, ratios, dcfValue] = await Promise.all([
        getProfile(symbol).catch(() => null),
        getQuote(symbol).catch(() => null),
        getRatiosTTM(symbol).catch(() => null),
        getDCF(symbol),
      ]);

      if (!profile && !quote) continue;

      upsertStock({
        symbol,
        name: profile?.companyName ?? symbol,
        sector: profile?.sector ?? null,
        price: quote?.price ?? profile?.price ?? null,
        pe_ratio: ratios?.priceToEarningsRatioTTM ?? null,
        pb_ratio: ratios?.priceToBookRatioTTM ?? null,
        debt_equity_ratio: ratios?.debtToEquityRatioTTM ?? null,
        current_ratio: ratios?.currentRatioTTM ?? null,
        dividend_yield: ratios?.dividendYieldTTM ?? null,
        payout_ratio: ratios?.dividendPayoutRatioTTM ?? null,
        sma_50: quote?.priceAvg50 ?? null,
        sma_200: quote?.priceAvg200 ?? null,
        dcf_value: dcfValue,
        peg_ratio: ratios?.priceToEarningsGrowthRatioTTM ?? null,
        market_cap: quote?.marketCap ?? profile?.marketCap ?? null,
        beta: profile?.beta ?? null,
        volume_avg: profile?.averageVolume ?? null,
        eps: ratios?.netIncomePerShareTTM ?? null,
        week52_high: quote?.yearHigh ?? null,
        week52_low: quote?.yearLow ?? null,
        industry: profile?.industry ?? null,
        exchange: profile?.exchange ?? null,
        is_dow: DOW_SYMBOLS.includes(symbol) ? 1 : 0,
        created_at: null,
      });

      results.push(symbol);
    } catch (err) {
      console.error(`Failed to fetch data for ${symbol}:`, err);
    }

    if ((i + 1) % 3 === 0 && i + 1 < symbols.length) {
      await sleep(4000);
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
