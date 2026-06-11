"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Filter,
  Globe2,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Palette,
  Rocket,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ArayAMark } from "@/components/shared/aray-a-mark";
import { ArayOrb } from "@/components/shared/aray-orb";

type FilterId = "all" | "sites" | "crm" | "marketing" | "partners" | "app";

type Solution = {
  id: string;
  title: string;
  text: string;
  href: string;
  tags: FilterId[];
  icon: LucideIcon;
  badge: string;
};

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "sites", label: "Сайты" },
  { id: "app", label: "ARAY App" },
  { id: "crm", label: "CRM" },
  { id: "marketing", label: "Маркетинг" },
  { id: "partners", label: "Партнеры" },
];

const SOLUTIONS: Solution[] = [
  {
    id: "zeder",
    title: "Zeder",
    text: "Эталон магазина: каталог, фильтры, корзина, заявки, PWA, футер ARAY и админка.",
    href: "/",
    tags: ["sites", "app", "crm"],
    icon: Globe2,
    badge: "эталон сайта",
  },
  {
    id: "pilorus",
    title: "PiloRus",
    text: "Эталон магазина и производственного потока: сайт, заказы, менеджеры и контроль.",
    href: "/aray/partners/yuva-studio",
    tags: ["sites", "crm", "marketing"],
    icon: Building2,
    badge: "пилот",
  },
  {
    id: "yuva",
    title: "Yuva Studio",
    text: "Первая партнерская студия ARAY: клиенты, заявки, страница студии и 50/50 модель.",
    href: "/aray/partners/yuva-studio",
    tags: ["partners", "marketing", "crm"],
    icon: Handshake,
    badge: "партнер",
  },
  {
    id: "crm",
    title: "ARAY CRM",
    text: "Внутренний мозг: партнеры, брифы, счета, производство, документы и контроль.",
    href: "/admin/aray",
    tags: ["crm", "partners"],
    icon: LayoutDashboard,
    badge: "админка",
  },
  {
    id: "brand-kit",
    title: "Бренд-комплект",
    text: "Логотипы, КП, инструкции, правила рекламы и материалы для партнеров.",
    href: "/admin/aray/brand-kit",
    tags: ["marketing", "partners"],
    icon: Palette,
    badge: "материалы",
  },
  {
    id: "aray-app",
    title: "ARAY App",
    text: "PWA-приложение, презентация, заявки и путь клиента внутри одного запуска.",
    href: "/aray/marketing/apply",
    tags: ["app", "sites", "crm"],
    icon: Smartphone,
    badge: "PWA",
  },
];

const PRODUCT_STACK = [
  { title: "Сайт", text: "Презентация, страницы, формы, SEO и примеры работ.", icon: Globe2 },
  { title: "PWA", text: "Приложение с установкой, быстрым входом и помощником.", icon: Smartphone },
  { title: "CRM", text: "Заявки, брифы, партнеры, счета, статусы и отчеты.", icon: LayoutDashboard },
  { title: "Маркетинг", text: "SEO, реклама, PR, тексты, бренд и материалы.", icon: Megaphone },
  { title: "Автоматизация", text: "Связки между сайтом, CRM, производством и командой.", icon: Workflow },
  { title: "ИИ", text: "ARAY помогает искать, готовить брифы и вести следующий шаг.", icon: Bot },
];

const TUNNEL_STEPS = [
  { title: "Клиент видит сайт", text: "В футере или рекламе нажимает: хочу такой же.", icon: Search },
  { title: "Выбирает путь", text: "Оставить заявку, выбрать партнера или стать партнером.", icon: Filter },
  { title: "CRM принимает", text: "Лид, бриф, ответственный, счет и статус появляются внутри ARAY.", icon: ClipboardList },
  { title: "Производство запускает", text: "После подтверждения и оплаты команда делает сайт, PWA, SEO и отчет.", icon: Rocket },
];

