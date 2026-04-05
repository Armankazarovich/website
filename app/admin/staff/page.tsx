"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  UserPlus,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Shuffle,
  Check,
  X,
} from "lucide-react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { InfoPopup } from "@/components/admin/info-popup";

// ─── Role definitions ───────────────────────────────────────────────────────

const ROLE_DEFINITIONS: Record<
  string,
  {
    label: string;
    color: string;
    dot: string;
    avatarBg: string;
    description: string;
    sections: string[];
    defaultPassword: string;
  }
> = {
  SUPER_ADMIN: {
    label: "Супер Администратор",
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    avatarBg: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
    description: "Владелец системы — неограниченный доступ ко всему",
    sections: ["Всё без ограничений", "Управление ADMIN аккаунтами"],
    defaultPassword: "superadmin123",
  },
  ADMIN: {
    label: "Администратор",
    color: "bg-red-500/15 text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    avatarBg: "bg-red-500/20 text-red-700 dark:text-red-300",
    description: "Полный доступ ко всем разделам",
    sections: ["Всё без ограничений"],
    defaultPassword: "admin123",
  },
  MANAGER: {
    label: "Менеджер",
    color: "bg-primary/15 text-primary",
    dot: "bg-primary",
    avatarBg: "bg-primary/20 text-primary",
    description: "Продажи, товары, клиенты, маркетинг",
    sections: ["Заказы", "Каталог товаров", "Клиенты", "Акции", "Отзывы", "Медиабиблиотека", "Импорт"],
    defaultPassword: "manager123",
  },
  COURIER: {
    label: "Курьер",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    avatarBg: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    description: "Заказы и доставка",
    sections: ["Заказы", "Доставка"],
    defaultPassword: "courier123",
  },
  ACCOUNTANT: {
    label: "Бухгалтер",
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
    avatarBg: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
    description: "Просмотр заказов и финансовых данных",
    sections: ["Заказы (просмотр)"],
    defaultPassword: "accountant123",
  },
  WAREHOUSE: {
    label: "Складчик",
    color: "bg-green-500/15 text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    avatarBg: "bg-green-500/20 text-green-700 dark:text-green-300",
    description: "Склад, остатки, импорт товаров",
    sections: ["Каталог товаров", "Склад / Остатки", "Импорт / Экспорт"],
    defaultPassword: "warehouse123",
  },
  SELLER: {
    label: "Продавец",
    color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
    avatarBg: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
    description: "Каталог и заказы (только просмотр)",
    sections: ["Заказы (просмотр)", "Каталог (просмотр)"],
    defaultPassword: "seller123",
  },
};

const ALL_ROLES = ["MANAGER", "COURIER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "ADMIN", "SUPER_ADMIN"];

// ─── Types ───────────────────────────────────────────────────────────────────

type StaffMember = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  staffStatus: string | null;
  customRole: string | null;
  lastActiveAt: string | null;
  createdAt: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: string | null): string {
  if (!date) return "Никогда";
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 2) return "Только что";
  if (mins < 60) return `${mins} мин. назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч. назад`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return new Date(date).toLocaleDateString("ru-RU");
}

