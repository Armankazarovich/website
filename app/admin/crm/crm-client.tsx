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
import { useToast } from "@/components/ui/use-toast";

// ─── Типы ─────────────────────────────────────────────────────────────────────

const STAGES = [
  { key: "NEW",         label: "Новый лид",     dot: "bg-blue-400" },
  { key: "CONTACTED",   label: "Контакт",       dot: "bg-cyan-400" },
  { key: "PROPOSAL",    label: "Предложение",   dot: "bg-violet-400" },
  { key: "NEGOTIATION", label: "Переговоры",    dot: "bg-amber-400" },
  { key: "WON",         label: "Выигран",       dot: "bg-emerald-400" },
  { key: "LOST",        label: "Проигран",      dot: "bg-red-400/50" },
  { key: "DEFERRED",    label: "Отложен",       dot: "bg-orange-400" },
  { key: "RECURRING",   label: "Повторный",     dot: "bg-purple-400" },
];

const ORDER_STAGES = [
  { key: "NEW",          label: "Новый",          dot: "bg-blue-400",     icon: Inbox },
  { key: "CONFIRMED",    label: "Подтверждён",    dot: "bg-teal-400",     icon: CheckCircle2 },
  { key: "PROCESSING",   label: "В комплектации", dot: "bg-violet-400",   icon: Settings2 },
  { key: "SHIPPED",      label: "Отгружен",       dot: "bg-amber-400",    icon: Truck },
  { key: "IN_DELIVERY",  label: "Доставляется",   dot: "bg-orange-400",   icon: Navigation },
  { key: "READY_PICKUP", label: "Готов к выдаче", dot: "bg-cyan-400",     icon: Package },
  { key: "DELIVERED",    label: "Доставлен",      dot: "bg-emerald-400",  icon: Home },
  { key: "COMPLETED",    label: "Завершён",       dot: "bg-green-500",    icon: Flag },
  { key: "CANCELLED",    label: "Отменён",        dot: "bg-red-400/50",   icon: XCircle },
];

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Сайт",
  PHONE: "Звонок",
  SOCIAL: "Соц.сети",
  EMAIL: "Email",
  REFERRAL: "Рекомендация",
  PARTNER: "Партнёр",
  OTHER: "Другое",
};

const SOURCE_ICONS: Record<string, typeof Phone> = {
  PHONE: PhoneCall,
  WEBSITE: ExternalLink,
  SOCIAL: Users,
  EMAIL: Mail,
  REFERRAL: Star,
  PARTNER: Building2,
  OTHER: MoreHorizontal,
};

type Lead = {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  source: string;
  stage: string;
  value?: number | null;
  comment?: string | null;
  tags: string[];
  assigneeId?: string | null;
  assignee?: { id: string; name: string; email?: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { activities: number };
};

type StaffMember = { id: string; name: string | null; role: string };

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.floor(h / 24);
  return `${d} дн`;
}

function formatMoney(n: number) {
  if (!n) return "";
  return n.toLocaleString("ru-RU") + " ₽";
}

// ─── LeadCard ─────────────────────────────────────────────────────────────────

