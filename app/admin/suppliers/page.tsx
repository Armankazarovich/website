import Link from "next/link";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Handshake,
  Package,
  Plus,
  ShieldCheck,
  Star,
  Truck,
  Warehouse,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getCurrentTenantId } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const SUPPLIER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE", "SELLER"];
const SUPPLIER_WRITE_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "WAREHOUSE"];

const statusLabels: Record<string, string> = {
  DRAFT: "Черновик",
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

  await prisma.supplier.create({
    data: {
      tenantId,
      name,
      slug: await makeUniqueSupplierSlug(name, tenantId),
      legalName: cleanString(formData.get("legalName"), 220),
      inn: cleanString(formData.get("inn"), 20),
      phone: cleanString(formData.get("phone"), 60),
      email: cleanString(formData.get("email"), 120),
      city: cleanString(formData.get("city"), 120),
      address: cleanString(formData.get("address"), 240),
      contactName: cleanString(formData.get("contactName"), 120),
      notes: cleanString(formData.get("notes"), 1200),
      status: "ACTIVE",
      trustLevel: "NEW",
      active: true,
    },
  });

  revalidatePath("/admin/suppliers");
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
  return new Intl.NumberFormat("ru-RU").format(num) + " ₽";
}

function messageFor(searchParams: Record<string, string | string[] | undefined>) {
  const created = searchParams.created;
  const error = searchParams.error;
  if (created === "supplier") return { type: "success", text: "Поставщик добавлен. Можно заводить предложения по товарам." };
  if (created === "offer") return { type: "success", text: "Предложение поставщика сохранено и доступно в админке." };
  if (error === "supplier-name") return { type: "error", text: "Укажи название поставщика." };
  if (error === "offer-link") return { type: "error", text: "Выбери поставщика и размер товара." };
  if (error === "offer-price") return { type: "error", text: "Укажи цену поставщика за м3 или за штуку." };
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

  const [suppliers, offers, products] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      include: { _count: { select: { offers: true } } },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
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
  ]);

  const activeSuppliers = suppliers.filter((supplier) => supplier.active && supplier.status === "ACTIVE").length;
  const preferredOffers = offers.filter((offer) => offer.preferred).length;
  const stockOffers = offers.filter((offer) => offer.active && (offer.stockQty ?? 0) > 0).length;
  const variantOptions = products.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      label: `${product.name} / ${variant.size}`,
      price: formatMoney(variant.pricePerCube ?? variant.pricePerPiece),
    })),
  );

  return (
    <div className="admin-page-frame admin-page-frame-fluid pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">Мультивендор</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Поставщики и предложения</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Первый слой маркетплейса: ПилоРус остается единой витриной, а внутри админки мы видим продавцов, их цены, остатки и приоритетные предложения.
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
        <MetricCard icon={Handshake} label="Поставщики" value={suppliers.length} hint={`${activeSuppliers} активных`} />
        <MetricCard icon={Package} label="Предложения" value={offers.length} hint={`${preferredOffers} приоритетных`} />
        <MetricCard icon={Warehouse} label="С остатком" value={stockOffers} hint="по поставщикам" />
        <MetricCard icon={ShieldCheck} label="Проверка" value={suppliers.filter((s) => s.trustLevel === "CHECKED" || s.trustLevel === "PRIORITY").length} hint="доверенные" />
      </div>

      {canWrite ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Добавить поставщика</h2>
            </div>
            <form action={createSupplierAction} className="mt-4 grid gap-3">
              <Input name="name" label="Название" required placeholder="Лесная база Химки" />
              <Input name="legalName" label="Юр. название" placeholder="ООО / ИП" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="inn" label="ИНН" placeholder="10 или 12 цифр" />
                <Input name="city" label="Город / склад" placeholder="Химки" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="phone" label="Телефон" placeholder="+7 ..." />
                <Input name="email" label="Почта" placeholder="sales@example.ru" />
              </div>
              <Input name="contactName" label="Контакт" placeholder="Имя менеджера" />
              <Textarea name="notes" label="Заметка" placeholder="Условия, скидки, график отгрузки" />
              <SubmitButton label="Добавить поставщика" />
            </form>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Предложение по товару</h2>
            </div>
            <form action={createOfferAction} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-foreground">Поставщик</span>
                <select name="supplierId" required className="min-h-[42px] rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary">
                  <option value="">Выбрать поставщика</option>
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
          <h2 className="font-display text-lg font-semibold text-foreground">Поставщики</h2>
          <div className="mt-4 grid gap-3">
            {suppliers.length === 0 ? (
              <EmptyState text="Поставщиков пока нет. Добавь первого, потом привяжем к нему цены и остатки." />
            ) : suppliers.map((supplier) => (
              <article key={supplier.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{supplier.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[supplier.city, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "Контакты не заполнены"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{statusLabels[supplier.status] || supplier.status}</Badge>
                    <Badge>{trustLabels[supplier.trustLevel] || supplier.trustLevel}</Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>{supplier._count.offers} предложений</span>
                  <span>ИНН: {supplier.inn || "нет"}</span>
                  <span>{supplier.active ? "В работе" : "Выключен"}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">Последние предложения</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {offers.length === 0 ? (
              <EmptyState text="Предложений пока нет. Сохрани первую цену поставщика по товару." />
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
