export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CheckSquare,
  FileText,
  Network,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import {
  ARAY_ADMIN_GAPS,
  ARAY_ADMIN_ORCHESTRATION_LAYERS,
  ARAY_ROLE_PERMISSION_MATRIX,
  ARAY_ROLE_CONSTRUCTOR_RULES,
  ARAY_SMART_CABINET_MODULES,
  getAraySmartCabinetProfile,
  getAraySmartCabinetProfiles,
} from "@/lib/aray-smart-cabinets";

type MetricCard = {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ElementType;
};

type SmartAction = {
  label: string;
  hint: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  hidden?: boolean;
};

type BusinessRisk = {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
  hidden?: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Владелец",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  SELLER: "Продавец",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Склад",
};

const INTEGRATIONS = [
  { label: "Заказы", state: "работает", href: "/admin/orders" },
  { label: "Склад", state: "работает", href: "/admin/inventory" },
  { label: "Уведомления", state: "настройка", href: "/admin/notifications" },
  { label: "Реклама", state: "подключение", href: "/admin/promotion" },
  { label: "Документы", state: "черновики", href: "/admin/finance" },
  { label: "Логистика", state: "расширяем", href: "/admin/delivery" },
];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function pluralRu(count: number, forms: [string, string, string]) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

export default async function DirectorCabinetPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!session || !role) redirect("/login");

  const profile = getAraySmartCabinetProfile(role);
  const canSeeFinance = profile.canSeeFinance;
  const canSeePeople = profile.canSeePeople;
  const canSeeStrategy = profile.canSeeStrategy;

  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    newOrders,
    todayOrders,
    activeOrders,
    monthRevenue,
    newLeads,
    activeLeads,
    pendingReviews,
    overdueTasks,
    urgentTasks,
    lowStockVariants,
    zeroStockMarkedInStock,
    staffTotal,
    staffPending,
    activeStaff,
    salaryExpenses,
    monthExpenses,
    activeConnectors,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "NEW", deletedAt: null } }),
    prisma.order.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    prisma.order.count({
      where: {
        deletedAt: null,
        status: { in: ["NEW", "CONFIRMED", "PROCESSING", "IN_DELIVERY", "READY_PICKUP"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true, deliveryCost: true },
      where: { status: { not: "CANCELLED" }, createdAt: { gte: monthStart }, deletedAt: null },
    }),
    prisma.lead.count({ where: { stage: "NEW", deletedAt: null } }),
    prisma.lead.count({
      where: { stage: { in: ["NEW", "CONTACTED", "QUALIFIED", "MEETING", "PROPOSAL", "NEGOTIATION"] }, deletedAt: null },
    }),
    prisma.review.count({ where: { approved: false } }),
    prisma.task.count({
      where: { status: { not: "DONE" }, dueDate: { lt: now } },
    }),
    prisma.task.count({
      where: { status: { not: "DONE" }, priority: { in: ["HIGH", "URGENT"] } },
    }),
    prisma.productVariant.count({ where: { stockQty: { lte: 3 } } }),
    prisma.productVariant.count({ where: { stockQty: 0, inStock: true } }),
    prisma.user.count({ where: { role: { not: "USER" } } }),
    prisma.user.count({ where: { staffStatus: "PENDING" } }),
    prisma.user.count({
      where: { role: { not: "USER" }, lastActiveAt: { gte: new Date(now.getTime() - 30 * 60 * 1000) } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart }, category: { contains: "Зарплата" } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart } },
    }),
    prisma.terminalConnector.count({ where: { status: { in: ["ACTIVE", "INTERNAL", "VENDOR_READY"] } } }).catch(() => 0),
  ]);

  const revenue = Number(monthRevenue._sum.totalAmount || 0) + Number(monthRevenue._sum.deliveryCost || 0);
  const expenses = Number(monthExpenses._sum.amount || 0);
  const salary = Number(salaryExpenses._sum.amount || 0);
  const profitPreview = revenue - expenses;
  const currentRoleLabel = ROLE_LABELS[role] || role;
  const visibleIntegrations = canSeeStrategy
    ? INTEGRATIONS
    : profile.primaryHrefs.slice(0, 6).map((href) => ({
        label: quickLabel(href),
        state: "доступно",
        href,
      }));
  const visibleCabinetModules = ARAY_SMART_CABINET_MODULES.filter((module) => {
    if (module.href === "/admin/finance" || module.href === "/admin/analytics") return canSeeFinance;
    if (module.href === "/admin/staff") return canSeePeople;
    return canSeeStrategy || profile.primaryHrefs.includes(module.href) || module.href === "/admin/orders" || module.href === "/admin/tasks";
  });
  const visibleOrchestrationLayers = ARAY_ADMIN_ORCHESTRATION_LAYERS.filter((layer) => {
    if (layer.href === "/admin/finance") return canSeeFinance;
    if (layer.href === "/admin/business/settings") return canSeePeople || canSeeStrategy;
    return canSeeStrategy || profile.primaryHrefs.includes(layer.href) || layer.href === "/admin/orders" || layer.href === "/admin/products";
  });
  const visibleAdminGaps = ARAY_ADMIN_GAPS.filter((gap) => {
    if (gap.href === "/admin/finance") return canSeeFinance;
    if (gap.label === "Лента бизнес-событий") return canSeeStrategy;
    return canSeeStrategy || profile.primaryHrefs.includes(gap.href) || gap.href === "/admin/tasks" || gap.href === "/admin/delivery";
  });
  const heroHrefs = canSeeStrategy
    ? ["/admin", "/admin/business/settings", "/admin/staff", "/admin/aray/modules"]
    : profile.primaryHrefs.slice(0, 4);
  const visibleRoleMatrix = canSeePeople || canSeeStrategy
    ? ARAY_ROLE_PERMISSION_MATRIX
    : ARAY_ROLE_PERMISSION_MATRIX.filter((item) => item.role === role);
  const employeeActions = [
    {
      label: "Заявки сотрудников",
      value: `${staffPending}`,
      hint: staffPending > 0 ? "нужно принять решение" : "новых заявок нет",
      href: "/admin/staff",
      icon: Users,
      active: staffPending > 0,
    },
    {
      label: "Роли и доступы",
      value: "правила",
      hint: "кто что видит и может делать",
      href: "/admin/business/settings",
      icon: ShieldCheck,
      active: true,
    },
    {
      label: "Активность команды",
      value: `${activeStaff}`,
      hint: `${staffTotal} сотрудников в системе`,
      href: "/admin/staff",
      icon: CheckSquare,
      active: activeStaff > 0,
    },
    {
      label: "Модули по ролям",
      value: "карта",
      hint: "какие функции включены для бизнеса",
      href: "/admin/aray/modules",
      icon: Network,
      active: true,
    },
  ];

  const metrics: MetricCard[] = [
    {
      label: "Продажи",
      value: `${newOrders}`,
      hint: `${activeOrders} ${pluralRu(activeOrders, ["заказ", "заказа", "заказов"])} в работе`,
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      label: "Лиды",
      value: `${newLeads}`,
      hint: `${activeLeads} ${pluralRu(activeLeads, ["контакт", "контакта", "контактов"])} в воронке`,
      href: "/admin/crm",
      icon: Target,
    },
    {
      label: "Команда",
      value: canSeePeople ? `${staffTotal}` : currentRoleLabel,
      hint: canSeePeople ? `${activeStaff} онлайн, ${staffPending} ждут решения` : profile.title,
      href: canSeePeople ? "/admin/staff" : profile.primaryHrefs[0],
      icon: Users,
    },
    {
      label: "Деньги",
      value: canSeeFinance ? formatPrice(profitPreview) : "по роли",
      hint: canSeeFinance ? "предварительный итог месяца" : "финансы видит директор или бухгалтер",
      href: canSeeFinance ? "/admin/finance" : profile.primaryHrefs[0],
      icon: Wallet,
    },
  ];

  const directorSignals = [
    newOrders > 0 ? `Подтвердить ${newOrders} ${pluralRu(newOrders, ["новый заказ", "новых заказа", "новых заказов"])}` : "Новых заказов сейчас нет",
    newLeads > 0 ? `Разобрать ${newLeads} ${pluralRu(newLeads, ["новый лид", "новых лида", "новых лидов"])}` : "Новые лиды не ждут",
    overdueTasks > 0 ? `Закрыть ${overdueTasks} ${pluralRu(overdueTasks, ["просроченную задачу", "просроченные задачи", "просроченных задач"])}` : "Просрочек по задачам нет",
    pendingReviews > 0 ? `Проверить ${pendingReviews} ${pluralRu(pendingReviews, ["отзыв", "отзыва", "отзывов"])}` : "Отзывы не ждут модерации",
  ];
  const smartActions: SmartAction[] = [
    {
      label: newOrders > 0 ? "Новые заказы" : "Заказы спокойны",
      hint: newOrders > 0 ? `${newOrders} ждут подтверждения` : `${activeOrders} сейчас в работе`,
      href: "/admin/orders",
      icon: ShoppingBag,
      active: newOrders > 0,
    },
    {
      label: newLeads > 0 ? "Новые лиды" : "Лиды под контролем",
      hint: newLeads > 0 ? `${newLeads} нужно разобрать` : `${activeLeads} контактов в воронке`,
      href: "/admin/crm",
      icon: Target,
      active: newLeads > 0,
    },
    {
      label: overdueTasks > 0 ? "Просроченные задачи" : "Задачи без просрочек",
      hint: overdueTasks > 0 ? `${overdueTasks} требуют решения` : `${urgentTasks} важных задач в работе`,
      href: "/admin/tasks",
      icon: CheckSquare,
      active: overdueTasks > 0,
    },
    {
      label: pendingReviews > 0 ? "Отзывы на проверке" : "Отзывы чистые",
      hint: pendingReviews > 0 ? `${pendingReviews} ждут модерации` : "можно идти дальше",
      href: "/admin/reviews",
      icon: Sparkles,
      active: pendingReviews > 0,
    },
    {
      label: staffPending > 0 ? "Заявки сотрудников" : "Команда в порядке",
      hint: staffPending > 0 ? `${staffPending} ждут решения` : `${activeStaff} онлайн сейчас`,
      href: "/admin/staff",
      icon: Users,
      active: staffPending > 0,
      hidden: !canSeePeople,
    },
    {
      label: zeroStockMarkedInStock > 0 ? "Проверить наличие" : "Склад без критики",
      hint: zeroStockMarkedInStock > 0 ? `${zeroStockMarkedInStock} позиций с нулем` : `${lowStockVariants} низких остатков`,
      href: "/admin/inventory",
      icon: Warehouse,
      active: zeroStockMarkedInStock > 0,
    },
  ].filter((action) => !action.hidden);
  const businessRisks: BusinessRisk[] = [
    {
      label: "Продажи",
      value: `${newOrders}`,
      hint: newOrders > 0 ? "есть заказы без подтверждения" : "новых заказов нет",
      href: "/admin/orders",
      icon: ShoppingBag,
      active: newOrders > 0,
    },
    {
      label: "Задачи",
      value: `${overdueTasks + urgentTasks}`,
      hint: overdueTasks > 0 ? "есть просроченные дела" : "критичных просрочек нет",
      href: "/admin/tasks",
      icon: CheckSquare,
      active: overdueTasks > 0,
    },
    {
      label: "Склад",
      value: `${lowStockVariants + zeroStockMarkedInStock}`,
      hint: zeroStockMarkedInStock > 0 ? "есть ноль, но товар отмечен в наличии" : "проверь низкие остатки",
      href: "/admin/inventory",
      icon: Package,
      active: zeroStockMarkedInStock > 0 || lowStockVariants > 0,
    },
    {
      label: "Команда",
      value: `${staffPending}`,
      hint: staffPending > 0 ? "есть заявки на доступ" : "заявок на доступ нет",
      href: "/admin/staff",
      icon: Users,
      active: staffPending > 0,
      hidden: !canSeePeople,
    },
    {
      label: "Деньги",
      value: formatPrice(profitPreview),
      hint: profitPreview >= 0 ? "месяц в плюсе до уточнения" : "расходы выше выручки",
      href: "/admin/finance",
      icon: Wallet,
      active: profitPreview < 0,
      hidden: !canSeeFinance,
    },
  ].filter((risk) => !risk.hidden);

  return (
    <div className="admin-page-frame admin-page-frame-readable space-y-4">
      <section className="bg-card border border-border rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>ARAY · польза без вреда</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground">
              {profile.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {profile.subtitle}. Вся админка работает как единый кабинет: разделы, поиск, быстрые действия и Арай подстраиваются под роль человека.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {heroHrefs.map((href) => (
              <DirectorLink key={href} href={href} label={quickLabel(href)} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          icon={Network}
          title="Админка как единый кабинет"
          subtitle="разделы связаны между собой и подстраиваются под роль"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleOrchestrationLayers.map((layer) => (
              <OrchestrationCard key={layer.label} layer={layer} />
            ))}
          </div>
        </Panel>

        <Panel
          icon={BriefcaseBusiness}
          title="Конструктор ролей"
          subtitle="не отдельная витрина, а правила всей системы"
        >
          <div className="space-y-2">
            {ARAY_ROLE_CONSTRUCTOR_RULES.map((rule) => (
              <ConstructorRuleRow key={rule.label} rule={rule} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          icon={ShieldCheck}
          title="Кто что видит и делает"
          subtitle="матрица ролей без догадок"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleRoleMatrix.map((item) => (
              <RolePermissionCard key={item.role} item={item} current={item.role === role} />
            ))}
          </div>
          {!canSeePeople && !canSeeStrategy ? (
            <SoftNote text="Для этой роли показана только своя зона. Полную матрицу видит директор или администратор." />
          ) : null}
        </Panel>

        <Panel
          icon={Users}
          title="Управление сотрудниками"
          subtitle="доступы, действия и контроль без хаоса"
        >
          {canSeePeople ? (
            <div className="space-y-2">
              {employeeActions.map((action) => (
                <SmartActionCard key={action.label} action={action} />
              ))}
            </div>
          ) : (
            <SoftNote text="Управление сотрудниками скрыто по роли. Здесь остается только личный рабочий контур и разрешенные действия." />
          )}
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          icon={CheckSquare}
          title="Операционный пульт"
          subtitle="одно касание до рабочего действия"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {smartActions.map((action) => (
              <SmartActionCard key={action.label} action={action} />
            ))}
          </div>
        </Panel>

        <Panel
          icon={BarChart3}
          title="Что тормозит бизнес"
          subtitle="риски без паники и без лишнего шума"
        >
          <div className="space-y-2">
            {businessRisks.map((risk) => (
              <RiskRow key={risk.label} risk={risk} />
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          icon={BriefcaseBusiness}
          title="Что делать сегодня"
          subtitle="Арай-директор собирает сигналы и не дает потерять важное"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {directorSignals.map((signal) => (
              <div key={signal} className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium text-foreground">{signal}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm font-medium text-foreground">Следующий умный шаг</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Сначала закрыть новые заказы и лиды, потом просрочки, отзывы, склад и документы. Арай может подготовить тексты, задачи и черновики.
            </p>
          </div>
        </Panel>

        <Panel
          icon={ShieldCheck}
          title="Права и границы"
          subtitle="каждый кабинет видит только свое"
        >
          <div className="space-y-3">
            <StatusLine label="Текущая роль" value={currentRoleLabel} />
            <StatusLine label="Финансы" value={canSeeFinance ? "доступны" : "скрыты по роли"} />
            <StatusLine label="Команда" value={canSeePeople ? "доступна" : "только свои задачи"} />
            <StatusLine label="Подтверждения" value="обязательны для важных действий" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel icon={Users} title="Люди, роли, графики" subtitle="операционная дисциплина">
          <ValueRow label="Сотрудники" value={canSeePeople ? `${staffTotal}` : "по роли"} />
          <ValueRow label="Онлайн сейчас" value={canSeePeople ? `${activeStaff}` : "личный режим"} />
          <ValueRow label="Заявки на доступ" value={canSeePeople ? `${staffPending}` : "директор"} />
          {canSeePeople ? (
            <>
              <LinkRow href="/admin/staff" label="Открыть команду" />
              <LinkRow href="/admin/business/settings" label="Настроить роли" />
            </>
          ) : (
            <SoftNote text="Командные данные скрыты по роли. В кабинете остаются свои задачи, заказы и рабочие действия." />
          )}
        </Panel>

        <Panel icon={Wallet} title="Зарплаты и отчеты" subtitle="деньги без догадок">
          <ValueRow label="Выручка месяца" value={canSeeFinance ? formatPrice(revenue) : "скрыто"} />
          <ValueRow label="Расходы месяца" value={canSeeFinance ? formatPrice(expenses) : "по правам"} />
          <ValueRow label="Зарплаты" value={canSeeFinance ? formatPrice(salary) : "директор / бухгалтер"} />
          {canSeeFinance ? (
            <>
              <LinkRow href="/admin/finance" label="Открыть финансы" />
              <LinkRow href="/admin/analytics" label="Открыть отчеты" />
            </>
          ) : (
            <SoftNote text="Финансовые данные скрыты. Арай показывает только безопасный рабочий уровень для текущей роли." />
          )}
        </Panel>

        <Panel icon={Truck} title="Логистика и склад" subtitle="заказ должен дойти спокойно">
          <ValueRow label="Заказы сегодня" value={`${todayOrders}`} />
          <ValueRow label="Низкий остаток" value={`${lowStockVariants}`} />
          <ValueRow label="Ноль, но в наличии" value={`${zeroStockMarkedInStock}`} />
          <LinkRow href="/admin/delivery" label="Открыть доставку" />
          <LinkRow href="/admin/inventory" label="Открыть склад" />
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel icon={Network} title="Программы и подключения" subtitle="что помогает автоматизации">
          <div className="space-y-2">
            {visibleIntegrations.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.state}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Активные внутренние подключения: {activeConnectors}. Новые внешние связи включаются только после проверки и подтверждения.
          </p>
        </Panel>

        <Panel icon={Sparkles} title="Умные кабинеты" subtitle="каждой роли свой экран и свои действия">
          <div className="grid gap-2 sm:grid-cols-2">
            {getAraySmartCabinetProfiles().map((cabinet) => {
              const Icon = cabinet.icon;
              return (
                <div key={cabinet.role} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{cabinet.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {cabinet.focus.slice(0, 3).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleAdminGaps.map((gap) => {
          const Icon = gap.icon;
          return (
            <Link
              key={gap.label}
              href={gap.href}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{gap.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{gap.state} · {gap.owner}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {visibleCabinetModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.label}
              href={module.href}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{module.label}</p>
                  <p className="text-xs text-muted-foreground">{module.owner}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function quickLabel(href: string) {
  const labels: Record<string, string> = {
    "/admin/director": "Роли",
    "/admin/business/settings": "Роли",
    "/admin/finance": "Финансы",
    "/admin/staff": "Команда",
    "/admin/aray/modules": "Модули",
    "/admin/settings": "Система",
    "/admin/crm": "CRM",
    "/admin/orders": "Заказы",
    "/admin/workflows": "Сценарии",
    "/admin/tasks": "Задачи",
    "/admin/clients": "Клиенты",
    "/admin/orders/new": "Терминал",
    "/admin/products": "Каталог",
    "/admin/stories": "Сторис",
    "/admin/reviews": "Отзывы",
    "/admin/delivery": "Доставка",
    "/admin/help": "Помощь",
    "/admin/inventory": "Склад",
    "/admin/import": "Импорт",
    "/admin/analytics": "Отчеты",
  };
  return labels[href] || "Открыть";
}

function DirectorLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-primary" />
    </Link>
  );
}

function MetricCard({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon;
  return (
    <Link href={metric.href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function SmartActionCard({ action }: { action: SmartAction }) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={`rounded-2xl border p-4 transition-colors hover:bg-muted/50 ${
        action.active ? "border-primary/45 bg-primary/10" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{action.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.hint}</p>
        </div>
        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-primary" />
      </div>
    </Link>
  );
}

function RiskRow({ risk }: { risk: BusinessRisk }) {
  const Icon = risk.icon;
  return (
    <Link
      href={risk.href}
      className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${risk.active ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{risk.label}</p>
          <p className="text-sm font-semibold text-foreground">{risk.value}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{risk.hint}</p>
      </div>
    </Link>
  );
}

function OrchestrationCard({
  layer,
}: {
  layer: (typeof ARAY_ADMIN_ORCHESTRATION_LAYERS)[number];
}) {
  const Icon = layer.icon;
  return (
    <Link href={layer.href} className="rounded-2xl border border-border bg-muted/20 p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{layer.label}</p>
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              {layer.state}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{layer.description}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{layer.owner}</p>
        </div>
      </div>
    </Link>
  );
}

function ConstructorRuleRow({
  rule,
}: {
  rule: (typeof ARAY_ROLE_CONSTRUCTOR_RULES)[number];
}) {
  const Icon = rule.icon;
  return (
    <div className="rounded-2xl border border-border px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{rule.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.description}</p>
          <p className="mt-1 text-[11px] font-medium text-foreground">{rule.result}</p>
        </div>
      </div>
    </div>
  );
}

function RolePermissionCard({
  item,
  current,
}: {
  item: (typeof ARAY_ROLE_PERMISSION_MATRIX)[number];
  current: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`rounded-2xl border p-4 transition-colors hover:bg-muted/50 ${
        current ? "border-primary/45 bg-primary/10" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            {current ? (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[11px] text-primary">
                текущая
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.purpose}</p>
          <PillList title="Видит" values={item.sees} />
          <PillList title="Может" values={item.actions} />
          <PillList title="Подтверждает" values={item.confirmations} compact />
        </div>
      </div>
    </Link>
  );
}

function PillList({ title, values, compact }: { title: string; values: string[]; compact?: boolean }) {
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {values.slice(0, compact ? 3 : 5).map((value) => (
          <span key={value} className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-foreground">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 lg:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 last:mb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SoftNote({ text }: { text: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-2 flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-primary" />
    </Link>
  );
}
