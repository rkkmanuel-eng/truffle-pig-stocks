import { NextResponse } from "next/server";
import {
  getActiveSubscriptions,
  getAllStocks,
  getStocksBySymbols,
  getDowStocks,
  logAlert,
  getSubscriptionQualifications,
  setSubscriptionQualifications,
} from "@/lib/db";
import { getStrategy, STRATEGIES } from "@/lib/strategies";
import { checkAlertCondition } from "@/lib/screener";
import { notifier } from "@/lib/alerts";

export async function POST() {
  const subscriptions = getActiveSubscriptions();
  const allStocks = getAllStocks();
  let sent = 0;

  for (const sub of subscriptions) {
    if (sub.strategy_slug && !sub.symbol) {
      const strategy = getStrategy(sub.strategy_slug);
      if (!strategy) continue;

      const stocks =
        strategy.slug === "dogs-of-the-dow" ? getDowStocks() : allStocks;

      const currentlyQualifying = new Set<string>();
      for (const stock of stocks) {
        const { triggered } = checkAlertCondition(
          stock,
          strategy.criteria,
          sub.buffer_percent
        );
        if (triggered) {
          currentlyQualifying.add(stock.symbol);
        }
      }

      const previouslyQualifying = getSubscriptionQualifications(sub.id);

      const joined: string[] = [];
      const left: string[] = [];

      for (const sym of currentlyQualifying) {
        if (!previouslyQualifying.has(sym)) joined.push(sym);
      }
      for (const sym of previouslyQualifying) {
        if (!currentlyQualifying.has(sym)) left.push(sym);
      }

      if (joined.length > 0 || left.length > 0) {
        const parts: string[] = [`${strategy.name} list update:`];
        if (joined.length > 0) {
          parts.push(`Joined: ${joined.join(", ")}`);
        }
        if (left.length > 0) {
          parts.push(`Left: ${left.join(", ")}`);
        }
        const message = parts.join("\n");
        const success = await notifier.send(sub.phone, message);
        if (success) {
          logAlert(sub.id, message);
          sent++;
        }
      }

      setSubscriptionQualifications(sub.id, [...currentlyQualifying]);
    } else if (sub.strategy_slug && sub.symbol) {
      const stocks = getStocksBySymbols([sub.symbol]);
      if (stocks.length === 0) continue;
      const stock = stocks[0];
      const strategy = getStrategy(sub.strategy_slug);
      if (!strategy) continue;

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
