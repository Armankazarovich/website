export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import {
  ShoppingBag, Package, Star, Clock, Users, Truck, Warehouse, Target,
  Mail, Wallet, BarChart2, CheckSquare, HeartPulse,
  UserCircle, FileDown, ChevronRight, Zap, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { DashboardTopItems } from "@/components/admin/dashboard-top-items";
import { DashboardGreeting } from "@/components/admin/dashboard-greeting";
import { DashboardMetrics, CourierMetrics } from "@/components/admin/dashboard-metrics";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { DashboardActions } from "@/components/admin/dashboard-actions";
import { DashboardArayAdvice } from "@/components/admin/dashboard-aray-advice";
import {
  ARAY_ICON_TONE,
  ARAY_ICON_TONE_WARNING,
  ARAY_ICON_TONE_SUCCESS,
} from "@/lib/aray-design-tokens";
// DashboardArayRail убран — Арай теперь fixed справа в AdminShell на ВСЕЙ админке
// (сессия 40 hotfix: видение Армана для сенсорных мониторов/телевизоров)

// ─────────────────────────────────────────────────────────────────────────────
// Сессия 40 (28.04.2026) — рабочий стол как эталонный экран.
// Полная переписка под calm UI магазина:
//  - Все aray-stat-card / arayglass-grid-* убраны.
//  - bg-card border-border rounded-2xl на каждом блоке.
//  - Palette-aware иконки: один акцент выбранной атмосферы, warning/success/danger только по смыслу.
//  - font-display для крупных значений, primary акцент на имени и сумме.
//  - Quick Actions grid 2/3/4 col с палитро-зависимой иконкой в круге.
//  - Чистый адаптив 375 / 640 / 1024 / 1280.
//  - DashboardActions (client) регистрирует "Новый заказ" в хедер AppHeader.
//  - DashboardArayRail справа на ≥lg как превью архитектуры pinned-rail.
// ─────────────────────────────────────────────────────────────────────────────

interface QuickAction {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface TodayImportantItem {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tone: "primary" | "warning" | "success";
}

interface ArayAdvice {
  label?: string;
  title: string;
  text: string;
  prompt: string;
}

const IMPORTANT_TONE: Record<TodayImportantItem["tone"], string> = {
  primary: ARAY_ICON_TONE,
  warning: ARAY_ICON_TONE_WARNING,
  success: ARAY_ICON_TONE_SUCCESS,
};


const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  owner: [
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2 },
    { href: "/admin/finance", label: "Финансы", icon: Wallet },
    { href: "/admin/products", label: "Каталог", icon: Package },
    { href: "/admin/email", label: "Рассылки", icon: Mail },
  ],
  manager: [
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle },
    { href: "/admin/crm", label: "CRM", icon: Target },
    { href: "/admin/delivery", label: "Доставка", icon: Truck },
    { href: "/admin/products", label: "Каталог", icon: Package },
    { href: "/admin/reviews", label: "Отзывы", icon: Star },
    { href: "/admin/tasks", label: "Задачи", icon: CheckSquare },
    { href: "/admin/inventory", label: "Склад", icon: Warehouse },
  ],
  courier: [
    { href: "/admin/delivery", label: "Доставки", icon: Truck },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/admin/tasks", label: "Задачи", icon: CheckSquare },
    { href: "/admin/help", label: "Помощь", icon: HeartPulse },
  ],
  accountant: [
    { href: "/admin/finance", label: "Финансы", icon: Wallet },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/admin/analytics", label: "Аналитика", icon: BarChart2 },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle },
  ],
  warehouse: [
    { href: "/admin/inventory", label: "Склад", icon: Warehouse },
    { href: "/admin/products", label: "Каталог", icon: Package },
    { href: "/admin/import", label: "Импорт", icon: FileDown },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  ],
  seller: [
    { href: "/admin/products", label: "Каталог", icon: Package },
    { href: "/admin/orders", label: "Заказы", icon: ShoppingBag },
    { href: "/admin/clients", label: "Клиенты", icon: UserCircle },
    { href: "/admin/reviews", label: "Отзывы", icon: Star },
  ],
};

const ROLE_GREETINGS: Record<string, string> = {
  SUPER_ADMIN: "Владелец платформы",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Кладовщик",
  SELLER: "Продавец",
};

