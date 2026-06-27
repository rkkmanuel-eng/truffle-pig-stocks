import { NextResponse } from "next/server";
import { getQuote, getProfile, getRatiosTTM, getDCF } from "@/lib/fmp";
import { upsertStock, getStockBySymbol, getStockCount } from "@/lib/db";
import { DOW_SYMBOLS } from "@/lib/fmp";

export async function GET() {
  const symbol = "AAPL";
  const steps: string[] = [];

  try {
    steps.push(`FMP_API_KEY set: ${!!process.env.FMP_API_KEY}`);

    const quote = await getQuote(symbol);
    steps.push(`quote: ${quote ? `price=${quote.price}` : "null"}`);

    const ratios = await getRatiosTTM(symbol).catch(() => null);
    steps.push(`ratios: ${ratios ? `pe=${ratios.priceToEarningsRatioTTM}` : "null"}`);

    const dcf = await getDCF(symbol);
    steps.push(`dcf: ${dcf}`);

    const profile = await getProfile(symbol);
    steps.push(`profile: ${profile ? profile.companyName : "null"}`);

    if (quote) {
      upsertStock({
        symbol,
        name: profile?.companyName ?? symbol,
        sector: profile?.sector ?? null,
        price: quote.price,
        pe_ratio: ratios?.priceToEarningsRatioTTM ?? null,
        pb_ratio: ratios?.priceToBookRatioTTM ?? null,
        debt_equity_ratio: ratios?.debtToEquityRatioTTM ?? null,
        current_ratio: ratios?.currentRatioTTM ?? null,
        dividend_yield: ratios?.dividendYieldTTM ?? null,
        payout_ratio: ratios?.dividendPayoutRatioTTM ?? null,
        sma_50: quote.priceAvg50 ?? null,
        sma_200: quote.priceAvg200 ?? null,
        dcf_value: dcf,
        peg_ratio: ratios?.priceToEarningsGrowthRatioTTM ?? null,
        market_cap: quote.marketCap ?? null,
        beta: profile?.beta ?? null,
        volume_avg: profile?.averageVolume ?? null,
        eps: ratios?.netIncomePerShareTTM ?? null,
        week52_high: quote.yearHigh ?? null,
        week52_low: quote.yearLow ?? null,
        industry: profile?.industry ?? null,
        exchange: profile?.exchange ?? null,
        is_dow: DOW_SYMBOLS.includes(symbol) ? 1 : 0,
        created_at: null,
      });
      steps.push("upsert: success");
    }

    const verify = getStockBySymbol(symbol);
    steps.push(`verify: price=${verify?.price}, name=${verify?.name}`);
    steps.push(`total stocks: ${getStockCount()}`);

    return NextResponse.json({ ok: true, steps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push(`ERROR: ${msg}`);
    return NextResponse.json({ ok: false, steps }, { status: 500 });
  }
}
