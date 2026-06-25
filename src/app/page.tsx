import { STRATEGIES } from "@/lib/strategies";
import StrategyCard from "@/components/StrategyCard";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Quality Investment Alerts</h1>
        <p className="text-gray-600">
          Find stocks that meet proven investing criteria and get notified when they cross key
          thresholds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {STRATEGIES.map((strategy) => (
          <StrategyCard key={strategy.slug} strategy={strategy} />
        ))}
      </div>

      <div className="mt-12 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        <p>
          <strong>How it works:</strong> Each strategy defines specific financial thresholds.
          Stocks are screened against these criteria daily. You can subscribe to alerts for
          individual stocks or entire strategies, with an adjustable threshold buffer (0–20%) to
          get early warnings.
        </p>
      </div>
    </main>
  );
}
