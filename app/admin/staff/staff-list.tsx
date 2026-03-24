"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, UserCog, Clock, ShieldAlert, Loader2, UserPlus, X, Pencil, Trash2, Search } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  COURIER: "Курьер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Складчик",
  SELLER: "Продавец",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  MANAGER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  COURIER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ACCOUNTANT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  WAREHOUSE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SELLER: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ALL_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "ADMIN"];

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  staffStatus: string | null;
  customRole: string | null;
  createdAt: Date;
};

const EMPTY_FORM = { name: "", phone: "", email: "", password: "", role: "", customRole: "" };

export function StaffList({ staff }: { staff: StaffMember[] }) {
  const [members, setMembers] = useState(staff);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const setField = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const filteredMembers = search.trim()
    ? members.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.name?.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone?.toLowerCase().includes(q)
        );
      })
    : members;

  const handleEdit = (member: StaffMember) => {
    setEditId(member.id);
    setEditForm({ name: member.name || "", phone: member.phone || "", email: member.email });
  };

  const handleEditSave = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.user } : m)));
        setEditId(null);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== id));
        setDeleteConfirmId(null);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.password || !form.role) {
      setFormError("Заполните все обязательные поля");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setMembers((prev) => [data.user, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const update = async (id: string, body: object) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...data.user } : m))
        );
      }
    } finally {
      setLoadingId(null);
    }
  };

  const pending = filteredMembers.filter((m) => m.staffStatus === "PENDING");
  const active = filteredMembers.filter((m) => m.staffStatus === "ACTIVE" || !m.staffStatus);
  const suspended = filteredMembers.filter((m) => m.staffStatus === "SUSPENDED");

  const renderMember = (member: StaffMember) => {
    const isLoading = loadingId === member.id;
    const roleBadge = ROLE_COLORS[member.role] || "bg-gray-100 text-gray-600";
    const displayRole = member.customRole || ROLE_LABELS[member.role] || member.role;
    const isEditing = editId === member.id;
    const isConfirmingDelete = deleteConfirmId === member.id;

    return (
      <div key={member.id} className="flex flex-col gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
            {member.name?.charAt(0)?.toUpperCase() || "?"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm">{member.name || "—"}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleBadge}`}>
                {displayRole}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
            {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Добавлен: {new Date(member.createdAt).toLocaleDateString("ru-RU")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {member.staffStatus !== "PENDING" && (
              <select
                className="h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none"
                value={member.role}
                disabled={isLoading}
                onChange={(e) => update(member.id, { role: e.target.value })}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            )}

            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                {member.staffStatus === "PENDING" && (
                  <>
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                      onClick={() => update(member.id, { staffStatus: "ACTIVE" })}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Одобрить
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                      onClick={() => update(member.id, { staffStatus: "SUSPENDED" })}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Отклонить
                    </Button>
                  </>
                )}
                {member.staffStatus === "ACTIVE" && (
                  <Button size="sm" variant="outline" className="h-8 text-xs text-muted-foreground"
                    onClick={() => update(member.id, { staffStatus: "SUSPENDED" })}>
                    Заблокировать
                  </Button>
                )}
                {member.staffStatus === "SUSPENDED" && (
                  <Button size="sm" variant="outline"
                    className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                    onClick={() => update(member.id, { staffStatus: "ACTIVE" })}>
                    Восстановить
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Редактировать"
                  onClick={() => isEditing ? setEditId(null) : handleEdit(member)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  title="Удалить"
                  onClick={() => setDeleteConfirmId(isConfirmingDelete ? null : member.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Edit form */}
        {isEditing && (
          <div className="border-t border-border pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input placeholder="Имя" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
            <Input placeholder="Телефон" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-xs" />
            <Input placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" />
            <div className="sm:col-span-3 flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={() => handleEditSave(member.id)} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Сохранить
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditId(null)}>Отмена</Button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {isConfirmingDelete && (
          <div className="border-t border-destructive/20 pt-3 flex items-center gap-3 bg-destructive/5 rounded-lg px-3 py-2">
            <p className="text-xs text-destructive flex-1">Удалить <strong>{member.name || member.email}</strong>? Это действие нельзя отменить.</p>
            <Button size="sm" variant="destructive" className="h-7 text-xs"
              onClick={() => handleDelete(member.id)} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Удалить"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteConfirmId(null)}>Отмена</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError(""); }} variant={showForm ? "outline" : "default"}>
          {showForm ? <><X className="w-4 h-4 mr-2" /> Отмена</> : <><UserPlus className="w-4 h-4 mr-2" /> Добавить сотрудника</>}
        </Button>
      </div>

      {/* Add employee form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-2xl p-5 space-y-4 max-w-lg">
          <h3 className="font-semibold">Новый сотрудник</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Имя и фамилия *</Label>
              <Input className="mt-1" placeholder="Иван Иванов" value={form.name} onChange={(e) => setField("name", e.target.value)} disabled={formLoading} />
            </div>
            <div>
              <Label>Телефон</Label>
              <Input className="mt-1" placeholder="+7 999 000-00-00" value={form.phone} onChange={(e) => setField("phone", e.target.value)} disabled={formLoading} />
            </div>
            <div>
              <Label>Email *</Label>
              <Input className="mt-1" type="email" placeholder="ivan@mail.ru" value={form.email} onChange={(e) => setField("email", e.target.value)} disabled={formLoading} />
            </div>
            <div>
              <Label>Пароль *</Label>
              <Input className="mt-1" type="password" placeholder="Минимум 6 символов" value={form.password} onChange={(e) => setField("password", e.target.value)} disabled={formLoading} />
            </div>
            <div>
              <Label>Роль *</Label>
              <select
                className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.role}
                onChange={(e) => setField("role", e.target.value)}
                disabled={formLoading}
              >
                <option value="">Выберите роль...</option>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {form.role === "CUSTOM" && (
              <div className="col-span-2">
                <Label>Своя должность</Label>
                <Input className="mt-1" placeholder="Например: Логист" value={form.customRole} onChange={(e) => setField("customRole", e.target.value)} disabled={formLoading} />
              </div>
            )}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={formLoading}>
            {formLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Добавляю...</> : "Добавить сотрудника"}
          </Button>
        </form>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Ожидают подтверждения ({pending.length})</h2>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="space-y-3">{pending.map(renderMember)}</div>
        </section>
      )}

      {/* Active */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <UserCog className="w-4 h-4 text-green-500" />
            <h2 className="font-semibold text-sm">Активные сотрудники ({active.length})</h2>
          </div>
          <div className="space-y-3">{active.map(renderMember)}</div>
        </section>
      )}

      {/* Suspended */}
      {suspended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h2 className="font-semibold text-sm">Заблокированы ({suspended.length})</h2>
          </div>
          <div className="space-y-3">{suspended.map(renderMember)}</div>
        </section>
      )}

      {members.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Сотрудников пока нет</p>
          <p className="text-sm mt-1">Поделитесь ссылкой на регистрацию: <strong>pilo-rus.ru/join</strong></p>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}
