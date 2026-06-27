export interface FinancialYear {
  fiscal_year: number;
  revenue: number | null;
  net_income: number | null;
  eps_diluted: number | null;
  total_equity: number | null;
  total_debt: number | null;
  total_assets: number | null;
  total_current_assets: number | null;
  total_current_liabilities: number | null;
  operating_cash_flow: number | null;
  capital_expenditure: number | null;
  free_cash_flow: number | null;
  dividends_paid: number | null;
  shares_outstanding: number | null;
}

export interface QuarterlyFinancial extends FinancialYear {
  fiscal_quarter: number;
}

function sumField(rows: QuarterlyFinancial[], field: keyof QuarterlyFinancial): number | null {
  const vals = rows.map((r) => r[field] as number | null).filter((v): v is number => v != null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

export function buildTTM(quarters: QuarterlyFinancial[]): FinancialYear | null {
  const sorted = [...quarters].sort((a, b) =>
    b.fiscal_year !== a.fiscal_year ? b.fiscal_year - a.fiscal_year : b.fiscal_quarter - a.fiscal_quarter
  );
  const last4 = sorted.slice(0, 4);
  if (last4.length < 4) return null;

  const latest = last4[0];
  return {
    fiscal_year: latest.fiscal_year,
    revenue: sumField(last4, "revenue"),
    net_income: sumField(last4, "net_income"),
    eps_diluted: sumField(last4, "eps_diluted"),
    operating_cash_flow: sumField(last4, "operating_cash_flow"),
    capital_expenditure: sumField(last4, "capital_expenditure"),
    free_cash_flow: sumField(last4, "free_cash_flow"),
    dividends_paid: sumField(last4, "dividends_paid"),
    total_equity: latest.total_equity,
    total_debt: latest.total_debt,
    total_assets: latest.total_assets,
    total_current_assets: latest.total_current_assets,
    total_current_liabilities: latest.total_current_liabilities,
    shares_outstanding: latest.shares_outstanding,
  };
}

export function buildAnnualSeries(quarters: QuarterlyFinancial[]): FinancialYear[] {
  const byYear = new Map<number, QuarterlyFinancial[]>();
  for (const q of quarters) {
    const arr = byYear.get(q.fiscal_year) || [];
    arr.push(q);
    byYear.set(q.fiscal_year, arr);
  }

  const annuals: FinancialYear[] = [];
  for (const [year, qs] of byYear) {
    if (qs.length < 4) continue;
    const latest = [...qs].sort((a, b) => b.fiscal_quarter - a.fiscal_quarter)[0];
    annuals.push({
      fiscal_year: year,
      revenue: sumField(qs, "revenue"),
      net_income: sumField(qs, "net_income"),
      eps_diluted: sumField(qs, "eps_diluted"),
      operating_cash_flow: sumField(qs, "operating_cash_flow"),
      capital_expenditure: sumField(qs, "capital_expenditure"),
      free_cash_flow: sumField(qs, "free_cash_flow"),
      dividends_paid: sumField(qs, "dividends_paid"),
      total_equity: latest.total_equity,
      total_debt: latest.total_debt,
      total_assets: latest.total_assets,
      total_current_assets: latest.total_current_assets,
      total_current_liabilities: latest.total_current_liabilities,
      shares_outstanding: latest.shares_outstanding,
    });
  }

  return annuals.sort((a, b) => b.fiscal_year - a.fiscal_year);
}

export function calculateDCF(
  financials: FinancialYear[],
  beta: number | null,
  currentShares: number | null
): number | null {
  const withFCF = financials
    .filter((f) => f.free_cash_flow != null && f.free_cash_flow > 0)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);

  if (withFCF.length < 3) return null;

  const shares =
    currentShares ??
    withFCF[withFCF.length - 1].shares_outstanding;
  if (!shares || shares <= 0) return null;

  const firstFCF = withFCF[0].free_cash_flow!;
  const lastFCF = withFCF[withFCF.length - 1].free_cash_flow!;
  const years = withFCF.length - 1;

  const rawGrowth = Math.pow(lastFCF / firstFCF, 1 / years) - 1;
  const growthRate = Math.max(-0.05, Math.min(0.15, rawGrowth));

  const riskFreeRate = 0.04;
  const equityPremium = 0.06;
  const costOfEquity = riskFreeRate + (beta ?? 1.0) * equityPremium;
  const wacc = Math.max(0.06, Math.min(0.20, costOfEquity));

  const terminalGrowth = 0.025;
  if (wacc <= terminalGrowth) return null;

  // Use average of last 3 years' FCF to smooth out cyclical spikes
  const recent = withFCF.slice(-3);
  const baseFCF = recent.reduce((sum, f) => sum + f.free_cash_flow!, 0) / recent.length;

  let totalPV = 0;
  let projFCF = baseFCF;
  for (let i = 1; i <= 5; i++) {
    projFCF *= 1 + growthRate;
    totalPV += projFCF / Math.pow(1 + wacc, i);
  }

  const terminalValue =
    (projFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  totalPV += terminalValue / Math.pow(1 + wacc, 5);

  const perShare = totalPV / shares;
  return perShare > 0 ? perShare : null;
}

export function calculatePE(
  price: number,
  eps: number | null
): number | null {
  if (eps == null || eps <= 0) return null;
  return price / eps;
}

export function calculatePB(
  price: number,
  totalEquity: number | null,
  sharesOutstanding: number | null
): number | null {
  if (!totalEquity || totalEquity <= 0 || !sharesOutstanding || sharesOutstanding <= 0)
    return null;
  return price / (totalEquity / sharesOutstanding);
}

export function calculateDE(
  totalDebt: number | null,
  totalEquity: number | null
): number | null {
  if (totalDebt == null || totalEquity == null || totalEquity === 0) return null;
  return totalDebt / totalEquity;
}

export function calculateCurrentRatio(
  currentAssets: number | null,
  currentLiabilities: number | null
): number | null {
  if (!currentAssets || !currentLiabilities || currentLiabilities === 0)
    return null;
  return currentAssets / currentLiabilities;
}

export function calculateEPSGrowth(
  financials: FinancialYear[]
): number | null {
  const withEPS = financials
    .filter((f) => f.eps_diluted != null && f.eps_diluted > 0)
    .sort((a, b) => a.fiscal_year - b.fiscal_year);

  if (withEPS.length < 2) return null;

  const first = withEPS[0].eps_diluted!;
  const last = withEPS[withEPS.length - 1].eps_diluted!;
  const years = withEPS.length - 1;

  return Math.pow(last / first, 1 / years) - 1;
}

export function calculatePEG(
  pe: number | null,
  epsGrowth: number | null
): number | null {
  if (pe == null || pe <= 0 || epsGrowth == null || epsGrowth <= 0) return null;
  const growthPct = epsGrowth * 100;
  if (growthPct === 0) return null;
  return pe / growthPct;
}

export function calculateDividendYield(
  dividendsPaid: number | null,
  sharesOutstanding: number | null,
  price: number
): number | null {
  if (!dividendsPaid || dividendsPaid >= 0 || !sharesOutstanding || sharesOutstanding <= 0 || price <= 0)
    return null;
  const dps = Math.abs(dividendsPaid) / sharesOutstanding;
  return dps / price;
}

export function calculatePayoutRatio(
  dividendsPaid: number | null,
  netIncome: number | null
): number | null {
  if (!dividendsPaid || dividendsPaid >= 0 || !netIncome || netIncome <= 0)
    return null;
  return Math.abs(dividendsPaid) / netIncome;
}
