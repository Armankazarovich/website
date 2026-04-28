"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Loader2, ChevronDown, ChevronUp, ShoppingBag, X, UserCog, KeyRound, CheckCircle2, AlertCircle, Mail, AlertTriangle, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminPageActions } from "@/components/admin/admin-page-actions";

const STAFF_ROLES = [
  { value: "MANAGER", label: "Менеджер" },
  { value: "COURIER", label: "Курьер" },
  { value: "ACCOUNTANT", label: "Бухгалтер" },
  { value: "WAREHOUSE", label: "Складчик" },
  { value: "SELLER", label: "Продавец" },
  { value: "ADMIN", label: "Администратор" },
];

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый", CONFIRMED: "Подтверждён", PROCESSING: "В обработке",
  SHIPPED: "Отгружен", IN_DELIVERY: "Доставляется", READY_PICKUP: "Самовывоз",
  DELIVERED: "Доставлен", COMPLETED: "Завершён", CANCELLED: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-slate-500/15 text-slate-500 border border-slate-500/25", CONFIRMED: "bg-teal-500/15 text-teal-600 border border-teal-500/25",
  PROCESSING: "bg-yellow-500/15 text-yellow-600 border border-yellow-500/25", SHIPPED: "bg-orange-500/15 text-orange-500 border border-orange-500/25",
  IN_DELIVERY: "bg-cyan-500/15 text-cyan-600 border border-cyan-500/25", READY_PICKUP: "bg-violet-500/15 text-violet-500 border border-violet-500/25",
  DELIVERED: "bg-green-500/15 text-green-600 border border-green-500/25", COMPLETED: "bg-teal-500/15 text-teal-600 border border-teal-500/25",
  CANCELLED: "bg-red-500/15 text-red-500 border border-red-500/25",
};

type ClientOrder = {
  id: string; orderNumber: number; totalAmount: any;
  deliveryCost: any; status: string; createdAt: Date;
};

type Client = {
  id: string; name: string | null; email: string;
  phone: string | null; address: string | null;
  createdAt: Date; orders: ClientOrder[];
};

