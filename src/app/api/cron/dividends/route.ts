import { NextRequest, NextResponse } from "next/server";
import { upsertDividendStreak, getAllStockSymbols } from "@/lib/db";
import { getDividendHistory, calculateDividendStreak, SP500_SAMPLE } from "@/lib/fmp";

export const maxDuration = 900;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const dbSymbols = getAllStockSymbols();
  const symbols = dbSymbols.length > 0 ? dbSymbols : SP500_SAMPLE;
  const startTime = Date.now();
  const results: { symbol: string; streak: number }[] = [];
  const errors: string[] = [];
  let processed = 0;

  for (const symbol of symbols) {
    try {
      const history = await getDividendHistory(symbol);
      const streak = calculateDividendStreak(history);
      upsertDividendStreak(symbol, streak);
      if (streak >= 10) {
        results.push({ symbol, streak });
      }
    } catch (err) {
      errors.push(symbol);
      console.error(`[cron/dividends] Failed: ${symbol}`, err);
    }

    processed++;
    if (processed % 5 === 0) {
      await sleep(4000);
    }
  }

  results.sort((a, b) => b.streak - a.streak);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    ok: true,
    processed: symbols.length,
    qualifyingStreaks: results.length,
    failed: errors.length,
    durationSeconds: duration,
    topStreaks: results.slice(0, 20),
    errors: errors.length > 0 ? errors : undefined,
  });
}
