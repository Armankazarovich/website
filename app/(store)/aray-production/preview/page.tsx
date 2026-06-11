import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Package, ShoppingCart, Sparkles, Store } from "lucide-react";
import { getStoreConstructorBlueprint } from "@/lib/store-constructor-blueprints";

type PreviewSearchParams = {
  tenantId?: string;
  networkId?: string;
  businessType?: string;
  name?: string;
  city?: string;
  domain?: string;
  referralSource?: string;
};

type ArayProductionPreviewPageProps = {
  searchParams?: PreviewSearchParams;
};

export const metadata: Metadata = {
  title: "Живое превью магазина | ARAY Production",
  description: "Проверочное превью магазина, собранного в ARAY Production перед публикацией.",
};

function readParam(searchParams: PreviewSearchParams | undefined, key: keyof PreviewSearchParams, fallback: string) {
  const value = searchParams?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default function ArayProductionLivePreviewPage({ searchParams }: ArayProductionPreviewPageProps) {
  const tenantId = readParam(searchParams, "tenantId", "demo-store");
  const networkId = readParam(searchParams, "networkId", "single");
  const blueprint = getStoreConstructorBlueprint(searchParams?.businessType);
  const storeName = readParam(searchParams, "name", blueprint.title);
  const city = readParam(searchParams, "city", "город уточняется");
  const domain = readParam(searchParams, "domain", `${tenantId}.aray-cms.local`);
  const referralSource = readParam(searchParams, "referralSource", "ARAY Production");

  const previewProducts = blueprint.catalogSeed.sampleProducts.slice(0, 4);
  const previewCategories = blueprint.catalogSeed.categories.slice(0, 5);

  return (
    <main className="bg-background" data-aray-production-live-preview>
      <section className="relative isolate min-h-[520px] overflow-hidden border-b border-border">
        <Image
          src="/images/production/hero-main.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl flex-col justify-end px-4 py-10 text-foreground sm:px-6 lg:px-8">
          <Link
            href="/aray-production#smart-application"
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-xl border border-border/25 bg-card/10 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться к анкете
          </Link>
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/25 bg-card/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/85">
              <Sparkles className="h-3.5 w-3.5" />
              Живое превью ARAY
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
              {storeName}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/82">
              Черновик магазина на базе шаблона {blueprint.title}: каталог, заявка, корзина, PWA и админка будут
              запускаться отдельно для этого проекта.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-xl border border-border/25 bg-card/10 px-3 py-2">tenantId: {tenantId}</span>
              <span className="rounded-xl border border-border/25 bg-card/10 px-3 py-2">networkId: {networkId}</span>
              <span className="rounded-xl border border-border/25 bg-card/10 px-3 py-2">домен: {domain}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
        {[
          ["Город", city],
          ["Шаблон", blueprint.storeKind],
          ["Источник", referralSource],
          ["Статус", "черновик превью"],
        ].map(([label, value]) => (
          <article key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Структура будущего магазина</h2>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {blueprint.defaultSections.map((section) => (
              <div key={section} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                {section}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
            ARAY показывает превью без публикации домена. После проверки менеджер сохраняет сайт, подключает данные и
            выпускает проект в бой только после подтверждения.
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Каталог для старта</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {previewCategories.map((category) => (
              <span key={category} className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold">
                {category}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {previewProducts.map((product) => (
              <div key={product} className="rounded-xl border border-border bg-background p-3">
                <div className="flex h-24 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Package className="h-7 w-7" />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{product}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Цена и остатки подтянутся из прайса клиента.</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Превью собрано безопасно</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Это отдельный просмотр будущего проекта. Он не смешивает товары, заказы, клиентов и выплаты с другими
                сайтами, потому что tenantId и networkId передаются явно.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