function getOnlineDot(date: string | null) {
  if (!date) return "bg-gray-300";
  const mins = (Date.now() - new Date(date).getTime()) / 60000;
  if (mins < 5) return "bg-green-500";
  if (mins < 30) return "bg-yellow-400";
  return "bg-gray-300";
}

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role, customRole }: { role: string; customRole?: string | null }) {
  const def = ROLE_DEFINITIONS[role];
  if (!def) return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{role}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${def.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${def.dot}`} />
        {customRole || def.label}
      </span>
      <InfoPopup
        width={260}
        align="start"
        content={
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{def.label}</p>
            <p className="text-xs text-white/70 leading-relaxed">{def.description}</p>
            <div className="pt-1.5 border-t border-white/10 flex flex-wrap gap-1.5">
              {def.sections.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-md text-white/60"
                  style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        }
      />
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "ACTIVE")
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />Активен</span>;
  if (status === "SUSPENDED")
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400"><XCircle className="w-3 h-3" />Заблокирован</span>;
  if (status === "PENDING")
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"><Clock className="w-3 h-3" />Ожидает</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status"); // "PENDING" | "ACTIVE" | "SUSPENDED" | null
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixOpen, setMatrixOpen] = useState(false);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    customRole: "",
    password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Inline panels: "role" | "password" | "delete" per member id
  const [panel, setPanel] = useState<{ id: string; type: "role" | "password" | "delete" } | null>(null);
  const [panelRole, setPanelRole] = useState("");
  const [panelCustomRole, setPanelCustomRole] = useState("");
  const [panelPassword, setPanelPassword] = useState("");
  const [showPanelPwd, setShowPanelPwd] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState("");

  // ── Load staff ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/staff")
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  // ── API helper ──────────────────────────────────────────────────────────────
  async function apiPost(body: object): Promise<{ ok?: boolean; user?: StaffMember; error?: string }> {
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // ── Update member in list ───────────────────────────────────────────────────
  function updateMember(user: StaffMember) {
    setMembers((prev) => prev.map((m) => (m.id === user.id ? user : m)));
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.role || !form.password) {
      setFormError("Заполните все обязательные поля");
      return;
    }
    setFormLoading(true);
    try {
      const data = await apiPost({ action: "create", ...form });
      if (data.error) { setFormError(data.error); return; }
      if (data.user) {
        setMembers((prev) => [data.user!, ...prev]);
        setForm({ name: "", email: "", phone: "", role: "", customRole: "", password: "" });
        setShowForm(false);
      }
    } finally {
      setFormLoading(false);
    }
  }

  // ── Open panel ──────────────────────────────────────────────────────────────
  function openPanel(id: string, type: "role" | "password" | "delete", member?: StaffMember) {
    if (panel?.id === id && panel.type === type) {
      setPanel(null);
      return;
    }
    setPanelError("");
    if (type === "role" && member) {
      setPanelRole(member.role);
      setPanelCustomRole(member.customRole || "");
    }
    if (type === "password") {
      setPanelPassword("");
      setShowPanelPwd(false);
    }
    setPanel({ id, type });
  }

  // ── Save role ───────────────────────────────────────────────────────────────
  async function handleSaveRole(userId: string) {
    setPanelError("");
    setPanelLoading(true);
    try {
      const data = await apiPost({ action: "update_role", userId, role: panelRole, customRole: panelCustomRole });
      if (data.error) { setPanelError(data.error); return; }
      if (data.user) { updateMember(data.user); setPanel(null); }
    } finally {
      setPanelLoading(false);
    }
  }

  // ── Save password ───────────────────────────────────────────────────────────
  async function handleSavePassword(userId: string) {
    setPanelError("");
    if (!panelPassword || panelPassword.length < 6) {
      setPanelError("Пароль минимум 6 символов");
      return;
    }
    setPanelLoading(true);
    try {
      const data = await apiPost({ action: "reset_password", userId, password: panelPassword });
      if (data.error) { setPanelError(data.error); return; }
      setPanel(null);
    } finally {
      setPanelLoading(false);
    }
  }

  // ── Toggle status ───────────────────────────────────────────────────────────
  async function handleToggleStatus(member: StaffMember) {
    const newStatus = member.staffStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const data = await apiPost({ action: "set_status", userId: member.id, staffStatus: newStatus });
    if (data.user) updateMember(data.user);
  }

  // ── Approve / Reject PENDING ────────────────────────────────────────────────
  async function handleSetStatus(userId: string, staffStatus: "ACTIVE" | "SUSPENDED") {
    const data = await apiPost({ action: "set_status", userId, staffStatus });
    if (data.user) updateMember(data.user);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(userId: string) {
    setPanelLoading(true);
    try {
      const data = await apiPost({ action: "delete", userId });
      if (data.error) { setPanelError(data.error); return; }
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      setPanel(null);
    } finally {
      setPanelLoading(false);
    }
  }

  // ── Render member card ──────────────────────────────────────────────────────
  function renderCard(member: StaffMember) {
    const def = ROLE_DEFINITIONS[member.role];
    const initials = getInitials(member.name, member.email);
    const avatarBg = def?.avatarBg || "bg-muted text-muted-foreground";
    const isActive = panel?.id === member.id;

    return (
      <div key={member.id} className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Card body */}
        <div className="flex items-start gap-4 p-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${avatarBg}`}>
              {initials}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${getOnlineDot(member.lastActiveAt)}`}
              title={relativeTime(member.lastActiveAt)}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-sm leading-tight">{member.name || "—"}</span>
              <RoleBadge role={member.role} customRole={member.customRole} />
              <StatusBadge status={member.staffStatus} />
            </div>
            <p className="text-xs text-muted-foreground">{member.email}</p>
            {member.phone && <p className="text-xs text-muted-foreground">{member.phone}</p>}
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              Был(а) активен: {relativeTime(member.lastActiveAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => openPanel(member.id, "role", member)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                isActive && panel?.type === "role"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Роль</span>
            </button>
            <button
              onClick={() => openPanel(member.id, "password")}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                isActive && panel?.type === "password"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Пароль</span>
            </button>
            <button
              onClick={() => handleToggleStatus(member)}
              title={member.staffStatus === "ACTIVE" ? "Заблокировать" : "Разблокировать"}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                member.staffStatus === "SUSPENDED"
                  ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                  : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {member.staffStatus === "SUSPENDED" ? (
                <><ShieldCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Разблокировать</span></>
              ) : (
                <><ShieldOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Блокировка</span></>
              )}
            </button>
            {member.role !== "ADMIN" && (
              <button
                onClick={() => openPanel(member.id, "delete")}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                  isActive && panel?.type === "delete"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border hover:border-destructive hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Approve / Reject buttons for PENDING ── */}
        {member.staffStatus === "PENDING" && (
          <div className="border-t border-yellow-200 dark:border-yellow-900/40 bg-yellow-50/50 dark:bg-yellow-900/10 px-4 py-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-2.5">
              <Clock className="w-3 h-3 inline mr-1" /> Сотрудник ожидает подтверждения. Одобрите или отклоните заявку:
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetStatus(member.id, "ACTIVE")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" /> Одобрить
              </button>
              <button
                onClick={() => handleSetStatus(member.id, "SUSPENDED")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-destructive/40 bg-destructive/5 hover:bg-destructive/10 text-destructive text-sm font-semibold transition-colors"
              >
                <X className="w-4 h-4" /> Отклонить
              </button>
            </div>
          </div>
        )}

        {/* Inline panels */}
        {isActive && panel?.type === "role" && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Изменить роль</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={panelRole}
                onChange={(e) => setPanelRole(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_DEFINITIONS[r]?.label || r}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Своя должность (необяз.)"
                value={panelCustomRole}
                onChange={(e) => setPanelCustomRole(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => handleSaveRole(member.id)}
                disabled={panelLoading}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {panelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Сохранить
              </button>
              <button onClick={() => setPanel(null)} className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">
                Отмена
              </button>
            </div>
            {panelRole && ROLE_DEFINITIONS[panelRole] && (
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium">{ROLE_DEFINITIONS[panelRole].label}:</span>{" "}
                {ROLE_DEFINITIONS[panelRole].description}
              </div>
            )}
            {panelError && <p className="mt-2 text-xs text-destructive">{panelError}</p>}
          </div>
        )}

        {isActive && panel?.type === "password" && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Сбросить пароль</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type={showPanelPwd ? "text" : "password"}
                  placeholder="Новый пароль"
                  value={panelPassword}
                  onChange={(e) => setPanelPassword(e.target.value)}
                  className="w-full h-9 px-3 pr-9 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPanelPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPanelPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setPanelPassword(generatePassword()); setShowPanelPwd(true); }}
                className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted flex items-center gap-1.5"
                title="Сгенерировать пароль"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Генерировать</span>
              </button>
              <button
                onClick={() => handleSavePassword(member.id)}
                disabled={panelLoading}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {panelLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Сохранить пароль
              </button>
              <button onClick={() => setPanel(null)} className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">
                Отмена
              </button>
            </div>
            {panelError && <p className="mt-2 text-xs text-destructive">{panelError}</p>}
          </div>
        )}

        {isActive && panel?.type === "delete" && (
          <div className="border-t border-destructive/30 bg-destructive/5 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-destructive flex-1">
              Удалить <strong>{member.name || member.email}</strong>? Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(member.id)}
                disabled={panelLoading}
                className="h-8 px-4 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {panelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Удалить
              </button>
              <button onClick={() => setPanel(null)} className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted">
                Отмена
              </button>
            </div>
            {panelError && <p className="text-xs text-destructive mt-1">{panelError}</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Sorted groups — с учётом URL фильтра из Smart Command Bar ─────────────
  const showPending  = !urlStatus || urlStatus === "PENDING";
  const showActive   = !urlStatus || urlStatus === "ACTIVE";
  const showSuspended = !urlStatus || urlStatus === "SUSPENDED";

  const pending  = members.filter((m) => m.staffStatus === "PENDING");
  const active   = members.filter((m) => m.staffStatus === "ACTIVE" || !m.staffStatus);
  const suspended = members.filter((m) => m.staffStatus === "SUSPENDED");

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Команда</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Управление сотрудниками — роли, доступ, пароли
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
          className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl font-medium text-sm transition-colors ${
            showForm
              ? "border border-border bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          {showForm ? "Отмена" : "Добавить сотрудника"}
        </button>
      </div>

      {/* Add form panel */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-card border border-border rounded-2xl p-5 space-y-4"
        >
          <h3 className="font-semibold text-base">Новый сотрудник</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Имя и фамилия *</label>
              <input
                type="text"
                placeholder="Иван Иванов"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={formLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
              <input
                type="email"
                placeholder="ivan@company.ru"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={formLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Телефон</label>
              <input
                type="tel"
                placeholder="+7 999 000-00-00"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={formLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Роль *</label>
              <select
                value={form.role}
                onChange={(e) => {
                  const r = e.target.value;
                  setForm((f) => ({
                    ...f,
                    role: r,
                    password: ROLE_DEFINITIONS[r]?.defaultPassword || f.password,
                  }));
                }}
                disabled={formLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Выберите роль...</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_DEFINITIONS[r]?.label || r}</option>
                ))}
              </select>
            </div>
            {/* Custom role */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Должность{" "}
                <span className="font-normal opacity-60">(необязательно)</span>
              </label>
              <input
                type="text"
                placeholder="Напр.: Старший менеджер"
                value={form.customRole}
                onChange={(e) => setForm((f) => ({ ...f, customRole: e.target.value }))}
                disabled={formLoading}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {/* Password */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Пароль *</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  disabled={formLoading}
                  className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role description preview */}
          {form.role && ROLE_DEFINITIONS[form.role] && (
            <div className="rounded-xl border border-border p-3 bg-muted/30">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <RoleBadge role={form.role} />
                <span className="text-xs text-muted-foreground">{ROLE_DEFINITIONS[form.role].description}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_DEFINITIONS[form.role].sections.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={formLoading}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Создать
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(""); }}
              className="h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Role Access Matrix */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setMatrixOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Матрица доступа по ролям</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">— кто что может делать</span>
          </div>
          {matrixOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {matrixOpen && (
          <div className="border-t border-border divide-y divide-border">
            {ALL_ROLES.map((role) => {
              const def = ROLE_DEFINITIONS[role];
              return (
                <div key={role} className="flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-3.5">
                  <div className="sm:w-44 shrink-0">
                    <RoleBadge role={role} />
                    <p className="text-[11px] text-muted-foreground mt-1">{def.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {def.sections.map((s) => (
                      <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Загрузка...
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Сотрудников пока нет</p>
          <p className="text-sm mt-1 opacity-70">Добавьте первого сотрудника кнопкой выше</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {showPending && pending.length > 0 && (
            <section>
              <AdminSectionTitle
                icon={Clock}
                title="Ожидают подтверждения"
                action={
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold">{pending.length}</span>
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  </span>
                }
              />
              <div className="space-y-2">{pending.map(renderCard)}</div>
            </section>
          )}

          {/* Active */}
          {showActive && active.length > 0 && (
            <section>
              <AdminSectionTitle
                icon={CheckCircle2}
                title="Активные сотрудники"
                action={
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">{active.length}</span>
                }
              />
              <div className="space-y-2">{active.map(renderCard)}</div>
            </section>
          )}

          {/* Suspended */}
          {showSuspended && suspended.length > 0 && (
            <section>
              <AdminSectionTitle
                icon={XCircle}
                title="Заблокированы"
                action={
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">{suspended.length}</span>
                }
              />
              <div className="space-y-2">{suspended.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
