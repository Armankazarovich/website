"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2, Rocket, Save, Sparkles } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { ArayBuilderEditableField, ArayBuilderBlockStatus, ArayLaunchBlockPlan } from "@/lib/aray-block-builder";

type PreviewBlock = ArayLaunchBlockPlan["blocks"][number];
type EditableBlockDraft = PreviewBlock["draft"];
type CreatedSiteDraft = {
  tenantId: string;
  name: string;
  previewHref: string;
  adminHref: string;
  selectedCount: number;
};

const statusLabel: Record<ArayBuilderBlockStatus, string> = {
  certified: "эталон",
  draft: "доводим",
  planned: "план",
};

const statusClassName: Record<ArayBuilderBlockStatus, string> = {
  certified: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  draft: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  planned: "border-sky-500/35 bg-sky-500/10 text-sky-300",
};

const fieldLabel: Record<ArayBuilderEditableField, string> = {
  eyebrow: "надпись",
  title: "заголовок",
  text: "текст",
  buttons: "кнопки",
  media: "фото",
  colors: "цвет",
  cards: "карточки",
  form: "форма",
  seo: "SEO",
  "crm-link": "CRM",
};

function PreviewBlockView({ block, index }: { block: PreviewBlock; index: number }) {
  if (block.id === "hero-offer") {
    return (
      <section className="rounded-2xl border border-border bg-card px-4 py-5 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">ARAY draft</p>
        <h3 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight text-foreground">{block.draft.title}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
            {block.draft.action}
          </span>
          <span className="inline-flex min-h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">
            Посмотреть план
          </span>
        </div>
      </section>
    );
  }

  if (block.id === "product-stack") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-lg font-semibold text-foreground">{block.draft.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {["Сайт", "PWA", "CRM", "SEO"].map((item) => (
            <div key={item} className="rounded-xl border border-border bg-background px-3 py-3">
              <p className="text-sm font-semibold text-foreground">{item}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">включено</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.id === "crm-process") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-lg font-semibold text-foreground">{block.draft.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {["Заявка", "Бриф", "Счет", "Запуск"].map((item, stepIndex) => (
            <div key={item} className="rounded-xl border border-border bg-background px-3 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                {stepIndex + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.id === "lead-form") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-lg font-semibold text-foreground">{block.draft.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {["Имя", "Телефон", "Город", "Задача"].map((field) => (
            <div key={field} className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
              {field}
            </div>
          ))}
        </div>
        <span className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {block.draft.action}
        </span>
      </section>
    );
  }

  if (block.id === "price-offer") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{block.draft.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">старт</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">150 000 ₽</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{block.draft.action}</p>
          </div>
        </div>
      </section>
    );
  }

  if (block.id === "footer-tunnel") {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{block.draft.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
          </div>
          <span className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary">
            {block.draft.action}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">блок {index + 1}</p>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{block.draft.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.draft.text}</p>
    </section>
  );
}

export function ArayBlockPlanStudio({
  leadId,
  plan,
}: {
  leadId: string;
  plan: ArayLaunchBlockPlan;
}) {
  const [selectedIds, setSelectedIds] = useState(() => plan.blocks.map((block) => block.id));
  const [draftById, setDraftById] = useState<Record<string, EditableBlockDraft>>(() =>
    Object.fromEntries(plan.blocks.map((block) => [block.id, block.draft])),
  );
  const [saving, setSaving] = useState(false);
  const [creatingSite, setCreatingSite] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmCreateSiteOpen, setConfirmCreateSiteOpen] = useState(false);
  const [siteDraft, setSiteDraft] = useState<CreatedSiteDraft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const blocksWithDrafts = useMemo(
    () => plan.blocks.map((block) => ({
      ...block,
      draft: draftById[block.id] || block.draft,
    })),
    [draftById, plan.blocks],
  );

  const selectedBlocks = useMemo(
    () => blocksWithDrafts.filter((block) => selectedIds.includes(block.id)),
    [blocksWithDrafts, selectedIds],
  );

  function toggleBlock(blockId: string) {
    setSelectedIds((current) =>
      current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId],
    );
  }

  function updateDraft(blockId: string, field: keyof EditableBlockDraft, value: string) {
    setDraftById((current) => {
      const base = current[blockId] || plan.blocks.find((block) => block.id === blockId)?.draft;
      if (!base) return current;
      return {
        ...current,
        [blockId]: {
          ...base,
          [field]: value,
        },
      };
    });
  }

  function buildBlockDraftPayload() {
    return selectedBlocks.map((block) => ({
      id: block.id,
      title: block.draft.title,
      text: block.draft.text,
      action: block.draft.action,
    }));
  }

  async function savePlan() {
    setConfirmSaveOpen(false);
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/aray/launch/block-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          selectedBlockIds: selectedIds,
          blockDrafts: buildBlockDraftPayload(),
          confirm: true,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось сохранить план блоков");
      }

      setMessage(`План сохранен: ${data.selectedCount} блоков связаны с CRM`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения плана");
    } finally {
      setSaving(false);
    }
  }

  async function createSiteShell() {
    setConfirmCreateSiteOpen(false);
    setCreatingSite(true);
    setMessage("");
    setError("");
    setSiteDraft(null);

    try {
      const response = await fetch("/api/admin/aray/launch/site-shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          selectedBlockIds: selectedIds,
          blockDrafts: buildBlockDraftPayload(),
          confirm: true,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok || !data.site) {
        throw new Error(data.error || "Не удалось создать черновик сайта");
      }

      setSiteDraft(data.site as CreatedSiteDraft);
      setMessage(`Черновик сайта создан: ${data.site.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания черновика сайта");
    } finally {
      setCreatingSite(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Первый сайт из блоков
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Арай показывает стартовый набор секций, объясняет зачем они нужны и сохраняет выбранный план в CRM.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {plan.benchmark}
          </span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            plan.confidence === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
          }`}>
            {plan.confidence === "ready" ? "можно собирать" : "нужно доспросить"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {["Показать", "Выбрать", "Сохранить", "Собрать"].map((step, index) => (
          <div key={step} className="rounded-xl border border-border bg-background px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              шаг {index + 1}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{step}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {blocksWithDrafts.map((block, index) => {
          const selected = selectedIds.includes(block.id);
          return (
            <article
              key={block.id}
              className={`min-h-[220px] rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-primary/45 bg-primary/10"
                  : "border-border bg-background hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassName[block.status]}`}>
                    {statusLabel[block.status]}
                  </span>
                  {selected ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleBlock(block.id)}
                className={`mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-xl border px-3 text-xs font-semibold transition ${
                  selected
                    ? "border-primary/45 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
                }`}
              >
                {selected ? "Включен в страницу" : "Добавить в страницу"}
              </button>
              <h4 className="mt-3 text-sm font-semibold text-foreground">{block.title}</h4>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{block.reason}</p>
              <div className="mt-3 rounded-xl border border-border bg-card px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">черновик Арая</p>
                <label className="mt-3 block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    заголовок
                  </span>
                  <input
                    value={block.draft.title}
                    onChange={(event) => updateDraft(block.id, "title", event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/45"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    текст
                  </span>
                  <textarea
                    value={block.draft.text}
                    onChange={(event) => updateDraft(block.id, "text", event.target.value)}
                    rows={4}
                    className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-xs leading-5 text-foreground outline-none transition focus:border-primary/45"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    действие
                  </span>
                  <input
                    value={block.draft.action}
                    onChange={(event) => updateDraft(block.id, "action", event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-primary outline-none transition focus:border-primary/45"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {block.editableFields.slice(0, 5).map((field) => (
                  <span key={field} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {fieldLabel[field]}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_260px]">
        <div className="rounded-xl border border-border bg-background p-4">
          <h4 className="text-sm font-semibold text-foreground">Что доспросить</h4>
          <div className="mt-3 grid gap-2">
            {plan.ownerInputs.slice(0, 5).map((item) => (
              <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <h4 className="text-sm font-semibold text-foreground">Что получаем</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.readyOutputs.map((item) => (
              <span key={item} className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">выбрано</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{selectedBlocks.length}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            блоков пойдут в первый план сайта.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => setConfirmSaveOpen(true)}
            disabled={saving || selectedBlocks.length === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить план
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full bg-background/80"
            onClick={() => setConfirmCreateSiteOpen(true)}
            disabled={creatingSite || selectedBlocks.length === 0}
          >
            {creatingSite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Создать черновик сайта
          </Button>
          <ConfirmDialog
            open={confirmSaveOpen}
            onClose={() => setConfirmSaveOpen(false)}
            onConfirm={() => void savePlan()}
            title="Сохранить план блоков?"
            description="ARAY добавит план в историю клиента и создаст задачу проверки выбранных блоков."
            confirmLabel="Сохранить"
            variant="warning"
            loading={saving}
          />
          <ConfirmDialog
            open={confirmCreateSiteOpen}
            onClose={() => setConfirmCreateSiteOpen(false)}
            onConfirm={() => void createSiteShell()}
            title="Создать черновик сайта?"
            description="ARAY создаст отдельный сайт на проверке и задачу для контроля черновика."
            confirmLabel="Создать черновик"
            variant="warning"
            loading={creatingSite}
          />
          {siteDraft ? (
            <div className="mt-3 rounded-xl border border-border bg-background px-3 py-3">
              <p className="text-xs font-semibold text-foreground">{siteDraft.name}</p>
              <p className="mt-1 break-words text-[11px] text-muted-foreground">tenant: {siteDraft.tenantId}</p>
              <div className="mt-3 grid gap-2">
                <a
                  href={siteDraft.previewHref}
                  target="_blank"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть превью
                </a>
                <a
                  href={siteDraft.adminHref}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Открыть в конструкторе
                </a>
              </div>
            </div>
          ) : null}
          {message ? <p className="mt-3 text-xs font-medium text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-3 text-xs font-medium text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              живое превью
            </p>
            <h4 className="mt-1 text-lg font-semibold text-foreground">Первая страница из выбранных блоков</h4>
          </div>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            {selectedBlocks.length} секций
          </span>
        </div>

        {selectedBlocks.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {selectedBlocks.map((block, index) => (
              <PreviewBlockView key={block.id} block={block} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Выберите хотя бы один блок, и Арай сразу покажет первый набросок страницы.
          </div>
        )}
      </div>
    </div>
  );
}
