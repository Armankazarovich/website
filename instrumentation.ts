export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Auto-sync from Google Sheets every 6 hours (production only)
    if (process.env.NODE_ENV === "production" && process.env.GOOGLE_SHEETS_ID) {
      const cron = require("node-cron");

      cron.schedule("0 */6 * * *", async () => {
        try {
          console.log("[Cron] Starting Google Sheets sync...");
          const { syncFromGoogleSheets } = require("./lib/sheets");
          const result = await syncFromGoogleSheets();
          console.log(`[Cron] Synced ${result.synced} products. Errors: ${result.errors.length}`);
        } catch (err) {
          console.error("[Cron] Sheets sync error:", err);
        }
      });

      console.log("[Cron] Google Sheets auto-sync scheduled (every 6 hours)");
    }
  }
}