export function ClientsList({ clients: initialClients }: { clients: Client[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // URL-параметры от Smart Command Bar чипсов
  const urlHasOrders = searchParams.get("hasorders") === "1";
  const urlPeriodNew = searchParams.get("period") === "new";
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return clients.filter((c) => {
      const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.includes(q);
      const matchHasOrders = !urlHasOrders || c.orders.length > 0;
      const matchNew = !urlPeriodNew || new Date(c.createdAt) >= thirtyDaysAgo;
      return matchSearch && matchHasOrders && matchNew;
    });
  }, [clients, search, urlHasOrders, urlPeriodNew]);

  // Регистрируем action-кнопки для AppHeader (сессия 40)
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

  const handleEdit = (c: Client) => {
    setEditId(c.id);
    setEditForm({ name: c.name || "", phone: c.phone || "", address: c.address || "" });
    setExpandedId(null);
    setPromoteId(null);
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
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...data.user } : c)));
        setEditId(null);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id));
        setDeleteConfirmId(null);
      }
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
      }
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
        // Убираем из списка клиентов — он теперь сотрудник
        setClients((prev) => prev.filter((c) => c.id !== id));
        setPromoteId(null);
        setPromoteRole("");
        setPromotedName(clientName || "Клиент");
        // Обновляем данные страницы
        router.refresh();
      } else {
        setPromoteError(data?.error || "Не удалось назначить роль");
      }
    } catch (e: any) {
      setPromoteError("Ошибка сети: " + (e?.message || "попробуйте снова"));
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditId(null);
    setPromoteId(null);
  };

  const getRevenue = (orders: ClientOrder[]) =>
    orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, email, телефону..."
          className="pl-9 h-10"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Success banner after promote */}
      {promotedName && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span><strong>{promotedName}</strong> успешно назначен сотрудником и добавлен в команду</span>
          <button className="ml-auto text-green-500 hover:text-primary" onClick={() => setPromotedName(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{search ? "Клиентов не найдено" : "Зарегистрированных клиентов пока нет"}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((client) => {
          const isEditing = editId === client.id;
          const isExpanded = expandedId === client.id;
          const isLoading = loadingId === client.id;
          const isDeleting = deleteConfirmId === client.id;
          const isPromoting = promoteId === client.id;
          const isResetting = resetPasswordId === client.id;
          const revenue = getRevenue(client.orders);
          const activeOrders = client.orders.filter(
            (o) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status)
          );

          return (
            <div key={client.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Main row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                  {client.name?.charAt(0)?.toUpperCase() || client.email.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{client.name || "Без имени"}</p>
                    {activeOrders.length > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {activeOrders.length} активных
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{client.email}</p>
                  {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Зарегистрирован: {new Date(client.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-center shrink-0">
                  <div>
                    <p className="text-sm font-bold">{client.orders.length}</p>
                    <p className="text-[10px] text-muted-foreground">заказов</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{revenue.toLocaleString("ru-RU")} ₽</p>
                    <p className="text-[10px] text-muted-foreground">потрачено</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {client.orders.length > 0 && (
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => toggleExpand(client.id)} title="История заказов">
                      <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost"
                    className={`h-8 w-8 p-0 ${isResetting ? "text-amber-600" : "text-muted-foreground hover:text-amber-600"}`}
                    title="Сбросить пароль"
                    onClick={() => {
                      setResetPasswordId(isResetting ? null : client.id);
                      setResetResult(null);
                      setEditId(null);
                      setPromoteId(null);
                    }}>
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    className={`h-8 w-8 p-0 ${isPromoting ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                    title="Назначить сотрудником"
                    onClick={() => { setPromoteId(isPromoting ? null : client.id); setPromoteRole(""); setPromoteError(null); setEditId(null); setResetPasswordId(null); }}>
                    <UserCog className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost"
                    className={`h-8 w-8 p-0 ${isEditing ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    title="Редактировать"
                    onClick={() => isEditing ? setEditId(null) : handleEdit(client)}>
                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    title="Удалить"
                    onClick={() => setDeleteConfirmId(isDeleting ? null : client.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Promote to staff panel */}
              {isPromoting && (
                <div className="border-t border-border px-4 py-3 bg-primary/10 dark:bg-primary/15">
                  <p className="text-xs font-medium text-primary mb-2">
                    <UserCog className="w-3.5 h-3.5 inline mr-1" />
                    Назначить <strong>{client.name || client.email}</strong> сотрудником
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 h-8 px-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      value={promoteRole}
                      onChange={(e) => setPromoteRole(e.target.value)}
                    >
                      <option value="">Выберите роль...</option>
                      {STAFF_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <Button size="sm" className="h-8 text-xs px-3"
                      onClick={() => handlePromote(client.id, client.name)}
                      disabled={!promoteRole || isLoading}>
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Назначить"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs"
                      onClick={() => { setPromoteId(null); setPromoteError(null); }}>Отмена</Button>
                  </div>
                  {promoteError && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {promoteError}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Клиент получит доступ в админку и исчезнет из этого списка
                  </p>
                </div>
              )}

              {/* Reset password panel */}
              {isResetting && (
                <div className="border-t border-border px-4 py-3 bg-amber-50/50 dark:bg-amber-950/20">
                  {!resetResult ? (
                    <>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                        Сбросить пароль для <strong>{client.name || client.email}</strong>
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-3">
                        Будет сгенерирован новый пароль и отправлен клиенту на email{" "}
                        <strong>{client.email}</strong>
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleResetPassword(client.id)} disabled={isLoading}>
                          {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <KeyRound className="w-3 h-3 mr-1" />}
                          Сбросить пароль
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs"
                          onClick={() => setResetPasswordId(null)}>Отмена</Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 inline" /> Пароль успешно сброшен
                      </p>
                      <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">Новый пароль клиента:</p>
                          <p className="text-lg font-mono font-bold tracking-widest">{resetResult.password}</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0"
                          onClick={() => navigator.clipboard.writeText(resetResult.password)}>
                          Копировать
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {resetResult.emailSent
                          ? <><Mail className="w-3 h-3 inline" /> Письмо с паролем отправлено на {resetResult.email}</>
                          : <><AlertTriangle className="w-3 h-3 inline" /> Email не отправлен — сообщите пароль клиенту вручную</>}
                      </p>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { setResetPasswordId(null); setResetResult(null); }}>Закрыть</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Имя" value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-8 text-xs" />
                    <Input placeholder="Телефон" value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-8 text-xs" />
                    <Input placeholder="Адрес" value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-8 text-xs" />
                    <div className="sm:col-span-3 flex gap-2">
                      <Button size="sm" className="h-8 text-xs"
                        onClick={() => handleSave(client.id)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs"
                        onClick={() => setEditId(null)}>Отмена</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete confirm */}
              {isDeleting && (
                <div className="border-t border-destructive/20 px-4 py-3 bg-destructive/5 flex items-center gap-3">
                  <p className="text-xs text-destructive flex-1">
                    Удалить клиента <strong>{client.name || client.email}</strong>?
                    {client.orders.length > 0 && ` У него ${client.orders.length} заказов — они останутся в системе.`}
                  </p>
                  <Button size="sm" variant="destructive" className="h-7 text-xs"
                    onClick={() => handleDelete(client.id)} disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Удалить"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => setDeleteConfirmId(null)}>Отмена</Button>
                </div>
              )}

              {/* Orders history */}
              {isExpanded && client.orders.length > 0 && (
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      История заказов ({client.orders.length})
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {client.orders.map((order) => {
                      const total = Number(order.totalAmount) + Number(order.deliveryCost ?? 0);
                      const color = STATUS_COLORS[order.status] || "bg-muted text-muted-foreground";
                      const label = STATUS_LABELS[order.status] || order.status;
                      return (
                        <Link key={order.id} href={`/admin/orders/${order.id}`}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.05] transition-colors">
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-muted-foreground">#{order.orderNumber}</p>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                            </p>
                          </div>
                          <p className="text-xs font-bold shrink-0">{total.toLocaleString("ru-RU")} ₽</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
