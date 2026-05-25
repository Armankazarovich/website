"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  BadgePercent,
  Bot,
  CalendarClock,
  Check,
  ExternalLink,
  ImageIcon,
  Layers3,
  Library,
  Link2,
  Loader2,
  Mail,
  Megaphone,
  PackagePlus,
  Plus,
  Save,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const MediaPickerModal = dynamic(
  () =>
    import("@/app/admin/media/media-client").then((m) => ({
      default: m.MediaPickerModal,
    })),
  { ssr: false },
);

type Promotion = {
  id: string;
  title: string;
  description: string;
  discount: number | null;
  imageUrl: string | null;
  active: boolean;
  validUntil: string | null;
  createdAt: string;
};

type PromotionStoryKit = {
  storyScript: string;
  adText: string;
  checklist: string[];
};

type PromoStatus = "active" | "expired" | "hidden" | "draft";
type PromoFilter = PromoStatus | "all";

const STATUS_FILTERS: { value: PromoFilter; label: string; hint: string }[] = [
  { value: "all", label: "Все", hint: "Показать весь список без фильтра" },
  {
    value: "active",
    label: "Активные",
    hint: "Акция включена и срок не истек",
  },
  { value: "expired", label: "Истекшие", hint: "Срок действия уже прошел" },
  {
    value: "draft",
    label: "Черновики",
    hint: "Не хватает условий или описания",
  },
  { value: "hidden", label: "Скрытые", hint: "Готовы, но выключены вручную" },
];

const ROADMAP_ITEMS = [
  {
    icon: PackagePlus,
    title: "Товары в акции",
    text: "Сейчас условия акции заполняются вручную. Следующим шагом добавим привязку товаров и цены со скидкой.",
  },
  {
    icon: Layers3,
    title: "Готовые шаблоны",
    text: "Запланированы готовые варианты для сезонных скидок, оптовых предложений, доставки и комплектов для стройки.",
  },
  {
    icon: Bot,
    title: "ARAY текст и баннер",
    text: "Я смогу помогать с текстом и баннером акции. Пока можно выбрать изображение и перейти к продвижению.",
  },
  {
    icon: Mail,
    title: "Рассылки и продвижение",
    text: "Автоматическая связь с рассылками и рекламой запланирована. Сейчас условия можно перенести вручную.",
  },
];

function getPromotionStatus(
  promo: Pick<Promotion, "active" | "validUntil" | "title" | "description">,
): PromoStatus {
  const hasTitle = promo.title.trim().length > 0;
  const hasConditions = promo.description.trim().length > 0;
  const isExpired = promo.validUntil
    ? new Date(promo.validUntil) < new Date()
    : false;

  if (!hasTitle || !hasConditions) return "draft";
  if (!promo.active && !promo.validUntil) return "draft";
  if (isExpired) return "expired";
  if (promo.active) return "active";
  return "hidden";
}

function statusMeta(status: PromoStatus) {
  if (status === "active") {
    return {
      label: "Активна",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      badge: "default" as const,
    };
  }

  if (status === "expired") {
    return {
      label: "Истекла",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      badge: "destructive" as const,
    };
  }

  if (status === "draft") {
    return {
      label: "Черновик",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      badge: "secondary" as const,
    };
  }

  return {
    label: "Скрыта",
    className: "border-border bg-muted text-muted-foreground",
    badge: "secondary" as const,
  };
}

