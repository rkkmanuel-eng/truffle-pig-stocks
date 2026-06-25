import { notFound } from "next/navigation";
import Link from "next/link";
import { getStrategy, STRATEGIES } from "@/lib/strategies";
import { screenStocks } from "@/lib/screener";
import StockTable from "@/components/StockTable";
import StrategyAlertButton from "@/components/StrategyAlertButton";
import ThresholdControl from "@/components/ThresholdControl";

export function generateStaticParams() {
  return STRATEGIES.map((s) => ({ slug: s.slug }));
}

export default async function StrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ buffer?: string }>;
}) {
  const { slug } = await params;
  const { buffer: bufferParam } = await searchParams;
  const strategy = getStrategy(slug);
  if (!strategy) notFound();

  const buffer = Math.min(20, Math.max(0, Number(bufferParam) || 0));
  const stocks = screenStocks(strategy, buffer);

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm mb-6 inline-block">
        &larr; All Strategies
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{strategy.name}</h1>
          <p className="text-gray-600 text-sm">{strategy.description}</p>
        </div>
        <StrategyAlertButton strategySlug={strategy.slug} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {strategy.criteria.map((c) => (
          <span
            key={c.metric}
            className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium"
          >
            {c.label} {c.operator} {c.threshold}
            {c.unit || ""}
          </span>
        ))}
      </div>

      <ThresholdControl currentBuffer={buffer} />

      <div className="mb-4 text-sm text-gray-500">
        {stocks.length} stock{stocks.length !== 1 ? "s" : ""} matching
        {buffer > 0 ? ` (with ${buffer}% buffer)` : ""}
      </div>

      <StockTable strategy={strategy} stocks={stocks} />
    </main>
  );
}
