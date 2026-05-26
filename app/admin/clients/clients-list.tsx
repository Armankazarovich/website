"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Ellipsis,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  PhoneCall,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  UserCog,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";
import { RelatedTasksPanel } from "@/components/admin/related-tasks-panel";
import { ARAY_ICON_TONE, ARAY_ICON_TONE_DANGER, ARAY_ICON_TONE_MUTED } from "@/lib/aray-design-tokens";
import { createStableArayNumber, formatArayPublicNumber } from "@/lib/aray-communication-identity";
import { cn, formatPrice, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const STAFF_ROLES = [
  { value: "MANAGER", label: "Менеджер" },
  { value: "COURIER", label: "Курьер" },
  { value: "ACCOUNTANT", label: "Бухгалтер" },
  { value: "WAREHOUSE", label: "Складчик" },
  { value: "SELLER", label: "Продавец" },
  { value: "ADMIN", label: "Администратор" },
];

const FINAL_STATUSES = new Set(["DELIVERED", "COMPLETED", "CANCELLED"]);

const CLIENT_FILTERS = [
  { id: "all", label: "Все", hint: "Полная база" },
  { id: "new", label: "Новые", hint: "За 30 дней" },
  { id: "buyers", label: "С заказами", hint: "Были покупки" },
  { id: "repeat", label: "Повторные", hint: "2+ заказа" },
  { id: "vip", label: "VIP", hint: "Сильная ценность" },
  { id: "attention", label: "Внимание", hint: "Есть задача" },
] as const;

type ClientFilter = (typeof CLIENT_FILTERS)[number]["id"];

type ClientOrder = {
  id: string;
  orderNumber: number;
  totalAmount: number | string;
  deliveryCost: number | string | null;
  status: string;
  createdAt: Date | string;
};

type Client = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: Date | string;
  orders: ClientOrder[];
  orderCount?: number;
  paidOrderCount?: number;
  activeOrderCount?: number;
  revenue?: number;
};

type ClientMeta = {
  revenue: number;
  paidOrders: ClientOrder[];
  activeOrders: ClientOrder[];
  lastOrder: ClientOrder | null;
  score: number;
  segmentLabel: string;
  segmentHint: string;
  segmentClassName: string;
  needsAttention: boolean;
  attentionReason: string | null;
  isNew: boolean;
};

function getRevenue(orders: ClientOrder[]) {
  return orders
    .filter((order) => order.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.totalAmount) + Number(order.deliveryCost ?? 0), 0);
}

