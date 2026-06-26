import { STRATEGIES } from "@/lib/strategies";
import { screenStocks } from "@/lib/screener";
import { evaluateAll } from "@/lib/valuations";
import { getDividendTiers } from "@/lib/dividends";

import StrategyColumn from "@/components/StrategyColumn";
import ValuationColumn from "@/components/ValuationColumn";
import DividendTierColumn from "@/components/DividendTierColumn";

import GlobalThreshold from "@/components/GlobalThreshold";
import ScrollHint from "@/components/ScrollHint";
import StockSearch from "@/components/StockSearch";
import UserMenu from "@/components/UserMenu";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ buffer?: string }>;
}) {
  const { buffer: bufferParam } = await searchParams;
  const buffer = Math.min(20, Math.max(0, Number(bufferParam) || 0));

  const strategyColumns = STRATEGIES.map((strategy) => ({
    strategy,
    stocks: screenStocks(strategy, buffer),
  }));

  const valuationResults = evaluateAll();
  const dividendTiers = getDividendTiers();

  return (
    <main className="max-w-[1800px] mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--th-text)]">🐷 Truffle Pig Stocks</h1>
          <p className="text-sm text-[var(--th-text-faint)] mt-1">
            We dig up value stocks so you don&apos;t have to get your hooves dirty.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StockSearch />
          <UserMenu />
        </div>
      </div>

      <div className="mb-6">
        <GlobalThreshold value={buffer} />
      </div>

      <ScrollHint>
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {strategyColumns.map(({ strategy, stocks }) => (
            <div key={strategy.slug} className="w-80 shrink-0">
              <StrategyColumn strategy={strategy} stocks={stocks} />
            </div>
          ))}
          {dividendTiers.map(({ meta, stocks }) => (
            <div key={meta.slug} className="w-80 shrink-0">
              <DividendTierColumn meta={meta} stocks={stocks} />
            </div>
          ))}
          {valuationResults.map(({ meta, buckets }) => (
            <div key={meta.slug} className="w-80 shrink-0">
              <ValuationColumn meta={meta} buckets={buckets} />
            </div>
          ))}

        </div>
      </ScrollHint>

      <footer className="mt-8 text-center text-[10px] text-[var(--th-text-ghost)]">
        Not financial advice. Data from Financial Modeling Prep.
      </footer>
    </main>
  );
}
