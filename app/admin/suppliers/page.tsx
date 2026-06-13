import Link from "next/link";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Handshake,
  MessageSquareText,
  Package,
  Plus,
  ScanSearch,
  ShieldCheck,
  Star,
  Truck,
  Warehouse,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";
import {
  cleanExternalUrl,
  cleanPositiveInt,
  cleanPublicAssetUrl,
  hasRawValue,
  isPublicSupplierStorefront,
  supplierStorefrontHref,
} from "@/lib/supplier-profile";
import { SupplierFeedPreviewClient } from "./supplier-feed-preview-client";
import { SupplierSiteScanPreviewClient } from "./supplier-site-scan-preview-client";

export const dynamic = "force-dynamic";

const SUPPLIER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const SUPPLIER_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];

const statusLabels: Record<string, string> = {
  DRAFT: "Кандидат",
  ACTIVE: "Активен",
  PAUSED: "Пауза",
  BLOCKED: "Заблокирован",
};

const trustLabels: Record<string, string> = {
  NEW: "Новый",
  CHECKED: "Проверен",
  PRIORITY: "Приоритет",
  RISK: "Риск",
};

function cleanString(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

async function getRole() {
  const session = await auth();
  return session?.user?.role as string | undefined;
}

async function requireSupplierAccess(write = false) {
  const role = await getRole();
  const allowed = write ? SUPPLIER_WRITE_ROLES : SUPPLIER_ROLES;
  if (!role || !allowed.includes(role)) redirect("/admin");
  return role;
}

async function makeUniqueSupplierSlug(name: string, tenantId: string) {
  const base = slugify(name) || "supplier";
  let candidate = base;
  let suffix = 1;

  while (await prisma.supplier.findUnique({ where: { tenantId_slug: { tenantId, slug: candidate } }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function createSupplierAction(formData: FormData) {
  "use server";

  await requireSupplierAccess(true);
  const tenantId = getCurrentTenantId();
  const name = cleanString(formData.get("name"), 160);
  if (!name) redirect("/admin/suppliers?error=supplier-name");

  const website = cleanExternalUrl(formData.get("website"));
  const sourceUrl = cleanExternalUrl(formData.get("sourceUrl")) || website;
  const logoUrl = cleanPublicAssetUrl(formData.get("logoUrl"));
  const storefrontEnabled = formData.get("storefrontEnabled") === "on";

  if (hasRawValue(formData.get("website")) && !website) redirect("/admin/suppliers?error=supplier-url");
  if (hasRawValue(formData.get("sourceUrl")) && !sourceUrl) redirect("/admin/suppliers?error=supplier-url");
  if (hasRawValue(formData.get("logoUrl")) && !logoUrl) redirect("/admin/suppliers?error=supplier-logo");
  if (storefrontEnabled && formData.get("publishConfirm") !== "on") redirect("/admin/suppliers?error=publish-confirm");

  await prisma.supplier.create({
    data: {
      tenantId,
      name,
      slug: await makeUniqueSupplierSlug(name, tenantId),
      legalName: cleanString(formData.get("legalName"), 220),
      inn: cleanString(formData.get("inn"), 20),
      phone: cleanString(formData.get("phone"), 60),
      email: cleanString(formData.get("email"), 120),
      website,
      sourceUrl,
      logoUrl,
      city: cleanString(formData.get("city"), 120),
      address: cleanString(formData.get("address"), 240),
      contactName: cleanString(formData.get("contactName"), 120),
      publicDescription: cleanString(formData.get("publicDescription"), 800),
      specialization: cleanString(formData.get("specialization"), 240),
      deliverySummary: cleanString(formData.get("deliverySummary"), 320),
      notes: cleanString(formData.get("notes"), 1200),
      status: storefrontEnabled ? "ACTIVE" : "DRAFT",
      trustLevel: "NEW",
      active: true,
      storefrontEnabled,
      featuredSeller: formData.get("featuredSeller") === "on",
      marketplaceRank: cleanPositiveInt(formData.get("marketplaceRank"), 100),
    },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/vendors");
  redirect("/admin/suppliers?created=supplier");
}

async function createOfferAction(formData: FormData) {
  "use server";

  await requireSupplierAccess(true);
  const tenantId = getCurrentTenantId();
  const supplierId = cleanString(formData.get("supplierId"), 128);
  const variantId = cleanString(formData.get("variantId"), 128);
  const pricePerCube = cleanNumber(formData.get("pricePerCube"));
  const pricePerPiece = cleanNumber(formData.get("pricePerPiece"));

  if (!supplierId || !variantId) redirect("/admin/suppliers?error=offer-link");
  if (pricePerCube === null && pricePerPiece === null) redirect("/admin/suppliers?error=offer-price");

  const [supplier, variant] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, tenantId }, select: { id: true } }),
    prisma.productVariant.findFirst({
      where: { id: variantId, product: { tenantId } },
      select: { id: true, product: { select: { slug: true } } },
    }),
  ]);

  if (!supplier || !variant) redirect("/admin/suppliers?error=offer-link");

  const preferred = formData.get("preferred") === "on";
  if (preferred) {
    await prisma.supplierOffer.updateMany({
      where: { tenantId, variantId, preferred: true },
      data: { preferred: false },
    });
  }

  const stockQty = cleanNumber(formData.get("stockQty"));
  const leadTimeDays = cleanNumber(formData.get("leadTimeDays"));

  await prisma.supplierOffer.upsert({
    where: { tenantId_supplierId_variantId: { tenantId, supplierId, variantId } },
    create: {
      tenantId,
      supplierId,
      variantId,
      pricePerCube,
      pricePerPiece,
      stockQty: stockQty === null ? null : Math.round(stockQty),
      leadTimeDays: leadTimeDays === null ? null : Math.round(leadTimeDays),
      city: cleanString(formData.get("city"), 120),
      deliveryText: cleanString(formData.get("deliveryText"), 240),
      notes: cleanString(formData.get("notes"), 1000),
      preferred,
      active: true,
      lastSeenAt: new Date(),
    },
    update: {
      pricePerCube,
      pricePerPiece,
      stockQty: stockQty === null ? null : Math.round(stockQty),
      leadTimeDays: leadTimeDays === null ? null : Math.round(leadTimeDays),
      city: cleanString(formData.get("city"), 120),
      deliveryText: cleanString(formData.get("deliveryText"), 240),
      notes: cleanString(formData.get("notes"), 1000),
      preferred,
      active: true,
      lastSeenAt: new Date(),
    },
  });

  revalidatePath("/admin/suppliers");
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  revalidatePath(`/product/${variant.product.slug}`);
  revalidateTag("store-shell-data");
  redirect("/admin/suppliers?created=offer");
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "нет";
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "нет";
  return `${new Intl.NumberFormat("ru-RU").format(num)} ₽`;
}

function messageFor(searchParams: Record<string, string | string[] | undefined>) {
  const created = searchParams.created;
  const error = searchParams.error;
  if (created === "supplier") return { type: "success", text: "Продавец добавлен. Теперь можно завести его предложения, а после проверки включить витрину." };
  if (created === "offer") return { type: "success", text: "Предложение продавца сохранено и доступно в админке." };
  if (error === "supplier-name") return { type: "error", text: "Укажи название продавца." };
  if (error === "supplier-url") return { type: "error", text: "Проверь ссылку: нужен корректный адрес сайта с http или https." };
  if (error === "supplier-logo") return { type: "error", text: "Логотип должен быть внутренним путем /... или корректной http(s)-ссылкой." };
  if (error === "publish-confirm") return { type: "error", text: "Для публикации витрины поставь подтверждение: карточка продавца готова к показу." };
  if (error === "offer-link") return { type: "error", text: "Выбери продавца и размер товара." };
  if (error === "offer-price") return { type: "error", text: "Укажи цену продавца за м3 или за штуку." };
  return null;
}

export default async function AdminSuppliersPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const role = await requireSupplierAccess();
  const canWrite = SUPPLIER_WRITE_ROLES.includes(role);
  const tenantId = getCurrentTenantId();
  const message = messageFor(searchParams);

  const [suppliers, offers, products, sellerLeads] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      include: { _count: { select: { offers: true } } },
      orderBy: [{ featuredSeller: "desc" }, { marketplaceRank: "asc" }, { active: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.supplierOffer.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        variant: { include: { product: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: [{ preferred: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
    prisma.product.findMany({
      where: { tenantId, active: true },
      include: { variants: { orderBy: { sortOrder: "asc" } }, category: true },
      orderBy: { name: "asc" },
      take: 120,
    }),
    prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        tags: { has: "Витрина продавца" },
      },
      select: {
        id: true,
        stage: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const activeSuppliers = suppliers.filter((supplier) => supplier.active && supplier.status === "ACTIVE").length;
  const publicStorefronts = suppliers.filter(isPublicSupplierStorefront).length;
  const scanCandidates = suppliers.filter((supplier) => supplier.sourceUrl && !supplier.storefrontEnabled).length;
  const preferredOffers = offers.filter((offer) => offer.preferred).length;
  const stockOffers = offers.filter((offer) => offer.active && (offer.stockQty ?? 0) > 0).length;
  const checkedSuppliers = suppliers.filter((supplier) => supplier.trustLevel === "CHECKED" || supplier.trustLevel === "PRIORITY").length;
  const variantOptions = products.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      label: `${product.name} / ${variant.size}`,
      price: formatMoney(variant.pricePerCube ?? variant.pricePerPiece),
    })),
  );
  const supplierPreviewOptions = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    slug: supplier.slug,
    sourceUrl: supplier.sourceUrl,
    website: supplier.website,
  }));
  const sellerLeadStats = new Map<string, { total: number; active: number; fresh: number; latest: Date | null }>();
  for (const lead of sellerLeads) {
    const supplierId = lead.tags.find((tag) => tag.startsWith("supplier-id:"))?.replace("supplier-id:", "");
    if (!supplierId) continue;
    const current = sellerLeadStats.get(supplierId) || { total: 0, active: 0, fresh: 0, latest: null };
    current.total += 1;
    if (!["WON", "LOST"].includes(lead.stage)) current.active += 1;
    if (lead.stage === "NEW") current.fresh += 1;
    if (!current.latest || lead.createdAt > current.latest) current.latest = lead.createdAt;
    sellerLeadStats.set(supplierId, current);
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Vendor Core</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Продавцы и предложения</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            ПилоРус - продавец N1 и эталонная витрина. Новые продавцы подключаются как проверенные страницы внутри биржи: профиль, сайт-источник, логотип, товары, цены и доставка.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <Package className="h-4 w-4" />
            Каталог
          </Link>
          <Link
            href="/vendors"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            Витрины
          </Link>
          <Link
            href="/admin/products/import-prices"
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Truck className="h-4 w-4" />
            Импорт цен
          </Link>
        </div>
      </div>

      {message ? (
        <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-destructive/35 bg-destructive/10 text-destructive"}`}>
          {message.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{message.text}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <MetricCard icon={Handshake} label="Продавцы" value={suppliers.length} hint={`${activeSuppliers} активных`} />
        <MetricCard icon={ExternalLink} label="Витрины" value={publicStorefronts} hint={`${scanCandidates} ждут скан`} />
        <MetricCard icon={Package} label="Предложения" value={offers.length} hint={`${preferredOffers} приоритетных`} />
        <MetricCard icon={Warehouse} label="С остатком" value={stockOffers} hint={`${checkedSuppliers} проверенных`} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <StatusNote
          icon={Star}
          title="ПилоРус - продавец N1"
          text="Главная витрина и эталон качества. Все новые продавцы подключаются рядом, но не ломают основной каталог."
        />
        <StatusNote
          icon={ScanSearch}
          title="Скан продавца"
          text="Следующий слой: сайт-источник даст логотип, фото, товары, цены и описания через превью перед переносом."
        />
        <StatusNote
          icon={ShieldCheck}
          title="Публикация под контролем"
          text="Витрина выходит наружу только после подтверждения, чтобы клиент не видел сырой карточки."
        />
      </div>

      {canWrite ? (
        <div className="mt-6">
          <SupplierSiteScanPreviewClient suppliers={supplierPreviewOptions} />
        </div>
      ) : null}

      {canWrite ? (
        <div className="mt-6">
          <SupplierFeedPreviewClient suppliers={supplierPreviewOptions} />
        </div>
      ) : null}

      {canWrite ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Добавить продавца</h2>
            </div>
            <form action={createSupplierAction} className="mt-4 grid gap-3">
              <Input name="name" label="Название" required placeholder="ПилоРус" />
              <Input name="legalName" label="Юр. название" placeholder="ООО / ИП" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="inn" label="ИНН" placeholder="10 или 12 цифр" />
                <Input name="city" label="Город / склад" placeholder="Химки" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="phone" label="Телефон" placeholder="+7 ..." />
                <Input name="email" label="Почта" placeholder="sales@example.ru" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="website" label="Сайт продавца" placeholder="https://example.ru/" />
                <Input name="sourceUrl" label="Сайт для скана" placeholder="https://example.ru/" />
              </div>
              <Input name="logoUrl" label="Логотип" placeholder="/uploads/sellers/logo.png или https://..." />
              <Input name="contactName" label="Контакт" placeholder="Имя менеджера" />
              <Input name="specialization" label="Специализация витрины" placeholder="Фанера, доска, брус, лиственница" />
              <Input name="deliverySummary" label="Доставка на витрине" placeholder="Самовывоз, доставка по Москве и МО" />
              <Textarea name="publicDescription" label="Описание для публичной витрины" placeholder="Коротко о продавце, ассортименте и условиях" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="marketplaceRank" label="Порядок в бирже" inputMode="numeric" placeholder="100" />
                <label className="flex min-h-[42px] items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                  <input name="featuredSeller" type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                  Продавец N1 / избранный
                </label>
              </div>
              <label className="flex min-h-[42px] items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <input name="storefrontEnabled" type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                Включить публичную витрину продавца
              </label>
              <label className="flex min-h-[42px] items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <input name="publishConfirm" type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                Подтверждаю: карточка продавца готова к показу
              </label>
              <Textarea name="notes" label="Заметка" placeholder="Условия, скидки, график отгрузки" />
              <SubmitButton label="Добавить продавца" />
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Предложение по товару</h2>
            </div>
            <form action={createOfferAction} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Продавец</span>
                <select name="supplierId" required className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary">
                  <option value="">Выбрать продавца</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Товар / размер</span>
                <select name="variantId" required className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary">
                  <option value="">Выбрать размер</option>
                  {variantOptions.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.label} · текущая {variant.price}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="pricePerCube" label="Цена за м3" inputMode="decimal" placeholder="17000" />
                <Input name="pricePerPiece" label="Цена за шт" inputMode="decimal" placeholder="258" />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input name="stockQty" label="Остаток, шт" inputMode="numeric" placeholder="120" />
                <Input name="leadTimeDays" label="Срок, дней" inputMode="numeric" placeholder="1" />
                <Input name="city" label="Склад" placeholder="Химки" />
              </div>
              <Input name="deliveryText" label="Доставка" placeholder="Самовывоз / машина завтра" />
              <Textarea name="notes" label="Комментарий" placeholder="Сорт, влажность, условия оплаты" />
              <label className="flex min-h-[42px] items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                <input name="preferred" type="checkbox" className="h-4 w-4 rounded border-border accent-primary" />
                Сделать приоритетным для этого размера
              </label>
              <SubmitButton label="Сохранить предложение" />
            </form>
          </section>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Продавцы биржи</h2>
          <div className="mt-4 grid gap-3">
            {suppliers.length === 0 ? (
              <EmptyState text="Продавцов пока нет. Добавь ПилоРус как продавца N1, потом подключим остальные сайты." />
            ) : suppliers.map((supplier) => {
              const storefrontHref = supplierStorefrontHref(supplier.slug);
              const publicStorefront = isPublicSupplierStorefront(supplier);
              const leadStats = sellerLeadStats.get(supplier.id) || { total: 0, active: 0, fresh: 0, latest: null };
              const sellerLeadHref = `/admin/crm?search=${encodeURIComponent(`seller:${supplier.slug}`)}`;
              return (
                <article key={supplier.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card text-sm font-bold text-primary">
                        {supplier.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={supplier.logoUrl} alt={supplier.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          supplier.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {supplier.featuredSeller ? "N1 · " : null}
                          {supplier.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[supplier.city, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "Контакты не заполнены"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {supplier.specialization || "Специализация еще не заполнена"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={publicStorefront ? "primary" : "muted"}>{publicStorefront ? "Витрина" : "Кандидат"}</Badge>
                      <Badge>{statusLabels[supplier.status] || supplier.status}</Badge>
                      <Badge>{trustLabels[supplier.trustLevel] || supplier.trustLevel}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
                    <span>{supplier._count.offers} предложений</span>
                    <span>{leadStats.active} заявок в работе / {leadStats.total} всего</span>
                    <span>Порядок: {supplier.marketplaceRank}</span>
                    <span>{supplier.sourceUrl ? "Сайт для скана есть" : "Сайт для скана не указан"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {publicStorefront ? (
                      <Link href={storefrontHref} className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Открыть витрину
                      </Link>
                    ) : null}
                    <Link href={sellerLeadHref} className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground">
                      <MessageSquareText className="h-3.5 w-3.5" />
                      Заявки{leadStats.fresh > 0 ? ` · ${leadStats.fresh} нов.` : ""}
                    </Link>
                    {supplier.website ? (
                      <a href={supplier.website} target="_blank" rel="noreferrer" className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Сайт продавца
                      </a>
                    ) : null}
                    {supplier.sourceUrl ? (
                      <span className="inline-flex min-h-[34px] items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground">
                        <ScanSearch className="h-3.5 w-3.5" />
                        Скан в следующем слое
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Последние предложения</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {offers.length === 0 ? (
              <EmptyState text="Предложений пока нет. Сохрани первую цену продавца по товару." />
            ) : (
              <div className="divide-y divide-border">
                {offers.map((offer) => (
                  <div key={offer.id} className="grid gap-2 bg-background p-4 lg:grid-cols-[minmax(0,1.2fr)_0.8fr_0.7fr_0.6fr] lg:items-center">
                    <div>
                      <p className="font-medium text-foreground">{offer.variant.product.name}</p>
                      <p className="text-sm text-muted-foreground">{offer.variant.size} · {offer.supplier.name}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>м3: <span className="text-foreground">{formatMoney(offer.pricePerCube)}</span></p>
                      <p>шт: <span className="text-foreground">{formatMoney(offer.pricePerPiece)}</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge>{offer.stockQty ?? "?"} шт</Badge>
                      <Badge>{offer.leadTimeDays ? `${offer.leadTimeDays} дн.` : "срок ?"}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {offer.preferred ? <Badge tone="primary">Приоритет</Badge> : null}
                      <Link href={`/admin/products/${offer.variant.product.id}`} className="text-sm font-semibold text-primary hover:underline">
                        Товар
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusNote({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  placeholder,
  required,
  inputMode,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        name={name}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </label>
  );
}

function Textarea({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <textarea
        name={name}
        rows={3}
        placeholder={placeholder}
        className="rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <CheckCircle2 className="h-4 w-4" />
      {label}
    </button>
  );
}

function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" }) {
  return (
    <span className={`inline-flex min-h-[26px] items-center rounded-full border px-2.5 text-xs font-semibold ${tone === "primary" ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}>
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center bg-background p-6 text-center text-sm text-muted-foreground">
      <div>
        <Clock3 className="mx-auto mb-2 h-5 w-5 text-primary" />
        {text}
      </div>
    </div>
  );
}