function getDaysSince(value: Date | string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function getClientMeta(client: Client): ClientMeta {
  const paidOrders = client.orders.filter((order) => order.status !== "CANCELLED");
  const activeOrders = client.orders.filter((order) => !FINAL_STATUSES.has(order.status));
  const paidOrderCount = client.paidOrderCount ?? paidOrders.length;
  const activeOrderCount = client.activeOrderCount ?? activeOrders.length;
  const revenue = client.revenue ?? getRevenue(client.orders);
  const isNew = getDaysSince(client.createdAt) <= 30;
  const hasFullContact = Boolean(client.name && client.phone);
  const lastOrder = client.orders[0] ?? null;
  const missingContact = !hasFullContact;
  const needsAttention = missingContact || activeOrderCount > 0;
  const score = Math.min(
    100,
    Math.round(
      (isNew ? 12 : 4) +
        (hasFullContact ? 18 : 4) +
        Math.min(paidOrderCount * 14, 38) +
        Math.min(revenue / 2500, 30) +
        (activeOrderCount > 0 ? 8 : 0)
    )
  );

  if (paidOrderCount >= 5 || revenue >= 100_000 || score >= 82) {
    return {
      revenue,
      paidOrders,
      activeOrders,
      lastOrder,
      score,
      segmentLabel: "VIP",
      segmentHint: "Высокая ценность",
      segmentClassName: "border-primary/35 bg-primary/10 text-primary",
      needsAttention,
      attentionReason: missingContact ? "Дополнить контакт" : activeOrderCount > 0 ? "Есть активный заказ" : null,
      isNew,
    };
  }

  if (paidOrderCount >= 2) {
    return {
      revenue,
      paidOrders,
      activeOrders,
      lastOrder,
      score,
      segmentLabel: "Повторный",
      segmentHint: "Вернулся за покупкой",
      segmentClassName: "border-primary/25 bg-primary/10 text-primary",
      needsAttention,
      attentionReason: missingContact ? "Дополнить контакт" : activeOrderCount > 0 ? "Есть активный заказ" : null,
      isNew,
    };
  }

  if (paidOrderCount >= 1) {
    return {
      revenue,
      paidOrders,
      activeOrders,
      lastOrder,
      score,
      segmentLabel: "Покупатель",
      segmentHint: "Есть первый заказ",
      segmentClassName: "border-border bg-muted/45 text-foreground",
      needsAttention,
      attentionReason: missingContact ? "Дополнить контакт" : activeOrderCount > 0 ? "Есть активный заказ" : null,
      isNew,
    };
  }

  return {
    revenue,
    paidOrders,
    activeOrders,
    lastOrder,
    score,
    segmentLabel: isNew ? "Новый" : "Потенциал",
    segmentHint: isNew ? "Недавно зарегистрирован" : "Пока без заказов",
    segmentClassName: "border-border bg-muted/35 text-muted-foreground",
    needsAttention,
    attentionReason: missingContact ? "Дополнить контакт" : null,
    isNew,
  };
}

function filterClient(filter: ClientFilter, client: Client, meta: ClientMeta) {
  if (filter === "new") return meta.isNew;
  if (filter === "buyers") return (client.orderCount ?? client.orders.length) > 0;
  if (filter === "repeat") return (client.paidOrderCount ?? meta.paidOrders.length) >= 2;
  if (filter === "vip") return meta.segmentLabel === "VIP";
  if (filter === "attention") return meta.needsAttention;
  return true;
}

function getInitialFilter(searchParams: ReturnType<typeof useSearchParams>): ClientFilter {
  if (searchParams.get("hasorders") === "1") return "buyers";
  if (searchParams.get("period") === "new") return "new";
  const raw = searchParams.get("segment");
  return CLIENT_FILTERS.some((item) => item.id === raw) ? (raw as ClientFilter) : "all";
}

function getClientArayNumber(client: Client) {
  return formatArayPublicNumber(createStableArayNumber({ id: `account:${client.id}` }));
}

function dialArayNumber(number: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aray:phone-dial", { detail: { number } }));
}

function getTelHref(phone: string) {
  const clean = phone.replace(/[^\d+]/g, "");
  return clean ? `tel:${clean}` : undefined;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard?.writeText(value);
  } catch {}
}

