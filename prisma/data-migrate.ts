/**
 * data-migrate.ts — Идемпотентные миграции данных для продакшна.
 * Запускается при каждом деплое (часть build скрипта).
 * Все операции проверяют текущее состояние перед изменением — безопасно запускать многократно.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();

async function upsertSetting(key: string, value: string) {
  try {
    await prisma.siteSettings.create({ data: { id: key, key, value } });
  } catch {
    await prisma.siteSettings.update({ where: { key }, data: { value } });
  }
}

async function main() {
  console.log("[data-migrate] Запуск миграций данных...");

  // ── 2026-03-29: Изменения по запросу клиента ─────────────────────────────

  // 1. Режим работы 09:00-20:00
  const existingHours = await prisma.siteSettings.findUnique({ where: { key: "working_hours" } });
  if (!existingHours || !existingHours.value.includes("20:00")) {
    await upsertSetting("working_hours", "Пн–Сб: 09:00–20:00, Вс: 09:00–18:00");
    console.log("[data-migrate] ✓ Режим работы обновлён");
  }

  // 2. Дополнительные телефоны (если нет)
  // 20.04.2026: phone2 (8-999-662-26-02) удалён по просьбе клиента.
  // Слот сохранён в БД и админке — клиент может заполнить новым номером.
  const phone3 = await prisma.siteSettings.findUnique({ where: { key: "phone3" } });
  if (!phone3) {
    await upsertSetting("phone3", "8-977-606-80-20");
    await upsertSetting("phone3_link", "+79776068020");
    console.log("[data-migrate] ✓ phone3 добавлен");
  }

  // 20.04.2026: одноразовая очистка старого phone2 (идемпотентно — проверяем точное значение)
  const currentPhone2 = await prisma.siteSettings.findUnique({ where: { key: "phone2" } });
  if (currentPhone2 && currentPhone2.value === "8-999-662-26-02") {
    await upsertSetting("phone2", "");
    await upsertSetting("phone2_link", "");
    console.log("[data-migrate] ✓ phone2 (8-999-662-26-02) очищен по запросу клиента");
  }

  // 3. Категории — найти по slug
  const kedrCat = await prisma.category.findUnique({ where: { slug: "kedr" } });
  const faneraCat = await prisma.category.findFirst({
    where: { slug: { in: ["fanera", "fanera-dsp-mdf-osb"] } }
  });
  const dspCat = await prisma.category.findFirst({
    where: { slug: { in: ["dsp-mdf-osb", "dsp-mdf-osb-csp", "dsp"] } }
  });

  // 4. Деактивировать товары Кедр + скрыть категорию
  if (kedrCat) {
    const activeKedr = await prisma.product.count({ where: { categoryId: kedrCat.id, active: true } });
    if (activeKedr > 0) {
      await prisma.product.updateMany({ where: { categoryId: kedrCat.id }, data: { active: false } });
      console.log(`[data-migrate] ✓ Кедр: ${activeKedr} товаров деактивировано`);
    }
    if (kedrCat.sortOrder !== 999) {
      await prisma.category.update({ where: { id: kedrCat.id }, data: { sortOrder: 999 } });
      console.log("[data-migrate] ✓ Кедр категория скрыта (sortOrder=999)");
    }
  }

  // 5. Переместить ДСП товары в Фанеру + скрыть ДСП категорию
  if (dspCat && faneraCat && dspCat.id !== faneraCat.id) {
    const dspProducts = await prisma.product.count({ where: { categoryId: dspCat.id } });
    if (dspProducts > 0) {
      await prisma.product.updateMany({ where: { categoryId: dspCat.id }, data: { categoryId: faneraCat.id } });
      console.log(`[data-migrate] ✓ ДСП: ${dspProducts} товаров перемещено в Фанеру`);
    }
    if (dspCat.sortOrder !== 999) {
      await prisma.category.update({ where: { id: dspCat.id }, data: { sortOrder: 999 } });
      console.log("[data-migrate] ✓ ДСП категория скрыта");
    }
  }

  // 6. Переименовать Фанеру
  if (faneraCat && faneraCat.name === "Фанера") {
    await prisma.category.update({
      where: { id: faneraCat.id },
      data: { name: "Фанера, ДСП, МДФ, ОСБ" }
    });
    console.log("[data-migrate] ✓ Категория переименована в «Фанера, ДСП, МДФ, ОСБ»");
  }

  // 7. Восстановить изображения категорий если файл отсутствует на диске
  // Логика: если у категории нет фото или загруженный файл не найден — восстановить стабильный.
  // Если файл upload-* существует (пользователь заменил фото) — не трогать.
  const stableImages: Record<string, string> = {
    "sosna-el":    "/images/categories/sosna-el.webp",
    "listvennitsa":"/images/categories/listvennitsa.png",
    "lipa-osina":  "/images/categories/lipa-osina.webp",
    "fanera":      "/images/categories/fanera.webp",
    "kedr":        "/images/categories/kedr.png",
  };
  for (const [slug, stablePath] of Object.entries(stableImages)) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) continue;

    let needsRestore = false;
    if (!cat.image) {
      // Нет фото → восстановить
      needsRestore = true;
    } else if (cat.image.includes("upload-")) {
      // Есть upload-* URL — проверяем существует ли файл физически
      const filePath = join(process.cwd(), "public", cat.image);
      if (!existsSync(filePath)) {
        // Файл потерян (новый сервер или удалён) → восстановить
        needsRestore = true;
      }
      // Файл жив → пользователь сменил фото, не трогаем
    }

    if (needsRestore) {
      await prisma.category.update({ where: { slug }, data: { image: stablePath } });
      console.log(`[data-migrate] ✓ Восстановлено фото ${slug}: ${stablePath}`);
    }
  }

  // 8. Установить showInMenu/showInFooter для существующих категорий
  // Скрытые (sortOrder=999) → false, остальные → true (только если поле ещё не задано вручную)
  const allCats = await prisma.category.findMany({ select: { id: true, slug: true, sortOrder: true } });
  for (const cat of allCats) {
    const isHiddenByOrder = cat.sortOrder >= 999;
    // Принудительно скрываем kedr и dsp из навигации
    const forceHide = ["kedr", "dsp-mdf-osb", "dsp-mdf-osb-csp"].includes(cat.slug);
    if (isHiddenByOrder || forceHide) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { showInMenu: false, showInFooter: false },
      });
    }
  }
  console.log("[data-migrate] ✓ Флаги навигации категорий обновлены");

  // 9. Редиректы категорий (для middleware — 301 перенаправления старых ссылок)
  const knownRedirects = [
    { fromSlug: "kedr",        toSlug: null,     permanent: true },  // /catalog?category=kedr → /catalog
    { fromSlug: "dsp-mdf-osb", toSlug: "fanera", permanent: true },  // → /catalog?category=fanera
    { fromSlug: "dsp-mdf-osb-csp", toSlug: "fanera", permanent: true },
  ];
  for (const r of knownRedirects) {
    await prisma.categoryRedirect.upsert({
      where:  { fromSlug: r.fromSlug },
      create: { fromSlug: r.fromSlug, toSlug: r.toSlug, permanent: r.permanent },
      update: {},
    });
  }
  console.log("[data-migrate] ✓ Редиректы категорий установлены (шаг 9)");

  // ── 2026-04-19: Multi-tenancy подготовка (Stage 1) ───────────────────────
  // 10. Создаём дефолтный тенант "pilorus" (если нет)
  //     Все существующие данные получили tenantId="pilorus" через @default.
  try {
    const existingTenant = await (prisma as any).tenant?.findUnique?.({ where: { slug: "pilorus" } });
    if (existingTenant === null || existingTenant === undefined) {
      await (prisma as any).tenant?.create?.({
        data: {
          slug: "pilorus",
          name: "ПилоРус",
          domain: "pilo-rus.ru",
          plan: "enterprise",
          active: true,
        },
      });
      console.log("[data-migrate] ✓ Дефолтный тенант pilorus создан (шаг 10)");
    } else {
      console.log("[data-migrate] ✓ Дефолтный тенант pilorus уже существует (шаг 10)");
    }
  } catch (e: any) {
    // Если модель Tenant ещё не сгенерирована в prisma client — не фейлим билд
    console.log("[data-migrate] ⚠ Tenant seed пропущен:", e.message);
  }

  // ── Шаг 12: Тестовый тенант "stroymaterialy" (multi-tenancy day 1, 27.04.2026)
  // Используется для тестирования tenant-isolation. БЕЗ домена и логотипа —
  // настоящие данные клиент Стройматериалы получит при запуске (план 12-18 мая).
  // Создаём только tenant-запись; данные (товары/заказы) пока не сидируем —
  // изоляция проверяется на пустом tenant: с ENABLE_TENANT_FILTER=1 stroymaterialy
  // должен видеть пустоту, pilorus — все существующие данные.
  try {
    const existingStroy = await (prisma as any).tenant?.findUnique?.({
      where: { slug: "stroymaterialy" },
    });
    if (existingStroy === null || existingStroy === undefined) {
      await (prisma as any).tenant?.create?.({
        data: {
          slug: "stroymaterialy",
          name: "Стройматериалы (тест multi-tenancy)",
          plan: "free",
          active: true,
          settings: {
            note: "Тестовый tenant для проверки изоляции. Создан 27.04.2026 в день 1 multi-tenancy.",
          },
        },
      });
      console.log("[data-migrate] ✓ Тестовый тенант stroymaterialy создан (шаг 12)");
    } else {
      console.log("[data-migrate] ✓ Тестовый тенант stroymaterialy уже существует (шаг 12)");
    }
  } catch (e: any) {
    console.log("[data-migrate] ⚠ stroymaterialy seed пропущен:", e.message);
  }

  // ── Шаг 11: Деактивация промо «Бесплатная доставка» (запрос клиента Пилорус, 23.04.2026)
  try {
    const result = await prisma.promotion.updateMany({
      where: {
        active: true,
        OR: [
          { title: { contains: "Бесплатная доставка", mode: "insensitive" } },
          { title: { contains: "бесплатн", mode: "insensitive" } },
          { description: { contains: "доставка бесплатна", mode: "insensitive" } },
        ],
      },
      data: { active: false },
    });
    if (result.count > 0) {
      console.log(`[data-migrate] ✓ Деактивировано промо «Бесплатная доставка» (${result.count} записей) — шаг 11`);
    } else {
      console.log("[data-migrate] ✓ Промо «Бесплатная доставка» не найдено (уже удалено/деактивировано) — шаг 11");
    }
  } catch (e: any) {
    console.log("[data-migrate] ⚠ Деактивация промо пропущена:", e.message);
  }

  // ── 26.04.2026: Сид постоянных подписок на AI / инфраструктуру ────────────
  // Идемпотентно: проверяем существование по name, не дубль.
  try {
    const seedSubs: Array<{
      provider: string; name: string; costUsd?: number; costRub?: number;
      billingDay?: number; billingType: string; notes?: string;
    }> = [
      {
        provider: "anthropic", name: "Claude Max plan (личный инструмент Армана)",
        costUsd: 240, billingDay: 8, billingType: "monthly",
        notes: "20x usage Pro. Claude.ai чат + Claude Code + Cowork. Это НЕ расход на Арая (pilo-rus.ru), а личный инструмент для работы со мной. Visa-1724.",
      },
      {
        provider: "anthropic", name: "Anthropic API Credits (для Арая на сайте)",
        costUsd: undefined, billingType: "prepaid",
        notes: "Prepaid credits, без авто-списания. Auto reload OFF. Реальный расход на Арая (pilo-rus.ru) логируется автоматически по каждому вызову.",
      },
      {
        provider: "elevenlabs", name: "ElevenLabs Creator (TTS Арая)",
        costUsd: 22, billingDay: 10, billingType: "monthly",
        notes: "100,000 кредитов/мес. Multilingual v2. Workspace 'Одиннадцатый творческий'. Реальный расход тоже логируется.",
      },
      {
        provider: "google", name: "Google AI Plus 200GB",
        costUsd: 3.99, billingDay: 10, billingType: "monthly",
        notes: "Промо $3.99/мес до 10 июня 2026, далее $7.99/мес. Visa-1724.",
      },
    ];

    let createdSubs = 0;
    for (const sub of seedSubs) {
      const existing = await (prisma as any).apiSubscription.findFirst({ where: { name: sub.name } });
      if (!existing) {
        await (prisma as any).apiSubscription.create({
          data: { ...sub, active: true },
        });
        createdSubs++;
      }
    }
    if (createdSubs > 0) console.log(`[data-migrate] ✓ Постоянные подписки засеяны (${createdSubs} новых)`);
  } catch (e: any) {
    console.log("[data-migrate] ⚠ Сид подписок пропущен:", e.message);
  }

  console.log("[data-migrate] Готово.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[data-migrate] ОШИБКА:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
