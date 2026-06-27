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

    console.log("[cron] Scheduled stock refresh at 6:00 AM and 6:00 PM UTC, Mon-Fri");

    setTimeout(() => {
      console.log("[boot] Starting immediate stock refresh");
      refreshAllStocks().catch((err) =>
        console.error("[boot] Refresh failed:", err)
      );
    }, 10_000);
  }
}