function formatDate(value: string | null) {
  if (!value) return "Без срока";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function dateInputToEndOfDayIso(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "banners");
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (data.url) onChange(data.url);
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  return (
    <>
      <div className="space-y-2">
        <FieldLabel>
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Баннер или изображение
          </span>
        </FieldLabel>

        <div
          className={`overflow-hidden rounded-lg border transition-colors ${
            dragging
              ? "border-primary bg-primary/[0.06]"
              : "border-border bg-muted/30"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="relative aspect-[16/9] min-h-[168px]">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Превью акции"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 opacity-60" />
                    <span>
                      Перетащите изображение или выберите источник ниже
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {value && (
            <div className="flex flex-col gap-2 border-t border-border bg-card p-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
              >
                <Library className="h-4 w-4" />
                Сменить
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_44px]">
          <button
            type="button"
            onClick={() => setShowMediaPicker(true)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
          >
            <Library className="h-4 w-4" />
            Медиатека
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
          >
            <Upload className="h-4 w-4" />
            Загрузить
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(!showUrlInput);
              setUrlDraft(value);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-3 py-2 transition-colors hover:bg-primary/[0.06]"
            aria-label="Вставить URL изображения"
            title="Вставить URL"
          >
            <Link2 className="h-4 w-4" />
          </button>
        </div>

        {showUrlInput && (
          <div className="grid gap-2 sm:grid-cols-[1fr_44px_44px]">
            <input
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              placeholder="https://..."
              className="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onChange(urlDraft.trim());
                  setShowUrlInput(false);
                }
                if (event.key === "Escape") setShowUrlInput(false);
              }}
            />
            <button
              type="button"
              onClick={() => {
                onChange(urlDraft.trim());
                setShowUrlInput(false);
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
              aria-label="Применить URL"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border px-3 py-2 transition-colors hover:bg-primary/[0.06]"
              aria-label="Закрыть ввод URL"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
            event.target.value = "";
          }}
        />
      </div>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onPick={(url) => {
          onChange(url);
          setShowMediaPicker(false);
        }}
      />
    </>
  );
}

function PromotionCard({
  promo,
  onUpdate,
  onDelete,
}: {
  promo: Promotion;
  onUpdate: (id: string, data: Partial<Promotion>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(promo.title);
  const [description, setDescription] = useState(promo.description);
  const [discount, setDiscount] = useState(
    promo.discount ? String(promo.discount) : "",
  );
  const [imageUrl, setImageUrl] = useState(promo.imageUrl || "");
  const [validUntil, setValidUntil] = useState(
    promo.validUntil ? promo.validUntil.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [generatingText, setGeneratingText] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [storyKit, setStoryKit] = useState<PromotionStoryKit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const draftPromo = useMemo(
    () => ({
      ...promo,
      title,
      description,
      validUntil: dateInputToEndOfDayIso(validUntil),
    }),
    [description, promo, title, validUntil],
  );
  const status = getPromotionStatus(draftPromo);
  const meta = statusMeta(status);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      await onUpdate(promo.id, {
        title,
        description,
        discount: discount ? Number(discount) : null,
        imageUrl: imageUrl.trim() || null,
        validUntil: dateInputToEndOfDayIso(validUntil),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch {
      setSaveError(
        "Не удалось сохранить. Проверьте поля и попробуйте еще раз.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function generatePromotionText() {
    const cleanTitle = title.trim() || "Акция";
    setGeneratingText(true);
    setGenerateError("");
    try {
      const res = await fetch("/api/admin/aray/content/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "promotion",
          title: cleanTitle,
          description,
          category: "Акции и скидки",
          price: discount ? `скидка ${discount}%` : null,
          unit: validUntil ? `до ${formatDate(validUntil)}` : "по условиям акции",
          businessType: "promotion",
          tone: "steady",
          benefits: ["ясное условие", "ограниченный срок", "готово для рассылки"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.draft) {
        throw new Error(data?.error || "ARAY Content Core не вернул текст акции");
      }
      const draft = data.draft as {
        shortDescription?: string;
        adText?: string;
        storyScript?: string;
        checklist?: string[];
      };
      const nextText = [
        draft.shortDescription || draft.adText,
        discount ? `Скидка: ${discount}%.` : null,
        validUntil ? `Действует до ${formatDate(validUntil)}.` : "Срок действия уточняется в условиях акции.",
        "Чтобы воспользоваться предложением, оставьте заявку или свяжитесь с менеджером.",
      ]
        .filter(Boolean)
        .join("\n");
      setTitle(title.trim() ? title : cleanTitle);
      setDescription(nextText);
      setStoryKit({
        storyScript: draft.storyScript || "",
        adText: draft.adText || draft.shortDescription || "",
        checklist: Array.isArray(draft.checklist) ? draft.checklist : [],
      });
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Не удалось собрать текст акции");
    } finally {
      setGeneratingText(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(280px,420px)_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Badge variant={meta.badge} className="mb-2">
                {meta.label}
              </Badge>
              <h2 className="truncate text-base font-semibold">
                {title.trim() || "Без названия"}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(validUntil || promo.validUntil)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSaveError("");
                onUpdate(promo.id, { active: !promo.active }).catch(() => {
                  setSaveError("Не удалось изменить видимость акции.");
                });
              }}
              title={
                promo.active
                  ? "Скрыть акцию без удаления"
                  : "Включить после проверки условий и срока"
              }
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
            >
              {promo.active ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
              {promo.active ? "Включена" : "Выключена"}
            </button>
          </div>

          <ImagePicker value={imageUrl} onChange={setImageUrl} />
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Заголовок</FieldLabel>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <FieldLabel>Скидка, %</FieldLabel>
            <input
              type="number"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="Не указана"
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <FieldLabel>Действует до</FieldLabel>
            <input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${meta.className}`}
          >
            <p className="font-medium">{meta.label}</p>
            <p className="mt-1 opacity-90">
              {status === "expired"
                ? "Срок акции прошел. Можно продлить дату или скрыть акцию."
                : status === "active"
                  ? "Показывается клиентам, если подключена в публичных блоках."
                  : status === "draft"
                    ? "Добавьте название и сохраните."
                    : "Не показывается, но остается в списке."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <FieldLabel>Описание и условия</FieldLabel>
              <button
                type="button"
                onClick={generatePromotionText}
                disabled={generatingText}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 text-[11px] font-semibold text-primary transition-colors hover:border-primary/45 hover:bg-primary/10 disabled:opacity-50"
              >
                {generatingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generatingText ? "Собираю..." : "Арай текст"}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {generateError && (
              <p className="mt-1.5 text-xs text-destructive">{generateError}</p>
            )}
          </div>
          {storyKit && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">ARAY Story Kit</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Сценарий сторис и рекламный текст для быстрого продвижения.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStoryKit(null)}
                  className="shrink-0 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Скрыть
                </button>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
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
                  {storyKit.checklist.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground">
                      {storyKit.checklist.map((item) => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          {saveError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
              {saveError}
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
            <Button
              className="min-h-[44px]"
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Сохранено
                </>
              ) : saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохраняем
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(promo.id);
        }}
        title="Удалить акцию?"
        description={`Акция «${promo.title || "Без названия"}» будет удалена навсегда.`}
        confirmLabel="Удалить"
        variant="danger"
      />
    </article>
  );
}

function RoadmapCard({ item }: { item: (typeof ROADMAP_ITEMS)[number] }) {
  const Icon = item.icon;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              запланировано
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.text}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromoFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDiscount, setNewDiscount] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;

    fetch("/api/admin/promotions")
      .then((response) => response.json())
      .then((data) => {
        if (!alive) return;
        setPromotions(Array.isArray(data) ? data : []);
        setError(
          Array.isArray(data)
            ? ""
            : "Сервер вернул неожиданный формат списка акций.",
        );
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setPromotions([]);
        setError(
          "Не удалось загрузить акции. Данные не изменены, попробуйте обновить страницу.",
        );
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  async function handleUpdate(id: string, data: Partial<Promotion>) {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    if (!res.ok) throw new Error(updated?.error || "Не удалось обновить акцию");
    setPromotions((prev) =>
      prev.map((promo) => (promo.id === id ? { ...promo, ...updated } : promo)),
    );
    setError("");
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/promotions/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(
        "Не удалось удалить акцию. Проверьте доступ и попробуйте еще раз.",
      );
      return;
    }
    setPromotions((prev) => prev.filter((promo) => promo.id !== id));
    setError("");
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription,
        discount: newDiscount ? Number(newDiscount) : null,
        active: false,
      }),
    });
    const created = await res.json();
    if (!res.ok) {
      setError(created?.error || "Не удалось создать акцию.");
      setCreating(false);
      return;
    }
    setPromotions((prev) => [created, ...prev]);
    setError("");
    setNewTitle("");
    setNewDescription("");
    setNewDiscount("");
    setShowNew(false);
    setCreating(false);
  }

  const stats = useMemo(() => {
    const active = promotions.filter(
      (promo) => getPromotionStatus(promo) === "active",
    ).length;
    const expired = promotions.filter(
      (promo) => getPromotionStatus(promo) === "expired",
    ).length;
    const draft = promotions.filter(
      (promo) => getPromotionStatus(promo) === "draft",
    ).length;
    const hidden = promotions.filter(
      (promo) => getPromotionStatus(promo) === "hidden",
    ).length;
    return { active, expired, draft, hidden, total: promotions.length };
  }, [promotions]);

  const displayedPromotions = useMemo(
    () =>
      promotions.filter((promo) => {
        if (statusFilter === "all") return true;
        return getPromotionStatus(promo) === statusFilter;
      }),
    [promotions, statusFilter],
  );

  if (loading) {
    return (
      <div className="admin-page-frame admin-page-frame-fluid">
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Загружаем акции
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold font-display">
            <BadgePercent className="h-6 w-6 text-primary" />
            Акции и скидки
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Управление карточками акций, сроками, баннерами и быстрыми
            переходами к рассылкам и продвижению.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/promotion"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
          >
            <Megaphone className="h-4 w-4" />
            Продвижение
          </Link>
          <Link
            href="/admin/email"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
          >
            <Mail className="h-4 w-4" />
            Рассылки
          </Link>
          <Button
            className="min-h-[44px]"
            onClick={() => setShowNew((value) => !value)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Новая акция
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Всего
          </p>
          <p className="mt-2 text-2xl font-bold font-display">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Активные
          </p>
          <p className="mt-2 text-2xl font-bold font-display">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Истекшие
          </p>
          <p className="mt-2 text-2xl font-bold font-display">
            {stats.expired}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Черновики
          </p>
          <p className="mt-2 text-2xl font-bold font-display">{stats.draft}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/55" />
            Скрытые
          </p>
          <p className="mt-2 text-2xl font-bold font-display">{stats.hidden}</p>
        </div>
      </section>

      {showNew && (
        <section className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold">Новая акция</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Создайте черновик: он появится выключенным, пока вы не проверите
                условия, срок и баннер.
              </p>
            </div>
            <Badge variant="secondary">черновик акции</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
            <div>
              <FieldLabel>Заголовок *</FieldLabel>
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Скидки при объеме"
                className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <FieldLabel>Скидка, %</FieldLabel>
              <input
                type="number"
                value={newDiscount}
                onChange={(event) => setNewDiscount(event.target.value)}
                placeholder="Не указана"
                className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Описание</FieldLabel>
              <textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                rows={3}
                placeholder="Условия акции, период, ограничения и кому подходит предложение."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              className="min-h-[44px]"
              onClick={() => setShowNew(false)}
            >
              Отмена
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Создать
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Список акций</h2>
            <p className="text-sm text-muted-foreground">
              Статус считается по активности и сроку действия. Действия видны на
              телефоне и компьютере.
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                title={filter.hint}
                className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-primary/[0.06]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {displayedPromotions.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
          {promotions.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-border bg-card p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-base font-semibold">Акций пока нет</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Создайте первую карточку и добавьте условия предложения.
              </p>
            </div>
          )}
          {promotions.length > 0 && displayedPromotions.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <h3 className="text-base font-semibold">
                В этом статусе ничего нет
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Смените фильтр или создайте новую акцию-черновик.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Что появится дальше</h2>
          <p className="text-sm text-muted-foreground">
            Эти возможности запланированы. Пока на странице нет нерабочих
            кнопок: только то, чем можно пользоваться уже сейчас.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_ITEMS.map((item) => (
            <RoadmapCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              Следующий шаг после карточки
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Используйте созданные акции в рассылках клиентам или перенесите
              условия в рекламный центр. Автоматической связи пока нет.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/admin/email"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />К рассылкам
            </Link>
            <Link
              href="/admin/promotion"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/[0.06]"
            >
              <ExternalLink className="h-4 w-4" />К продвижению
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
