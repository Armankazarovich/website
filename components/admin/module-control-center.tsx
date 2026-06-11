"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  Loader2,
  Plug,
  Power,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminModal } from "@/components/admin/admin-modal";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type {
  ArayModuleBillingPlan,
  ArayModuleCategory,
  ArayModuleControlItem,
  ArayModuleStatus,
} from "@/lib/aray-module-registry";
import { cn } from "@/lib/utils";

type ModuleSummary = {
  total: number;
  byCategory: Record<ArayModuleCategory, number>;
  byStatus: Record<ArayModuleStatus, number>;
};

type FilterStatus = "all" | ArayModuleStatus;
type FilterCategory = "all" | ArayModuleCategory;
type ModulePolicyPayload = {
  allowedRoles: string[];
  subscriptionPlan: ArayModuleBillingPlan;
  requiredConnectorTypes: string[];
};

const CATEGORY_LABELS: Record<ArayModuleCategory, string> = {
  core: "Ядро",
  business: "Бизнес",
  marketplace: "Биржа",
  constructor: "Конструктор",
  analytics: "Аналитика",
  marketing: "Маркетинг",
  finance: "Финансы",
  connector: "Подключения",
};

const STATUS_LABELS: Record<ArayModuleStatus, string> = {
  ready: "Готов",
  beta: "Бета",
  draft: "Черновик",
  disabled: "Отключен",
};

const HEALTH_LABELS: Record<ArayModuleControlItem["health"], string> = {
  healthy: "Здоров",
  attention: "Внимание",
  draft: "Черновик",
  disabled: "Отключен",
};

const STATUS_OPTIONS: Array<{ key: FilterStatus; label: string }> = [
  { key: "all", label: "Все" },
  { key: "ready", label: "Готов" },
  { key: "beta", label: "Бета" },
  { key: "draft", label: "Черновик" },
  { key: "disabled", label: "Отключен" },
];

const CATEGORY_OPTIONS: Array<{ key: FilterCategory; label: string }> = [
  { key: "all", label: "Все типы" },
  { key: "core", label: "Ядро" },
  { key: "business", label: "Бизнес" },
  { key: "marketplace", label: "Биржа" },
  { key: "analytics", label: "Аналитика" },
  { key: "marketing", label: "Маркетинг" },
  { key: "finance", label: "Финансы" },
  { key: "connector", label: "Подключения" },
  { key: "constructor", label: "Конструктор" },
];

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  "core.design-system": "Дизайн-система",
  "core.popup-system": "Единые окна",
  "core.motion-system": "Движение экранов",
  "core.app-identity": "Иконки и приложения",
  "core.notifications": "Уведомления",
  "core.aray-voice": "Голос ARAY",
  "business.terminal": "Терминал",
  "finance.wallet-ledger": "Финансы и кошелек",
  "marketplace.marketplace": "Биржа",
};

const MODULE_SHORT_HINTS: Record<string, string> = {
  "core.design-system": "Единый внешний вид, кнопки, цвета и читаемость.",
  "core.popup-system": "Общие модальные окна, панели и защита от перекрытий.",
  "core.motion-system": "Лёгкие переходы экранов без тяжёлых эффектов.",
  "core.app-identity": "Название, иконки и запуск установленных приложений.",
  "core.notifications": "Уведомления, роли, каналы и тихие часы.",
  "core.aray-voice": "Голосовые ответы ARAY с расписанием и согласием.",
  "business.terminal": "Касса, новый заказ и рабочее место продавца.",
  "finance.wallet-ledger": "Кошелек, управленческий баланс, расходы, движения и finance-задачи без имитации банка.",
  "marketplace.marketplace": "Черновик биржи: спрос и аналитика остаются в паспорте, пока нет готового рабочего экрана.",
};

const BILLING_LABELS: Record<string, string> = {
  free: "Базовый",
  paid: "Платный",
  usage: "По использованию",
  enterprise: "Корпоративный",
};

const BILLING_OPTIONS: Array<{ key: ArayModuleBillingPlan; label: string }> = [
  { key: "free", label: "Базовый" },
  { key: "paid", label: "Платный" },
  { key: "usage", label: "По использованию" },
  { key: "enterprise", label: "Корпоративный" },
];

const ROLE_OPTIONS = [
  { key: "SUPER_ADMIN", label: "Супер-админ", locked: true },
  { key: "ADMIN", label: "Админ" },
  { key: "MANAGER", label: "Менеджер" },
  { key: "SELLER", label: "Продавец" },
  { key: "WAREHOUSE", label: "Склад" },
  { key: "ACCOUNTANT", label: "Бухгалтер" },
  { key: "COURIER", label: "Курьер" },
  { key: "USER", label: "Клиент" },
] as const;