export function ClientsList({ clients: initialClients }: { clients: Client[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState(initialClients);
  const [filter, setFilter] = useState<ClientFilter>(() => getInitialFilter(searchParams));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [editId, setEditId] = useState<string | null>(null);
  const focusedClientId = searchParams.get("client");
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [promoteRole, setPromoteRole] = useState("");
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promotedName, setPromotedName] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{ password: string; emailSent: boolean; email: string } | null>(null);

  useEffect(() => {
    setFilter(getInitialFilter(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (focusedClientId && clients.some((client) => client.id === focusedClientId)) {
      setExpandedId(focusedClientId);
    }
  }, [clients, focusedClientId]);

  useAdminPageActions({
    onRefresh: () => router.refresh(),
    actions: [
      {
        id: "import-clients",
        label: "Импорт",
        icon: Download,
        onClick: () => router.push("/admin/import?type=clients"),
        hideOnMobile: true,
      },
    ],
  });

  const clientRows = useMemo(
    () =>
      clients.map((client) => ({
        client,
        meta: getClientMeta(client),
      })),
    [clients]
  );

  const counts = useMemo(() => {
    const result = Object.fromEntries(CLIENT_FILTERS.map((item) => [item.id, 0])) as Record<ClientFilter, number>;
    for (const row of clientRows) {
      for (const item of CLIENT_FILTERS) {
        if (filterClient(item.id, row.client, row.meta)) result[item.id] += 1;
      }
    }
    return result;
  }, [clientRows]);

  const filtered = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase().replace(/ё/g, "е");
    return clientRows.filter((row) => {
      if (!filterClient(filter, row.client, row.meta)) return false;
      if (!search) return true;
      const haystack = [
        row.client.name,
        row.client.email,
        row.client.phone,
        row.client.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .replace(/ё/g, "е");
      return haystack.includes(search);
    });
  }, [clientRows, deferredQuery, filter]);

  const handleEdit = (client: Client) => {
    setEditId(client.id);
    setEditForm({ name: client.name || "", phone: client.phone || "", address: client.address || "" });
    setExpandedId(null);
    setPromoteId(null);
    setResetPasswordId(null);
    setDeleteConfirmId(null);
  };

  const handleSave = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setClients((prev) => prev.map((client) => (client.id === id ? { ...client, ...data.user } : client)));
        setEditId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Клиент не сохранён",
          description: data?.error || "Сервер не подтвердил изменение.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Клиент не сохранён",
        description: "Ошибка сети при сохранении.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((client) => client.id !== id));
        setDeleteConfirmId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Клиент не удалён",
          description: data?.error || "Сервер не подтвердил удаление.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Клиент не удалён",
        description: "Ошибка сети при удалении.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    setLoadingId(id);
    setResetResult(null);
    try {
      const res = await fetch(`/api/admin/clients/${id}/reset-password`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResetResult({ password: data.newPassword, emailSent: data.emailSent, email: data.email });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Пароль не сброшен",
          description: data?.error || "Сервер не подтвердил сброс.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Пароль не сброшен",
        description: "Ошибка сети при сбросе пароля.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handlePromote = async (id: string, clientName: string | null) => {
    if (!promoteRole) return;
    setLoadingId(id);
    setPromoteError(null);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: promoteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setClients((prev) => prev.filter((client) => client.id !== id));
        setPromoteId(null);
        setPromoteRole("");
        setPromotedName(clientName || "Клиент");
        router.refresh();
      } else {
        setPromoteError(data?.error || "Не удалось назначить роль");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "попробуйте снова";
      setPromoteError(`Ошибка сети: ${message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditId(null);
    setPromoteId(null);
    setResetPasswordId(null);
    setDeleteConfirmId(null);
  };

  const openReset = (id: string) => {
    setResetPasswordId((prev) => (prev === id ? null : id));
    setResetResult(null);
    setEditId(null);
    setPromoteId(null);
    setDeleteConfirmId(null);
  };

  const openPromote = (id: string) => {
    setPromoteId((prev) => (prev === id ? null : id));
    setPromoteRole("");
    setPromoteError(null);
    setEditId(null);
    setResetPasswordId(null);
    setDeleteConfirmId(null);
  };

  const openDelete = (id: string) => {
    setDeleteConfirmId((prev) => (prev === id ? null : id));
    setEditId(null);
    setPromoteId(null);
    setResetPasswordId(null);
  };

  return (
    <div className="space-y-4">
      {promotedName && (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <strong>{promotedName}</strong> назначен сотрудником и добавлен в команду.
          </span>
          <button
            type="button"
            className="rounded-xl p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setPromotedName(null)}
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/80 p-3">
        <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Сегменты клиентов</h2>
            <p className="text-sm text-muted-foreground">Фильтры по ценности и состоянию базы.</p>
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} из {clients.length}</p>
        </div>
        <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/55 px-3 text-sm text-muted-foreground focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
          <Search className="h-4 w-4 shrink-0 text-primary" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти клиента, телефон, email или адрес"
            className="min-h-10 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {CLIENT_FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "group flex min-h-16 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-background/35 text-foreground hover:border-primary/30 hover:bg-muted/40"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.hint}</span>
                </span>
                <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-semibold text-foreground">
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/55 px-4 py-14 text-center text-muted-foreground">
          <UserRound className="mx-auto mb-3 h-9 w-9 opacity-45" />
          <p className="text-sm font-medium text-foreground">В этом сегменте пока никого нет</p>
          <p className="mt-1 text-sm">Когда появятся подходящие клиенты, они окажутся здесь автоматически.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ client, meta }) => {
            const isEditing = editId === client.id;
            const isExpanded = expandedId === client.id;
            const isLoading = loadingId === client.id;
            const isDeleting = deleteConfirmId === client.id;
            const isPromoting = promoteId === client.id;
            const isResetting = resetPasswordId === client.id;
            const isFocused = focusedClientId === client.id;
            const displayName = client.name || "Без имени";
            const avatar = displayName !== "Без имени" ? displayName.charAt(0) : client.email.charAt(0);
            const orderCount = client.orderCount ?? client.orders.length;
            const paidOrderCount = client.paidOrderCount ?? meta.paidOrders.length;
            const arayNumber = getClientArayNumber(client);
            const phoneHref = client.phone ? getTelHref(client.phone) : undefined;

            return (
              <article
                key={client.id}
                className={cn(
                  "scroll-mt-28 overflow-hidden rounded-2xl border bg-card/80 transition-colors",
                  isFocused ? "border-primary/70 ring-1 ring-primary/25" : "border-border"
                )}
              >
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`${ARAY_ICON_TONE} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold`}>
                      {avatar.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">{displayName}</h3>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", meta.segmentClassName)}>
                          {meta.segmentLabel}
                        </span>
                        {meta.needsAttention && meta.attentionReason && (
                          <span className="rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                            {meta.attentionReason}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="truncate">{client.email}</span>
                        {client.phone ? (
                          <a
                            href={phoneHref}
                            className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
                            title="Позвонить по живому телефону"
                          >
                            <PhoneCall className="h-3 w-3" />
                            {client.phone}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEdit(client)}
                            className="font-semibold text-destructive transition-colors hover:text-primary"
                          >
                            нет живого телефона
                          </button>
                        )}
                        {client.address ? <span className="truncate">адрес есть</span> : null}
                      </div>
                      <div className="mt-2 flex max-w-full flex-wrap items-center gap-1.5">
                        {client.phone ? (
                          <a
                            href={phoneHref}
                            className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/15"
                            title="Позвонить по живому телефону"
                          >
                            <PhoneCall className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.phone}</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEdit(client)}
                            className="inline-flex min-h-7 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 text-[10.5px] font-semibold text-destructive transition-colors hover:border-primary/35 hover:text-primary"
                          >
                            <Pencil className="h-3 w-3" />
                            Добавить телефон
                          </button>
                        )}
                        <span className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-border bg-background/45 px-2.5 text-[10.5px] font-semibold text-muted-foreground">
                          <PhoneCall className="h-3 w-3 shrink-0" />
                          <span className="text-[9px] uppercase tracking-wide">AR</span>
                          <span className="truncate">{arayNumber}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => dialArayNumber(arayNumber)}
                          className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-background/45 px-2 text-[10.5px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          title="Набрать внутренний номер в AR Phone"
                        >
                          <PhoneCall className="h-3 w-3" />
                          AR Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyText(arayNumber)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/45 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          title="Скопировать номер"
                          aria-label="Скопировать номер"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Зарегистрирован {new Date(client.createdAt).toLocaleDateString("ru-RU")} · {meta.segmentHint}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-border bg-background/35 px-3 py-2">
                      <p className="text-base font-semibold text-foreground">{orderCount}</p>
                      <p className="text-[11px] text-muted-foreground">заказов</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/35 px-3 py-2">
                      <p className="truncate text-base font-semibold text-foreground">{formatPrice(meta.revenue)}</p>
                      <p className="text-[11px] text-muted-foreground">выручка</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/35 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-semibold text-foreground">{paidOrderCount}</p>
                        <span className="text-[10px] text-muted-foreground">покупок</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${meta.score}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 lg:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl"
                      onClick={() => toggleExpand(client.id)}
                      disabled={orderCount === 0}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      История
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                          <Ellipsis className="h-4 w-4" />
                          <span className="sr-only">Действия клиента</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-border bg-card p-1">
                        <DropdownMenuItem className="rounded-xl focus:bg-muted focus:text-foreground" onSelect={() => handleEdit(client)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl focus:bg-muted focus:text-foreground" onSelect={() => openReset(client.id)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Сбросить пароль
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl focus:bg-muted focus:text-foreground" onSelect={() => openPromote(client.id)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          Назначить сотрудником
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="rounded-xl text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={() => openDelete(client.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isPromoting && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4">
                    <div className="mb-3 flex items-start gap-3">
                      <span className={`${ARAY_ICON_TONE} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Назначить сотрудником</p>
                        <p className="text-xs text-muted-foreground">
                          {displayName} получит доступ в админку и исчезнет из клиентской базы.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <Select value={promoteRole} onValueChange={setPromoteRole}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Выберите роль" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 rounded-xl"
                        onClick={() => handlePromote(client.id, client.name)}
                        disabled={!promoteRole || isLoading}
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Назначить
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setPromoteId(null)}>
                        Отмена
                      </Button>
                    </div>
                    {promoteError && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {promoteError}
                      </p>
                    )}
                  </div>
                )}

                {isResetting && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4">
                    {!resetResult ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <span className={`${ARAY_ICON_TONE_MUTED} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                            <KeyRound className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Сброс пароля</p>
                            <p className="text-xs text-muted-foreground">
                              Новый пароль будет отправлен на {client.email}.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" className="h-9 rounded-xl" onClick={() => handleResetPassword(client.id)} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                            Сбросить пароль
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setResetPasswordId(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Пароль сброшен
                        </p>
                        <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Новый пароль клиента</p>
                            <p className="font-mono text-lg font-semibold tracking-wide text-foreground">{resetResult.password}</p>
                          </div>
                          <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl" onClick={() => navigator.clipboard.writeText(resetResult.password)}>
                            Копировать
                          </Button>
                        </div>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                          {resetResult.emailSent ? <Mail className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {resetResult.emailSent
                            ? `Письмо отправлено на ${resetResult.email}`
                            : "Email не отправлен, сообщите пароль клиенту вручную"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Имя"
                        value={editForm.name}
                        onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))}
                        className="h-9"
                      />
                      <Input
                        placeholder="Телефон"
                        value={editForm.phone}
                        onChange={(event) => setEditForm((form) => ({ ...form, phone: event.target.value }))}
                        className="h-9"
                      />
                      <Input
                        placeholder="Адрес"
                        value={editForm.address}
                        onChange={(event) => setEditForm((form) => ({ ...form, address: event.target.value }))}
                        className="h-9"
                      />
                      <div className="flex flex-wrap gap-2 sm:col-span-3">
                        <Button type="button" size="sm" className="h-9 rounded-xl" onClick={() => handleSave(client.id)} disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Сохранить
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setEditId(null)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isDeleting && (
                  <div className="flex flex-col gap-3 border-t border-destructive/25 bg-destructive/10 px-4 py-4 sm:flex-row sm:items-center">
                    <span className={`${ARAY_ICON_TONE_DANGER} flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>
                      <Trash2 className="h-4 w-4" />
                    </span>
                    <p className="min-w-0 flex-1 text-sm text-foreground">
                      Удалить клиента <strong>{displayName}</strong>? Заказы останутся в системе.
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="destructive" className="h-9 rounded-xl" onClick={() => handleDelete(client.id)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Удалить"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-9 rounded-xl" onClick={() => setDeleteConfirmId(null)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}

                {isExpanded && orderCount > 0 && (
                  <div className="border-t border-border">
                    <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Последние заказы
                      </p>
                      {meta.lastOrder && (
                        <p className="text-xs text-muted-foreground">
                          последний {new Date(meta.lastOrder.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                    <div className="divide-y divide-border">
                      {client.orders.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-muted-foreground">
                          Заказы есть в статистике, но последние записи не попали в текущую выборку.
                        </div>
                      ) : client.orders.map((order) => {
                        const total = Number(order.totalAmount) + Number(order.deliveryCost ?? 0);
                        const color = ORDER_STATUS_COLORS[order.status] || "border-border bg-muted/40 text-muted-foreground";
                        const label = ORDER_STATUS_LABELS[order.status] || order.status;
                        return (
                          <Link
                            key={order.id}
                            href={`/admin/orders/${order.id}`}
                            className="grid gap-2 px-4 py-3 transition-colors hover:bg-muted/35 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-semibold text-primary">#{order.orderNumber}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", color)}>
                                {label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{formatPrice(total)}</p>
                          </Link>
                        );
                      })}
                    </div>
                    {orderCount > client.orders.length && (
                      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                        Показаны последние {client.orders.length} из {orderCount}. Полная история открывается через заказы клиента.
                      </p>
                    )}
                    <div className="border-t border-border bg-muted/10 px-4 py-4">
                      <RelatedTasksPanel
                        entityType="CLIENT"
                        entityId={client.id}
                        entityLabel={displayName}
                        entityHref={`/admin/clients?client=${client.id}`}
                        className="rounded-xl bg-background/60"
                      />
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
