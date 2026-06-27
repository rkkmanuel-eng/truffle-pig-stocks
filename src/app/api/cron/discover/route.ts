import { NextRequest, NextResponse } from "next/server";
import { getDb, getAllStockSymbols } from "@/lib/db";
import { searchSymbols, getQuote } from "@/lib/fmp";

export const maxDuration = 900;

const MIN_MARKET_CAP = 300_000_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = req.nextUrl.searchParams.get("secret");
    const authorized =
      authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not set" }, { status: 500 });
  }

  const existingSymbols = new Set(getAllStockSymbols());
  const startTime = Date.now();
  const candidates = new Set<string>();

  const exchanges = ["NYSE", "NASDAQ", "AMEX"];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  for (const exchange of exchanges) {
    for (const letter of letters) {
      try {
        const results = await searchSymbols(letter, exchange);
        for (const r of results) {
          if (
            !r.symbol.includes(".") &&
            !r.symbol.includes("-") &&
            !r.symbol.startsWith("^") &&
            !existingSymbols.has(r.symbol)
          ) {
            candidates.add(r.symbol);
          }
        }
      } catch {}
      await sleep(150);
    }
  }

  console.log(`[discover] Found ${candidates.size} new candidate symbols`);

  const db = getDb();
  const insertStock = db.prepare(
    "INSERT OR IGNORE INTO stocks (symbol, name, is_dow) VALUES (?, ?, 0)"
  );
  let qualified = 0;
  let checked = 0;

  for (const symbol of candidates) {
    try {
      const quote = await getQuote(symbol);
      if (quote && quote.marketCap >= MIN_MARKET_CAP) {
        insertStock.run(symbol, symbol);
        qualified++;
      }
    } catch {}

    checked++;
    if (checked % 3 === 0) await sleep(600);

    if (checked % 100 === 0) {
      console.log(`[discover] Checked ${checked}/${candidates.size}, qualified: ${qualified}`);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 840) {
      console.log(`[discover] Time limit approaching, stopping at ${checked}/${candidates.size}`);
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    ok: true,
    newCandidates: candidates.size,
    qualified,
    checked,
    existingCount: existingSymbols.size,
    durationSeconds: duration,
  });
}
