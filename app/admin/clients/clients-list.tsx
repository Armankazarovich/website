"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, ShoppingBag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Самовывоз",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-purple-100 text-purple-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  SHIPPED: "bg-orange-100 text-orange-700",
  IN_DELIVERY: "bg-sky-100 text-sky-700",
  READY_PICKUP: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-green-100 text-green-700",
  COMPLETED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-red-100 text-red-700",
};

type ClientOrder = {
  id: string;
  orderNumber: number;
  totalAmount: any;
  deliveryCost: any;
  status: string;
  createdAt: Date;
};

type Client = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  orders: ClientOrder[];
};

export function ClientsList({ clients: initialClients }: { clients: Client[] }) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        String(c.orders.length).includes(q)
    );
  }, [clients, search]);

  const handleEdit = (c: Client) => {
    setEditId(c.id);
    setEditForm({ name: c.name || "", phone: c.phone || "", address: c.address || "" });
    setExpandedId(null);
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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditId(null);
  };

  const getClientRevenue = (orders: ClientOrder[]) =>
    orders
      .filter((o) => o.status !== "CANCELLED")
      .reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryCost ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени, email, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>{search ? "Клиентов не найдено" : "Зарегистрированных клиентов пока нет"}</p>
        </div>
      )}

      {/* Client cards */}
      <div className="space-y-3">
        {filtered.map((client) => {
          const isEditing = editId === client.id;
          const isExpanded = expandedId === client.id;
          const isLoading = loadingId === client.id;
          const isDeleting = deleteConfirmId === client.id;
          const revenue = getClientRevenue(client.orders);
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => toggleExpand(client.id)}
                      title="История заказов"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title="Редактировать"
                    onClick={() => isEditing ? setEditId(null) : handleEdit(client)}
                  >
                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    title="Удалить"
                    onClick={() => setDeleteConfirmId(isDeleting ? null : client.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Имя"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Телефон"
                      value={editForm.phone}
                      onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Адрес"
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <div className="sm:col-span-3 flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleSave(client.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Сохранить
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditId(null)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete confirm */}
              {isDeleting && (
                <div className="border-t border-destructive/20 px-4 py-3 bg-destructive/5 flex items-center gap-3">
                  <p className="text-xs text-destructive flex-1">
                    Удалить клиента <strong>{client.name || client.email}</strong>?
                    {client.orders.length > 0 && ` У него ${client.orders.length} заказов.`}
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={() => handleDelete(client.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Удалить"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteConfirmId(null)}>
                    Отмена
                  </Button>
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
                      const color = STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700";
                      const label = STATUS_LABELS[order.status] || order.status;
                      return (
                        <Link
                          key={order.id}
                          href={`/admin/orders/${order.id}`}
                          className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              #{order.orderNumber}
                            </p>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${color}`}>
                              {label}
                            </span>
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
