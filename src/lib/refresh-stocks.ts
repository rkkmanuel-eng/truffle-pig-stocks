import {
  upsertStock, getAllStockSymbols, getStockBySymbol,
  getMetadata, setMetadata,
  hasFinancials, getFinancials, upsertFinancial,
} from "./db";
import {
  getProfile,
  getQuote,
  getIncomeStatements,
  getCashFlowStatements,
  getBalanceSheets,
  parseFiscalQuarter,
  DOW_SYMBOLS,
  SP500_SAMPLE,
} from "./fmp";
import {
  calculateDCF, calculatePE, calculatePB,
  calculateDE, calculateCurrentRatio,
  calculateEPSGrowth, calculatePEG,
  calculateDividendYield, calculatePayoutRatio,
  buildTTM, buildAnnualSeries,
  type QuarterlyFinancial,
} from "./calculations";
import { DEFAULT_MIN_MARKET_CAP } from "./config";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAndStoreFinancials(symbol: string): Promise<boolean> {
  try {
    const [incomes, cashFlows, balanceSheets] = await Promise.all([
      getIncomeStatements(symbol),
      getCashFlowStatements(symbol),
      getBalanceSheets(symbol),
    ]);

    if (!incomes.length && !cashFlows.length && !balanceSheets.length) return false;

    const keys = new Set<string>();
    for (const s of incomes) {
      const q = parseFiscalQuarter(s.period);
      if (q > 0) keys.add(`${parseInt(s.fiscalYear)}-${q}`);
    }
    for (const s of cashFlows) {
      const q = parseFiscalQuarter(s.period);
      if (q > 0) keys.add(`${parseInt(s.fiscalYear)}-${q}`);
    }
    for (const s of balanceSheets) {
      const q = parseFiscalQuarter(s.period);
      if (q > 0) keys.add(`${parseInt(s.fiscalYear)}-${q}`);
    }

    for (const key of keys) {
      const [yearStr, qStr] = key.split("-");
      const year = parseInt(yearStr);
      const quarter = parseInt(qStr);
      if (isNaN(year) || isNaN(quarter)) continue;

      const inc = incomes.find((s) => parseInt(s.fiscalYear) === year && parseFiscalQuarter(s.period) === quarter);
      const cf = cashFlows.find((s) => parseInt(s.fiscalYear) === year && parseFiscalQuarter(s.period) === quarter);
      const bs = balanceSheets.find((s) => parseInt(s.fiscalYear) === year && parseFiscalQuarter(s.period) === quarter);

      upsertFinancial({
        symbol,
        fiscal_year: year,
        fiscal_quarter: quarter,
        revenue: inc?.revenue ?? null,
        net_income: inc?.netIncome ?? null,
        eps_diluted: inc?.epsDiluted ?? null,
        total_equity: bs?.totalStockholdersEquity ?? null,
        total_debt: bs?.totalDebt ?? null,
        total_assets: bs?.totalAssets ?? null,
        total_current_assets: bs?.totalCurrentAssets ?? null,
        total_current_liabilities: bs?.totalCurrentLiabilities ?? null,
        operating_cash_flow: cf?.operatingCashFlow ?? null,
        capital_expenditure: cf?.capitalExpenditure ?? null,
        free_cash_flow: cf?.freeCashFlow ?? null,
        dividends_paid: cf?.commonDividendsPaid ?? null,
        shares_outstanding: inc?.weightedAverageShsOutDil ?? null,
      });
    }

    return true;
  } catch (err) {
    console.error(`[refresh] Financials fetch failed: ${symbol}`, err);
    return false;
  }
}