const CONNECTOR_TYPE_LABELS: Record<string, string> = {
  orders: "Заказы",
  catalog: "Каталог",
  search: "Поиск",
  notifications: "Уведомления",
  ai: "ARAY",
};

const CONNECTOR_TYPE_OPTIONS = Object.entries(CONNECTOR_TYPE_LABELS).map(([key, label]) => ({ key, label }));

function connectorStatusLabel(module: ArayModuleControlItem) {
  if (module.connectors.status === "not-required") return "Не нужны";
  if (module.connectors.status === "ready") return "Подключены";
  return `Нужно: ${module.connectors.missingTypes.map((type) => CONNECTOR_TYPE_LABELS[type] || type).join(", ")}`;
}

function modulePowerLabel(module: ArayModuleControlItem) {
  if (module.locked) return "Ядро";
  if (module.effectiveEnabled) return "Включен";
  if (module.requestedEnabled) return "Ждет настройку";
  return "Выключен";
}

function statusClass(status: ArayModuleStatus) {
  if (status === "ready") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (status === "beta") return "border-sky-500/25 bg-sky-500/10 text-sky-500";
  if (status === "draft") return "border-amber-500/25 bg-amber-500/10 text-amber-500";
  return "border-border bg-muted/30 text-muted-foreground";
}

function healthClass(health: ArayModuleControlItem["health"]) {
  if (health === "healthy") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-500";
  if (health === "attention") return "border-amber-500/25 bg-amber-500/10 text-amber-500";
  if (health === "draft") return "border-sky-500/25 bg-sky-500/10 text-sky-500";
  return "border-border bg-muted/30 text-muted-foreground";
}

function searchableText(module: ArayModuleControlItem) {
  return [
    module.id,
    module.name,
    module.category,
    module.status,
    module.routes.join(" "),
    module.navItems.join(" "),
    module.permissions.join(" "),
    module.dependencies.join(" "),
    module.settings.join(" "),
    module.aray.skills.join(" "),
    module.aray.quickActions.join(" "),
    module.events.join(" "),
    module.dataSources.join(" "),
    module.quality.join(" "),
    module.role.allowedRoles.join(" "),
    module.subscription.tenantPlan,
    module.subscription.label,
    module.connectors.requiredTypes.join(" "),
    module.connectors.missingTypes.join(" "),
  ].join(" ").toLowerCase();
}

function firstUiRoute(module: ArayModuleControlItem) {
  if (module.status === "draft" || module.status === "disabled") return null;
  return module.routes.find((route) => route.startsWith("/admin") || route.startsWith("/cabinet")) || null;
}

function moduleTitle(module: ArayModuleControlItem) {
  return MODULE_DISPLAY_NAMES[module.id] || module.name;
}

function moduleHint(module: ArayModuleControlItem) {
  return MODULE_SHORT_HINTS[module.id] || "Часть платформы с собственными правами, настройками и проверками.";
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "ready" | "beta" | "draft" }) {
  const toneClass =
    tone === "ready"
      ? "text-emerald-500"
      : tone === "beta"
        ? "text-sky-500"
        : tone === "draft"
          ? "text-amber-500"
          : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-3 text-3xl font-bold", toneClass)}>{value}</div>
    </div>
  );
}

function FilterPill<T extends string>({
  value,
  active,
  label,
  onClick,
}: {
  value: T;
  active: boolean;
  label: string;
  onClick: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background/45 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ModulePowerButton({
  module,
  canManage,
  loading,
  onToggle,
}: {
  module: ArayModuleControlItem;
  canManage: boolean;
  loading: boolean;
  onToggle: (module: ArayModuleControlItem) => void;
}) {
  const disabled = loading || !canManage || !module.canToggle;
  const title = module.toggleBlockedReasons[0] || "Изменить состояние модуля";
  const active = module.effectiveEnabled;

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onToggle(module);
      }}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : module.requestedEnabled
            ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
            : "border-border bg-background/45 text-muted-foreground",
        disabled && "cursor-not-allowed opacity-65",
      )}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : module.locked ? (
        <LockKeyhole className="h-3.5 w-3.5" />
      ) : (
        <Power className="h-3.5 w-3.5" />
      )}
      {modulePowerLabel(module)}
    </button>
  );
}

