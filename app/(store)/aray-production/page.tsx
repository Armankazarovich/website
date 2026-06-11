import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList, Store, UploadCloud } from "lucide-react";
import { SmartStoreLauncher } from "@/components/site-constructor/smart-store-launcher";
import {
  ONE_CLICK_STORE_IMPORT_COLUMNS,
  ONE_CLICK_STORE_QUESTIONNAIRE,
  STORE_CONSTRUCTOR_BUSINESS_TYPES,
  getStoreConstructorBlueprint,
} from "@/lib/store-constructor-blueprints";

export const metadata: Metadata = {
  title: "ARAY Production · запуск магазина на базе PiloRus",
  description: "Легкая заявка для запуска интернет-магазина стройматериалов, пиломатериалов и других каталогов на базе PiloRus.",
  alternates: { canonical: "https://pilo-rus.ru/aray-production" },
};

const blueprints = STORE_CONSTRUCTOR_BUSINESS_TYPES.map((type) => getStoreConstructorBlueprint(type));

const launchPoints = [
  {
    icon: ClipboardList,
    title: "Анкета",
    text: "Название, город, контакты, доставка, оплата и домен.",
  },
  {
    icon: UploadCloud,
    title: "Файлы",
    text: "Логотип, прайс Excel или CSV, товары и базовые поля каталога.",
  },
  {
    icon: Store,
    title: "Превью",
    text: "Готовый черновик магазина с категориями, карточками и заявками.",
  },
  {
    icon: CheckCircle2,
    title: "Публикация",
    text: "После подтверждения магазин появляется в «Моих сайтах».",
  },
];

export default function ArayProductionLandingPage() {
  return (
    <main className="bg-background" data-aray-production-landing>
      <section className="relative isolate flex min-h-[520px] items-end overflow-hidden">
        <Image
          src="/images/production/hero-main.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-background/55" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/75">
              Запуск от PiloRus
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              ARAY Production
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/80">
              Быстрый старт интернет-магазина: клиент заполняет заявку, загружает прайс и логотип,
              получает превью, а после подтверждения сайт уходит в публикацию.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="#smart-application"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Запустить заявку
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/admin/site/constructor"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/30 bg-card/10 px-5 text-sm font-semibold text-foreground transition-colors hover:bg-card/20"
              >
                Админ-конструктор
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-4 py-8 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {launchPoints.map((point) => {
          const Icon = point.icon;
          return (
            <article key={point.title} className="rounded-xl border border-border bg-card p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-foreground">{point.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <SmartStoreLauncher
          blueprints={blueprints}
          questionnaire={ONE_CLICK_STORE_QUESTIONNAIRE}
          importColumns={ONE_CLICK_STORE_IMPORT_COLUMNS}
          referralSource="PiloRus"
          mode="public"
        />
      </section>
    </main>
  );
}
