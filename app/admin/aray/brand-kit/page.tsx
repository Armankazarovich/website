export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Download, FileText, Palette, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArayAMark } from "@/components/shared/aray-a-mark";
import { ARAY_PARTNER_BRAND_KIT_ITEMS } from "@/lib/aray-agency-crm-foundation";

const BRAND_RULES = [
  "партнер берет только утвержденные материалы",
  "логотип нельзя растягивать, перекрашивать вручную и ставить на шумный фон",
  "реклама должна говорить про партнерство с ARAY/Yuva, а не обещать невозможное",
  "все обещания клиенту должны совпадать с тарифом и договором",
  "материалы для печати и блогеров проходят единый стандарт качества",
];

const MATERIAL_GROUPS = [
  { title: "Для продаж", text: "Презентация, КП, тариф 150 000 ₽, скрипт разговора и короткое описание пользы.", icon: FileText },
  { title: "Для рекламы", text: "Баннеры, посты, сторис, тексты для блогеров, партнерская ссылка и городская подача.", icon: Palette },
  { title: "Для печати", text: "Листовка, визитка, бейдж партнера, QR-заявка, правила использования логотипа.", icon: Printer },
];

const LOGO_VARIANTS = [
  {
    title: "Official",
    text: "Оригинальные цвета для документов, печати и партнерских материалов.",
    variant: "official",
    previewClassName: "bg-background",
    src: "/aray/brand-assets/originals/aray-a-corel.svg",
  },
  {
    title: "Live",
    text: "Живой режим для админки, приложений и тем оформления.",
    variant: "live",
    previewClassName: "bg-background",
  },
  {
    title: "Mono Light",
    text: "Светлая версия для темных поверхностей и иконок.",
    variant: "mono-light",
    previewClassName: "bg-card",
  },
  {
    title: "Mono Dark",
    text: "Темная версия для светлых носителей и печати.",
    variant: "mono-dark",
    previewClassName: "bg-card",
  },
] as const;

const SOURCE_ASSETS = [
  {
    title: "Полный логотип Yuva",
    src: "/aray/brand-assets/yuva-logo-polnyj.png",
    downloadSrc: "/aray/brand-assets/yuva-logo-polnyj.png",
    width: 360,
    height: 95,
  },
  {
    title: "Красная A из логотипа Yuva",
    src: "/aray/brand-assets/yuva-a-red-source-transparent.png",
    downloadSrc: "/aray/brand-assets/yuva-a-red-source-transparent.png",
    width: 168,
    height: 145,
  },
  {
    title: "Оригинал A Corel SVG",
    src: "/aray/brand-assets/originals/aray-a-corel.svg",
    downloadSrc: "/aray/brand-assets/originals/aray-a-corel.svg",
    width: 168,
    height: 168,
  },
  {
    title: "Оригинал A PDF",
    src: "/aray/brand-assets/originals/aray-a-corel-preview.png",
    downloadSrc: "/aray/brand-assets/originals/aray-a-corel.pdf",
    width: 168,
    height: 168,
  },
  {
    title: "Оригинал A Illustrator AI",
    src: "/aray/brand-assets/originals/aray-a-corel-preview.png",
    downloadSrc: "/aray/brand-assets/originals/aray-a-illustrator.ai",
    width: 168,
    height: 168,
  },
];

const BRAND_KIT_STATUS_LABELS = {
  ready: "готово",
  draft: "черновик",
  planned: "готовим",
} as const;

const BRAND_KIT_STATUS_CLASSES = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  draft: "border-primary/30 bg-primary/10 text-primary",
  planned: "border-border bg-muted/40 text-muted-foreground",
} as const;

const MOCKUP_LIBRARY = [
  { title: "Презентация", format: "16:9 / PDF", status: "planned" },
  { title: "Коммерческое предложение", format: "PDF / A4", status: "planned" },
  { title: "Листовка", format: "A4 / A5", status: "planned" },
  { title: "Визитка партнера", format: "90x50 мм", status: "planned" },
  { title: "Партнерский бейдж", format: "карточка / QR", status: "planned" },
  { title: "Пост", format: "1080x1080", status: "planned" },
  { title: "Сторис", format: "1080x1920", status: "planned" },
  { title: "Баннер сайта", format: "широкий экран / телефон", status: "planned" },
  { title: "Обложка документов", format: "счет / акт / договор", status: "draft" },
] as const;

