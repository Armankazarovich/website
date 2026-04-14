"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Phone, Mail, Building2, User, Tag, ChevronRight,
  Pencil, Trash2, MessageSquare, PhoneCall, Calendar,
  TrendingUp, Clock, Filter, Users, Zap,
  CheckCircle2, XCircle, MoreHorizontal, ArrowRight,
  Banknote, Star, AlertCircle, RefreshCw, Loader2,
  ShoppingBag, Download, ExternalLink,
  Inbox, Settings2, Truck, Navigation, Package, Home, Flag,
} from "lucide-react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useClassicMode } from "@/lib/use-classic-mode";

// ─── Типы ─────────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "NEW",         label: "Новый лид",     color: "bg-slate-500",   light: "bg-slate-50 dark:bg-slate-900/40",   border: "border-slate-200 dark:border-slate-700",   dot: "bg-slate-400" },
  { key: "CONTACTED",   label: "Связались",     color: "bg-cyan-600",    light: "bg-cyan-50 dark:bg-cyan-900/20",     border: "border-cyan-200 dark:border-cyan-800",     dot: "bg-cyan-400" },
  { key: "QUALIFIED",   label: "Квалифицирован",color: "bg-violet-500",  light: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", dot: "bg-violet-400" },
  { key: "MEETING",     label: "Замер/встреча", color: "bg-amber-500",   light: "bg-amber-50 dark:bg-amber-900/20",   border: "border-amber-200 dark:border-amber-800",   dot: "bg-amber-400" },
  { key: "PROPOSAL",    label: "КП отправлено", color: "bg-orange-500",  light: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-400" },
  { key: "NEGOTIATION", label: "Переговоры",    color: "bg-rose-500",    light: "bg-rose-50 dark:bg-rose-900/20",     border: "border-rose-200 dark:border-rose-800",     dot: "bg-rose-400" },
  { key: "WON",         label: "Успех ✓",       color: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-400" },
  { key: "LOST",        label: "Отказ",         color: "bg-gray-400",    light: "bg-gray-50 dark:bg-gray-900/20",     border: "border-gray-200 dark:border-gray-700",     dot: "bg-gray-400" },
];

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Сайт", TELEGRAM: "Telegram", PHONE: "Звонок",
  REFERRAL: "Рекомендация", PARTNER: "Партнёр", OTHER: "Другое",
};

const ACTIVITY_ICONS: Record<string, any> = {
  NOTE: MessageSquare, CALL: PhoneCall, EMAIL: Mail,
  MEETING: Calendar, TASK: CheckCircle2, STAGE_CHANGE: ArrowRight, SYSTEM: Zap,
};

const ACTIVITY_LABELS: Record<string, string> = {
  NOTE: "Заметка", CALL: "Звонок", EMAIL: "Email",
  MEETING: "Встреча", TASK: "Задача", STAGE_CHANGE: "Смена этапа", SYSTEM: "Система",
};

type Lead = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  source: string;
  stage: string;
  value?: number | null;
  comment?: string | null;
  tags: string[];
  assigneeId?: string | null;
  assignee?: { id: string; name: string | null; email: string } | null;
  convertedAt?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  activities?: Activity[];
  _count?: { activities: number };
};

type Activity = {
  id: string;
  type: string;
  text: string;
  scheduledFor?: string | null;
  completedAt?: string | null;
  userId?: string | null;
  user?: { id: string; name: string | null } | null;
  createdAt: string;
};

type StaffMember = { id: string; name: string | null; email: string; role: string };

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function formatMoney(v: number | null | undefined) {
  if (!v) return null;
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v);
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return d.toLocaleDateString("ru-RU");
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Карточка лида ────────────────────────────────────────────────────────────

