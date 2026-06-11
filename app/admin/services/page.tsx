"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { AdminModal } from "@/components/admin/admin-modal";
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
  Check,
  GripVertical,
  Sparkles,
  SearchCheck,
  CalendarCheck,
  MapPin,
  Images,
  Bot,
  ExternalLink,
  Upload,
  Library,
  Link2,
  type LucideIcon,
} from "lucide-react";
import {
  SERVICE_BUSINESS_BLUEPRINTS,
  SERVICE_MODULE_CAPABILITIES,
  type ServiceCapabilityKey,
  type ServiceBlueprintKey,
  type ServiceTemplate,
} from "@/lib/service-module-blueprints";
import { buildArayContentDraft, type ArayContentDraft } from "@/lib/aray-content-core";

const MediaPickerModal = dynamic(
  () =>
    import("@/app/admin/media/media-client").then((m) => ({
      default: m.MediaPickerModal,
    })),
  { ssr: false },
);

type Service = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  price: string | null;
  unit: string | null;
  image: string | null;
  icon: string | null;
  active: boolean;
  sortOrder: number;
};

type ArayStoryKit = Pick<ArayContentDraft, "storyScript" | "adText" | "checklist">;

const BLANK_SERVICE: Omit<Service, "id"> = {
  slug: "",
  title: "",
  description: "",
  content: "",
  price: "",
  unit: "",
  image: "",
  icon: "Wrench",
  active: true,
  sortOrder: 100,
};

const CAPABILITY_ICON: Record<ServiceCapabilityKey, LucideIcon> = {
  seo: SearchCheck,
  page: Wrench,
  lead: Check,
  booking: CalendarCheck,
  map: MapPin,
  gallery: Images,
  automation: Bot,
};

