export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAllStocks } = await import("./lib/refresh-stocks");

    // Run twice daily at 6:00 AM and 6:00 PM UTC to cover all ~2,900 stocks
    // Each run handles ~2,100 stocks (840s limit), so two runs cover everything
    cron.default.schedule("0 6,18 * * *", () => {
      console.log("[cron] Starting scheduled stock refresh");
      refreshAllStocks().catch((err) =>
        console.error("[cron] Refresh failed:", err)
      );
    });

    // Also run once on startup (after a 30s delay to let the server stabilize)
    setTimeout(() => {
      console.log("[cron] Starting initial stock refresh on boot");
      refreshAllStocks().catch((err) =>
        console.error("[cron] Initial refresh failed:", err)
      );
    }, 30_000);

    console.log("[cron] Scheduled stock refresh at 6:00 AM and 6:00 PM UTC");
  }
}