function buildArayAdvice({
  newOrders,
  pendingReviews,
  pendingStaff,
  totalOrders,
  zeroStockVariants,
  zeroStockMarkedInStock,
}: {
  newOrders: number;
  pendingReviews: number;
  pendingStaff: number;
  totalOrders: number;
  zeroStockVariants: number;
  zeroStockMarkedInStock: number;
}): ArayAdvice | null {
  if (zeroStockVariants > 0) {
    const zeroStockLabel = `${zeroStockVariants} ${pluralizeRu(zeroStockVariants, ["позиция", "позиции", "позиций"])} с остатком 0`;
    const mismatchLabel = `${zeroStockMarkedInStock} ${pluralizeRu(zeroStockMarkedInStock, ["позиция", "позиции", "позиций"])} с флагом «В наличии» при нуле`;

    return {
      label: "ARAY · склад",
      title: "Склад: нулевой остаток не равен наличию",
      text: zeroStockMarkedInStock > 0
        ? `${zeroStockLabel}. ${mismatchLabel}; dashboard и ARAY не считают это реальным наличием.`
        : `${zeroStockLabel}. Эти позиции не считаются реальным наличием, пока остаток не станет больше 0.`,
      prompt: `Арай, проверь склад без предположений: ${zeroStockLabel}, ${mismatchLabel}. Что нужно исправить в карточках и заказах?`,
    };
  }

  if (newOrders > 0) {
    return {
      title: "Начни с подтверждения новых заказов",
      text: "ARAY может быстро разложить очередь: что подтвердить, где клиент ждёт и какие заказы лучше не откладывать.",
      prompt: "Арай, проверь рабочий стол: какие новые заказы требуют внимания в первую очередь и что мне сделать сейчас?",
    };
  }

  if (pendingReviews > 0 || pendingStaff > 0) {
    return {
      title: "Закрой админские хвосты до продаж",
      text: "Есть модерация или заявки сотрудников. Лучше разобрать это до активного потока заказов.",
      prompt: "Арай, проверь рабочий стол и подскажи, какие административные задачи сейчас важнее закрыть.",
    };
  }

  if (totalOrders === 0) {
    return {
      title: "Подготовь первый заказ без суеты",
      text: "Проверь каталог, цены и сценарий терминала. После этого первый тестовый заказ станет хорошей проверкой всей цепочки.",
      prompt: "Арай, помоги подготовить первый заказ: что проверить в каталоге, терминале, доставке и оплате?",
    };
  }

  return null;
}

function getRoleGroup(role: string): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "owner";
  if (role === "MANAGER") return "manager";
  if (role === "COURIER") return "courier";
  if (role === "ACCOUNTANT") return "accountant";
  if (role === "WAREHOUSE") return "warehouse";
  if (role === "SELLER") return "seller";
  return "manager";
}

