"use client";

import { useState, useEffect, useRef } from "react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Check,
  GripVertical,
} from "lucide-react";

function useClassicMode() {
  const [classic, setClassic] = useState(false);
  useEffect(() => {
    setClassic(localStorage.getItem("aray-classic-mode") === "1");
    const h = () => setClassic(localStorage.getItem("aray-classic-mode") === "1");
    window.addEventListener("aray-classic-change", h);
    return () => window.removeEventListener("aray-classic-change", h);
  }, []);
  return classic;
}

type Service = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  price: string | null;
  unit: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
};

const BLANK_SERVICE: Omit<Service, "id"> = {
  slug: "",
  title: "",
  description: "",
  content: "",
  price: "",
  unit: "",
  icon: "Wrench",
  active: true,
  sortOrder: 100,
};

function slugify(str: string) {
  const map: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return str.toLowerCase().split("").map(c => map[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/* ── ServiceModal ─────────────────────────────────────────────────────── */
function ServiceModal({
  service,
  onClose,
  onSave,
}: {
  service: Partial<Service> | null;
  onClose: () => void;
  onSave: (data: Partial<Service>) => Promise<void>;
}) {
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
  const isNew = !service?.id;
  const [form, setForm] = useState<Omit<Service, "id">>({
    ...BLANK_SERVICE,
    ...(service ?? {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, val: string | boolean | number) =>
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "title" && isNew) next.slug = slugify(val as string);
      return next;
    });

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    await onSave(isNew ? form : { ...service, ...form });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" style={popupStyle}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 z-10" style={popupStyle}>
          <p className="font-display font-semibold" style={{ color: isClassic ? undefined : "rgba(255,255,255,0.92)" }}>{isNew ? "Новая услуга" : "Редактировать услугу"}</p>
          <button onClick={onClose} style={{ color: isClassic ? undefined : "rgba(255,255,255,0.7)" }} className="hover:opacity-80 transition-opacity"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Название *</label>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Slug</label>
              <input value={form.slug} onChange={e => set("slug", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Краткое описание *</label>
              <input value={form.description} onChange={e => set("description", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Полное описание (HTML)</label>
              <textarea value={form.content} onChange={e => set("content", e.target.value)} rows={5}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Цена</label>
              <input value={form.price ?? ""} onChange={e => set("price", e.target.value)}
                placeholder="от 150 ₽/м²"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Единица</label>
              <input value={form.unit ?? ""} onChange={e => set("unit", e.target.value)}
                placeholder="за м²"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Иконка (Lucide)</label>
              <input value={form.icon ?? ""} onChange={e => set("icon", e.target.value)}
                placeholder="Paintbrush"
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Сортировка</label>
              <input type="number" value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)}
              className="rounded" />
            <span className="text-sm">Активна</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving || !form.title || !form.slug}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState<Partial<Service> | null | false>(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragItem.current = idx; };
  const handleDragEnter = (idx: number) => { dragOver.current = idx; };
  const handleDragEnd = async () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) { dragItem.current = null; dragOver.current = null; return; }
    const reordered = [...services];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, sortOrder: i }));
    setServices(updated);
    dragItem.current = null;
    dragOver.current = null;
    // Save to DB
    await Promise.all(updated.map((s) =>
      fetch(`/api/admin/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: s.sortOrder }),
      })
    ));
  };

  const loadServices = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setServices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServices(); }, []);

  const saveService = async (data: Partial<Service>) => {
    if (data.id) {
      const res = await fetch(`/api/admin/services/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === data.id ? updated : s)));
      }
    } else {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setServices((prev) => [...prev, created]);
      }
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Удалить услугу?")) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    setServices((prev) => prev.filter((s) => s.id !== id));
    setDeletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleActive = (service: Service) =>
    saveService({ id: service.id, active: !service.active });

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <AdminSectionTitle
        icon={Wrench}
        title="Услуги"
        subtitle={`${services.length} услуг`}
        action={
          <Button size="sm" onClick={() => setModalService({})}>
            <Plus className="w-3.5 h-3.5" />
            Добавить услугу
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Загрузка...
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Услуг нет</p>
          <p className="text-sm mb-4">Добавьте первую услугу</p>
          <Button size="sm" onClick={() => setModalService({})}>
            <Plus className="w-4 h-4" />
            Добавить услугу
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service, idx) => (
            <div
              key={service.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/20 transition-colors cursor-default"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />

              <div
                className={`w-2 h-2 rounded-full shrink-0 ${service.active ? "bg-primary" : "bg-zinc-400"}`}
              />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{service.title}</p>
                <p className="text-xs text-muted-foreground truncate">{service.description}</p>
              </div>

              {service.price && (
                <span className="text-sm font-semibold text-primary shrink-0">{service.price}</span>
              )}

              <Badge variant={service.active ? "default" : "secondary"} className="text-xs shrink-0">
                {service.active ? "Активна" : "Скрыта"}
              </Badge>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleActive(service)}
                  title={service.active ? "Скрыть" : "Показать"}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {service.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setModalService(service)}
                  title="Редактировать"
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteService(service.id)}
                  disabled={deletingIds.has(service.id)}
                  title="Удалить"
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  {deletingIds.has(service.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalService !== false && (
        <ServiceModal
          service={modalService}
          onClose={() => setModalService(false)}
          onSave={saveService}
        />
      )}
    </div>
  );
}
