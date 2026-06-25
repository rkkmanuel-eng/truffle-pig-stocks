import Link from "next/link";
import { Strategy } from "@/lib/strategies";

export default function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <Link
      href={`/strategy/${strategy.slug}`}
      className="block border border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-md transition-all"
    >
      <h2 className="text-xl font-semibold mb-2">{strategy.name}</h2>
      <p className="text-gray-600 text-sm mb-4">{strategy.description}</p>
      <div className="flex flex-wrap gap-2">
        {strategy.criteria.map((c) => (
          <span
            key={c.metric}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
          >
            {c.label} {c.operator} {c.threshold}
            {c.unit || ""}
          </span>
        ))}
      </div>
    </Link>
  );
}
