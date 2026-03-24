export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production") {
      const cron = require("node-cron");

      // Google Sheets sync — каждые 6 часов
      if (process.env.GOOGLE_SHEETS_ID) {
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

      // Совет по пиломатериалам — каждый понедельник 10:00
      cron.schedule("0 10 * * 1", async () => {
        try {
          const tips = [
            "Храните доски горизонтально в вентилируемом месте — избежите коробления.",
            "Перед покраской выдержите пиломатериал 48ч в помещении для адаптации.",
            "Сухостойная сосна меньше ведёт — идеальна для внутренних работ.",
            "Обрезная доска 25x150мм — оптимальный выбор для обшивки и полов.",
          ];
          const tip = tips[new Date().getDate() % tips.length];
          const { sendPushToAll } = require("./lib/push");
          await sendPushToAll({ title: "💡 Совет ПилоРус", body: tip, icon: "/icons/icon-192x192.png", url: "/catalog" });
          console.log("[Cron] Weekly tip push sent");
        } catch (err) {
          console.error("[Cron] Weekly tip error:", err);
        }
      });

      // Пятничная акция — каждую пятницу 12:00
      cron.schedule("0 12 * * 5", async () => {
        try {
          const { sendPushToAll } = require("./lib/push");
          await sendPushToAll({
            title: "🪵 Выгодные цены — ПилоРус",
            body: "Свежие поступления в наличии. Доставка по Московской области.",
            icon: "/icons/icon-192x192.png",
            url: "/catalog",
          });
          console.log("[Cron] Friday promo push sent");
        } catch (err) {
          console.error("[Cron] Friday promo error:", err);
        }
      });

      // Возврат спящих клиентов — каждое воскресенье 11:00
      cron.schedule("0 11 * * 0", async () => {
        try {
          const { PrismaClient } = require("@prisma/client");
          const prisma = new PrismaClient();
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const users = await prisma.user.findMany({
            where: {
              pushSubs: { some: {} },
              orders: { some: { createdAt: { lt: thirtyDaysAgo } } },
              NOT: { orders: { some: { createdAt: { gte: thirtyDaysAgo } } } },
            },
            select: { id: true },
          });
          if (!users.length) { await prisma.$disconnect(); return; }
          const subs = await prisma.pushSubscription.findMany({
            where: { userId: { in: users.map((u: any) => u.id) } },
          });
          await prisma.$disconnect();
          if (!subs.length) return;
          const webpush = require("web-push");
          webpush.setVapidDetails("mailto:info@pilo-rus.ru", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
          await Promise.allSettled(
            subs.map((sub: any) =>
              webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({
                  title: "🌲 Соскучились по ПилоРус?",
                  body: "Мы обновили ассортимент. Загляните — найдёте нужные материалы!",
                  icon: "/icons/icon-192x192.png",
                  url: "/catalog",
                })
              )
            )
          );
          console.log(`[Cron] Re-engagement push sent to ${subs.length} subscribers`);
        } catch (err) {
          console.error("[Cron] Re-engagement error:", err);
        }
      });

      console.log("[Cron] Push notification schedules registered");
    }
  }
}
