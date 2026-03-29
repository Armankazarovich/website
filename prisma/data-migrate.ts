/**
 * data-migrate.ts — Идемпотентные миграции данных для продакшна.
 * Запускается при каждом деплое (часть build скрипта).
 * Все операции проверяют текущее состояние перед изменением — безопасно запускать многократно.
 */

import { PrismaClient } from "@prisma/client";
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
  const phone2 = await prisma.siteSettings.findUnique({ where: { key: "phone2" } });
  if (!phone2) {
    await upsertSetting("phone2", "8-999-662-26-02");
    await upsertSetting("phone2_link", "+79996622602");
    console.log("[data-migrate] ✓ phone2 добавлен");
  }
  const phone3 = await prisma.siteSettings.findUnique({ where: { key: "phone3" } });
  if (!phone3) {
    await upsertSetting("phone3", "8-977-606-80-20");
    await upsertSetting("phone3_link", "+79776068020");
    console.log("[data-migrate] ✓ phone3 добавлен");
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

  // 7. Редиректы категорий (для middleware — 301 перенаправления старых ссылок)
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
  console.log("[data-migrate] ✓ Редиректы категорий установлены");

  console.log("[data-migrate] Готово.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("[data-migrate] ОШИБКА:", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