function slugify(str: string) {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return str
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const isNew = !service?.id;
  const [form, setForm] = useState<Omit<Service, "id">>({
    ...BLANK_SERVICE,
    ...(service ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [storyKit, setStoryKit] = useState<ArayStoryKit | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const serviceMediaInputRef = useRef<HTMLInputElement>(null);
  const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
  const fieldClass =
    "w-full min-h-[44px] rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/15";

  const set = (key: keyof typeof form, val: string | boolean | number) =>
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "title" && isNew) next.slug = slugify(val as string);
      return next;
    });

  const mediaUrls = (form.image ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
  const firstMediaUrl = mediaUrls[0] ?? "";
  const firstMediaIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(firstMediaUrl);
  const setMediaUrls = (urls: string[]) => set("image", urls.filter(Boolean).join("\n"));
  const addMediaUrl = (url: string) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setMediaUrls([cleanUrl, ...mediaUrls.filter((item) => item !== cleanUrl)]);
  };
  const removeMediaUrl = (url: string) => setMediaUrls(mediaUrls.filter((item) => item !== url));

  const uploadServiceMedia = async (file: File) => {
    setUploadingMedia(true);
    setMediaError("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "services");
      const res = await fetch("/api/admin/upload", { method: "POST", body: data });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || "Не удалось загрузить медиа");
      addMediaUrl(json.url);
    } catch (err: any) {
      setMediaError(err.message || "Не удалось загрузить медиа");
    } finally {
      setUploadingMedia(false);
    }
  };

  const applyArayDescriptionDraft = () => {
    const draft = buildArayContentDraft({
      kind: "service",
      title: form.title,
      description: form.description,
      price: form.price,
      unit: form.unit,
      category: "Услуги",
      businessType: "services",
      tone: "steady",
      benefits: ["понятный следующий шаг", "заявка уходит в CRM", "Арай помогает сопровождать клиента"],
    });
    setForm((prev) => ({
      ...prev,
      description: prev.description.trim() ? prev.description : draft.shortDescription,
      content: draft.fullHtml,
    }));
    setStoryKit({
      storyScript: draft.storyScript,
      adText: draft.adText,
      checklist: draft.checklist,
    });
  };

  const buildStoryKitOnly = () => {
    const draft = buildArayContentDraft({
      kind: "service",
      title: form.title,
      description: form.description,
      price: form.price,
      unit: form.unit,
      category: "Услуги",
      businessType: "services",
      tone: "steady",
      benefits: ["понятный следующий шаг", "заявка уходит в CRM", "Арай помогает сопровождать клиента"],
    });
    setStoryKit({
      storyScript: draft.storyScript,
      adText: draft.adText,
      checklist: draft.checklist,
    });
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSave(isNew ? form : { ...service, ...form });
      onClose();
    } catch (error: any) {
      setError(error.message || "Не удалось сохранить услугу");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <AdminModal
      open
      onClose={onClose}
      title={isNew ? "Новая услуга" : "Редактировать услугу"}
      subtitle="Название, описание, цена и видимость на странице услуг"
      size="lg"
      bodyClassName="p-4 sm:p-5"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.title || !form.slug}
            className="min-h-[44px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Сохранить
          </Button>
        </>
      )}
    >
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>
                Название *
              </label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>
                Краткое описание *
              </label>
              <input
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Полное описание (HTML)
                </label>
                <button
                  type="button"
                  onClick={applyArayDescriptionDraft}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 text-[11px] font-semibold text-primary transition-colors hover:border-primary/45 hover:bg-primary/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Арай описание
                </button>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                rows={5}
                className={`${fieldClass} min-h-[150px] resize-y font-mono leading-relaxed`}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={buildStoryKitOnly}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary"
                >
                  <Bot className="h-3.5 w-3.5" />
                  Story Kit
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>
                Фото / лёгкий слайдер
              </label>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) uploadServiceMedia(file);
                }}
                className="rounded-2xl border border-border bg-background/45 p-3"
              >
                <input
                  ref={serviceMediaInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadServiceMedia(file);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                    {firstMediaUrl ? (
                      firstMediaIsVideo ? (
                        <video src={firstMediaUrl} className="h-full w-full object-cover" muted preload="metadata" playsInline />
                      ) : (
                        <img src={firstMediaUrl} alt="" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Images className="h-8 w-8 opacity-60" />
                        <span className="text-xs">медиа услуги</span>
                      </div>
                    )}
                    {uploadingMedia && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Загрузите фото или короткое видео, выберите из медиабиблиотеки или вставьте ссылку. Первое медиа станет обложкой услуги.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant="outline" onClick={() => serviceMediaInputRef.current?.click()} className="min-h-10">
                        <Upload className="h-4 w-4" />
                        Медиа
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowMediaPicker(true)} className="min-h-10">
                        <Library className="h-4 w-4" />
                        Библиотека
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowUrlInput((value) => !value)} className="min-h-10">
                        <Link2 className="h-4 w-4" />
                        URL
                      </Button>
                    </div>
                  </div>
                </div>
                {showUrlInput && (
                  <textarea
                    value={form.image ?? ""}
                    onChange={(e) => set("image", e.target.value)}
                    rows={3}
                    placeholder="Одна ссылка или несколько ссылок с новой строки"
                    className={`${fieldClass} mt-3 min-h-[88px] resize-y text-xs leading-relaxed`}
                  />
                )}
                {mediaUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mediaUrls.map((url) => (
                      <span key={url} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs">
                        <span className="max-w-[230px] truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeMediaUrl(url)}
                          className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Убрать медиа"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {mediaError && (
                  <p className="mt-2 text-xs text-destructive">{mediaError}</p>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>
                Цена
              </label>
              <input
                value={form.price ?? ""}
                onChange={(e) => set("price", e.target.value)}
                placeholder="от 150 ₽/м²"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Единица
              </label>
              <input
                value={form.unit ?? ""}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="за м²"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Иконка (Lucide)
              </label>
              <input
                value={form.icon ?? ""}
                onChange={(e) => set("icon", e.target.value)}
                placeholder="Paintbrush"
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div>
              <label className={labelClass}>
                Сортировка
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
          </div>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium">Активна на сайте</span>
          </label>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {storyKit && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    ARAY Story Kit
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Сценарий для сторис, рекламный текст и быстрый чек-лист.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStoryKit(null)}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Скрыть
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Сторис
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                    {storyKit.storyScript}
                  </pre>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Реклама
                  </p>
                  <p className="text-xs leading-relaxed text-foreground">
                    {storyKit.adText}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground">
                    {storyKit.checklist.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
    </AdminModal>
    {showMediaPicker && (
      <MediaPickerModal
        open
        onClose={() => setShowMediaPicker(false)}
        pickerKind="all"
        initialFolder="services"
        title="Выбрать медиа услуги"
        onPick={(url) => {
          addMediaUrl(url);
          setShowMediaPicker(false);
        }}
      />
    )}
    </>
  );
}

function CapabilityPill({
  capability,
}: {
  capability: (typeof SERVICE_MODULE_CAPABILITIES)[number];
}) {
  const Icon = CAPABILITY_ICON[capability.key];

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-border/80 bg-muted/20 px-3 py-2 text-xs">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="font-semibold text-foreground">{capability.label}</span>
      <span className="hidden truncate text-muted-foreground xl:inline">
        {capability.description}
      </span>
    </div>
  );
}

function SmartServicesStarter({
  selectedBlueprint,
  activeBlueprint,
  onBlueprintChange,
  onTemplateSelect,
}: {
  selectedBlueprint: (typeof SERVICE_BUSINESS_BLUEPRINTS)[number];
  activeBlueprint: ServiceBlueprintKey;
  onBlueprintChange: (key: ServiceBlueprintKey) => void;
  onTemplateSelect: (template: ServiceTemplate) => void;
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-primary/15 bg-card/80">
      <div className="border-b border-border/70 bg-primary/5 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                ARAY Services
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">
              Умные услуги под роль и бизнес
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Быстрые заготовки сразу готовят карточку, SEO-текст, страницу
              услуги, заявку в CRM и будущую бронь без хаоса в админке.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTemplateSelect(selectedBlueprint.templates[0])}
            className="shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Создать с Араем
          </Button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {SERVICE_BUSINESS_BLUEPRINTS.map((blueprint) => {
            const active = blueprint.key === activeBlueprint;
            return (
              <button
                key={blueprint.key}
                type="button"
                onClick={() => onBlueprintChange(blueprint.key)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-left text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/55 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="block font-semibold">{blueprint.label}</span>
                <span className={`block ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {blueprint.role}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[0.9fr_1.3fr]">
        <div>
          <p className="text-sm font-semibold">{selectedBlueprint.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {selectedBlueprint.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SERVICE_MODULE_CAPABILITIES.map((capability) => (
              <CapabilityPill key={capability.key} capability={capability} />
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {selectedBlueprint.templates.map((template) => (
            <button
              key={template.slug}
              type="button"
              onClick={() => onTemplateSelect(template)}
              className="group rounded-2xl border border-border bg-background/55 p-4 text-left transition-colors hover:border-primary/45 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-snug text-foreground">
                    {template.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-primary/25 px-2 py-1 text-[11px] font-semibold text-primary">
                  {template.price}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {template.capabilityTags.slice(0, 4).map((tag) => {
                  const capability = SERVICE_MODULE_CAPABILITIES.find(
                    (item) => item.key === tag,
                  );
                  return capability ? (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {capability.label}
                    </span>
                  ) : null;
                })}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalService, setModalService] = useState<
    Partial<Service> | null | false
  >(false);
  const [activeBlueprint, setActiveBlueprint] =
    useState<ServiceBlueprintKey>("lumber");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const selectedBlueprint =
    SERVICE_BUSINESS_BLUEPRINTS.find((item) => item.key === activeBlueprint) ??
    SERVICE_BUSINESS_BLUEPRINTS[0];

  const makeUniqueSlug = (baseSlug: string) => {
    const base = baseSlug || "service";
    const used = new Set(services.map((service) => service.slug));
    if (!used.has(base)) return base;
    let index = 2;
    while (used.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  };

  const nextSortOrder = () =>
    services.length
      ? Math.max(...services.map((service) => service.sortOrder ?? 0)) + 10
      : 10;

  const createFromTemplate = (template: ServiceTemplate) => {
    setModalService({
      title: template.title,
      slug: makeUniqueSlug(template.slug),
      description: template.description,
      content: template.content,
      price: template.price,
      unit: template.unit,
      image: template.image ?? "",
      icon: template.icon,
      active: template.active,
      sortOrder: nextSortOrder(),
    });
  };

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };
  const handleDragEnter = (idx: number) => {
    dragOver.current = idx;
  };
  const handleDragEnd = async () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (from === null || to === null || from === to) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    const reordered = [...services];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const updated = reordered.map((s, i) => ({ ...s, sortOrder: i }));
    const previous = services;
    if (!window.confirm("Сохранить новый порядок услуг?")) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    setServices(updated);
    dragItem.current = null;
    dragOver.current = null;
    setActionError("");
    try {
      const responses = await Promise.all(
        updated.map((s) =>
          fetch(`/api/admin/services/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: s.sortOrder, confirm: true }),
          }),
        ),
      );
      if (responses.some((res) => !res.ok))
        throw new Error("Не удалось сохранить порядок услуг");
    } catch (error: any) {
      setServices(previous);
      setActionError(error.message || "Не удалось сохранить порядок услуг");
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch("/api/admin/services");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить услуги");
      setServices(Array.isArray(data) ? data : []);
      setActionError("");
    } catch (error: any) {
      setActionError(error.message || "Не удалось загрузить услуги");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const saveService = async (data: Partial<Service>, confirmed = false) => {
    if (!confirmed && !window.confirm(data.id ? "Сохранить услугу?" : "Создать услугу?")) return;
    if (data.id) {
      const res = await fetch(`/api/admin/services/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirm: true }),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(updated.error || "Не удалось сохранить услугу");
      setServices((prev) => prev.map((s) => (s.id === data.id ? updated : s)));
    } else {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirm: true }),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(created.error || "Не удалось создать услугу");
      setServices((prev) => [...prev, created]);
    }
    setActionError("");
  };

  const deleteService = async (id: string) => {
    if (!confirm("Удалить услугу?")) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    setActionError("");
    try {
      const res = await fetch(`/api/admin/services/${id}?confirm=true`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось удалить услугу");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      setActionError(error.message || "Не удалось удалить услугу");
    } finally {
      setDeletingIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const toggleActive = (service: Service) => {
    if (!window.confirm(service.active ? "Скрыть услугу?" : "Показать услугу?")) return;
    saveService({ id: service.id, active: !service.active }, true).catch(
      (error: any) => {
        setActionError(error.message || "Не удалось изменить видимость услуги");
      },
    );
  };

  return (
    <div className="admin-page-frame admin-page-frame-readable">
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

      {actionError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {!loading && (
        <SmartServicesStarter
          selectedBlueprint={selectedBlueprint}
          activeBlueprint={activeBlueprint}
          onBlueprintChange={setActiveBlueprint}
          onTemplateSelect={createFromTemplate}
        />
      )}

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
              className="flex cursor-default flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/20 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <GripVertical className="mt-1 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${service.active ? "bg-primary" : "bg-zinc-400"}`}
                  aria-label={service.active ? "Активна" : "Скрыта"}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {service.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </div>

              {service.price && (
                <span className="text-sm font-semibold text-primary shrink-0">
                  {service.price}
                </span>
              )}

              <Badge
                variant={service.active ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                {service.active ? "Активна" : "Скрыта"}
              </Badge>

              <div className="grid w-full grid-cols-4 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-1">
                <Link
                  href={`/services/${service.slug}`}
                  target="_blank"
                  aria-label="Открыть услугу на сайте"
                  className="flex min-h-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => toggleActive(service)}
                  aria-label={
                    service.active ? "Скрыть услугу" : "Показать услугу"
                  }
                  className="flex min-h-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  {service.active ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setModalService(service)}
                  aria-label="Редактировать услугу"
                  className="flex min-h-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteService(service.id)}
                  disabled={deletingIds.has(service.id)}
                  aria-label="Удалить услугу"
                  className="flex min-h-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60 sm:w-11"
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