export function ArayProductionSite() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const filteredSolutions = useMemo(() => {
    if (activeFilter === "all") return SOLUTIONS;
    return SOLUTIONS.filter((solution) => solution.tags.includes(activeFilter));
  }, [activeFilter]);

  return (
    <main data-aray-production-landing className="aray-fluid-page min-h-screen overflow-hidden bg-card text-foreground">
      <section className="relative border-b border-border/10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-card bg-[size:32px_32px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-card"
        />

        <div className="aray-fluid-shell relative py-5">
          <header className="flex items-center justify-between gap-4">
            <Link href="/aray" className="flex min-w-0 items-center gap-3">
              <ArayAMark size={44} variant="official" idPrefix="aray-production-nav" className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-foreground xs:text-sm xs:tracking-[0.24em]">
                  ARAY Production
                </p>
                <p className="mt-0.5 text-xs text-foreground/62">site system + agency CRM</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink href="#examples" label="Примеры" />
              <NavLink href="#system" label="Система" />
              <NavLink href="/aray/partners/apply" label="Партнерам" />
              <NavLink href="/admin/aray" label="CRM" />
            </nav>
          </header>

          <div className="aray-split-grid py-[clamp(2.5rem,5vw,4.5rem)] lg:min-h-[76vh]">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200   xs:text-xs xs:tracking-[0.22em]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="truncate">сайт, приложение и маркетинг в одной системе</span>
              </div>

              <h1 className="aray-fluid-title mt-6 max-w-4xl font-black text-foreground">
                ARAY Production
              </h1>
              <p className="aray-fluid-text mt-6 max-w-2xl text-foreground/76">
                Мы делаем бизнесу не обычный лендинг, а сайт-систему: витрина,
                PWA-приложение, CRM-заявки, маркетинг, бренд, документы и
                производство внутри ARAY.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ActionLink href="/aray/marketing/apply" label="Заказать систему" icon={Rocket} primary />
                <ActionLink href="#examples" label="Смотреть примеры" icon={Search} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Signal label="1. Сайт" value="страницы и заявки" />
                <Signal label="2. ARAY App" value="PWA и помощник" />
                <Signal label="3. CRM" value="заказы и производство" />
              </div>
            </div>

            <div className="relative min-h-[420px] xs:min-h-[470px] md:min-h-[540px]">
              <div className="aray-glass-panel absolute inset-x-0 top-4 rounded-[var(--aray-radius-xl)] p-[var(--aray-panel-pad)] xs:inset-x-4 xs:top-8">
                <div className="rounded-[24px] border border-cyan-300/20 bg-card p-5  xs:p-8">
                  <div className="flex items-center justify-center py-5 xs:py-7">
                    <ArayAMark size="min(64vw, 340px)" variant="official" idPrefix="aray-production-hero" />
                  </div>
                  <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border/12 bg-background/42 px-4 py-3 shadow-xl shadow-black/25 ">
                    <ArayOrb size="md" pulse="idle" intensity="normal" />
                    <div>
                      <p className="text-sm font-bold text-foreground">ARAY ведет связки</p>
                      <p className="text-xs leading-5 text-foreground/62">
                        Сайт, заявка, бриф, счет, производство и отчет не теряются.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <HeroTile icon={Globe2} label="витрина" text="страницы и примеры" />
                  <HeroTile icon={Smartphone} label="PWA" text="приложение ARAY App" />
                  <HeroTile icon={LayoutDashboard} label="CRM" text="заявки и статусы" />
                  <HeroTile icon={ShieldCheck} label="порядок" text="сначала оплата, потом запуск" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="examples" className="border-b border-border/10 bg-card">
        <div className="aray-fluid-shell aray-fluid-section">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              eyebrow="примеры и модули"
              title="Фильтры, чтобы видеть не лендинг, а систему"
              text="Выбираем слой: сайты, приложение, CRM, маркетинг или партнерка. Так ARAY показывает бизнесу, что именно можно собрать."
            />

            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                    activeFilter === filter.id
                      ? "border-border bg-card text-foreground"
                      : "border-border/12 bg-card/[0.045] text-foreground/70 hover:border-cyan-300/35 hover:text-foreground"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 aray-auto-grid">
            {filteredSolutions.map((solution) => (
              <SolutionCard key={solution.id} solution={solution} />
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="border-b border-border/10 bg-card">
        <div className="aray-fluid-shell aray-fluid-section">
          <SectionHeading
            eyebrow="серьезная основа"
            title="Каждый сайт ARAY должен быть приложением и CRM-процессом"
            text="PiloRus остается золотой базой: каталог, фильтры, заявки, футер ARAY и админка. Новые сайты запускаем от этой базы через скан, бриф, превью и отдельный профиль проекта."
          />

          <div className="mt-8 aray-auto-grid">
            {PRODUCT_STACK.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="aray-glass-card rounded-[var(--aray-radius-lg)] p-[var(--aray-card-pad)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-black text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground/62">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-border/10 bg-card">
        <div className="aray-fluid-shell aray-fluid-section">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <SectionHeading
              eyebrow="туннель между сайтами"
              title="Каждый клиентский сайт ведет обратно в ARAY"
              text="В футере PiloRus и будущих сайтов человек нажимает «хочу такой же». Дальше ARAY ведет его в заявку, партнера, бриф и CRM."
            />

            <div className="grid gap-3">
              {TUNNEL_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="aray-glass-card rounded-[var(--aray-radius-lg)] p-[var(--aray-card-pad)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-amber-300">{index + 1}</p>
                        <h3 className="mt-1 text-base font-black text-foreground">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-foreground/62">{step.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/10 bg-card">
        <div className="aray-fluid-shell aray-fluid-section">
          <div className="aray-glass-panel rounded-[var(--aray-radius-xl)] p-[var(--aray-panel-pad)]">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground">
                  один продукт
                </p>
                <h2 className="aray-fluid-section-title mt-3 font-black text-foreground">
                  Маркетинговый отдел под ключ
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-foreground/68">
                  На первом этапе держим один понятный пакет: сайт, PWA, SEO,
                  реклама, бренд, автоматизация и ИИ-помощь. Клиент видит
                  результат, партнер ведет коммуникацию, производство работает внутри ARAY.
                </p>
              </div>
              <div className="grid gap-3">
                <PriceLine label="Клиент платит" value="150 000 ₽ / месяц" />
                <PriceLine label="Партнерская модель" value="50 / 50" />
                <PriceLine label="Производство" value="ARAY / Yuva" />
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/aray/marketing/apply" label="Оставить заявку" icon={ClipboardList} primary />
              <ActionLink href="/aray/partners/apply" label="Стать партнером" icon={Handshake} />
              <ActionLink href="/admin/aray" label="Открыть CRM" icon={LayoutDashboard} />
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-card">
        <div className="aray-fluid-shell py-8">
          <div className="flex flex-col gap-5 border-t border-border/10 pt-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <ArayAMark size={42} variant="official" idPrefix="aray-production-footer" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-foreground">ARAY Production</p>
                <p className="mt-1 text-xs text-foreground/55">site system, PWA, CRM, marketing production</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <FooterLink href="/aray/marketing/apply" label="Заказать" />
              <FooterLink href="/aray/partners/apply" label="Партнерство" />
              <FooterLink href="/aray/partners/yuva-studio" label="Yuva Studio" />
              <FooterLink href="/admin/aray" label="CRM" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-border/12 bg-card/[0.045] px-4 py-2 text-sm font-semibold text-foreground/72 transition hover:border-cyan-300/30 hover:text-foreground"
    >
      {label}
    </Link>
  );
}

function ActionLink({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-card px-5 py-3 text-sm font-black text-foreground  shadow-rose-950/30 transition hover:bg-card"
          : "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border/14 bg-card/[0.045] px-5 py-3 text-sm font-black text-foreground transition hover:border-cyan-300/35 hover:bg-card/[0.075]"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="aray-glass-card rounded-[var(--aray-radius-lg)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function HeroTile({ icon: Icon, label, text }: { icon: LucideIcon; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-background/24 px-4 py-3">
      <Icon className="h-5 w-5 text-cyan-200" />
      <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-foreground/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{text}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-foreground">{eyebrow}</p>
      <h2 className="aray-fluid-section-title mt-3 font-black text-foreground">{title}</h2>
      <p className="mt-4 text-base leading-7 text-foreground/62">{text}</p>
    </div>
  );
}

function SolutionCard({ solution }: { solution: Solution }) {
  const Icon = solution.icon;
  return (
    <Link
      href={solution.href}
      className="aray-glass-card group rounded-[var(--aray-radius-lg)] p-[var(--aray-card-pad)] transition hover:border-cyan-300/35 hover:bg-card/[0.07]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon className="h-6 w-6" />
        </div>
        <span className="rounded-full border border-border/12 bg-background/28 px-3 py-1 text-xs font-bold text-foreground/58">
          {solution.badge}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-black text-foreground">{solution.title}</h3>
      <p className="mt-3 text-sm leading-6 text-foreground/62">{solution.text}</p>
      <div className="mt-5 flex items-center gap-2 text-sm font-black text-cyan-200">
        открыть
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/10 bg-background/24 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">{label}</p>
      <p className="mt-1 text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-border/12 bg-card/[0.045] px-4 py-2 text-sm font-bold text-foreground/70 transition hover:border-cyan-300/35 hover:text-foreground"
    >
      {label}
    </Link>
  );
}
