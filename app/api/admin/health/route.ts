export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  return session && (session.user as any).role === "ADMIN";
}

type CheckResult = {
  id: string;
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  fix?: string;
  autoFixable?: boolean;
};

export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checks: CheckResult[] = [];

  // 1. Database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    const productCount = await prisma.product.count();
    const orderCount = await prisma.order.count();
    checks.push({
      id: "db",
      name: "База данных",
      status: "ok",
      message: `Подключена. Товаров: ${productCount}, заказов: ${orderCount}`,
    });
  } catch (e: any) {
    checks.push({
      id: "db",
      name: "База данных",
      status: "error",
      message: `Ошибка подключения: ${e.message}`,
      fix: "Проверьте переменную DATABASE_URL в настройках Vercel → Settings → Environment Variables",
    });
  }

  // 2. Products with no images
  try {
    const noImg = await prisma.product.count({
      where: { images: { isEmpty: true }, active: true },
    });
    if (noImg > 0) {
      checks.push({
        id: "product_images",
        name: "Фото товаров",
        status: "warn",
        message: `${noImg} активных товаров без фотографий`,
        fix: "Каталог товаров → откройте товар → вкладка «Фото» → загрузите изображения",
        autoFixable: false,
      });
    } else {
      checks.push({
        id: "product_images",
        name: "Фото товаров",
        status: "ok",
        message: "У всех активных товаров есть фотографии",
      });
    }
  } catch {}

  // 3. Product variants with no price
  try {
    const noPriceVariants = await prisma.productVariant.count({
      where: {
        pricePerCube: null,
        pricePerPiece: null,
        product: { active: true },
      },
    });
    if (noPriceVariants > 0) {
      checks.push({
        id: "product_prices",
        name: "Цены товаров",
        status: "warn",
        message: `${noPriceVariants} вариантов активных товаров без цены`,
        fix: "Каталог товаров → откройте товар → вкладка «Варианты» → укажите цену за куб или за штуку",
      });
    } else {
      checks.push({
        id: "product_prices",
        name: "Цены товаров",
        status: "ok",
        message: "У всех вариантов активных товаров указаны цены",
      });
    }
  } catch {}

  // 4. SMTP email configuration
  try {
    const smtpRow = await prisma.siteSettings.findUnique({
      where: { key: "smtp_host" },
    });
    if (!smtpRow?.value) {
      checks.push({
        id: "smtp",
        name: "Email / SMTP",
        status: "warn",
        message: "SMTP не настроен — email-рассылка и уведомления недоступны",
        fix: "Email рассылка → раздел «SMTP настройки» → введите данные почтового сервера (например, Яндекс Почта)",
      });
    } else {
      checks.push({
        id: "smtp",
        name: "Email / SMTP",
        status: "ok",
        message: `Настроен: ${smtpRow.value}`,
      });
    }
  } catch {}

  // 5. Yandex Metrika counter
  try {
    const metrika = await prisma.siteSettings.findUnique({
      where: { key: "yandex_metrika_id" },
    });
    if (!metrika?.value) {
      checks.push({
        id: "metrika",
        name: "Яндекс Метрика",
        status: "warn",
        message: "Счётчик не подключён — статистика посещений не собирается",
        fix: "Аналитика → поле «ID счётчика Яндекс Метрики» → вставьте номер счётчика",
      });
    } else {
      checks.push({
        id: "metrika",
        name: "Яндекс Метрика",
        status: "ok",
        message: `Счётчик подключён: ${metrika.value}`,
      });
    }
  } catch {}

  // 6. Sitemap XML availability
  try {
    const siteUrlRow = await prisma.siteSettings.findUnique({
      where: { key: "site_url" },
    });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const res = await fetch(`${siteUrl}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      checks.push({
        id: "sitemap",
        name: "Sitemap XML",
        status: "ok",
        message: "Доступен — поисковые системы могут его обнаружить",
      });
    } else {
      checks.push({
        id: "sitemap",
        name: "Sitemap XML",
        status: "error",
        message: `Файл недоступен (HTTP ${res.status})`,
        fix: "Проверьте файл app/sitemap.ts — он должен возвращать корректный XML-список страниц",
      });
    }
  } catch {
    checks.push({
      id: "sitemap",
      name: "Sitemap XML",
      status: "warn",
      message: "Не удалось проверить (превышен таймаут 5 сек)",
      fix: "Откройте https://pilo-rus.ru/sitemap.xml в браузере и убедитесь, что страница открывается",
    });
  }

  // 7. YML feed for Yandex Market
  try {
    const siteUrlRow = await prisma.siteSettings.findUnique({
      where: { key: "site_url" },
    });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const res = await fetch(`${siteUrl}/api/yml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      checks.push({
        id: "yml",
        name: "YML фид (Яндекс Маркет)",
        status: "ok",
        message: "Фид доступен — товары готовы к выгрузке в маркетплейс",
      });
    } else {
      checks.push({
        id: "yml",
        name: "YML фид (Яндекс Маркет)",
        status: "error",
        message: `Фид недоступен (HTTP ${res.status})`,
        fix: "Проверьте файл app/api/yml/route.ts на наличие ошибок",
      });
    }
  } catch {
    checks.push({
      id: "yml",
      name: "YML фид (Яндекс Маркет)",
      status: "warn",
      message: "Не удалось проверить (превышен таймаут 5 сек)",
      fix: "Откройте https://pilo-rus.ru/api/yml в браузере и убедитесь, что страница возвращает XML",
    });
  }

  // 8. Push notifications VAPID keys
  try {
    const vapidRow = await prisma.siteSettings.findUnique({
      where: { key: "vapid_public" },
    });
    const subCount = await prisma.pushSubscription.count().catch(() => 0);
    // Check both DB and environment variables
    const vapidOk = !!(vapidRow?.value || process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY);
    if (!vapidOk) {
      checks.push({
        id: "push",
        name: "Push-уведомления",
        status: "warn",
        message: "VAPID-ключи не настроены — браузерные уведомления недоступны",
        fix: "Уведомления → нажмите «Сгенерировать VAPID ключи» → сохраните настройки",
      });
    } else {
      checks.push({
        id: "push",
        name: "Push-уведомления",
        status: "ok",
        message: `Активны. Подписчиков: ${subCount}`,
      });
    }
  } catch {}

  // 9. Watermark backup status
  try {
    const backup = await prisma.siteSettings.findUnique({
      where: { key: "watermark_backup_date" },
    });
    if (!backup?.value) {
      checks.push({
        id: "watermark_backup",
        name: "Резервная копия фото",
        status: "warn",
        message: "Резервная копия ещё не создавалась — водяной знак ни разу не применялся",
        fix: "Водяной знак → нажмите «Применить ко всем товарам» — бэкап создаётся автоматически перед обработкой",
      });
    } else {
      const d = new Date(backup.value);
      const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
      checks.push({
        id: "watermark_backup",
        name: "Резервная копия фото",
        status: "ok",
        message:
          daysAgo === 0
            ? "Создана сегодня"
            : `Создана ${daysAgo} ${daysAgo === 1 ? "день" : daysAgo < 5 ? "дня" : "дней"} назад`,
      });
    }
  } catch {}

  // 10. Stale orders (NEW status for more than 3 days)
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const stale = await prisma.order.count({
      where: {
        status: "NEW",
        createdAt: { lt: threeDaysAgo },
        deletedAt: null,
      },
    });
    if (stale > 0) {
      checks.push({
        id: "stale_orders",
        name: "Заказы без ответа",
        status: "warn",
        message: `${stale} ${stale === 1 ? "заказ" : stale < 5 ? "заказа" : "заказов"} в статусе «Новый» более 3 дней`,
        fix: "Заказы → отфильтруйте по статусу «Новый» → свяжитесь с клиентами и обновите статус",
      });
    } else {
      checks.push({
        id: "stale_orders",
        name: "Заказы без ответа",
        status: "ok",
        message: "Все новые заказы обрабатываются вовремя",
      });
    }
  } catch {}

  const summary = {
    ok: checks.filter((c) => c.status === "ok").length,
    warn: checks.filter((c) => c.status === "warn").length,
    error: checks.filter((c) => c.status === "error").length,
  };

  return NextResponse.json({
    checks,
    summary,
    checkedAt: new Date().toISOString(),
  });
}
