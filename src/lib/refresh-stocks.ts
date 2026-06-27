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
  DOW_SYMBOLS,
  SP500_SAMPLE,
} from "./fmp";
import {
  calculateDCF, calculatePE, calculatePB,
  calculateDE, calculateCurrentRatio,
  calculateEPSGrowth, calculatePEG,
  calculateDividendYield, calculatePayoutRatio,
} from "./calculations";

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

    const years = new Set<number>();
    for (const s of incomes) years.add(parseInt(s.calendarYear));
    for (const s of cashFlows) years.add(parseInt(s.calendarYear));
    for (const s of balanceSheets) years.add(parseInt(s.calendarYear));

    for (const year of years) {
      if (isNaN(year)) continue;
      const inc = incomes.find((s) => parseInt(s.calendarYear) === year);
      const cf = cashFlows.find((s) => parseInt(s.calendarYear) === year);
      const bs = balanceSheets.find((s) => parseInt(s.calendarYear) === year);

      upsertFinancial({
        symbol,
        fiscal_year: year,
        revenue: inc?.revenue ?? null,
        net_income: inc?.netIncome ?? null,
        eps_diluted: inc?.epsdiluted ?? null,
        total_equity: bs?.totalStockholdersEquity ?? null,
        total_debt: bs?.totalDebt ?? null,
        total_assets: bs?.totalAssets ?? null,
        total_current_assets: bs?.totalCurrentAssets ?? null,
        total_current_liabilities: bs?.totalCurrentLiabilities ?? null,
        operating_cash_flow: cf?.operatingCashFlow ?? null,
        capital_expenditure: cf?.capitalExpenditure ?? null,
        free_cash_flow: cf?.freeCashFlow ?? null,
        dividends_paid: cf?.dividendsPaid ?? null,
        shares_outstanding: inc?.weightedAverageShsOutDil ?? null,
      });
    }

    return true;
  } catch (err) {
    console.error(`[refresh] Financials fetch failed: ${symbol}`, err);
    return false;
  }
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
      const needsFinancials = !hasFinancials(symbol);

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

      if (needsFinancials) {
        const got = await fetchAndStoreFinancials(symbol);
        if (got) financialsFetched++;
        await sleep(600);
      }

      const fins = getFinancials(symbol);
      const latest = fins[0];
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

      if (latest && quote.price) {
        eps = latest.eps_diluted;
        peRatio = calculatePE(quote.price, eps);
        pbRatio = calculatePB(quote.price, latest.total_equity, currentShares);
        deRatio = calculateDE(latest.total_debt, latest.total_equity);
        curRatio = calculateCurrentRatio(latest.total_current_assets, latest.total_current_liabilities);
        divYield = calculateDividendYield(latest.dividends_paid, currentShares, quote.price);
        payRatio = calculatePayoutRatio(latest.dividends_paid, latest.net_income);

        const epsGrowth = calculateEPSGrowth(fins);
        pegRatio = calculatePEG(peRatio, epsGrowth);
        dcfValue = calculateDCF(fins, beta, currentShares);
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