const SMART_DOCUMENTS = [
  {
    title: "Advertising Rules",
    language: "EN",
    text: "Брендированный документ для партнеров и блогеров на английском.",
    href: "/aray/brand-assets/documents/aray-partner-ad-rules-en.html",
  },
  {
    title: "Правила рекламы",
    language: "RU",
    text: "Русская версия с теми же правилами и печатью в PDF.",
    href: "/aray/brand-assets/documents/aray-partner-ad-rules-ru.html",
  },
  {
    title: "Partner Guide",
    language: "EN",
    text: "Путь партнера: заявка, бриф, счет, оплата, производство.",
    href: "/aray/brand-assets/documents/aray-partner-guide-en.html",
  },
  {
    title: "Инструкция партнера",
    language: "RU",
    text: "Русская версия процесса продаж и сопровождения клиента.",
    href: "/aray/brand-assets/documents/aray-partner-guide-ru.html",
  },
  {
    title: "Commercial Offer",
    language: "EN",
    text: "Черновик КП про маркетинговый отдел под ключ.",
    href: "/aray/brand-assets/documents/aray-commercial-offer-en.html",
  },
  {
    title: "Коммерческое предложение",
    language: "RU",
    text: "Черновик КП с тарифом 150 000 ₽ в месяц.",
    href: "/aray/brand-assets/documents/aray-commercial-offer-ru.html",
  },
  {
    title: "Sales Script",
    language: "EN",
    text: "Conversation structure for partner sales.",
    href: "/aray/brand-assets/documents/aray-partner-sales-script-en.html",
  },
  {
    title: "Скрипт продаж",
    language: "RU",
    text: "Как партнеру объяснять услугу клиенту.",
    href: "/aray/brand-assets/documents/aray-partner-sales-script-ru.html",
  },
  {
    title: "Client Brief",
    language: "EN",
    text: "Business data checklist before production.",
    href: "/aray/brand-assets/documents/aray-client-brief-en.html",
  },
  {
    title: "Бриф клиента",
    language: "RU",
    text: "Что собрать для ТЗ и запуска работ.",
    href: "/aray/brand-assets/documents/aray-client-brief-ru.html",
  },
  {
    title: "Payments & Requisites",
    language: "EN",
    text: "Safe invoice flow and requisites checklist.",
    href: "/aray/brand-assets/documents/aray-payments-requisites-en.html",
  },
  {
    title: "Платежи и реквизиты",
    language: "RU",
    text: "Как собирать данные и не публиковать чувствительные реквизиты.",
    href: "/aray/brand-assets/documents/aray-payments-requisites-ru.html",
  },
] as const;

export default function ArayBrandKitPage() {
  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <section className="rounded-2xl border border-border bg-card px-5 py-6 lg:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Partner Media Kit
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Бренд-комплект ARAY
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Единый набор логотипов, презентаций, печатных материалов и рекламных шаблонов
              для партнеров, блогеров и региональных представителей.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/aray/partners">
              Партнеры
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Варианты ARAY A Mark
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Официальный знак остается как в Yuva, а live-режим показывает технологию смены палитры.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {LOGO_VARIANTS.map((item) => (
              <div key={item.variant} className="rounded-2xl border border-border bg-background p-3">
                <div className={`flex min-h-[144px] items-center justify-center rounded-xl border border-border/70 px-3 py-4 ${item.previewClassName}`}>
                  {"src" in item ? (
                    <Image
                      src={item.src}
                      alt={`${item.title} ARAY A Mark`}
                      width={132}
                      height={132}
                      unoptimized
                      className="h-auto max-h-[124px] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <ArayAMark
                      size={124}
                      variant={item.variant}
                      idPrefix={`aray-a-mark-${item.variant}`}
                    />
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">{item.title}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Материалы партнера</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ARAY_PARTNER_BRAND_KIT_ITEMS.map((item) => (
              item.href ? (
                <a
                  key={item.title}
                  href={item.href}
                  download={!item.href.endsWith(".html") ? true : undefined}
                  target={item.href.endsWith(".html") ? "_blank" : undefined}
                  rel={item.href.endsWith(".html") ? "noreferrer" : undefined}
                  className="rounded-xl border border-border bg-background px-3 py-2.5 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{item.title}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BRAND_KIT_STATUS_CLASSES[item.status]}`}>
                      {BRAND_KIT_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 pl-7 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </a>
              ) : (
                <div key={item.title} className="rounded-xl border border-border bg-background px-3 py-2.5 opacity-85">
                  <div className="flex items-center gap-3">
                    <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{item.title}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BRAND_KIT_STATUS_CLASSES[item.status]}`}>
                      {BRAND_KIT_STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-1 pl-7 text-xs leading-5 text-muted-foreground">{item.note}</p>
                </div>
              )
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Брендбук и макеты</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Очередь макетов для партнеров, менеджеров и блогеров.
            </p>
          </div>
          <a
            href="/aray/brand-assets/downloads/aray-brandbook-mockups-blueprint.txt"
            download
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Download className="h-4 w-4 text-primary" />
            Скачать структуру
          </a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCKUP_LIBRARY.map((mockup) => (
            <div key={mockup.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{mockup.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{mockup.format}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BRAND_KIT_STATUS_CLASSES[mockup.status]}`}>
                  {BRAND_KIT_STATUS_LABELS[mockup.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Умные документы</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Брендированные правила и инструкции можно открыть, проверить, распечатать или сохранить как PDF.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SMART_DOCUMENTS.map((document) => (
            <a
              key={document.href}
              href={document.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{document.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{document.text}</p>
                </div>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {document.language}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Исходники бренда</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {SOURCE_ASSETS.map((asset) => (
            <div key={asset.src} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-border/70 bg-card px-4 py-5">
                <Image
                  src={asset.src}
                  alt={asset.title}
                  width={asset.width}
                  height={asset.height}
                  unoptimized={asset.src.endsWith(".svg")}
                  className="h-auto max-h-[130px] w-auto max-w-full object-contain"
                />
              </div>
              <a
                href={asset.downloadSrc}
                download
                className="mt-3 flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                <Download className="h-4 w-4 text-primary" />
                {asset.title}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {MATERIAL_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="rounded-2xl border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{group.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.text}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Правила использования</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {BRAND_RULES.map((rule) => (
            <div key={rule} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
