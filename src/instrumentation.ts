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

    setTimeout(() => {
      console.log("[boot] Starting immediate stock refresh");
      refreshAllStocks().catch((err) =>
        console.error("[boot] Refresh failed:", err)
      );
    }, 10_000);
  }
}