export async function refreshAllStocks({ refreshFinancials = false } = {}) {
  if (!process.env.FMP_API_KEY) {
    console.error("[refresh] FMP_API_KEY not set, skipping");
    return;
  }

  const dbSymbols = getAllStockSymbols();
  const symbols = dbSymbols.length > 0 ? dbSymbols : SP500_SAMPLE;
  const startTime = Date.now();
  let updated = 0;
  let failed = 0;
  let financialsFetched = 0;

  const savedOffset = parseInt(getMetadata("refresh_offset") || "0", 10);
  const startIdx = savedOffset < symbols.length ? savedOffset : 0;

  console.log(`[refresh] Starting at offset ${startIdx} (${symbols[startIdx]}) for ${symbols.length} stocks`);

  let processed = 0;
  for (let n = 0; n < symbols.length; n++) {
    const i = (startIdx + n) % symbols.length;
    const symbol = symbols[i];

    try {
      const existing = getStockBySymbol(symbol);
      const needsProfile = !existing || !existing.sector || existing.name === symbol;
      const needsFinancials = refreshFinancials || !hasFinancials(symbol);

      const fetchPromises: Promise<unknown>[] = [getQuote(symbol, true)];
      if (needsProfile) fetchPromises.push(getProfile(symbol, true));

      const results = await Promise.all(fetchPromises);
      const quote = results[0] as Awaited<ReturnType<typeof getQuote>>;
      const profile = needsProfile ? results[1] as Awaited<ReturnType<typeof getProfile>> : null;

      if (!quote) {
        failed++;
        processed++;
        continue;
      }

      const belowMinCap = DEFAULT_MIN_MARKET_CAP > 0 &&
        quote.marketCap != null && quote.marketCap < DEFAULT_MIN_MARKET_CAP;

      if (belowMinCap) {
        upsertStock({
          symbol,
          name: profile?.companyName ?? existing?.name ?? symbol,
          sector: profile?.sector ?? existing?.sector ?? null,
          price: quote.price,
          pe_ratio: existing?.pe_ratio ?? null,
          pb_ratio: existing?.pb_ratio ?? null,
          debt_equity_ratio: existing?.debt_equity_ratio ?? null,
          current_ratio: existing?.current_ratio ?? null,
          dividend_yield: existing?.dividend_yield ?? null,
          payout_ratio: existing?.payout_ratio ?? null,
          sma_50: quote.priceAvg50 ?? null,
          sma_200: quote.priceAvg200 ?? null,
          dcf_value: existing?.dcf_value ?? null,
          peg_ratio: existing?.peg_ratio ?? null,
          market_cap: quote.marketCap ?? null,
          beta: profile?.beta ?? existing?.beta ?? null,
          volume_avg: profile?.averageVolume ?? existing?.volume_avg ?? null,
          eps: existing?.eps ?? null,
          week52_high: quote.yearHigh ?? null,
          week52_low: quote.yearLow ?? null,
          industry: profile?.industry ?? existing?.industry ?? null,
          exchange: profile?.exchange ?? existing?.exchange ?? null,
          is_dow: DOW_SYMBOLS.includes(symbol) ? 1 : 0,
          created_at: null,
        });
        updated++;
        processed++;
        continue;
      }

      if (needsFinancials) {
        const got = await fetchAndStoreFinancials(symbol);
        if (got) financialsFetched++;
        await sleep(600);
      }

      const quarters = getFinancials(symbol) as QuarterlyFinancial[];
      const beta = profile?.beta ?? existing?.beta ?? null;
      const currentShares = quote.marketCap && quote.price ? quote.marketCap / quote.price : null;

      let peRatio: number | null = null;
      let pbRatio: number | null = null;
      let deRatio: number | null = null;
      let curRatio: number | null = null;
      let divYield: number | null = null;
      let payRatio: number | null = null;
      let pegRatio: number | null = null;
      let dcfValue: number | null = null;
      let eps: number | null = null;

      const ttm = buildTTM(quarters);
      const annuals = buildAnnualSeries(quarters);

      if (ttm && quote.price) {
        eps = ttm.eps_diluted;
        peRatio = calculatePE(quote.price, eps);
        pbRatio = calculatePB(quote.price, ttm.total_equity, currentShares);
        deRatio = calculateDE(ttm.total_debt, ttm.total_equity);
        curRatio = calculateCurrentRatio(ttm.total_current_assets, ttm.total_current_liabilities);
        divYield = calculateDividendYield(ttm.dividends_paid, currentShares, quote.price);
        payRatio = calculatePayoutRatio(ttm.dividends_paid, ttm.net_income);

        const epsGrowth = calculateEPSGrowth(annuals);
        pegRatio = calculatePEG(peRatio, epsGrowth);
        dcfValue = calculateDCF(annuals, beta, currentShares);
      }

      upsertStock({
        symbol,
        name: profile?.companyName ?? existing?.name ?? symbol,
        sector: profile?.sector ?? existing?.sector ?? null,
        price: quote.price,
        pe_ratio: peRatio,
        pb_ratio: pbRatio,
        debt_equity_ratio: deRatio,
        current_ratio: curRatio,
        dividend_yield: divYield,
        payout_ratio: payRatio,
        sma_50: quote.priceAvg50 ?? null,
        sma_200: quote.priceAvg200 ?? null,
        dcf_value: dcfValue,
        peg_ratio: pegRatio,
        market_cap: quote.marketCap ?? null,
        beta: profile?.beta ?? existing?.beta ?? null,
        volume_avg: profile?.averageVolume ?? existing?.volume_avg ?? null,
        eps,
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
      console.log(`[refresh] Time limit after ${processed} stocks (${financialsFetched} new financials), next offset: ${nextOffset} (${symbols[nextOffset]})`);
      break;
    }
  }

  if (processed >= symbols.length) {
    setMetadata("refresh_offset", "0");
  }

  setMetadata("last_refresh_at", new Date().toISOString());

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[refresh] Done: ${updated} updated, ${financialsFetched} financials fetched, ${failed} failed, ${duration}s`);

  return { updated, failed, financialsFetched, duration };
}