function LeadCard({
  lead, onDragStart, onDragEnd, onClick, staff,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: (lead: Lead) => void;
  staff: StaffMember[];
}) {
  const SrcIcon = SOURCE_ICONS[lead.source] || MoreHorizontal;
  const isUrgent = lead.tags.some(t => t.toLowerCase().includes("срочн") || t.toLowerCase().includes("urgent") || t.toLowerCase().includes("vip"));

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(lead)}
      className={`arayglass arayglass-shimmer rounded-xl p-3.5 sm:p-3 cursor-pointer select-none transition-all duration-200 group ${
        isUrgent ? "arayglass-glow" : ""
      }`}
    >
      {/* Urgency indicator */}
      {isUrgent && (
        <div className="absolute top-0 right-3 w-1.5 h-6 rounded-b-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 shrink-0" />{lead.company}
            </p>
          )}
        </div>
        {lead.value && lead.value > 0 && (
          <span className="shrink-0 text-sm font-bold text-emerald-500 dark:text-emerald-400 px-2 py-1 rounded-xl bg-emerald-500/10">
            {formatMoney(lead.value)}
          </span>
        )}
      </div>

      {/* Contacts */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {lead.phone && (
          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{lead.email}</span>
        )}
      </div>

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.map(tag => (
            <span key={tag} className="arayglass-badge text-[10px] px-2 py-0.5 text-primary/80">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-primary/[0.06]">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <SrcIcon className="w-3 h-3" />
          {SOURCE_LABELS[lead.source] || lead.source}
        </span>
        <div className="flex items-center gap-2">
          {lead._count && lead._count.activities > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> {lead._count.activities}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{timeAgo(lead.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── StageColumn ──────────────────────────────────────────────────────────────

function StageColumn({
  stage, leads, staff, total, totalValue,
  onLeadClick, onAddLead, onDragStart, onDragEnd, onDrop, onDragOver, isDragOver,
}: {
  stage: typeof STAGES[number];
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
      className={`flex flex-col arayglass rounded-2xl min-w-[260px] max-w-[300px] flex-1 transition-all duration-200 ${
        isDragOver ? "!border-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.15)]" : ""
      }`}
      onDrop={(e) => onDrop(e, stage.key)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
    >
      {/* Column header */}
      <div className="px-3.5 pt-3.5 pb-2.5 flex-shrink-0 border-b border-primary/[0.08]">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${stage.dot}`} />
          <span className="text-sm font-bold text-foreground">{stage.label}</span>
          <span className="text-xs text-muted-foreground bg-primary/[0.08] px-2 py-0.5 rounded-xl font-semibold ml-auto">
            {total}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 ml-[18px]">
            {formatMoney(totalValue)}
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 max-h-[calc(100vh-400px)] scrollbar-thin">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            staff={staff}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onLeadClick}
          />
        ))}

        {isDragOver && leads.length === 0 && (
          <div className="border-2 border-dashed border-primary/40 rounded-xl h-20 flex items-center justify-center text-sm text-primary/60">
            Перетащить сюда
          </div>
        )}

        {leads.length === 0 && !isDragOver && (
          <p className="text-sm text-muted-foreground text-center py-6 opacity-50">Пусто</p>
        )}
      </div>

      {/* Add button */}
      <div className="p-2.5 flex-shrink-0">
        <button
          onClick={() => onAddLead(stage.key)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-dashed border-primary/15 hover:border-primary/30 hover:bg-primary/[0.05] hover:text-foreground transition-all"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>
    </div>
  );
}

// ─── LeadForm (модал создания лида) ───────────────────────────────────────────

function LeadForm({
  onClose, onSave, staff, initial,
}: {
  onClose: () => void;
  onSave: (data: Partial<Lead>) => void;
  staff: StaffMember[];
  initial?: Partial<Lead>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [company, setCompany] = useState(initial?.company || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [source, setSource] = useState(initial?.source || "PHONE");
  const [stage, setStage] = useState(initial?.stage || "NEW");
  const [value, setValue] = useState(initial?.value?.toString() || "");
  const [comment, setComment] = useState(initial?.comment || "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") || "");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId || "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      source,
      stage,
      value: value ? parseFloat(value) : null,
      comment: comment.trim() || null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      assigneeId: assigneeId || null,
    });
    onClose();
  };

  return (
    <>
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className="arayglass-popup arayglass-popup-md">
          {/* Header */}
          <div className="arayglass-popup-header">
            <div>
              <h2 className="text-base font-bold text-foreground">Новый лид</h2>
              <p className="text-sm mt-0.5 text-muted-foreground">Заполните данные о потенциальном клиенте</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <div className="arayglass-popup-body space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Имя / Компания *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
              placeholder="Имя контакта"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Организация</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
              placeholder="ООО, ИП..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Телефон</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
                placeholder="+7..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
                placeholder="email@..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Источник</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all">
                {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Этап</label>
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all">
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Сумма ₽</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Ответственный</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all">
                <option value="">Не назначен</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Теги (через запятую)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all"
              placeholder="VIP, Срочный, Опт..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all resize-none"
              placeholder="Детали запроса..."
            />
          </div>
        </div>

          {/* Actions */}
          <div className="arayglass-popup-footer">
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-primary/15 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/[0.05] transition-all">
                Отмена
              </button>
              <button onClick={handleSave} disabled={!name.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-40">
                Создать лид
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── LeadDetailPanel (правая панель с деталями лида) ──────────────────────────

function LeadDetailPanel({
  lead, staff, onClose, onUpdate, onDelete,
}: {
  lead: Lead;
  staff: StaffMember[];
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}) {
  const [activities, setActivities] = useState<any[]>([]);
  const [actLoading, setActLoading] = useState(true);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editCompany, setEditCompany] = useState(lead.company || "");
  const [editPhone, setEditPhone] = useState(lead.phone || "");
  const [editEmail, setEditEmail] = useState(lead.email || "");
  const [editValue, setEditValue] = useState(lead.value?.toString() || "");
  const [editComment, setEditComment] = useState(lead.comment || "");
  const [editAssigneeId, setEditAssigneeId] = useState(lead.assigneeId || "");

  // Синхронизируем поля при смене лида
  useEffect(() => {
    setEditName(lead.name);
    setEditCompany(lead.company || "");
    setEditPhone(lead.phone || "");
    setEditEmail(lead.email || "");
    setEditValue(lead.value?.toString() || "");
    setEditComment(lead.comment || "");
    setEditAssigneeId(lead.assigneeId || "");
    setEditing(false);
  }, [lead.id]);

  useEffect(() => {
    setActLoading(true);
    fetch(`/api/admin/crm/leads/${lead.id}/activities`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setActLoading(false); })
      .catch(() => setActLoading(false));
  }, [lead.id]);

  const handleStageChange = async (newStage: string) => {
    const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    const updated = await res.json();
    onUpdate(updated);
  };

  const handleSaveEdit = async () => {
    const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        company: editCompany.trim() || null,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        value: editValue ? parseFloat(editValue) : null,
        comment: editComment.trim() || null,
        assigneeId: editAssigneeId || null,
      }),
    });
    const updated = await res.json();
    onUpdate(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/admin/crm/leads/${lead.id}`, { method: "DELETE" });
    onDelete(lead.id);
    onClose();
  };

  const currentStage = STAGES.find(s => s.key === lead.stage);

  return (
    <>
      {/* ARAY POPUP */}
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className="arayglass-popup arayglass-popup-lg">
          {/* Header */}
          <div className="arayglass-popup-header">
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground truncate text-base">{lead.name}</p>
                {lead.company && <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.company}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(!editing)}
                className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground arayglass-icon">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setShowConfirmDelete(true)}
                className="w-10 h-10 rounded-xl hover:bg-red-500/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="arayglass-popup-body space-y-4">
          {/* Stage selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Этап воронки</label>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button key={s.key} onClick={() => handleStageChange(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    lead.stage === s.key
                      ? "border-2 border-primary bg-primary/15 text-foreground shadow-[0_0_8px_hsl(var(--primary)/0.15)]"
                      : "border border-primary/10 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.05]"
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Edit form or info */}
          {editing ? (
            <div className="space-y-3">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Имя"
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all" />
              <input value={editCompany} onChange={e => setEditCompany(e.target.value)} placeholder="Компания"
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all" />
              <div className="grid grid-cols-2 gap-3">
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Телефон"
                  className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all" />
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email"
                  className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Сумма"
                  className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all" />
                <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)}
                  className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all">
                  <option value="">Не назначен</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                </select>
              </div>
              <textarea value={editComment} onChange={e => setEditComment(e.target.value)} rows={2} placeholder="Комментарий"
                className="w-full bg-black/20 dark:bg-black/20 bg-white/50 border border-primary/15 rounded-xl px-4 py-3 text-base sm:text-sm text-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:outline-none transition-all resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-primary/15 text-sm font-medium hover:bg-primary/[0.05] transition-all">
                  Отмена
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                  Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Contact info */}
              <div className="arayglass rounded-xl p-4 space-y-3">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors min-h-[36px]">
                    <Phone className="w-4 h-4 text-muted-foreground arayglass-icon" />
                    {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors min-h-[36px]">
                    <Mail className="w-4 h-4 text-muted-foreground arayglass-icon" />
                    {lead.email}
                  </a>
                )}
                {lead.value && lead.value > 0 && (
                  <div className="flex items-center gap-2.5 text-sm min-h-[36px]">
                    <Banknote className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-emerald-500 dark:text-emerald-400">{formatMoney(lead.value)}</span>
                  </div>
                )}
                {lead.assignee && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-h-[36px]">
                    <User className="w-4 h-4" />
                    <span>{lead.assignee.name}</span>
                  </div>
                )}
              </div>

              {/* Comment */}
              {lead.comment && (
                <div className="arayglass rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1.5 font-medium">Комментарий</p>
                  <p className="text-sm text-foreground leading-relaxed">{lead.comment}</p>
                </div>
              )}

              {/* Tags */}
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map(tag => (
                    <span key={tag} className="arayglass-badge text-xs text-primary/80">
                      <Tag className="w-3 h-3 inline mr-0.5" />{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
                <p>Создан: {new Date(lead.createdAt).toLocaleString("ru-RU")}</p>
                <p>Обновлён: {new Date(lead.updatedAt).toLocaleString("ru-RU")}</p>
                <p>Источник: {SOURCE_LABELS[lead.source] || lead.source}</p>
              </div>
            </div>
          )}

          {/* Activities / Timeline */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              История ({activities.length})
            </h3>
            {actLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : activities.length > 0 ? (
              <div className="space-y-2.5">
                {activities.map((a: any) => (
                  <div key={a.id} className="arayglass rounded-xl p-3 flex gap-2.5">
                    <div className="w-1 shrink-0 rounded-full bg-primary/20 self-stretch" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{a.content || a.type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground opacity-50 text-center py-4">Нет записей</p>
            )}
          </div>
        </div>
        </div>
      </div>

      {showConfirmDelete && (
        <ConfirmDialog
          title="Удалить лид?"
          description={`Лид "${lead.name}" будет удалён безвозвратно.`}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirmDelete(false)}
          variant="destructive"
        />
      )}
    </>
  );
}

// ─── CrmStats ─────────────────────────────────────────────────────────────────

function CrmStats({ leads }: { leads: Lead[] }) {
  const totalValue = leads.filter(l => l.value).reduce((s, l) => s + Number(l.value), 0);
  const activeLeads = leads.filter(l => !["WON", "LOST"].includes(l.stage)).length;
  const wonLeads = leads.filter(l => l.stage === "WON").length;
  const convRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  const stats = [
    { label: "Всего лидов", value: leads.length.toString(), icon: Users, iconBg: "bg-primary" },
    { label: "Активных", value: activeLeads.toString(), icon: TrendingUp, iconBg: "bg-amber-500" },
    { label: "Выиграно", value: wonLeads.toString(), icon: CheckCircle2, iconBg: "bg-emerald-500" },
    { label: "Конверсия", value: `${convRate}%`, icon: Star, iconBg: "bg-violet-500" },
  ];

  return (
    <div className="arayglass-grid-metrics px-4 sm:px-5 py-3 border-b border-primary/[0.08] flex-shrink-0">
      {stats.map(stat => (
        <div key={stat.label} className="aray-stat-card relative overflow-hidden">
          <div className={`absolute top-3 right-3 p-2.5 rounded-xl ${stat.iconBg}`}>
            <stat.icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-[10px] lg:text-xs text-muted-foreground font-medium uppercase tracking-wide pr-12">{stat.label}</p>
          <p className="text-2xl lg:text-3xl font-bold mt-1.5 font-display leading-tight text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Presets Modal ─────────────────────────────────────────────────────────────

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
  const [selected, setSelected] = useState<string | null>(null);
  const preset = PRESETS.find(p => p.key === selected);

  return (
    <>
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className="arayglass-popup arayglass-popup-sm">
          <div className="arayglass-popup-header">
            <div>
              <h2 className="text-base font-bold text-foreground">Пресеты по отраслям</h2>
              <p className="text-sm mt-0.5 text-muted-foreground">Загрузить демо-лиды для вашей сферы</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="arayglass-popup-body space-y-2">
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => setSelected(p.key)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  selected === p.key
                    ? "border-2 border-primary bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.1)]"
                    : "border-2 border-primary/10 hover:border-primary/30 hover:bg-primary/[0.05]"
                }`}>
                <p className="font-semibold text-sm text-foreground">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
          <div className="arayglass-popup-footer">
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-primary/15 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/[0.05] transition-all">
                Отмена
              </button>
              <button
                disabled={!selected || !preset?.sampleLeads.length}
                onClick={() => { preset && onApply(preset.sampleLeads); onClose(); }}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-40">
                Загрузить демо ({preset?.sampleLeads.length || 0} лидов)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Orders Kanban (заказы по статусам) ───────────────────────────────────────

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
  updatedAt?: string;
  items: Array<{ productName: string; variantSize: string; quantity: number; price: number; unitType: string }>;
};

function OrderKanbanCard({
  order, onDragStart, onDragEnd, onClick,
}: {
  order: OrderCard;
  onDragStart: (e: React.DragEvent, order: OrderCard) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: (order: OrderCard) => void;
}) {
  const firstItem = order.items[0];
  const moreCount = order.items.length - 1;
  const created = new Date(order.createdAt);
  const dateStr = created.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(order)}
      className="arayglass arayglass-shimmer rounded-xl p-3 cursor-pointer select-none transition-all duration-200 group"
    >
      {/* Row 1: номер + имя + сумма */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-primary shrink-0">#{order.orderNumber}</span>
          <span className="text-sm font-semibold text-foreground truncate">{order.guestName || "Клиент"}</span>
        </div>
        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
          {Number(order.totalAmount).toLocaleString("ru-RU")} ₽
        </span>
      </div>

      {/* Row 2: телефон */}
      {order.guestPhone && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
          <Phone className="w-3 h-3 shrink-0 text-primary/40" />
          <span className="font-medium">{order.guestPhone}</span>
        </p>
      )}

      {/* Row 3: товар */}
      {firstItem && (
        <p className="text-xs text-muted-foreground truncate mb-2 flex items-center gap-1.5">
          <Package className="w-3 h-3 shrink-0 text-primary/40" />
          <span>{firstItem.productName} {firstItem.variantSize}{moreCount > 0 ? ` +${moreCount}` : ""}</span>
        </p>
      )}

      {/* Row 4: footer — оплата + дата */}
      <div className="flex items-center justify-between pt-1.5 border-t border-primary/[0.06]">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Banknote className="w-3 h-3" />
          {order.paymentMethod === "Наличные" ? "Нал" : "Безнал"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateStr}
          </span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── OrderDetailPanel (попап деталей заказа из канбана) ─────────────────────

function OrderDetailPanel({
  order, onClose, onStatusChange,
}: {
  order: OrderCard;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}) {
  const currentStage = ORDER_STAGES.find(s => s.key === order.status);
  const itemsTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  const createdStr = new Date(order.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const updatedStr = order.updatedAt ? new Date(order.updatedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <>
      {/* ARAY POPUP */}
      <div className="arayglass-popup-backdrop" onClick={onClose} />
      <div className="arayglass-popup-container">
        <div className="arayglass-popup arayglass-popup-lg">
          {/* Header */}
          <div className="arayglass-popup-header">
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base">Заказ #{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{order.guestName || "Клиент"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/admin/orders/${order.id}`}
                className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-primary arayglass-icon">
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-primary/[0.05] flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="arayglass-popup-body space-y-4">
            {/* Status selector */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Статус заказа</label>
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STAGES.filter(s => s.key !== "CANCELLED").map(s => {
                  const StIcon = s.icon;
                  return (
                    <button key={s.key} onClick={() => { onStatusChange(order.id, s.key); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        order.status === s.key
                          ? "border-2 border-primary bg-primary/15 text-foreground shadow-[0_0_8px_hsl(var(--primary)/0.15)]"
                          : "border border-primary/10 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.05]"
                      }`}>
                      <StIcon className="w-3.5 h-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Сумма */}
            <div className="arayglass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Сумма товаров</span>
                <span className="text-sm font-semibold text-foreground">{itemsTotal.toLocaleString("ru-RU")} ₽</span>
              </div>
              {order.deliveryCost && Number(order.deliveryCost) > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Доставка</span>
                  <span className="text-sm font-semibold text-foreground">{Number(order.deliveryCost).toLocaleString("ru-RU")} ₽</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t border-primary/[0.08]">
                <span className="text-sm font-bold text-foreground">Итого</span>
                <span className="text-lg font-bold text-emerald-500 dark:text-emerald-400">{Number(order.totalAmount).toLocaleString("ru-RU")} ₽</span>
              </div>
            </div>

            {/* Контактная информация */}
            <div className="arayglass rounded-xl p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Контакт</p>
              {order.guestPhone && (
                <a href={`tel:${order.guestPhone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors min-h-[36px]">
                  <Phone className="w-4 h-4 text-muted-foreground arayglass-icon" />
                  {order.guestPhone}
                </a>
              )}
              {order.guestEmail && (
                <a href={`mailto:${order.guestEmail}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors min-h-[36px]">
                  <Mail className="w-4 h-4 text-muted-foreground arayglass-icon" />
                  {order.guestEmail}
                </a>
              )}
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground min-h-[36px]">
                <Banknote className="w-4 h-4" />
                {order.paymentMethod}
              </div>
              {order.deliveryAddress && (
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground min-h-[36px]">
                  <Navigation className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Товары */}
            <div className="arayglass rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-primary/[0.08]">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Товары ({order.items.length})</p>
              </div>
              <div className="divide-y divide-primary/[0.05]">
                {order.items.map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.variantSize} · {item.quantity} {item.unitType}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Комментарий */}
            {order.comment && (
              <div className="arayglass rounded-xl p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Комментарий</p>
                <p className="text-sm text-foreground leading-relaxed">{order.comment}</p>
              </div>
            )}

            {/* Даты */}
            <div className="arayglass rounded-xl p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary/40" />
                  Оформлен: {createdStr}
                </span>
                {updatedStr && updatedStr !== createdStr && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary/40" />
                    Изменён: {updatedStr}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="arayglass-popup-footer">
            <Link href={`/admin/orders/${order.id}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200">
              <ExternalLink className="w-4 h-4" />
              Открыть полную карточку
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function OrdersKanban({ search }: { search: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [mobileOrderStage, setMobileOrderStage] = useState("NEW");
  const [selectedOrder, setSelectedOrder] = useState<OrderCard | null>(null);
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

    const prevStatus = order.status;
    // Оптимистичное обновление
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));

    try {
      const res = await fetch("/api/admin/crm/orders-kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status: newStatus }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const stageLabel = ORDER_STAGES.find(s => s.key === newStatus)?.label ?? newStatus;
      toast({ title: "Статус изменён", description: `Заказ #${order.orderNumber} → ${stageLabel}` });
    } catch (err) {
      // Откат оптимистичного обновления
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: prevStatus } : o));
      toast({
        title: "Не удалось сохранить",
        description: "Статус заказа не изменён. Проверь соединение и попробуй снова.",
        variant: "destructive",
      });
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    const prev = orders.find(o => o.id === orderId);
    const prevStatus = prev?.status;
    setOrders(prevArr => prevArr.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    try {
      const res = await fetch("/api/admin/crm/orders-kanban", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const stageLabel = ORDER_STAGES.find(s => s.key === newStatus)?.label ?? newStatus;
      toast({ title: "Статус изменён", description: `${stageLabel}` });
    } catch (err) {
      if (prevStatus) {
        setOrders(prevArr => prevArr.map(o => o.id === orderId ? { ...o, status: prevStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: prevStatus });
        }
      }
      toast({
        title: "Не удалось сохранить",
        description: "Проверь соединение и попробуй снова.",
        variant: "destructive",
      });
    }
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
      <div className="arayglass-grid-metrics px-4 sm:px-5 py-3 border-b border-primary/[0.08] flex-shrink-0">
        {[
          { label: "Всего заказов", value: orders.length.toString(), icon: ShoppingBag, iconBg: "bg-primary" },
          { label: "Активных", value: activeOrders.toString(), icon: TrendingUp, iconBg: "bg-amber-500" },
          { label: "Завершённых", value: orders.filter(o => ["DELIVERED","COMPLETED"].includes(o.status)).length.toString(), icon: CheckCircle2, iconBg: "bg-emerald-500" },
          { label: "Выручка (факт)", value: formatMoney(totalRevenue) || "—", icon: Banknote, iconBg: "bg-violet-500" },
        ].map(stat => (
          <div key={stat.label} className="aray-stat-card relative overflow-hidden">
            <div className={`absolute top-3 right-3 p-2.5 rounded-xl ${stat.iconBg}`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-[10px] lg:text-xs text-muted-foreground font-medium uppercase tracking-wide pr-12">{stat.label}</p>
            <p className="text-2xl lg:text-3xl font-bold mt-1.5 font-display leading-tight text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Синхронизация */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-primary/[0.08] flex items-center gap-3 flex-shrink-0">
        <button
          onClick={handleSyncToLeads}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/15 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.05] transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 arayglass-icon" />}
          Синхронизировать с лидами
        </button>
        {syncResult && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-500 dark:text-emerald-400 font-medium"><CheckCircle2 className="w-4 h-4 shrink-0" /> {syncResult}</span>
        )}
        <span className="text-sm text-muted-foreground ml-auto hidden sm:block">
          Перетащите карточку для смены статуса · Клик → детали
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
          <div className="sm:hidden flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto flex-shrink-0 border-b border-primary/[0.08]">
            {ORDER_STAGES.map(s => {
              const cnt = (ordersByStatus[s.key] || []).length;
              return (
                <button key={s.key} onClick={() => setMobileOrderStage(s.key)}
                  className={`admin-pill-btn shrink-0 min-h-[40px] ${mobileOrderStage === s.key ? "admin-pill-btn-active" : ""}`}>
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                  {cnt > 0 && <span className={`px-1.5 rounded-md text-[10px] font-bold ${mobileOrderStage === s.key ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>{cnt}</span>}
                </button>
              );
            })}
          </div>

          {/* Мобильный вид — одна колонка */}
          <div className="sm:hidden flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {(ordersByStatus[mobileOrderStage] || []).map(order => (
              <OrderKanbanCard key={order.id} order={order} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onClick={setSelectedOrder} />
            ))}
            {(ordersByStatus[mobileOrderStage] || []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/[0.08] flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Нет заказов</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">в статусе «{ORDER_STAGES.find(s => s.key === mobileOrderStage)?.label}»</p>
              </div>
            )}
          </div>

          {/* Десктоп — горизонтальный Kanban */}
          <div className="hidden sm:block flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-5 py-4">
            <div className="flex gap-3 h-full" style={{ minWidth: `${ORDER_STAGES.length * 280}px` }}>
              {ORDER_STAGES.map(stage => {
                const stageOrders = ordersByStatus[stage.key] || [];
                const stageTotal = stageOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
                const isOver = dragOverStage === stage.key;
                const StageIcon = stage.icon;

                return (
                  <div
                    key={stage.key}
                    className={`flex flex-col arayglass rounded-2xl min-w-[265px] max-w-[300px] flex-1 transition-all duration-200 ${
                      isOver ? "!border-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.15)]" : ""
                    }`}
                    onDrop={(e) => handleDrop(e, stage.key)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                    onDragLeave={() => setDragOverStage(null)}
                  >
                    {/* Заголовок колонки */}
                    <div className="px-3 pt-3 pb-2.5 flex-shrink-0 border-b border-primary/[0.08]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/10">
                          <StageIcon className="w-3.5 h-3.5 text-primary arayglass-icon" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{stage.label}</span>
                        <span className="text-xs font-bold text-primary bg-primary/[0.1] px-2 py-0.5 rounded-xl ml-auto">
                          {stageOrders.length}
                        </span>
                      </div>
                      {stageTotal > 0 && (
                        <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 ml-8">
                          {stageTotal.toLocaleString("ru-RU")} ₽
                        </p>
                      )}
                    </div>

                    {/* Карточки */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 max-h-[calc(100vh-420px)] scrollbar-thin">
                      {stageOrders.map(order => (
                        <OrderKanbanCard
                          key={order.id}
                          order={order}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          onClick={setSelectedOrder}
                        />
                      ))}
                      {isOver && stageOrders.length === 0 && (
                        <div className="border-2 border-dashed border-primary/40 rounded-xl h-24 flex items-center justify-center text-sm text-primary/60">
                          <ArrowRight className="w-4 h-4 mr-2" /> Перетащить сюда
                        </div>
                      )}
                      {stageOrders.length === 0 && !isOver && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Inbox className="w-5 h-5 text-muted-foreground/30 mb-1.5" />
                          <p className="text-xs text-muted-foreground/50">Пусто</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Попап деталей заказа */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleOrderStatusChange}
        />
      )}
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function CrmClient() {
  const { toast } = useToast();
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

  // Группировка по этапам
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

    const prevStage = lead.stage;
    // Оптимистичное обновление
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: newStage } : l));

    try {
      const res = await fetch(`/api/admin/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const stageLabel = STAGES.find(s => s.key === newStage)?.label ?? newStage;
      toast({ title: "Этап изменён", description: `${lead.name} → ${stageLabel}` });
    } catch (err) {
      // Откат при ошибке
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, stage: prevStage } : l));
      toast({
        title: "Не удалось сохранить этап",
        description: "Лид не передвинут. Проверь соединение и попробуй снова.",
        variant: "destructive",
      });
    }
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
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">ARAY CRM</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === "orders" ? "Перетащи карточку → статус заказа меняется" : "Перетащи лид между этапами воронки"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "leads" && (
              <>
                <button onClick={() => setShowPresets(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/15 text-sm font-medium hover:border-primary/30 hover:bg-primary/[0.05] transition-all text-muted-foreground">
                  <Zap className="w-4 h-4 arayglass-icon" />
                  <span className="hidden sm:inline">Пресеты</span>
                </button>
                <button onClick={fetchLeads}
                  className="w-9 h-9 rounded-xl border border-primary/15 flex items-center justify-center hover:border-primary/30 hover:bg-primary/[0.05] transition-all text-muted-foreground">
                  <RefreshCw className="w-4 h-4 arayglass-icon" />
                </button>
                <button
                  onClick={() => handleAddLead("NEW")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                  <Plus className="w-4 h-4" />
                  Новый лид
                </button>
              </>
            )}
          </div>
        </div>

        {/* Таб-переключатель */}
        <div className="flex items-center gap-1 mb-3 p-1 arayglass rounded-xl w-fit">
          <button
            onClick={() => setTab("orders")}
            className={`admin-pill-btn ${tab === "orders" ? "admin-pill-btn-active" : ""}`}
          >
            <ShoppingBag className="w-4 h-4" />
            Заказы
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
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-primary/[0.08] overflow-x-auto flex-shrink-0">
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
              <div className="sm:hidden flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto flex-shrink-0 border-b border-primary/[0.08]">
                {STAGES.map(s => {
                  const cnt = (leadsByStage[s.key] || []).length;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setMobileStage(s.key)}
                      className={`admin-pill-btn shrink-0 min-h-[40px] ${mobileStage === s.key ? "admin-pill-btn-active" : ""}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                      {s.label}
                      {cnt > 0 && <span className={`px-1.5 rounded-md text-[10px] font-bold ${mobileStage === s.key ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>{cnt}</span>}
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
                <div className="flex gap-3 h-full" style={{ minWidth: `${STAGES.length * 315}px` }}>
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
