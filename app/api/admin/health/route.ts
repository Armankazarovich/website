export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  return session && (role === "ADMIN" || role === "SUPER_ADMIN");
}

type CheckResult = {
  id: string;
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  detail?: string;
  fix?: string;
  version?: string;
  versionOk?: boolean;
  category: string;
  autoFixable?: boolean;
};

export async function GET() {
  if (!(await checkAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const checks: CheckResult[] = [];

  // ── ИНФРАСТРУКТУРА ────────────────────────────────────────────────

  // 1. Node.js version
  const nodeVersion = process.version; // e.g. "v20.11.0"
  const nodeMajor = parseInt(nodeVersion.replace("v", "").split(".")[0]);
  checks.push({
    id: "nodejs",
    name: "Node.js",
    category: "infrastructure",
    status: nodeMajor >= 18 ? "ok" : nodeMajor >= 16 ? "warn" : "error",
    message: nodeMajor >= 18
      ? `Версия ${nodeVersion} — актуальная LTS`
      : `Версия ${nodeVersion} — рекомендуется обновить до v20+`,
    version: nodeVersion,
    versionOk: nodeMajor >= 18,
    fix: nodeMajor < 18 ? "Обновите Node.js до версии 20 LTS на сервере: `nvm install 20 && nvm use 20`" : undefined,
  });

  // 2. Next.js version
  let nextVersion = "неизвестно";
  let nextOk = false;
  try {
    const pkg = await import("../../../../package.json").then(m => m.default).catch(() => null);
    nextVersion = pkg?.dependencies?.next || pkg?.devDependencies?.next || "неизвестно";
    const major = parseInt(nextVersion.replace(/[^\d]/, "").split(".")[0]);
    nextOk = major >= 14;
  } catch {}
  checks.push({
    id: "nextjs",
    name: "Next.js",
    category: "infrastructure",
    status: nextOk ? "ok" : "warn",
    message: nextOk ? `Версия ${nextVersion} — актуальная` : `Версия ${nextVersion} — проверьте обновления`,
    version: nextVersion,
    versionOk: nextOk,
    detail: "Next.js 14+ App Router с Server Components и Server Actions",
  });

  // 3. Memory usage
  const mem = process.memoryUsage();
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
  const memPercent = Math.round((heapMb / heapTotalMb) * 100);
  checks.push({
    id: "memory",
    name: "Память (RAM)",
    category: "infrastructure",
    status: memPercent < 70 ? "ok" : memPercent < 90 ? "warn" : "error",
    message: `Использовано ${heapMb} МБ из ${heapTotalMb} МБ (${memPercent}%)`,
    detail: `RSS: ${Math.round(mem.rss / 1024 / 1024)} МБ · External: ${Math.round(mem.external / 1024 / 1024)} МБ`,
    fix: memPercent >= 70 ? "Перезапустите PM2: `pm2 restart pilo-rus --update-env` или оптимизируйте тяжёлые запросы" : undefined,
  });

  // 4. Database connectivity + stats
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [productCount, orderCount, userCount, variantCount] = await Promise.all([
      prisma.product.count({ where: { active: true } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.user.count(),
      prisma.productVariant.count(),
    ]);
    checks.push({
      id: "db",
      name: "База данных PostgreSQL",
      category: "infrastructure",
      status: "ok",
      message: `Подключена и работает`,
      detail: `Товаров: ${productCount} · Вариантов: ${variantCount} · Заказов: ${orderCount} · Пользователей: ${userCount}`,
      version: "PostgreSQL",
      versionOk: true,
    });
  } catch (e: any) {
    checks.push({
      id: "db",
      name: "База данных PostgreSQL",
      category: "infrastructure",
      status: "error",
      message: `Ошибка подключения: ${e.message?.slice(0, 100)}`,
      fix: "Проверьте переменную DATABASE_URL в .env или настройках хостинга. Убедитесь что PostgreSQL запущен.",
    });
  }

  // 5. SSL certificate check (HEAD request)
  try {
    const siteUrlRow = await prisma.siteSettings.findUnique({ where: { key: "site_url" } });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const isHttps = siteUrl.startsWith("https://");
    if (!isHttps) {
      checks.push({
        id: "ssl",
        name: "SSL / HTTPS",
        category: "infrastructure",
        status: "error",
        message: "Сайт работает по HTTP — данные не зашифрованы",
        fix: "Установите SSL-сертификат на хостинге (Beget → Сертификаты → Let's Encrypt)",
        detail: "HTTPS обязателен для SEO и безопасности пользователей",
      });
    } else {
      const res = await fetch(siteUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) }).catch(() => null);
      const responseTime = res ? 200 : 0;
      checks.push({
        id: "ssl",
        name: "SSL / HTTPS",
        category: "infrastructure",
        status: res ? "ok" : "warn",
        message: res ? `Сертификат активен · HTTPS работает` : "Не удалось проверить — сайт может быть недоступен",
        detail: `${siteUrl} · ${res ? `HTTP ${res.status}` : "таймаут"}`,
        versionOk: true,
      });
    }
  } catch {}

  // 6. Sitemap XML
  try {
    const siteUrlRow = await prisma.siteSettings.findUnique({ where: { key: "site_url" } });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const res = await fetch(`${siteUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (res?.ok) {
      checks.push({
        id: "sitemap",
        name: "Sitemap XML",
        category: "seo",
        status: "ok",
        message: "Доступен — поисковые системы индексируют сайт",
        detail: "Яндекс и Google используют sitemap.xml для обнаружения страниц",
      });
    } else {
      checks.push({
        id: "sitemap",
        name: "Sitemap XML",
        category: "seo",
        status: res ? "error" : "warn",
        message: res ? `Недоступен (HTTP ${res.status})` : "Не удалось проверить (таймаут 5 сек)",
        fix: "Откройте /sitemap.xml в браузере. Проверьте файл app/sitemap.ts",
      });
    }
  } catch {}

  // 7. YML feed
  try {
    const siteUrlRow = await prisma.siteSettings.findUnique({ where: { key: "site_url" } });
    const siteUrl = siteUrlRow?.value || "https://pilo-rus.ru";
    const res = await fetch(`${siteUrl}/api/yml`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
    const activeCount = await prisma.product.count({ where: { active: true } }).catch(() => 0);
    if (res?.ok) {
      checks.push({
        id: "yml",
        name: "YML фид (Яндекс.Маркет)",
        category: "seo",
        status: "ok",
        message: `Фид работает · ${activeCount} активных товаров`,
        detail: "Используется для выгрузки товаров в Яндекс.Маркет и другие маркетплейсы",
      });
    } else {
      checks.push({
        id: "yml",
        name: "YML фид (Яндекс.Маркет)",
        category: "seo",
        status: res ? "error" : "warn",
        message: `Фид ${res ? `недоступен (HTTP ${res.status})` : "не проверен (таймаут)"}`,
        fix: "Проверьте /api/yml/route.ts на ошибки",
      });
    }
  } catch {}

  // 8. Yandex Metrika
  try {
    const metrika = await prisma.siteSettings.findUnique({ where: { key: "yandex_metrika_id" } });
    if (!metrika?.value) {
      checks.push({
        id: "metrika",
        name: "Яндекс Метрика",
        category: "analytics",
        status: "warn",
        message: "Счётчик не подключён — статистика посещений не собирается",
        fix: "Аналитика → поле «ID счётчика Яндекс Метрики» → вставьте номер счётчика",
        detail: "Без Метрики вы не видите откуда приходят клиенты и какие страницы популярны",
      });
    } else {
      checks.push({
        id: "metrika",
        name: "Яндекс Метрика",
        category: "analytics",
        status: "ok",
        message: `Счётчик подключён: ${metrika.value}`,
        detail: "Данные о посетителях собираются и доступны в Яндекс Метрике",
      });
    }
  } catch {}

  // 9. SMTP email
  try {
    const smtpRow = await prisma.siteSettings.findUnique({ where: { key: "smtp_host" } });
    if (!smtpRow?.value) {
      checks.push({
        id: "smtp",
        name: "Email / SMTP",
        category: "notifications",
        status: "warn",
        message: "SMTP не настроен — email-рассылка и уведомления недоступны",
        fix: "Email рассылка → SMTP настройки → введите данные smtp.beget.com, port 465",
        detail: "Без SMTP клиенты не получают письма о заказах, а менеджеры не получают уведомления",
      });
    } else {
      checks.push({
        id: "smtp",
        name: "Email / SMTP",
        category: "notifications",
        status: "ok",
        message: `Настроен: ${smtpRow.value}`,
        detail: "Email-уведомления о заказах и рассылки работают",
      });
    }
  } catch {}

  // 10. Push notifications (VAPID)
  try {
    const vapidRow = await prisma.siteSettings.findUnique({ where: { key: "vapid_public" } });
    const subCount = await prisma.pushSubscription.count().catch(() => 0);
    const vapidOk = !!(vapidRow?.value || process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY);
    checks.push({
      id: "push",
      name: "Push-уведомления",
      category: "notifications",
      status: vapidOk ? "ok" : "warn",
      message: vapidOk ? `Активны · Подписчиков: ${subCount}` : "VAPID-ключи не настроены",
      fix: !vapidOk ? "Уведомления → нажмите «Сгенерировать VAPID ключи» → сохраните" : undefined,
      detail: "Push-уведомления в браузере — акции, новые поступления, статус заказа",
    });
  } catch {}

  // 11. Telegram bot
  try {
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChat = process.env.TELEGRAM_CHAT_ID;
    if (!tgToken || !tgChat) {
      checks.push({
        id: "telegram",
        name: "Telegram-бот",
        category: "notifications",
        status: "warn",
        message: "Бот не настроен — уведомления в Telegram не работают",
        fix: "Уведомления → настройте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env",
        detail: "Telegram-бот отправляет уведомления о новых заказах и позволяет менять статусы",
      });
    } else {
      const botRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, {
        signal: AbortSignal.timeout(5000),
      }).then(r => r.json()).catch(() => null);
      const ok = botRes?.ok;
      checks.push({
        id: "telegram",
        name: "Telegram-бот",
        category: "notifications",
        status: ok ? "ok" : "warn",
        message: ok ? `Бот @${botRes.result?.username} активен` : "Не удалось подключиться к боту",
        fix: !ok ? "Проверьте правильность TELEGRAM_BOT_TOKEN — создайте нового бота у @BotFather" : undefined,
        detail: ok ? `Бот: @${botRes.result?.username} · Chat ID: ${tgChat}` : "Бот может быть заблокирован или токен неверный",
      });
    }
  } catch {}

  // 12. Product images coverage
  try {
    const noImg = await prisma.product.count({ where: { images: { isEmpty: true }, active: true } });
    const total = await prisma.product.count({ where: { active: true } });
    if (noImg > 0) {
      checks.push({
        id: "product_images",
        name: "Фото товаров",
        category: "catalog",
        status: "warn",
        message: `${noImg} из ${total} активных товаров без фото`,
        fix: "Каталог → откройте товар → загрузите фотографии",
        detail: "Товары без фото хуже продаются и выглядят непрофессионально",
      });
    } else {
      checks.push({
        id: "product_images",
        name: "Фото товаров",
        category: "catalog",
        status: "ok",
        message: `Все ${total} активных товаров с фотографиями`,
      });
    }
  } catch {}

  // 13. Product prices
  try {
    const noPriceVariants = await prisma.productVariant.count({
      where: { pricePerCube: null, pricePerPiece: null, product: { active: true } },
    });
    if (noPriceVariants > 0) {
      checks.push({
        id: "product_prices",
        name: "Цены товаров",
        category: "catalog",
        status: "warn",
        message: `${noPriceVariants} вариантов без цены`,
        fix: "Каталог → откройте товар → вкладка «Варианты» → укажите цену",
        detail: "Варианты без цены не отображаются клиентам в корзине",
      });
    } else {
      checks.push({
        id: "product_prices",
        name: "Цены товаров",
        category: "catalog",
        status: "ok",
        message: "У всех вариантов активных товаров указаны цены",
      });
    }
  } catch {}

  // 14. Stale orders
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const stale = await prisma.order.count({
      where: { status: "NEW", createdAt: { lt: threeDaysAgo }, deletedAt: null },
    });
    if (stale > 0) {
      checks.push({
        id: "stale_orders",
        name: "Заказы без ответа",
        category: "sales",
        status: "warn",
        message: `${stale} ${stale === 1 ? "заказ" : stale < 5 ? "заказа" : "заказов"} в статусе «Новый» более 3 дней`,
        fix: "Заказы → отфильтруйте по статусу «Новый» → свяжитесь с клиентами",
        detail: "Необработанные заказы снижают конверсию и доверие клиентов",
      });
    } else {
      checks.push({
        id: "stale_orders",
        name: "Заказы без ответа",
        category: "sales",
        status: "ok",
        message: "Все новые заказы обрабатываются вовремя",
      });
    }
  } catch {}

  // 15. Watermark backup
  try {
    const backup = await prisma.siteSettings.findUnique({ where: { key: "watermark_backup_date" } });
    if (!backup?.value) {
      checks.push({
        id: "watermark_backup",
        name: "Резервная копия фото",
        category: "media",
        status: "warn",
        message: "Резервная копия ещё не создавалась",
        fix: "Водяной знак → «Применить ко всем товарам» — бэкап создаётся автоматически",
        detail: "Бэкап защищает от случайного повреждения оригинальных фотографий",
      });
    } else {
      const d = new Date(backup.value);
      const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
      checks.push({
        id: "watermark_backup",
        name: "Резервная копия фото",
        category: "media",
        status: "ok",
        message: daysAgo === 0 ? "Создана сегодня" : `Создана ${daysAgo} дн. назад`,
        detail: `Последний бэкап: ${d.toLocaleDateString("ru-RU")}`,
      });
    }
  } catch {}

  const summary = {
    ok:    checks.filter(c => c.status === "ok").length,
    warn:  checks.filter(c => c.status === "warn").length,
    error: checks.filter(c => c.status === "error").length,
  };

  return NextResponse.json({
    checks,
    summary,
    checkedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
  });
}
