import { upsertStock, getAllStockSymbols, getStockBySymbol, getMetadata, setMetadata } from "./db";
import {
  getProfile,
  getQuote,
  getRatiosTTM,
  getDCF,
  DOW_SYMBOLS,
  SP500_SAMPLE,
} from "./fmp";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function refreshAllStocks() {
  if (!process.env.FMP_API_KEY) {
    console.error("[refresh] FMP_API_KEY not set, skipping");
    return;
  }

  const dbSymbols = getAllStockSymbols();
  const symbols = dbSymbols.length > 0 ? dbSymbols : SP500_SAMPLE;
  const startTime = Date.now();
  let updated = 0;
  let failed = 0;

  const savedOffset = parseInt(getMetadata("refresh_offset") || "0", 10);
  const startIdx = savedOffset < symbols.length ? savedOffset : 0;

  console.log(`[refresh] Starting at offset ${startIdx} (${symbols[startIdx]}) for ${symbols.length} stocks`);

  let processed = 0;
  for (let n = 0; n < symbols.length; n++) {
    const i = (startIdx + n) % symbols.length;
    const symbol = symbols[i];

    try {
      const [quote, ratios, dcfValue] = await Promise.all([
        getQuote(symbol, true),
        getRatiosTTM(symbol, true).catch(() => null),
        getDCF(symbol, true),
      ]);

      if (!quote) {
        failed++;
        processed++;
        continue;
      }

      const existing = getStockBySymbol(symbol);
      const needsProfile = !existing || !existing.sector || existing.name === symbol;
      const profile = needsProfile ? await getProfile(symbol, true) : null;

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

      updated++;
    } catch (err) {
      failed++;
      console.error(`[refresh] Failed: ${symbol}`, err);
    }

    processed++;

    if (processed % 3 === 0 && processed < symbols.length) {
      await sleep(1200);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed > 840) {
      const nextOffset = (startIdx + processed) % symbols.length;
      setMetadata("refresh_offset", String(nextOffset));
      console.log(`[refresh] Time limit after ${processed} stocks, next offset: ${nextOffset} (${symbols[nextOffset]})`);
      break;
    }
  }

  if (processed >= symbols.length) {
    setMetadata("refresh_offset", "0");
  }

  setMetadata("last_refresh_at", new Date().toISOString());

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[refresh] Done: ${updated} updated, ${failed} failed, ${duration}s`);

  return { updated, failed, duration };
}
