import { NextRequest, NextResponse } from "next/server";
import { upsertStock, getStockCount } from "@/lib/db";
import {
  getProfiles,
  getRatiosTTM,
  getKeyMetricsTTM,
  getSMA,
  getDCF,
  getPEGRatio,
  SP500_SAMPLE,
  DOW_SYMBOLS,
} from "@/lib/fmp";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const startTime = Date.now();
  const results: string[] = [];
  const errors: string[] = [];
  const batchSize = 5;

  for (let i = 0; i < SP500_SAMPLE.length; i += batchSize) {
    const batch = SP500_SAMPLE.slice(i, i + batchSize);

    try {
      const profiles = await getProfiles(batch);

      for (const profile of profiles) {
        try {
          const [ratios, keyMetrics, sma50, sma200, dcfValue, pegRatio] =
            await Promise.all([
              getRatiosTTM(profile.symbol),
              getKeyMetricsTTM(profile.symbol),
              getSMA(profile.symbol, 50),
              getSMA(profile.symbol, 200),
              getDCF(profile.symbol),
              getPEGRatio(profile.symbol),
            ]);

          const rangeParts = profile.range?.split("-").map(Number);
          const week52Low = rangeParts?.[0] || null;
          const week52High = rangeParts?.[1] || null;

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
            dcf_value: dcfValue,
            peg_ratio: pegRatio,
            market_cap: profile.mktCap ?? null,
            beta: profile.beta ?? null,
            volume_avg: profile.volAvg ?? null,
            eps: keyMetrics?.epsTTM ?? null,
            week52_high: week52High,
            week52_low: week52Low,
            industry: profile.industry ?? null,
            exchange: profile.exchangeShortName ?? null,
            is_dow: DOW_SYMBOLS.includes(profile.symbol) ? 1 : 0,
            created_at: null,
          });

          results.push(profile.symbol);
        } catch (err) {
          errors.push(profile.symbol);
          console.error(`[cron] Failed: ${profile.symbol}`, err);
        }
      }
    } catch (err) {
      errors.push(...batch);
      console.error(`[cron] Batch failed:`, batch, err);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    ok: true,
    updated: results.length,
    failed: errors.length,
    total: getStockCount(),
    durationSeconds: duration,
    errors: errors.length > 0 ? errors : undefined,
  });
}