function ModulePolicyEditor({
  module,
  canManage,
  loading,
  onSave,
}: {
  module: ArayModuleControlItem;
  canManage: boolean;
  loading: boolean;
  onSave: (module: ArayModuleControlItem, payload: ModulePolicyPayload) => void;
}) {
  const [allowedRoles, setAllowedRoles] = useState(module.role.allowedRoles);
  const [subscriptionPlan, setSubscriptionPlan] = useState<ArayModuleBillingPlan>(module.subscription.plan);
  const [requiredConnectorTypes, setRequiredConnectorTypes] = useState(module.connectors.requiredTypes);

  useEffect(() => {
    setAllowedRoles(module.role.allowedRoles);
    setSubscriptionPlan(module.subscription.plan);
    setRequiredConnectorTypes(module.connectors.requiredTypes);
  }, [module.connectors.requiredTypes, module.id, module.role.allowedRoles, module.subscription.plan]);

  const changed =
    subscriptionPlan !== module.subscription.plan ||
    allowedRoles.join("|") !== module.role.allowedRoles.join("|") ||
    requiredConnectorTypes.join("|") !== module.connectors.requiredTypes.join("|");

  function toggleRole(role: string) {
    if (role === "SUPER_ADMIN") return;
    setAllowedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : Array.from(new Set(["SUPER_ADMIN", ...current, role])),
    );
  }

  function toggleConnector(type: string) {
    setRequiredConnectorTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Политика доступа</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Роли, тариф и обязательные подключения.</p>
        </div>
        <button
          type="button"
          disabled={!canManage || !changed || loading}
          onClick={() =>
            onSave(module, {
              allowedRoles,
              subscriptionPlan,
              requiredConnectorTypes,
            })
          }
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Сохранить
        </button>
      </div>

      {!canManage && (
        <div className="mt-3 rounded-xl border border-border bg-background/45 px-3 py-2 text-xs text-muted-foreground">
          Политику меняет только SUPER_ADMIN.
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Роли</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map((role) => {
              const checked = allowedRoles.includes(role.key);
              const locked = "locked" in role && role.locked;
              return (
                <label
                  key={role.key}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background/45 text-muted-foreground",
                    (!canManage || locked) && "opacity-75",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canManage || locked}
                    onChange={() => toggleRole(role.key)}
                    className="h-4 w-4 accent-primary"
                  />
                  {role.label}
                </label>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Тариф</span>
          <select
            value={subscriptionPlan}
            disabled={!canManage}
            onChange={(event) => setSubscriptionPlan(event.target.value as ArayModuleBillingPlan)}
            className="min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
          >
            {BILLING_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Коннекторы</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONNECTOR_TYPE_OPTIONS.map((connector) => {
              const checked = requiredConnectorTypes.includes(connector.key);
              return (
                <label
                  key={connector.key}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                    checked
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-border bg-background/45 text-muted-foreground",
                    !canManage && "opacity-75",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canManage}
                    onChange={() => toggleConnector(connector.key)}
                    className="h-4 w-4 accent-primary"
                  />
                  {connector.label}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleControlCenter({
  modules,
  summary,
  canManage,
}: {
  modules: ArayModuleControlItem[];
  summary: ModuleSummary;
  canManage: boolean;
}) {
  const [items, setItems] = useState(modules);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [category, setCategory] = useState<FilterCategory>("all");
  const [selectedId, setSelectedId] = useState(modules[0]?.id ?? "");
  const [passportOpen, setPassportOpen] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [policyLoadingId, setPolicyLoadingId] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<ArayModuleControlItem | null>(null);
  const [pendingPolicy, setPendingPolicy] = useState<{
    module: ArayModuleControlItem;
    payload: ModulePolicyPayload;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setItems(modules);
  }, [modules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((module) => {
      if (status !== "all" && module.status !== status) return false;
      if (category !== "all" && module.category !== category) return false;
      if (q && !searchableText(module).includes(q)) return false;
      return true;
    });
  }, [category, items, query, status]);

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!filtered.some((module) => module.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = items.find((module) => module.id === selectedId) || filtered[0] || items[0];
  const selectedRoute = selected ? firstUiRoute(selected) : null;

  async function toggleModule(module: ArayModuleControlItem) {
    setPendingToggle(null);
    setToggleLoadingId(module.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/aray/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: module.id, enabled: !module.requestedEnabled, confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Не удалось изменить модуль");
      }
      if (Array.isArray(data.modules)) {
        setItems(data.modules);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось изменить модуль");
    } finally {
      setToggleLoadingId(null);
    }
  }

  async function savePolicy(module: ArayModuleControlItem, payload: ModulePolicyPayload) {
    setPendingPolicy(null);
    setPolicyLoadingId(module.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/aray/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "policy",
          moduleId: module.id,
          allowedRoles: payload.allowedRoles,
          subscriptionPlan: payload.subscriptionPlan,
          requiredConnectorTypes: payload.requiredConnectorTypes,
          confirm: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Не удалось сохранить политику модуля");
      }
      if (Array.isArray(data.modules)) {
        setItems(data.modules);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не удалось сохранить политику модуля");
    } finally {
      setPolicyLoadingId(null);
    }
  }

  return (
    <div className="admin-page-frame admin-page-frame-readable space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Boxes className="h-3.5 w-3.5" />
              Центр модулей
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Модули ARAY</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Это карта больших частей платформы: что уже работает, что ещё в бете, от чего зависит каждый раздел и
              какие действия я смогу делать внутри него. Сейчас это безопасная карта, не панель опасных рубильников.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/50 p-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {canManage ? "SUPER_ADMIN" : "Режим просмотра"}
            </div>
            <p className="mt-1 max-w-sm text-xs leading-5">
              Включатели уже пишут состояние в базу. Ядро защищено, а включение модулей проверяет роли, тариф, зависимости и подключения.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">Что это значит</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Модуль — это не страница. Это законченная часть системы: экран, права, настройки, события, подсказки ARAY и проверки.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">Что можно сейчас</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Смотреть готовность модулей, быстро находить нужный слой и открывать паспорт, если нужна техническая глубина.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm font-semibold text-foreground">Что доработаем дальше</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Кнопку “настроить модуль”, историю изменений и отдельные экраны подключения внешних сервисов.
            </p>
        </div>
      </section>

      {actionError && (
        <div className="admin-alert admin-alert-danger flex items-start gap-2 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Паспортов" value={summary.total} />
        <Metric label="Готовы" value={summary.byStatus.ready} tone="ready" />
        <Metric label="В бете" value={summary.byStatus.beta} tone="beta" />
        <Metric label="Планируются" value={summary.byStatus.draft} tone="draft" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="space-y-3">
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm">
                <Search className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Найти модуль, право, экран или действие..."
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.key}
                    value={option.key}
                    label={option.label}
                    active={status === option.key}
                    onClick={setStatus}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.key}
                    value={option.key}
                    label={option.label}
                    active={category === option.key}
                    onClick={setCategory}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {filtered.map((module) => (
              <article
                key={module.id}
                role="button"
                tabIndex={0}
                aria-current={selected?.id === module.id ? "true" : undefined}
                onClick={() => setSelectedId(module.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(module.id);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-2xl border bg-card p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/35",
                  selected?.id === module.id
                    ? "border-primary/45 bg-primary/[0.04]"
                    : "border-border hover:border-primary/35 hover:bg-muted/25",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", statusClass(module.status))}>
                        {STATUS_LABELS[module.status]}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", healthClass(module.health))}>
                        {HEALTH_LABELS[module.health]}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-base font-semibold text-foreground">{moduleTitle(module)}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{moduleHint(module)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ModulePowerButton
                      module={module}
                      canManage={canManage}
                      loading={toggleLoadingId === module.id}
                      onToggle={setPendingToggle}
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniStat label="Экраны" value={module.routes.length} />
                  <MiniStat label="Права" value={module.permissions.length} />
                  <MiniStat label="Умения" value={module.aray.skills.length} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {CATEGORY_LABELS[module.category]}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {BILLING_LABELS[module.billing.plan] || module.billing.plan}
                  </span>
                  {module.dependencies.length > 0 && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      связей {module.dependencies.length}
                    </span>
                  )}
                  {module.connectors.status !== "not-required" && (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        module.connectors.status === "ready"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-500",
                      )}
                    >
                      {connectorStatusLabel(module)}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              По этому фильтру модулей нет.
            </div>
          )}
        </div>

        {selected && (
          <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground">{moduleTitle(selected)}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{moduleHint(selected)}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">ID: {selected.id}</p>
                </div>
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", statusClass(selected.status))}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                <PassportRow icon={Activity} label="Состояние" value={HEALTH_LABELS[selected.health]} />
                <PassportRow icon={LockKeyhole} label="Тариф" value={BILLING_LABELS[selected.billing.plan] || selected.billing.plan} />
                <PassportRow icon={Sparkles} label="Тип" value={CATEGORY_LABELS[selected.category]} />
                <PassportRow icon={Power} label="Модуль" value={modulePowerLabel(selected)} />
                <PassportRow icon={Users} label="Роли" value={selected.role.allowedRoles.join(", ")} />
                <PassportRow icon={CreditCard} label="Подписка" value={selected.subscription.label} />
                <PassportRow icon={Plug} label="Подключения" value={connectorStatusLabel(selected)} />
              </div>

              {selected.toggleBlockedReasons.length > 0 && (
                <div className="mt-4 rounded-xl border border-border bg-background/45 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Почему нельзя прямо сейчас</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.toggleBlockedReasons.map((reason) => (
                      <span key={reason} className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.missingDependencies.length > 0 ? (
                <div className="admin-alert admin-alert-danger mt-4 flex items-start gap-2 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Не найдены зависимости: {selected.missingDependencies.join(", ")}</span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  Связи модуля в порядке
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRoute && selected.effectiveEnabled ? (
                  <Link
                    href={selectedRoute}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.08]"
                  >
                    Открыть маршрут
                  </Link>
                ) : selectedRoute ? (
                  <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-muted/30 px-3 text-sm font-semibold text-muted-foreground">
                    Маршрут выключен
                  </span>
                ) : null}
                <ModulePowerButton
                  module={selected}
                  canManage={canManage}
                  loading={toggleLoadingId === selected.id}
                  onToggle={setPendingToggle}
                />
                <button
                  type="button"
                  onClick={() => setPassportOpen(true)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Открыть паспорт
                </button>
              </div>
            </div>

            <ModulePolicyEditor
              module={selected}
              canManage={canManage}
              loading={policyLoadingId === selected.id}
              onSave={(module, payload) => setPendingPolicy({ module, payload })}
            />

            <PassportBlock title="Что умеет ARAY" items={[...selected.aray.skills, ...selected.aray.quickActions]} empty="нет действий" />
            <PassportBlock title="Права" items={selected.permissions} empty="нет прав" />
            <PassportBlock title="Проверки качества" items={selected.quality} empty="нет проверок" />
            <PassportBlock title="Источники данных" items={selected.dataSources} empty="нет источников" />
            <PassportBlock title="Нужные подключения" items={selected.connectors.requiredTypes.map((type) => CONNECTOR_TYPE_LABELS[type] || type)} empty="подключения не требуются" />
          </aside>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => pendingToggle ? void toggleModule(pendingToggle) : undefined}
        title={pendingToggle?.requestedEnabled ? "Выключить модуль?" : "Включить модуль?"}
        description={
          pendingToggle
            ? `${moduleTitle(pendingToggle)} изменит доступность связанных экранов и действий ARAY.`
            : ""
        }
        confirmLabel={pendingToggle?.requestedEnabled ? "Выключить" : "Включить"}
        variant="warning"
        loading={Boolean(pendingToggle && toggleLoadingId === pendingToggle.id)}
      />

      <ConfirmDialog
        open={Boolean(pendingPolicy)}
        onClose={() => setPendingPolicy(null)}
        onConfirm={() => pendingPolicy ? void savePolicy(pendingPolicy.module, pendingPolicy.payload) : undefined}
        title="Сохранить политику модуля?"
        description={
          pendingPolicy
            ? `${moduleTitle(pendingPolicy.module)} получит новые роли, тариф или обязательные подключения.`
            : ""
        }
        confirmLabel="Сохранить"
        variant="warning"
        loading={Boolean(pendingPolicy && policyLoadingId === pendingPolicy.module.id)}
      />

      {selected && (
        <AdminModal
          open={passportOpen}
          onClose={() => setPassportOpen(false)}
          title={selected.name}
          subtitle={selected.id}
          size="lg"
        >
          <div className="space-y-4">
            <PassportBlock title="Экраны и API" items={selected.routes} empty="нет маршрутов" />
            <PassportBlock title="Навигация" items={selected.navItems} empty="нет пунктов навигации" />
            <PassportBlock title="Зависимости" items={selected.dependencies} empty="нет зависимостей" />
            <PassportBlock title="Настройки" items={selected.settings} empty="нет настроек" />
            <PassportBlock title="События" items={selected.events} empty="нет событий" />
            <PassportBlock title="Подтверждения" items={selected.aray.confirmations} empty="нет подтверждений" />
          </div>
        </AdminModal>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/45 px-2 py-2">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function PassportRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-background/45 px-3">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function PassportBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-background/55 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
