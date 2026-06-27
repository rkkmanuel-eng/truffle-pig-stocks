export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAllStocks } = await import("./lib/refresh-stocks");

    cron.default.schedule("0 6,18 * * 1-5", () => {
      console.log("[cron] Starting scheduled stock refresh");
      refreshAllStocks().catch((err) =>
        console.error("[cron] Refresh failed:", err)
      );
    });

    cron.default.schedule("0 8 * * 6", () => {
      console.log("[cron] Starting Saturday financials refresh");
      refreshAllStocks({ refreshFinancials: true }).catch((err) =>
        console.error("[cron] Financials refresh failed:", err)
      );
    });

    console.log("[cron] Scheduled: quotes Mon-Fri 6AM/6PM UTC, financials Sat 8AM UTC");

    setTimeout(async () => {
      const { getMetadata, hasFinancials, getAllStockSymbols } = await import("./lib/db");
      const { DEFAULT_MIN_MARKET_CAP } = await import("./lib/config");

      const symbols = getAllStockSymbols();
      const needsFinancials = symbols.filter((s) => !hasFinancials(s)).length;
      const fullSeed = needsFinancials > symbols.length * 0.5;
      const passes = fullSeed ? 8 : 1;

      console.log(`[boot] ${needsFinancials}/${symbols.length} stocks need financials, running ${passes} pass${passes > 1 ? "es" : ""}`);
      for (let i = 0; i < passes; i++) {
        try {
          console.log(`[boot] Pass ${i + 1}/${passes}`);
          await refreshAllStocks();
        } catch (err) {
          console.error(`[boot] Pass ${i + 1} failed:`, err);
        }
      }
      console.log("[boot] Refresh complete");
    }, 10_000);
  }
}
