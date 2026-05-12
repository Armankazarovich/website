"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  BellRing,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RoleBlueprint = {
  key: string;
  label: string;
  description: string;
  baseRole: string;
  scope: string;
  roleKind: string;
  notificationEvents: string[];
  channels: string[];
  created: boolean;
};

type StaffCandidate = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  staffStatus: string | null;
};

type EventMeta = {
  key: string;
  label: string;
  description: string;
};

type NotificationSeed = {
  events: string[];
  channels: string[];
};

type BusinessRole = {
  id: string;
  roleKey: string;
  label: string;
  description: string | null;
  baseRole: string | null;
  scope: string;
  roleKind: string;
  isActive: boolean;
  memberCount: number;
  preferenceCount: number;
  members: Array<{
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    role: string | null;
  }>;
  notificationSeed: NotificationSeed;
};

type BusinessRolePayload = {
  canEdit: boolean;
  roles: BusinessRole[];
  blueprints: RoleBlueprint[];
  staffCandidates: StaffCandidate[];
  events: EventMeta[];
};

type EditDraft = {
  label: string;
  description: string;
  baseRole: string;
  scope: string;
  isActive: boolean;
  notificationSeed: NotificationSeed;
};

const BASE_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Супер-админ",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
  ACCOUNTANT: "Бухгалтер",
  WAREHOUSE: "Склад",
  SELLER: "Продавец",
  COURIER: "Курьер",
  USER: "Клиент",
};

const BASE_ROLES = Object.keys(BASE_ROLE_LABELS);
const CHANNEL_LABELS: Record<string, string> = {
  SYSTEM: "Внутри ARAY",
  PUSH: "Push",
  TELEGRAM: "Telegram",
  ARAY: "ARAY",
  EMAIL: "Email",
  SMS: "SMS",
};

const NOTIFICATION_CHANNELS = Object.keys(CHANNEL_LABELS);
const ROLE_SCOPES = [
  { key: "business", label: "Бизнес" },
  { key: "team", label: "Команда" },
  { key: "operations", label: "Операции" },
  { key: "sales", label: "Продажи" },
  { key: "finance", label: "Финансы" },
  { key: "client", label: "Клиенты" },
  { key: "partner", label: "Партнеры" },
];

function deriveRoleKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s:_-]/gi, "")
    .replace(/[а-яё]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toggleListItem(items: string[], item: string) {
  return items.includes(item)
    ? items.filter((current) => current !== item)
    : [...items, item];
}

function roleToDraft(role: BusinessRole): EditDraft {
  return {
    label: role.label,
    description: role.description ?? "",
    baseRole: role.baseRole ?? "MANAGER",
    scope: role.scope,
    isActive: role.isActive,
    notificationSeed: {
      events: [...role.notificationSeed.events],
      channels: role.notificationSeed.channels.length ? [...role.notificationSeed.channels] : ["SYSTEM", "ARAY"],
    },
  };
}

function ToggleButton({
  checked,
  disabled,
  label,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      aria-label={`${label}: ${checked ? "включено" : "выключено"}`}
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        "aray-toggle aray-toggle-md shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className="aray-toggle-thumb" />
    </button>
  );
}

export function BusinessRoleOsPanel() {
  const [data, setData] = useState<BusinessRolePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<Record<string, string>>({});
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [form, setForm] = useState({
    label: "",
    roleKey: "",
    description: "",
    baseRole: "MANAGER",
    scope: "business",
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/business-roles", { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(payload?.roles)) {
        throw new Error(payload?.error || "Не удалось загрузить умные роли.");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить умные роли.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savedRoleKeys = useMemo(
    () => new Set((data?.roles ?? []).map((role) => role.roleKey)),
    [data?.roles],
  );

  async function send(
    key: string,
    request: () => Promise<Response>,
    fallback = "Не удалось выполнить действие.",
  ) {
    if (!data?.canEdit || savingKey) return false;
    setSavingKey(key);
    setError(null);
    try {
      const res = await request();
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.payload) {
        throw new Error(payload?.error || fallback);
      }
      setData(payload.payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  function createFromTemplate(templateKey: string) {
    send(`template:${templateKey}`, () =>
      fetch("/api/admin/business-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey }),
      }),
    );
  }

  function createCustomRole() {
    const roleKey = form.roleKey || deriveRoleKey(form.label);
    send("custom", () =>
      fetch("/api/admin/business-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          roleKey,
          notificationSeed: {
            events: ["new_order", "task_assigned", "aray_reminder"],
            channels: ["SYSTEM", "ARAY"],
          },
        }),
      }),
    ).then((ok) => {
      if (ok) setForm({ label: "", roleKey: "", description: "", baseRole: "MANAGER", scope: "business" });
    });
  }

  function patchRole(role: BusinessRole, patch: Partial<BusinessRole>) {
    const body: Record<string, unknown> = {
      action: "update_role",
      roleId: role.id,
      label: patch.label ?? role.label,
      description: patch.description ?? role.description ?? "",
      baseRole: patch.baseRole ?? role.baseRole ?? "MANAGER",
      scope: patch.scope ?? role.scope,
      isActive: patch.isActive ?? role.isActive,
    };
    if (patch.notificationSeed) {
      body.notificationSeed = patch.notificationSeed;
    }

    return send(`role:${role.id}`, () =>
      fetch("/api/admin/business-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  function startEdit(role: BusinessRole) {
    setEditingRoleId(role.id);
    setEditDraft(roleToDraft(role));
  }

  function updateEditDraft(patch: Partial<EditDraft>) {
    setEditDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function toggleDraftEvent(eventKey: string) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            notificationSeed: {
              ...current.notificationSeed,
              events: toggleListItem(current.notificationSeed.events, eventKey),
            },
          }
        : current,
    );
  }

  function toggleDraftChannel(channel: string) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            notificationSeed: {
              ...current.notificationSeed,
              channels: toggleListItem(current.notificationSeed.channels, channel),
            },
          }
        : current,
    );
  }

  function cancelEdit() {
    setEditingRoleId(null);
    setEditDraft(null);
  }

  function saveEdit(role: BusinessRole) {
    if (!editDraft || !editDraft.label.trim()) return;
    if (editDraft.notificationSeed.events.length === 0 || editDraft.notificationSeed.channels.length === 0) {
      setError("Для роли нужен минимум один сигнал и один канал уведомлений.");
      return;
    }

    patchRole(role, {
      label: editDraft.label.trim(),
      description: editDraft.description.trim(),
      baseRole: editDraft.baseRole,
      scope: editDraft.scope,
      isActive: editDraft.isActive,
      notificationSeed: editDraft.notificationSeed,
    }).then((ok) => {
      if (ok) cancelEdit();
    });
  }

  function syncNotifications(role: BusinessRole) {
    send(`sync:${role.id}`, () =>
      fetch("/api/admin/business-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_notifications", roleId: role.id }),
      }),
    );
  }

  function addMember(role: BusinessRole) {
    const userId = memberDraft[role.id];
    if (!userId) return;
    send(`member:${role.id}`, () =>
      fetch("/api/admin/business-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_member", roleId: role.id, userId }),
      }),
    ).then((ok) => {
      if (ok) setMemberDraft((current) => ({ ...current, [role.id]: "" }));
    });
  }

  function removeMember(role: BusinessRole, userId: string) {
    send(`remove:${role.id}:${userId}`, () =>
      fetch("/api/admin/business-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_member", roleId: role.id, userId }),
      }),
    );
  }

  function deleteRole(role: BusinessRole) {
    send(`delete:${role.id}`, () =>
      fetch(`/api/admin/business-roles?id=${encodeURIComponent(role.id)}`, { method: "DELETE" }),
    );
  }

  const canEdit = Boolean(data?.canEdit);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Dynamic Role OS</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
              Умные роли под каждый бизнес: шаблоны, участники, базовые права и audience-настройки уведомлений.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading || Boolean(savingKey)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Обновить
        </button>
      </div>

      <div className="space-y-4 p-4">
        {error && (
          <div className="admin-alert admin-alert-danger px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Загружаю роли
          </div>
        ) : data ? (
          <>
            {!canEdit && (
              <div className="rounded-xl border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
                Режим просмотра. Создание и изменение ролей доступно администратору.
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Plus className="h-4 w-4 text-primary" />
                  Своя роль
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    value={form.label}
                    onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Например: Замерщик"
                    disabled={!canEdit || Boolean(savingKey)}
                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                  />
                  <input
                    value={form.roleKey}
                    onChange={(event) => setForm((current) => ({ ...current, roleKey: event.target.value }))}
                    placeholder="role-key"
                    disabled={!canEdit || Boolean(savingKey)}
                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                  />
                  <select
                    value={form.baseRole}
                    onChange={(event) => setForm((current) => ({ ...current, baseRole: event.target.value }))}
                    disabled={!canEdit || Boolean(savingKey)}
                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                  >
                    {BASE_ROLES.map((role) => (
                      <option key={role} value={role}>{BASE_ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                  <select
                    value={form.scope}
                    onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value }))}
                    disabled={!canEdit || Boolean(savingKey)}
                    className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                  >
                    {ROLE_SCOPES.map((scope) => (
                      <option key={scope.key} value={scope.key}>{scope.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Коротко: что делает роль и какие сигналы ей нужны"
                  disabled={!canEdit || Boolean(savingKey)}
                  className="mt-2 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={createCustomRole}
                  disabled={!canEdit || Boolean(savingKey) || !form.label.trim()}
                  className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingKey === "custom" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Создать роль
                </button>
              </div>

              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Шаблоны ARAY
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.blueprints.map((blueprint) => {
                    const created = blueprint.created || savedRoleKeys.has(blueprint.key);
                    return (
                      <button
                        key={blueprint.key}
                        type="button"
                        onClick={() => createFromTemplate(blueprint.key)}
                        disabled={!canEdit || Boolean(savingKey)}
                        className={cn(
                          "min-h-[84px] rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                          created
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-background/45 hover:border-primary/30 hover:bg-primary/5",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">{blueprint.label}</span>
                          <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {created ? "создана" : BASE_ROLE_LABELS[blueprint.baseRole] || blueprint.baseRole}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{blueprint.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Активные роли
              </div>

              {data.roles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                  Пока нет кастомных ролей. Подключи шаблон или создай роль вручную.
                </div>
              ) : (
                data.roles.map((role) => {
                  const draft = editingRoleId === role.id ? editDraft : null;
                  const saveDisabled = !draft
                    || !draft.label.trim()
                    || draft.notificationSeed.events.length === 0
                    || draft.notificationSeed.channels.length === 0;

                  return (
                    <article key={role.id} className="rounded-xl border border-border bg-background/40 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          {draft ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <input
                                value={draft.label}
                                onChange={(event) => updateEditDraft({ label: event.target.value })}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none transition-colors focus:border-primary disabled:opacity-50"
                              />
                              <select
                                value={draft.baseRole}
                                onChange={(event) => updateEditDraft({ baseRole: event.target.value })}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                              >
                                {BASE_ROLES.map((baseRole) => (
                                  <option key={baseRole} value={baseRole}>{BASE_ROLE_LABELS[baseRole]}</option>
                                ))}
                              </select>
                              <select
                                value={draft.scope}
                                onChange={(event) => updateEditDraft({ scope: event.target.value })}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                              >
                                {ROLE_SCOPES.map((scope) => (
                                  <option key={scope.key} value={scope.key}>{scope.label}</option>
                                ))}
                              </select>
                              <div className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {draft.isActive ? "Активна" : "Архив"}
                                </span>
                                <ToggleButton
                                  checked={draft.isActive}
                                  disabled={!canEdit || Boolean(savingKey)}
                                  label="Статус роли"
                                  onClick={() => updateEditDraft({ isActive: !draft.isActive })}
                                />
                              </div>
                              <textarea
                                value={draft.description}
                                onChange={(event) => updateEditDraft({ description: event.target.value })}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="min-h-20 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50 sm:col-span-2"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-foreground">{role.label}</h3>
                                <span className="rounded-full border border-border bg-background/65 px-2 py-0.5 text-[11px] text-muted-foreground">
                                  {role.roleKey}
                                </span>
                                <span className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                  role.isActive
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                                    : "border-border bg-muted/35 text-muted-foreground",
                                )}>
                                  {role.isActive ? "активна" : "архив"}
                                </span>
                              </div>
                              {role.description && (
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{role.description}</p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                                <span className="rounded-full border border-border px-2 py-0.5">{BASE_ROLE_LABELS[role.baseRole || ""] || role.baseRole}</span>
                                <span className="rounded-full border border-border px-2 py-0.5">{role.scope}</span>
                                <span className="rounded-full border border-border px-2 py-0.5">{role.memberCount} участ.</span>
                                <span className="rounded-full border border-border px-2 py-0.5">{role.preferenceCount} уведомл.</span>
                                {role.notificationSeed.events.slice(0, 2).map((eventKey) => {
                                  const eventMeta = data.events.find((event) => event.key === eventKey);
                                  return (
                                    <span key={eventKey} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-primary">
                                      {eventMeta?.label ?? eventKey}
                                    </span>
                                  );
                                })}
                                {role.notificationSeed.events.length > 2 && (
                                  <span className="rounded-full border border-border px-2 py-0.5">
                                    +{role.notificationSeed.events.length - 2}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {draft ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(role)}
                                disabled={!canEdit || Boolean(savingKey) || saveDisabled}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                              >
                                {savingKey === `role:${role.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Сохранить
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={Boolean(savingKey)}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                                aria-label="Закрыть редактирование роли"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(role)}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Править
                              </button>
                              <button
                                type="button"
                                onClick={() => syncNotifications(role)}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                              >
                                {savingKey === `sync:${role.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                                Уведомления
                              </button>
                              <button
                                type="button"
                                onClick={() => patchRole(role, { isActive: !role.isActive })}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                              >
                                <Archive className="h-3.5 w-3.5" />
                                {role.isActive ? "В архив" : "Вернуть"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRole(role)}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-destructive/30 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                                aria-label={`Удалить роль ${role.label}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {draft && (
                        <div className="mt-3 grid gap-3 border-t border-border pt-3 lg:grid-cols-[1fr_280px]">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <BellRing className="h-3.5 w-3.5 text-primary" />
                              События
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              {data.events.map((eventMeta) => {
                                const checked = draft.notificationSeed.events.includes(eventMeta.key);
                                return (
                                  <div
                                    key={eventMeta.key}
                                    className="flex min-h-[72px] items-start justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"
                                  >
                                    <span className="min-w-0">
                                      <span className="block text-xs font-semibold text-foreground">{eventMeta.label}</span>
                                      <span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{eventMeta.description}</span>
                                    </span>
                                    <ToggleButton
                                      checked={checked}
                                      disabled={!canEdit || Boolean(savingKey)}
                                      label={eventMeta.label}
                                      onClick={() => toggleDraftEvent(eventMeta.key)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              Каналы
                            </div>
                            <div className="mt-2 space-y-2">
                              {NOTIFICATION_CHANNELS.map((channel) => {
                                const checked = draft.notificationSeed.channels.includes(channel);
                                return (
                                  <div
                                    key={channel}
                                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background/50 px-3"
                                  >
                                    <span className="text-xs font-semibold text-foreground">{CHANNEL_LABELS[channel]}</span>
                                    <ToggleButton
                                      checked={checked}
                                      disabled={!canEdit || Boolean(savingKey)}
                                      label={CHANNEL_LABELS[channel]}
                                      onClick={() => toggleDraftChannel(channel)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 lg:flex-row lg:items-center">
                        <select
                          value={memberDraft[role.id] || ""}
                          onChange={(event) => setMemberDraft((current) => ({ ...current, [role.id]: event.target.value }))}
                          disabled={!canEdit || Boolean(savingKey)}
                          className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
                        >
                          <option value="">Добавить участника...</option>
                          {data.staffCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name || candidate.email} · {BASE_ROLE_LABELS[candidate.role] || candidate.role}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => addMember(role)}
                          disabled={!canEdit || Boolean(savingKey) || !memberDraft[role.id]}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-primary/[0.08] hover:text-foreground disabled:opacity-50"
                        >
                          <UserPlus className="h-4 w-4" />
                          Добавить
                        </button>
                      </div>

                      {role.members.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {role.members.map((member) => (
                            <span
                              key={member.id}
                              className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-background/65 px-2.5 text-xs text-muted-foreground"
                            >
                              {member.name || member.email}
                              <button
                                type="button"
                                onClick={() => removeMember(role, member.userId)}
                                disabled={!canEdit || Boolean(savingKey)}
                                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                                aria-label={`Убрать ${member.name || member.email} из роли`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
