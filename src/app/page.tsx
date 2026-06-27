import { STRATEGIES } from "@/lib/strategies";
import { screenStocks } from "@/lib/screener";
import { evaluateAll } from "@/lib/valuations";
import { getDividendTiers } from "@/lib/dividends";

import StrategyColumn from "@/components/StrategyColumn";
import ValuationColumn from "@/components/ValuationColumn";
import DividendTierColumn from "@/components/DividendTierColumn";

import GlobalThreshold from "@/components/GlobalThreshold";
import MarketCapFilter from "@/components/MarketCapFilter";
import StockSearch from "@/components/StockSearch";
import UserMenu from "@/components/UserMenu";
import ColumnsLayout from "@/components/ColumnsLayout";
import type { ColumnDef } from "@/components/ColumnPicker";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ buffer?: string; minCap?: string }>;
}) {
  const { buffer: bufferParam, minCap: minCapParam } = await searchParams;
  const buffer = Math.min(20, Math.max(0, Number(bufferParam) || 0));
  const minCap = Math.max(0, Number(minCapParam) || 0);

  const strategyColumns = STRATEGIES.map((strategy) => ({
    strategy,
    stocks: screenStocks(strategy, buffer, minCap || undefined),
  }));

  const valuationResults = evaluateAll(minCap || undefined);
  const dividendTiers = getDividendTiers(minCap || undefined);

  const allColumns: ColumnDef[] = [
    ...STRATEGIES.map((s) => ({ id: `strategy-${s.slug}`, label: s.name, group: "Strategies" })),
    ...dividendTiers.map((d) => ({ id: `dividend-${d.meta.slug}`, label: d.meta.name, group: "Dividends" })),
    ...valuationResults.map((v) => ({ id: `valuation-${v.meta.slug}`, label: v.meta.name, group: "Valuations" })),
  ];

  return (
    <main className="max-w-[1800px] mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--th-text)]">Truffle Pig Stocks</h1>
          <p className="text-sm text-[var(--th-text-faint)] mt-1">
            We dig up value stocks so you don&apos;t have to get your hooves dirty.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StockSearch />
          <UserMenu />
        </div>
      </div>

      <ColumnsLayout
        columns={allColumns}
        filterBar={
          <>
            <GlobalThreshold value={buffer} />
            <MarketCapFilter value={minCap} />
          </>
        }
      >
        {strategyColumns.map(({ strategy, stocks }) => (
          <div key={strategy.slug} className="w-80 shrink-0" data-column-id={`strategy-${strategy.slug}`}>
            <StrategyColumn strategy={strategy} stocks={stocks} />
          </div>
        ))}
        {dividendTiers.map(({ meta, stocks }) => (
          <div key={meta.slug} className="w-80 shrink-0" data-column-id={`dividend-${meta.slug}`}>
            <DividendTierColumn meta={meta} stocks={stocks} />
          </div>
        ))}
        {valuationResults.map(({ meta, buckets }) => (
          <div key={meta.slug} className="w-80 shrink-0" data-column-id={`valuation-${meta.slug}`}>
            <ValuationColumn meta={meta} buckets={buckets} />
          </div>
        ))}
      </ColumnsLayout>

      <footer className="mt-8 text-center text-[10px] text-[var(--th-text-ghost)]">
        Not financial advice. Data from Financial Modeling Prep.
      </footer>
    </main>
  );
}
