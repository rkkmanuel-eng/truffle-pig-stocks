import { NextResponse } from "next/server";
import { getActiveSubscriptions, getAllStocks, getStocksBySymbols, logAlert } from "@/lib/db";
import { getStrategy, STRATEGIES } from "@/lib/strategies";
import { checkAlertCondition } from "@/lib/screener";
import { notifier } from "@/lib/alerts";

export async function POST() {
  const subscriptions = getActiveSubscriptions();
  const allStocks = getAllStocks();
  let sent = 0;

  for (const sub of subscriptions) {
    if (sub.strategy_slug) {
      const strategy = getStrategy(sub.strategy_slug);
      if (!strategy) continue;

      const stocks = sub.symbol
        ? getStocksBySymbols([sub.symbol])
        : allStocks;

      for (const stock of stocks) {
        const { triggered, details } = checkAlertCondition(
          stock,
          strategy.criteria,
          sub.buffer_percent
        );

        if (triggered) {
          const message = `Alert: ${stock.symbol} (${stock.name}) meets ${strategy.name} criteria!\n${details.join("\n")}`;
          const success = await notifier.send(sub.phone, message);
          if (success) {
            logAlert(sub.id, message);
            sent++;
          }
        }
      }
    } else if (sub.symbol) {
      const stocks = getStocksBySymbols([sub.symbol]);
      if (stocks.length === 0) continue;
      const stock = stocks[0];

      for (const strategy of STRATEGIES) {
        const { triggered, details } = checkAlertCondition(
          stock,
          strategy.criteria,
          sub.buffer_percent
        );

        if (triggered) {
          const message = `Alert: ${stock.symbol} meets ${strategy.name} criteria!\n${details.join("\n")}`;
          const success = await notifier.send(sub.phone, message);
          if (success) {
            logAlert(sub.id, message);
            sent++;
          }
        }
      }
    }
  }

  return NextResponse.json({ checked: subscriptions.length, sent });
}
