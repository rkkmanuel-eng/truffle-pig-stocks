"use client";

import { useState } from "react";
import { Strategy } from "@/lib/strategies";
import { ScreenedStock } from "@/lib/screener";
import AlertSignup from "./AlertSignup";

interface Props {
  strategy: Strategy;
  stocks: ScreenedStock[];
}

export default function StockTable({ strategy, stocks }: Props) {
  const [alertStock, setAlertStock] = useState<string | null>(null);

  if (stocks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No stocks currently meet all criteria.</p>
        <p className="text-sm mt-2">
          Try adjusting the threshold buffer or check back after data is refreshed.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-3 px-4 font-medium">Symbol</th>
            <th className="py-3 px-4 font-medium">Name</th>
            <th className="py-3 px-4 font-medium">Price</th>
            {strategy.criteria.map((c) => (
              <th key={c.metric} className="py-3 px-4 font-medium">
                {c.label}
              </th>
            ))}
            <th className="py-3 px-4 font-medium">Alert</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr key={stock.symbol} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 font-mono font-semibold">{stock.symbol}</td>
              <td className="py-3 px-4 text-gray-700">{stock.name}</td>
              <td className="py-3 px-4">
                {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
              </td>
              {strategy.criteria.map((c) => {
                const value = stock.metrics[c.metric];
                const passes = stock.passing[c.metric];
                return (
                  <td
                    key={c.metric}
                    className={`py-3 px-4 ${passes ? "text-green-700" : "text-red-600"}`}
                  >
                    {value != null ? value.toFixed(2) : "—"}
                    {c.unit || ""}
                  </td>
                );
              })}
              <td className="py-3 px-4">
                <button
                  onClick={() => setAlertStock(stock.symbol)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  Set Alert
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {alertStock && (
        <AlertSignup
          strategySlug={strategy.slug}
          symbol={alertStock}
          onClose={() => setAlertStock(null)}
        />
      )}
    </div>
  );
}