function LeadCard({
  lead, stageColor, stageDot,
  onClick, onDragStart, onDragEnd,
}: {
  lead: Lead;
  stageColor: string;
  stageDot: string;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  const daysSince = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
  const urgency = daysSince >= 7 ? "red" : daysSince >= 3 ? "amber" : null;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-150 group select-none overflow-hidden relative"
      style={urgency === "red" ? { borderLeftColor: "rgb(248,113,113)", borderLeftWidth: "3px" }
        : urgency === "amber" ? { borderLeftColor: "rgb(251,191,36)", borderLeftWidth: "3px" }
        : undefined}
    >
      {/* Шапка */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground truncate leading-tight">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 shrink-0" />{lead.company}
            </p>
          )}
        </div>
        {lead.value && (
          <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg whitespace-nowrap"
            style={{
              color: "hsl(var(--emerald-600, 142 71% 45%))",
              backgroundColor: "hsl(var(--emerald-100, 142 76% 92%))"
            }}>
            {formatMoney(Number(lead.value))}
          </span>
        )}
      </div>

      {/* Контакты */}
      <div className="space-y-1 mb-2">
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Теги */}
      {lead.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              style={{
                backgroundColor: "hsl(var(--primary-100, 198 93% 90%))",
                color: "hsl(var(--primary, 198 93% 60%))"
              }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Футер */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {lead.assignee ? (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
              {initials(lead.assignee.name)}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          <span className="text-[10px] text-muted-foreground">
            {SOURCE_LABELS[lead.source] || lead.source}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {urgency && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
              style={urgency === "red"
                ? { backgroundColor: "hsl(var(--red-100, 0 84% 97%))", color: "hsl(var(--red-600, 0 84% 47%))" }
                : { backgroundColor: "hsl(var(--amber-100, 39 96% 84%))", color: "hsl(var(--amber-600, 38 92% 50%))" }
              }>
              {daysSince}д
            </span>
          )}
          {(lead._count?.activities || 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {lead._count?.activities}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Колонка этапа ─────────────────────────────────────────────────────────────

function StageColumn({
  stage, leads, staff, total, totalValue,
  onLeadClick, onAddLead,
  onDragStart, onDragEnd, onDrop, onDragOver,
  isDragOver,
}: {
  stage: typeof STAGES[0];
  leads: Lead[];
  staff: StaffMember[];
  total: number;
  totalValue: number;
  onLeadClick: (lead: Lead) => void;
  onAddLead: (stage: string) => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border-2 transition-all duration-150 min-w-[260px] max-w-[280px] ${
        isDragOver
          ? "border-primary/50 bg-primary/15 shadow-lg shadow-primary/10"
          : `${stage.border} ${stage.light}`
      }`}
      onDrop={(e) => onDrop(e, stage.key)}
      onDragOver={onDragOver}
    >
      {/* Заголовок */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
            <span className="text-xs font-bold text-foreground">{stage.label}</span>
            <span className="text-xs text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-lg font-medium">
              {total}
            </span>
          </div>
          <button
            onClick={() => onAddLead(stage.key)}
            className="w-6 h-6 rounded-lg hover:bg-background/80 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 hover:!opacity-100"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        {totalValue > 0 && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(totalValue)}
          </p>
        )}
      </div>

      {/* Карточки */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 max-h-[calc(100vh-260px)] scrollbar-thin">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            stageColor={stage.color}
            stageDot={stage.dot}
            onClick={() => onLeadClick(lead)}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}

        {/* Зона дропа когда пусто */}
        {isDragOver && leads.length === 0 && (
          <div className="border-2 border-dashed border-primary/40 rounded-xl h-20 flex items-center justify-center text-xs text-primary/60">
            Перетащить сюда
          </div>
        )}

        {/* Кнопка добавить */}
        <button
          onClick={() => onAddLead(stage.key)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors border-2 border-dashed border-border/50 hover:border-primary/30"
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить лид
        </button>
      </div>
    </div>
  );
}

// ─── Форма создания/редактирования лида ───────────────────────────────────────

function LeadForm({
  onClose, onSave, initial, staff,
}: {
  onClose: () => void;
  onSave: (data: Partial<Lead>) => Promise<void>;
  initial?: Partial<Lead>;
  staff: StaffMember[];
}) {
  const isClassic = useClassicMode();
  const popupStyle = isClassic ? {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  } : {
    background: "rgba(12,12,14,0.88)",
    backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
  };
  const headerStyle = isClassic ? {
    borderBottom: "1px solid hsl(var(--border))",
    background: "hsl(var(--card))",
  } : {
    borderBottom: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(12,12,14,0.70)",
    backdropFilter: "blur(20px)",
  };
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [source, setSource] = useState(initial?.source || "PHONE");
  const [stage, setStage] = useState(initial?.stage || "NEW");
  const [value, setValue] = useState(initial?.value ? String(initial.value) : "");
  const [comment, setComment] = useState(initial?.comment || "");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name, phone: phone || null, email: email || null, company: company || null, source, stage, value: value ? parseFloat(value) : null, comment: comment || null, assigneeId: assigneeId || null, tags });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={popupStyle}>
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={headerStyle}>
          <h2 className="font-bold text-foreground">{initial?.id ? "Редактировать лид" : "Новый лид"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-primary/[0.08] flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Имя */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Имя / ФИО *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Иван Иванов" />
          </div>

          {/* Компания */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Компания</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="ООО Стройтех" />
          </div>

          {/* Телефон + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Телефон</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+7 999 000-00-00" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="ivan@mail.ru" />
            </div>
          </div>

          {/* Источник + Этап */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Источник</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Этап</label>
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Сумма + Ответственный */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Сумма сделки ₽</label>
              <input value={value} onChange={e => setValue(e.target.value)} type="number" min="0"
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="150 000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ответственный</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Не назначен</option>
                {staff.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Теги */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Теги</label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Срочный, VIP, Перезвонить..." />
              <button type="button" onClick={addTag}
                className="px-3 py-2.5 bg-muted rounded-xl text-sm hover:bg-muted/80 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{
                      backgroundColor: "hsl(var(--primary-100, 198 93% 90%))",
                      color: "hsl(var(--primary, 198 93% 60%))"
                    }}>
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Комментарий */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Детали, пожелания клиента..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-primary/[0.08] transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {initial?.id ? "Сохранить" : "Создать лид"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Панель деталей лида ───────────────────────────────────────────────────────

function LeadDetailPanel({
  lead, staff, onClose, onUpdate, onDelete,
}: {
  lead: Lead;
  staff: StaffMember[];
  onClose: () => void;
  onUpdate: (updated: Lead) => void;
  onDelete: (id: string) => void;
}) {
  const [fullLead, setFullLead] = useState<Lead>(lead);
  const [newActivity, setNewActivity] = useState("");
  const [activityType, setActivityType] = useState("NOTE");
  const [addingActivity, setAddingActivity] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changingStage, setChangingStage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/crm/leads/${lead.id}`)
      .then(r => r.json())
      .then(data => { setFullLead(data); setLoading(false); });
  }, [lead.id]);

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;
    setAddingActivity(true);
    const res = await fetch(`/api/admin/crm/leads/${lead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, text: newActivity.trim() }),
    });
    const act = await res.json();
    setFullLead(prev => ({ ...prev, activities: [act, ...(prev.activities || [])] }));
    setNewActivity("");
    setAddingActivity(false);
  };

  const handleStageChange = async (newStage: string) => {
    setChangingStage(true);
    const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    const updated = await res.json();
    setFullLead(updated);
    onUpdate(updated);
    setChangingStage(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/admin/crm/leads/${lead.id}`, { method: "DELETE" });
      setConfirmDelete(false);
      onDelete(lead.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const isClassic = useClassicMode();
  const drawerStyle = isClassic ? {
    background: "hsl(var(--card))",
    borderLeft: "1px solid hsl(var(--border))",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  } : {
    background: "rgba(12,12,14,0.82)",
    backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    borderLeft: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
  };
  const drawerHeaderStyle = isClassic ? {
    background: "hsl(var(--card))",
    borderBottom: "1px solid hsl(var(--border))",
  } : {
    background: "rgba(12,12,14,0.70)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.09)",
  };
  const currentStage = STAGES.find(s => s.key === fullLead.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full overflow-y-auto shadow-lg flex flex-col" style={drawerStyle}>

        {/* Заголовок */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={drawerHeaderStyle}>
          <div className="min-w-0">
            <h2 className="font-bold truncate text-foreground">{fullLead.name}</h2>
            {fullLead.company && (
              <p className="text-xs flex items-center gap-1 text-muted-foreground">
                <Building2 className="w-3 h-3" />{fullLead.company}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button onClick={() => setEditing(true)} className="w-8 h-8 rounded-xl hover:bg-primary/[0.04] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 rounded-xl hover:bg-destructive/10 flex items-center justify-center transition-colors">
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-primary/[0.04] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Воронка */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3">ЭТАП ВОРОНКИ</p>
            <div className="flex gap-1.5 flex-wrap">
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleStageChange(s.key)}
                  disabled={changingStage}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    fullLead.stage === s.key
                      ? `${s.color} text-white shadow-sm`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Информация */}
          <div className="px-5 py-4 border-b border-border space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground mb-2">КОНТАКТЫ</p>
            {fullLead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`tel:${fullLead.phone}`} className="text-sm text-foreground hover:text-primary transition-colors">
                  {fullLead.phone}
                </a>
              </div>
            )}
            {fullLead.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${fullLead.email}`} className="text-sm text-foreground hover:text-primary transition-colors">
                  {fullLead.email}
                </a>
              </div>
            )}
            {fullLead.value && (
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold"
                  style={{ color: "hsl(var(--emerald-600, 142 71% 45%))" }}>
                  {formatMoney(Number(fullLead.value))}
                </span>
              </div>
            )}
            {fullLead.assignee && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">{fullLead.assignee.name || fullLead.assignee.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{SOURCE_LABELS[fullLead.source]}</span>
            </div>
            {fullLead.comment && (
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{fullLead.comment}</p>
              </div>
            )}
            {fullLead.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {fullLead.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-lg font-medium"
                    style={{
                      backgroundColor: "hsl(var(--primary-100, 198 93% 90%))",
                      color: "hsl(var(--primary, 198 93% 60%))"
                    }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Добавить активность */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-3">ДОБАВИТЬ АКТИВНОСТЬ</p>
            <div className="flex gap-2 mb-2 flex-wrap">
              {["NOTE", "CALL", "EMAIL", "MEETING"].map(t => {
                const Icon = ACTIVITY_ICONS[t];
                return (
                  <button key={t} onClick={() => setActivityType(t)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      activityType === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {ACTIVITY_LABELS[t]}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <textarea
                value={newActivity}
                onChange={e => setNewActivity(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAddActivity(); }}
                rows={2}
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder={activityType === "CALL" ? "Результат звонка..." : activityType === "MEETING" ? "Детали встречи..." : "Заметка..."}
              />
              <button onClick={handleAddActivity} disabled={addingActivity || !newActivity.trim()}
                className="px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 self-end">
                {addingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Лента активностей */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">ИСТОРИЯ</p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : fullLead.activities?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Активностей пока нет</p>
            ) : (
              <div className="space-y-3">
                {fullLead.activities?.map(act => {
                  const Icon = ACTIVITY_ICONS[act.type] || MessageSquare;
                  return (
                    <div key={act.id} className="flex gap-3">
                      <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center ${
                        act.type === "CALL" ? "bg-orange-500/15" :
                        "bg-muted"
                      }`}
                        style={act.type === "WON"
                          ? { backgroundColor: "hsl(var(--emerald-100, 142 76% 92%))" }
                          : act.type === "STAGE_CHANGE"
                          ? { backgroundColor: "hsl(var(--violet-100, 258 90% 92%))" }
                          : undefined
                        }>
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{act.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {act.user?.name && (
                            <span className="text-[10px] text-muted-foreground font-medium">{act.user.name}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">{timeAgo(act.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Форма редактирования */}
      {editing && (
        <LeadForm
          onClose={() => setEditing(false)}
          staff={staff}
          initial={fullLead}
          onSave={async (data) => {
            const res = await fetch(`/api/admin/crm/leads/${fullLead.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            const updated = await res.json();
            setFullLead(updated);
            onUpdate(updated);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Удалить лид?"
        description="Лид и вся его история будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

// ─── Статистика ───────────────────────────────────────────────────────────────

function CrmStats({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const won = leads.filter(l => l.stage === "WON").length;
  const totalValue = leads.filter(l => l.value).reduce((s, l) => s + Number(l.value), 0);
  const wonValue = leads.filter(l => l.stage === "WON" && l.value).reduce((s, l) => s + Number(l.value), 0);
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-border">
      {[
        { label: "Всего лидов", value: total, icon: Users, color: "text-primary" },
        { label: "Успешных", value: won, icon: CheckCircle2, color: "text-emerald-500" },
        { label: "Конверсия", value: `${convRate}%`, icon: TrendingUp, color: "text-violet-500" },
        { label: "Сумма воронки", value: formatMoney(totalValue) || "—", icon: Banknote, color: "text-amber-500" },
      ].map(stat => (
        <div key={stat.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
          <stat.icon className={`w-4 h-4 shrink-0 ${stat.color}`} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-none mb-0.5">{stat.label}</p>
            <p className="font-bold text-sm text-foreground truncate">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Пресеты отраслей ─────────────────────────────────────────────────────────

const PRESETS = [
  {
    key: "lumber",
    label: "🪵 Пиломатериалы",
    desc: "Воронка для продаж лесоматериалов",
    sampleLeads: [
      { name: "Алексей Петров", company: "СтройМонтаж ООО", phone: "+7 903 123-45-67", source: "PHONE", stage: "NEW", value: 285000, comment: "Нужна доска обрезная 50×150, ~5м³", tags: ["Срочный"] },
      { name: "Дмитрий Козлов", company: "ИП Козлов", phone: "+7 916 234-56-78", source: "WEBSITE", stage: "CONTACTED", value: 120000, comment: "Брус 100×100, строительство дачи", tags: [] },
      { name: "ТД Горизонт", company: "ТД Горизонт", phone: "+7 495 000-00-01", source: "PARTNER", stage: "PROPOSAL", value: 980000, comment: "Оптовая партия, ежемесячно", tags: ["VIP", "Опт"] },
    ],
  },
  {
    key: "restaurant",
    label: "🍕 Ресторан / Доставка",
    desc: "Воронка для корпоративных заказов",
    sampleLeads: [
      { name: "ООО Офис Центр", company: "Офис Центр", phone: "+7 499 111-11-11", source: "WEBSITE", stage: "NEW", value: 45000, comment: "Корпоративные обеды на 30 человек", tags: [] },
    ],
  },
  {
    key: "furniture",
    label: "🛋️ Мебель",
    desc: "Воронка для продаж мебели",
    sampleLeads: [],
  },
];

function PresetsModal({ onClose, onApply }: { onClose: () => void; onApply: (leads: any[]) => void }) {
  const isClassic = useClassicMode();
  const popupStyle = isClassic ? {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  } : {
    background: "rgba(12,12,14,0.82)",
    backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
  };
  const [selected, setSelected] = useState<string | null>(null);

  const preset = PRESETS.find(p => p.key === selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative rounded-2xl w-full max-w-md" style={popupStyle}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Пресеты по отраслям</h2>
            <p className="text-xs mt-0.5 text-muted-foreground">Загрузить демо-лиды для вашей сферы</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-primary/[0.04] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setSelected(p.key)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                selected === p.key ? "border-primary bg-primary/15" : "border-border hover:border-primary/30"
              }`}>
              <p className="font-semibold text-sm text-foreground">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-primary/[0.08] transition-colors">
            Отмена
          </button>
          <button
            disabled={!selected || !preset?.sampleLeads.length}
            onClick={() => { preset && onApply(preset.sampleLeads); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40">
            Загрузить демо ({preset?.sampleLeads.length || 0} лидов)
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Kanban (заказы по статусам) ───────────────────────────────────────

const ORDER_STAGES = [
  { key: "NEW",          label: "Новый",          color: "bg-slate-500",   light: "bg-slate-50 dark:bg-slate-900/40",    border: "border-slate-200 dark:border-slate-700",   dot: "bg-slate-400",   icon: Inbox },
  { key: "CONFIRMED",    label: "Подтверждён",    color: "bg-teal-500",    light: "bg-teal-50 dark:bg-teal-900/20",      border: "border-teal-200 dark:border-teal-800",     dot: "bg-teal-400",    icon: CheckCircle2 },
  { key: "PROCESSING",   label: "В комплектации", color: "bg-violet-500",  light: "bg-violet-50 dark:bg-violet-900/20",  border: "border-violet-200 dark:border-violet-800", dot: "bg-violet-400",  icon: Settings2 },
  { key: "SHIPPED",      label: "Отгружен",       color: "bg-amber-500",   light: "bg-amber-50 dark:bg-amber-900/20",    border: "border-amber-200 dark:border-amber-800",   dot: "bg-amber-400",   icon: Truck },
  { key: "IN_DELIVERY",  label: "Доставляется",   color: "bg-orange-500",  light: "bg-orange-50 dark:bg-orange-900/20",  border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-400",  icon: Navigation },
  { key: "READY_PICKUP", label: "Готов к выдаче", color: "bg-cyan-500",    light: "bg-cyan-50 dark:bg-cyan-900/20",      border: "border-cyan-200 dark:border-cyan-800",     dot: "bg-cyan-400",    icon: Package },
  { key: "DELIVERED",    label: "Доставлен",      color: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-900/20",border: "border-emerald-200 dark:border-emerald-800",dot: "bg-emerald-400", icon: Home },
  { key: "COMPLETED",    label: "Завершён",       color: "bg-green-600",   light: "bg-green-50 dark:bg-green-900/20",    border: "border-green-200 dark:border-green-800",   dot: "bg-green-500",   icon: Flag },
  { key: "CANCELLED",    label: "Отменён",        color: "bg-gray-400",    light: "bg-gray-50 dark:bg-gray-900/20",      border: "border-gray-200 dark:border-gray-700",     dot: "bg-gray-400",    icon: XCircle },
];

type OrderCard = {
  id: string;
  orderNumber: number;
  guestName?: string | null;
  guestPhone?: string | null;
  guestEmail?: string | null;
  status: string;
  totalAmount: number;
  deliveryCost?: number;
  paymentMethod: string;
  deliveryAddress?: string | null;
  comment?: string | null;
  createdAt: string;
  items: Array<{ productName: string; variantSize: string; quantity: number; price: number; unitType: string }>;
};

function OrderKanbanCard({
  order, onDragStart, onDragEnd,
}: {
  order: OrderCard;
  onDragStart: (e: React.DragEvent, order: OrderCard) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  const itemsSummary = order.items.slice(0, 2).map(i => `${i.productName} ${i.variantSize}`).join(", ");
  const hasMore = order.items.length > 2;

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onDragEnd={onDragEnd}
      className="block bg-card border border-border rounded-xl p-3 hover:shadow-md hover:border-primary/30 transition-all duration-150 group select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-primary">#{order.orderNumber}</span>
            <span className="text-xs text-muted-foreground truncate">{order.guestName || "Клиент"}</span>
          </div>
          {order.guestPhone && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-2.5 h-2.5" />{order.guestPhone}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-lg whitespace-nowrap"
          style={{
            color: "hsl(var(--emerald-600, 142 71% 45%))",
            backgroundColor: "hsl(var(--emerald-100, 142 76% 92%))"
          }}>
          {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
        </span>
      </div>

      {itemsSummary && (
        <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1.5 flex items-center gap-1">
          <Package className="w-2.5 h-2.5 shrink-0" />
          {itemsSummary}{hasMore ? `... +${order.items.length - 2}` : ""}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          {order.paymentMethod === "Наличные"
            ? <><Banknote className="w-2.5 h-2.5" /> Нал</>
            : <><Building2 className="w-2.5 h-2.5" /> Безнал</>}
        </span>
        <span className="text-[10px] text-muted-foreground">{timeAgo(order.createdAt)}</span>
      </div>
    </Link>
  );
}

function OrdersKanban({ search }: { search: string }) {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [mobileOrderStage, setMobileOrderStage] = useState("NEW");
  const dragOrderRef = useRef<OrderCard | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/orders-kanban${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 30s
  useEffect(() => {
    const timer = setInterval(() => { fetchOrders(); }, 30000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const handleSyncToLeads = async () => {
    setSyncing(true);
    const res = await fetch("/api/admin/crm/sync-orders", { method: "POST" });
    const data = await res.json();
    setSyncResult(data.message || `Импортировано ${data.imported} заказов`);
    setSyncing(false);
    setTimeout(() => setSyncResult(null), 4000);
  };

  const handleDragStart = (e: React.DragEvent, order: OrderCard) => {
    dragOrderRef.current = order;
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const order = dragOrderRef.current;
    if (!order || order.status === newStatus) return;

    // Оптимистичное обновление
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));

    await fetch("/api/admin/crm/orders-kanban", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, status: newStatus }),
    });
  };

  const ordersByStatus = ORDER_STAGES.reduce((acc, s) => {
    acc[s.key] = orders.filter(o => o.status === s.key);
    return acc;
  }, {} as Record<string, OrderCard[]>);

  const totalRevenue = orders
    .filter(o => ["DELIVERED", "COMPLETED"].includes(o.status))
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  const activeOrders = orders.filter(o => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        {[
          { label: "Всего заказов", value: orders.length, icon: ShoppingBag, color: "text-primary" },
          { label: "Активных", value: activeOrders, icon: TrendingUp, color: "text-amber-500" },
          { label: "Завершённых", value: orders.filter(o => ["DELIVERED","COMPLETED"].includes(o.status)).length, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Выручка (факт)", value: formatMoney(totalRevenue) || "—", icon: Banknote, color: "text-violet-500" },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
            <stat.icon className={`w-4 h-4 shrink-0 ${stat.color}`} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">{stat.label}</p>
              <p className="font-bold text-sm text-foreground truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Синхронизация */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleSyncToLeads}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-primary/[0.08] transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Синхронизировать с лидами
        </button>
        {syncResult && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {syncResult}</span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          Перетащите карточку чтобы изменить статус заказа
        </span>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Мобильный переключатель этапов заказов */}
          <div className="sm:hidden flex items-center gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-b border-border">
            {ORDER_STAGES.map(s => {
              const cnt = (ordersByStatus[s.key] || []).length;
              return (
                <button key={s.key} onClick={() => setMobileOrderStage(s.key)}
                  className={`admin-pill-btn shrink-0 ${mobileOrderStage === s.key ? "admin-pill-btn-active" : ""}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                  {s.label}
                  <span className={`px-1 rounded text-[9px] font-bold ${mobileOrderStage === s.key ? "bg-primary/15 text-primary" : "bg-muted"}`}>{cnt}</span>
                </button>
              );
            })}
          </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-4">
          <div className="flex gap-3 h-full" style={{ minWidth: `${ORDER_STAGES.length * 240}px` }}>
            {ORDER_STAGES.map(stage => {
              const stageOrders = ordersByStatus[stage.key] || [];
              const stageTotal = stageOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
              const isOver = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  className={`flex flex-col rounded-2xl border-2 transition-all duration-150 min-w-[230px] max-w-[250px] ${
                    isOver ? "border-primary/50 bg-primary/15 shadow-lg" : `${stage.border} ${stage.light}`
                  }`}
                  onDrop={(e) => handleDrop(e, stage.key)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                  onDragLeave={() => setDragOverStage(null)}
                >
                  {/* Заголовок колонки */}
                  <div className="px-3 pt-3 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <stage.icon className="w-3.5 h-3.5 text-foreground/60" />
                      <span className="text-xs font-bold text-foreground">{stage.label}</span>
                      <span className="text-xs text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-lg font-medium ml-auto">
                        {stageOrders.length}
                      </span>
                    </div>
                    {stageTotal > 0 && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {stageTotal.toLocaleString("ru-RU")} ₽
                      </p>
                    )}
                  </div>

                  {/* Карточки */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 max-h-[calc(100vh-320px)] scrollbar-thin">
                    {stageOrders.map(order => (
                      <OrderKanbanCard
                        key={order.id}
                        order={order}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                    {isOver && stageOrders.length === 0 && (
                      <div className="border-2 border-dashed border-primary/40 rounded-xl h-16 flex items-center justify-center text-xs text-primary/60">
                        Перетащить сюда
                      </div>
                    )}
                    {stageOrders.length === 0 && !isOver && (
                      <p className="text-xs text-muted-foreground text-center py-4 opacity-50">Пусто</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function CrmClient() {
  const [tab, setTab] = useState<"orders" | "leads">("orders");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormStage, setAddFormStage] = useState("NEW");
  const [showPresets, setShowPresets] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [mobileStage, setMobileStage] = useState("NEW");
  const dragLeadRef = useRef<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    const res = await fetch(`/api/admin/crm/leads${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setStaff(data.staff || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Фильтрация по источнику
  const filteredLeads = sourceFilter === "ALL" ? leads : leads.filter(l => l.source === sourceFilter);

  // Группировка по этапам (используем filteredLeads для канбана)
  const leadsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = filteredLeads.filter(l => l.stage === s.key);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    dragLeadRef.current = lead;
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const lead = dragLeadRef.current;
    if (!lead || lead.stage === newStage) return;

    // Оптимистичное обновление
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));

    await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
  };

  const handleAddLead = (stage: string) => {
    setAddFormStage(stage);
    setShowAddForm(true);
  };

  const handleCreateLead = async (data: Partial<Lead>) => {
    const res = await fetch("/api/admin/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const lead = await res.json();
    setLeads(prev => [lead, ...prev]);
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? { ...updated, _count: l._count } : l));
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const handleApplyPreset = async (sampleLeads: any[]) => {
    for (const leadData of sampleLeads) {
      const res = await fetch("/api/admin/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData),
      });
      const lead = await res.json();
      setLeads(prev => [...prev, lead]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-148px)] lg:h-[calc(100vh-64px)] overflow-hidden">
      {/* Топ-бар */}
      <div className="px-4 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">CRM</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tab === "orders" ? "Перетащи карточку → статус заказа меняется" : "Перетащи лид между этапами воронки"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "leads" && (
              <>
                <button onClick={() => setShowPresets(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium hover:bg-primary/[0.08] transition-colors text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Пресеты</span>
                </button>
                <button onClick={fetchLeads}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-primary/[0.08] transition-colors text-muted-foreground">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleAddLead("NEW")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                  Новый лид
                </button>
              </>
            )}
          </div>
        </div>

        {/* Таб-переключатель */}
        <div className="flex items-center gap-1 mb-3 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setTab("orders")}
            className={`admin-pill-btn ${tab === "orders" ? "admin-pill-btn-active" : ""}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Заказы по статусам
          </button>
          <button
            onClick={() => setTab("leads")}
            className={`admin-pill-btn ${tab === "leads" ? "admin-pill-btn-active" : ""}`}
          >
            <TrendingUp className="w-4 h-4" />
            Воронка лидов
          </button>
        </div>

      </div>

      {/* Контент */}
      {tab === "orders" ? (
        <OrdersKanban search={search} />
      ) : (
        <>
          {/* Статистика лидов */}
          <CrmStats leads={leads} />

          {/* Фильтр по источнику */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border overflow-x-auto flex-shrink-0">
            {[{ key: "ALL", label: "Все" }, ...Object.entries(SOURCE_LABELS).map(([k, v]) => ({ key: k, label: v }))].map(s => {
              const isActive = sourceFilter === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSourceFilter(s.key)}
                  className={`admin-pill-btn shrink-0 ${isActive ? "admin-pill-btn-active" : ""}`}
                >
                  {s.label}
                  {s.key !== "ALL" && (
                    <span className="ml-1 opacity-60">{leads.filter(l => l.source === s.key).length}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Kanban лидов */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Мобильный переключатель этапов */}
              <div className="sm:hidden flex items-center gap-1.5 px-4 py-2 overflow-x-auto flex-shrink-0 border-b border-border">
                {STAGES.map(s => {
                  const cnt = (leadsByStage[s.key] || []).length;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setMobileStage(s.key)}
                      className={`admin-pill-btn shrink-0 ${mobileStage === s.key ? "admin-pill-btn-active" : ""}`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                      {s.label}
                      <span className={`px-1 rounded text-[9px] font-bold ${mobileStage === s.key ? "bg-primary/15 text-primary" : "bg-muted"}`}>{cnt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Мобильный вид — одна колонка */}
              <div className="sm:hidden flex-1 overflow-y-auto px-4 py-3">
                {STAGES.filter(s => s.key === mobileStage).map(stage => {
                  const stageleads = leadsByStage[stage.key] || [];
                  const totalValue = stageleads.filter(l => l.value).reduce((s, l) => s + Number(l.value), 0);
                  return (
                    <StageColumn
                      key={stage.key}
                      stage={stage}
                      leads={stageleads}
                      staff={staff}
                      total={stageleads.length}
                      totalValue={totalValue}
                      onLeadClick={setSelectedLead}
                      onAddLead={handleAddLead}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      isDragOver={dragOverStage === stage.key}
                    />
                  );
                })}
              </div>

              {/* Десктоп — горизонтальный Kanban */}
              <div className="hidden sm:block flex-1 overflow-x-auto overflow-y-hidden px-4 py-4">
                <div className="flex gap-3 h-full" style={{ minWidth: `${STAGES.length * 280}px` }}>
                  {STAGES.map(stage => {
                    const stageleads = leadsByStage[stage.key] || [];
                    const totalValue = stageleads.filter(l => l.value).reduce((s, l) => s + Number(l.value), 0);
                    return (
                      <StageColumn
                        key={stage.key}
                        stage={stage}
                        leads={stageleads}
                        staff={staff}
                        total={stageleads.length}
                        totalValue={totalValue}
                        onLeadClick={setSelectedLead}
                        onAddLead={handleAddLead}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        isDragOver={dragOverStage === stage.key}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Формы и панели */}
      {showAddForm && (
        <LeadForm
          onClose={() => setShowAddForm(false)}
          onSave={handleCreateLead}
          staff={staff}
          initial={{ stage: addFormStage }}
        />
      )}

      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          staff={staff}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updated) => { handleUpdateLead(updated); setSelectedLead(updated); }}
          onDelete={handleDeleteLead}
        />
      )}

      {showPresets && (
        <PresetsModal onClose={() => setShowPresets(false)} onApply={handleApplyPreset} />
      )}
    </div>
  );
}