export default async function AdminDashboard() {
  const session = await auth();
  const role = (session?.user as any)?.role || "MANAGER";
  const userId = (session?.user as any)?.id;
  let userName = session?.user?.name || "Коллега";
  const roleGroup = getRoleGroup(role);
  const isOwner = roleGroup === "owner";
  const canCreateOrder = isOwner || roleGroup === "manager" || roleGroup === "seller";
  const canOpenInventory = isOwner || roleGroup === "manager" || roleGroup === "warehouse";
  const quickActions = QUICK_ACTIONS[roleGroup] || QUICK_ACTIONS.manager;

  if ((!session?.user?.name || session.user.name.trim().length === 0) && userId) {
    const freshUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }).catch(() => null);
    if (freshUser?.name) userName = freshUser.name;
  }

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const days7ago = new Date(now); days7ago.setDate(now.getDate() - 6); days7ago.setHours(0, 0, 0, 0);
  const days30ago = new Date(now); days30ago.setDate(now.getDate() - 29); days30ago.setHours(0, 0, 0, 0);

  const [
    totalOrders, newOrders, todayOrders,
    pendingReviews, recentOrders, revenue30, revenue7, revenueToday,
    allOrdersForChart, pendingStaff, zeroStockVariants, zeroStockMarkedInStock,
  ] = await Promise.all([
    prisma.order.count({ where: { deletedAt: null } }),
    prisma.order.count({ where: { status: "NEW", deletedAt: null } }),
    prisma.order.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    prisma.review.count({ where: { approved: false } }),
    prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, orderNumber: true, guestName: true, totalAmount: true, status: true, createdAt: true },
    }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: days7ago }, deletedAt: null } }),
    prisma.order.aggregate({ _sum: { totalAmount: true, deliveryCost: true }, where: { status: { not: "CANCELLED" }, createdAt: { gte: today }, deletedAt: null } }),
    prisma.order.findMany({ where: { createdAt: { gte: days7ago }, status: { not: "CANCELLED" }, deletedAt: null }, select: { createdAt: true, totalAmount: true, deliveryCost: true }, orderBy: { createdAt: "asc" } }),
    prisma.user.count({ where: { staffStatus: "PENDING" } }).catch(() => 0),
    prisma.productVariant.count({ where: { stockQty: 0 } }),
    prisma.productVariant.count({ where: { stockQty: 0, inStock: true } }),
  ]);

  // Chart data за последние 7 дней
  const chartDays: { label: string; amount: number; date: Date }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    chartDays.push({ label: d.toLocaleDateString("ru-RU", { weekday: "short" }), amount: 0, date: d });
  }
  for (const o of allOrdersForChart) {
    const d = new Date(o.createdAt); d.setHours(0, 0, 0, 0);
    const slot = chartDays.find((c) => c.date.getTime() === d.getTime());
    if (slot) slot.amount += Number(o.totalAmount) + Number(o.deliveryCost || 0);
  }

  const orders30count = await prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: days30ago }, deletedAt: null } });
  const revenue30total = Number(revenue30._sum.totalAmount || 0) + Number(revenue30._sum.deliveryCost || 0);
  const revenue7total = Number(revenue7._sum.totalAmount || 0) + Number(revenue7._sum.deliveryCost || 0);
  const revenueTodayTotal = Number(revenueToday._sum.totalAmount || 0) + Number(revenueToday._sum.deliveryCost || 0);
  const avgOrder = orders30count > 0 ? revenue30total / orders30count : 0;
  const todayImportant: TodayImportantItem[] = [];

  if (newOrders > 0) {
    todayImportant.push({
      href: "/admin/orders?status=NEW",
      title: `${newOrders} ${pluralizeRu(newOrders, ["новый заказ", "новых заказа", "новых заказов"])}`,
      description: "Ждут подтверждения",
      icon: Clock,
      tone: "warning",
    });
  }

  if (pendingReviews > 0 && isOwner) {
    todayImportant.push({
      href: "/admin/reviews",
      title: `${pendingReviews} ${pluralizeRu(pendingReviews, ["отзыв", "отзыва", "отзывов"])}`,
      description: "Ждут модерации",
      icon: Star,
      tone: "warning",
    });
  }

  if (pendingStaff > 0 && isOwner) {
    todayImportant.push({
      href: "/admin/staff",
      title: `${pendingStaff} ${pluralizeRu(pendingStaff, ["сотрудник", "сотрудника", "сотрудников"])}`,
      description: "Ждут одобрения",
      icon: Users,
      tone: "warning",
    });
  }

  if (zeroStockVariants > 0) {
    todayImportant.push({
      href: canOpenInventory ? "/admin/inventory?status=out" : "/admin/products",
      title: `${zeroStockVariants} ${pluralizeRu(zeroStockVariants, ["позиция", "позиции", "позиций"])} с остатком 0`,
      description: zeroStockMarkedInStock > 0
        ? `${zeroStockMarkedInStock} ${pluralizeRu(zeroStockMarkedInStock, ["позиция", "позиции", "позиций"])} с флагом «В наличии»`
        : "Не считаются реальным наличием",
      icon: Warehouse,
      tone: "warning",
    });
  }

  if (totalOrders === 0 && canCreateOrder) {
    todayImportant.push({
      href: "/admin/orders/new",
      title: "Запустить первый заказ",
      description: "Проверить терминал и корзину",
      icon: ShoppingBag,
      tone: "primary",
    });
  }

  if (totalOrders === 0 && (isOwner || roleGroup === "manager" || roleGroup === "seller")) {
    todayImportant.push({
      href: "/admin/products",
      title: "Проверить каталог",
      description: "Товары и цены перед продажами",
      icon: Package,
      tone: "primary",
    });
  }

  if (todayImportant.length === 0) {
    todayImportant.push({
      href: "/admin/analytics",
      title: "Новых срочных сигналов нет",
      description: "Склад, заказы и модерация без предупреждений",
      icon: CheckCircle2,
      tone: "success",
    });
  }

  const arayAdvice = buildArayAdvice({
    newOrders,
    pendingReviews,
    pendingStaff,
    totalOrders,
    zeroStockVariants,
    zeroStockMarkedInStock,
  });

  return (
    <div className="admin-dashboard-standard space-y-3.5 sm:space-y-5 min-w-0">
        <AutoRefresh intervalMs={60000} />
        <DashboardActions showNewOrder={canCreateOrder} />

        {/* ── HERO: приветствие ── */}
        <DashboardGreeting
          userName={userName}
          roleLabel={ROLE_GREETINGS[role] || role}
        />

        {/* ── СЕГОДНЯ ВАЖНО + ARAY СОВЕТ ── */}
        <div className={`grid grid-cols-1 gap-2.5 sm:gap-3 min-w-0 ${arayAdvice ? "xl:grid-cols-[minmax(18rem,0.95fr)_minmax(24rem,1.05fr)]" : ""}`}>
          <section className="min-w-0" data-testid="dashboard-today-important">
            <div className="admin-section-kicker mb-2.5 sm:mb-3">
              <span className="admin-section-kicker-icon">
                <Zap className="w-4 h-4" strokeWidth={1.75} />
              </span>
              <p className="font-display font-semibold text-sm text-foreground">
                Сегодня важно
              </p>
            </div>
            <div
              className={[
                "grid gap-2.5 min-w-0",
                todayImportant.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2",
              ].join(" ")}
            >
              {todayImportant.map((item) => (
                <TodayImportantCard key={item.href + item.title} item={item} />
              ))}
            </div>
          </section>
          {arayAdvice && (
            <section className="min-w-0 xl:pt-7">
              <DashboardArayAdvice
                label={arayAdvice.label}
                title={arayAdvice.title}
                text={arayAdvice.text}
                prompt={arayAdvice.prompt}
              />
            </section>
          )}
        </div>

        {/* ── ГЛАВНЫЕ МЕТРИКИ (для владельца / менеджера / бухгалтера) ── */}
        {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
          <DashboardMetrics
            revenue30={revenue30total}
            revenueToday={revenueTodayTotal}
            newOrders={newOrders}
            avgOrder={avgOrder}
          />
        )}

        {/* ── КУРЬЕР: его доставки ── */}
        {roleGroup === "courier" && (
          <CourierMetrics newOrders={newOrders} todayOrders={todayOrders} />
        )}

        {/* ── БЫСТРЫЕ ДЕЙСТВИЯ ── */}
        <div>
          <div className="admin-section-kicker mb-3">
            <span className="admin-section-kicker-icon">
              <Zap className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <p className="font-display font-semibold text-sm text-foreground">
              Быстрый доступ
            </p>
          </div>
          <div className="admin-quick-actions-grid grid gap-2.5 sm:gap-3 min-w-0">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                prefetch
                className="admin-liquid-surface group flex items-center justify-start gap-3 px-3 py-2.5 sm:px-4 rounded-2xl min-h-[58px] sm:min-h-[64px] min-w-0 transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${ARAY_ICON_TONE}`}
                >
                  <action.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <span className="min-w-0 flex-1 text-xs sm:text-[13px] font-medium text-left leading-tight text-foreground">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── ГРАФИК 7 ДНЕЙ ── */}
        {(isOwner || roleGroup === "manager" || roleGroup === "accountant") && (
          <DashboardChart
            days={chartDays.map((d) => ({ label: d.label, amount: d.amount }))}
            revenue7={formatPrice(revenue7total)}
            revenue30={formatPrice(revenue30total)}
          />
        )}

        {/* ── ПОСЛЕДНИЕ ЗАКАЗЫ + ТОП ТОВАРОВ ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 min-w-0">
          {/* Recent orders */}
          <div className="admin-liquid-surface rounded-2xl overflow-hidden min-w-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl aray-icon-tone flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground leading-tight">
                    Последние заказы
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {totalOrders.toLocaleString("ru-RU")} всего · {todayOrders} сегодня
                  </p>
                </div>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-primary flex items-center gap-0.5 hover:gap-1 transition-all shrink-0"
              >
                Все <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {recentOrders.map((order) => {
                const color = ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
                const label = ORDER_STATUS_LABELS[order.status] || order.status;
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        №{order.orderNumber}
                        <span className="text-muted-foreground font-normal"> · {order.guestName || "Клиент"}</span>
                      </p>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        {formatPrice(Number(order.totalAmount))}
                      </p>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </Link>
                );
              })}
              {recentOrders.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    Заказов пока нет
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Когда клиент оформит заказ, он появится здесь первым.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top items (live) */}
          {(isOwner || roleGroup === "manager" || roleGroup === "seller") ? (
            <DashboardTopItems />
          ) : (
            <div />
          )}
        </div>
    </div>
  );
}

function TodayImportantCard({ item }: { item: TodayImportantItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="admin-liquid-surface admin-liquid-interactive group flex min-h-[84px] items-center gap-3 rounded-2xl px-4 py-3.5 min-w-0"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <span className={`${IMPORTANT_TONE[item.tone]} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight text-foreground">
          {item.title}
        </span>
        <span className="mt-1 block truncate text-[11px] leading-tight text-muted-foreground">
          {item.description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/45 transition-colors group-hover:text-primary" />
    </Link>
  );
}

// Helper для русского склонения
function pluralizeRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
