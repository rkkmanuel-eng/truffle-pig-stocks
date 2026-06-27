import { NextResponse } from "next/server";
import { upsertStock, getStockCount, getAllStockSymbols, getStockBySymbol } from "@/lib/db";
import { getProfile, getQuote, getRatiosTTM, getDCF, SP500_SAMPLE, DOW_SYMBOLS } from "@/lib/fmp";

export const maxDuration = 900;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST() {
  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const dbSymbols = getAllStockSymbols();
  const symbols = dbSymbols.length > 0 ? dbSymbols : SP500_SAMPLE;
  const startTime = Date.now();
  const results: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      const [quote, ratios, dcfValue] = await Promise.all([
        getQuote(symbol),
        getRatiosTTM(symbol).catch(() => null),
        getDCF(symbol),
      ]);

      if (!quote) {
        errors.push(symbol);
        continue;
      }

      const existing = getStockBySymbol(symbol);
      const needsProfile = !existing || !existing.sector || existing.name === symbol;
      const profile = needsProfile ? await getProfile(symbol) : null;

      upsertStock({
        symbol,
        name: profile?.companyName ?? existing?.name ?? symbol,
        sector: profile?.sector ?? existing?.sector ?? null,
        price: quote.price,
        pe_ratio: ratios?.priceToEarningsRatioTTM ?? null,
        pb_ratio: ratios?.priceToBookRatioTTM ?? null,
        debt_equity_ratio: ratios?.debtToEquityRatioTTM ?? null,
        current_ratio: ratios?.currentRatioTTM ?? null,
        dividend_yield: ratios?.dividendYieldTTM ?? null,
        payout_ratio: ratios?.dividendPayoutRatioTTM ?? null,
        sma_50: quote.priceAvg50 ?? null,
        sma_200: quote.priceAvg200 ?? null,
        dcf_value: dcfValue,
        peg_ratio: ratios?.priceToEarningsGrowthRatioTTM ?? null,
        market_cap: quote.marketCap ?? null,
        beta: profile?.beta ?? existing?.beta ?? null,
        volume_avg: profile?.averageVolume ?? existing?.volume_avg ?? null,
        eps: ratios?.netIncomePerShareTTM ?? null,
        week52_high: quote.yearHigh ?? null,
        week52_low: quote.yearLow ?? null,
        industry: profile?.industry ?? existing?.industry ?? null,
        exchange: profile?.exchange ?? existing?.exchange ?? null,
        is_dow: DOW_SYMBOLS.includes(symbol) ? 1 : 0,
        created_at: null,
      });

      results.push(symbol);
    } catch (err) {
      errors.push(symbol);
      console.error(`[stocks] Failed: ${symbol}`, err);
    }

    if ((i + 1) % 3 === 0 && i + 1 < symbols.length) {
      await sleep(1200);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 840) {
      console.log(`[stocks] Time limit at ${i + 1}/${symbols.length}`);
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    updated: results.length,
    failed: errors.length,
    total: getStockCount(),
    totalTracked: symbols.length,
    durationSeconds: duration,
  });
}

export async function GET() {
  return NextResponse.json({ total: getStockCount() });
}
