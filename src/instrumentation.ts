export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { refreshAllStocks } = await import("./lib/refresh-stocks");

    // Run twice daily Mon-Fri at 6:00 AM and 6:00 PM UTC
    // Each run handles ~2,100 stocks (840s limit), so two runs cover everything
    cron.default.schedule("0 6,18 * * 1-5", () => {
      console.log("[cron] Starting scheduled stock refresh");
      refreshAllStocks().catch((err) =>
        console.error("[cron] Refresh failed:", err)
      );
    });

    console.log("[cron] Scheduled stock refresh at 6:00 AM and 6:00 PM UTC, Mon-Fri");
  }
}
