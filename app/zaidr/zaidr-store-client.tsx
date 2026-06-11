"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  formatZaidrPrice,
  ZAIDR_CATEGORIES,
  ZAIDR_PRODUCTS,
  ZAIDR_SITE,
  type ZaidrProduct,
} from "@/lib/zaidr-catalog";
import { requestArayPrompt } from "@/components/store/aray-events";

const PRODUCT_LIMIT = 42;

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function ProductVisual({ product }: { product: ZaidrProduct }) {
  const label = product.category.slice(0, 2).toUpperCase();
  const tone = product.category.length % 5;
  const palettes = [
    "from-orange-500 via-amber-400 to-zinc-900",
    "from-sky-500 via-cyan-300 to-slate-900",
    "from-emerald-500 via-lime-300 to-zinc-900",
    "from-rose-500 via-orange-300 to-slate-900",
    "from-violet-500 via-blue-300 to-zinc-900",
  ];

  return (
    <div className={`relative h-32 overflow-hidden rounded-xl bg-card ${palettes[tone]} p-4 text-foreground`}>
      <div className="absolute inset-0 bg-card" />
      <div className="relative flex h-full items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 inline-flex rounded-full bg-card/18 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
            {product.brand}
          </div>
          <div className="line-clamp-2 max-w-[12rem] text-sm font-semibold">
            {product.category}
          </div>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-border/35 bg-card/18 text-xl font-black shadow-2xl ">
          {label}
        </div>
      </div>
    </div>
  );
}

function buildSelectionText(items: ZaidrProduct[]) {
  if (!items.length) return "Пока без выбранных товаров.";
  return items
    .slice(0, 12)
    .map((item, index) => `${index + 1}. ${item.name}, арт. ${item.sku}, ${formatZaidrPrice(item.price)}`)
    .join("\n");
}

export function ZaidrStoreClient() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все");
  const [selected, setSelected] = useState<ZaidrProduct[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return ZAIDR_PRODUCTS.filter((product) => {
      const byCategory = category === "Все" || product.category === category;
      const byQuery = !needle || normalize([
        product.name,
        product.sku,
        product.category,
        product.group,
        product.brand,
      ].join(" ")).includes(needle);

      return byCategory && byQuery;
    });
  }, [category, query]);

  const shown = filtered.slice(0, PRODUCT_LIMIT);
  const total = selected.reduce((sum, item) => sum + item.price, 0);
  const selectedKeys = new Set(selected.map((item) => `${item.sku}:${item.name}`));

  function toggleProduct(product: ZaidrProduct) {
    const key = `${product.sku}:${product.name}`;
    setSelected((current) => (
      current.some((item) => `${item.sku}:${item.name}` === key)
        ? current.filter((item) => `${item.sku}:${item.name}` !== key)
        : [...current, product]
    ));
  }

  function askAray() {
    requestArayPrompt({
      text: "Арай, помоги клиенту Зейдр подобрать стройматериалы и оформить заявку.",
      displayText: "Подбери товары Зейдр и помоги оформить заявку",
      localReply: "Я рядом. Могу уточнить задачу, подсказать категорию, собрать список товаров и подготовить заявку менеджеру.",
      context: [
        `Сайт: ${ZAIDR_SITE.title}`,
        `Город: ${ZAIDR_SITE.city}`,
        `Выбранные товары:\n${buildSelectionText(selected)}`,
      ].join("\n"),
      actions: [
        { type: "navigate", label: "Каталог", url: "#catalog", icon: "search" },
        { type: "navigate", label: "Заявка", url: "#request", icon: "send" },
        { type: "call", label: ZAIDR_SITE.phoneDisplay, url: `tel:${ZAIDR_SITE.phoneHref}`, icon: "phone" },
      ],
    });
  }

  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSent(false);

    try {
      const response = await fetch("/api/zaidr/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Клиент Зейдр",
          phone: phone.trim(),
          message: message.trim(),
          items: selected.map((item) => ({
            sku: item.sku,
            name: item.name,
            category: item.category,
            price: item.price,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Заявка не отправилась");
      }

      setSent(true);
      requestArayPrompt({
        text: "Арай, заявка Зейдр сохранена. Подскажи менеджеру следующий шаг.",
        localReply: "Заявка сохранена в CRM. Следующий шаг: связаться с клиентом, подтвердить позиции и согласовать доставку.",
        context: buildSelectionText(selected),
      }, 120);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Заявка не отправилась");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="catalog" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4  sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию, артикулу или категории"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <button
            type="button"
            onClick={askAray}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-foreground transition hover:bg-slate-800"
          >
            <Bot className="h-4 w-4" />
            Спросить Арая
          </button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {["Все", ...ZAIDR_CATEGORIES.map((item) => item.name)].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                category === item
                  ? "border-orange-500 bg-orange-500 text-foreground  shadow-orange-500/25"
                  : "border-slate-200 bg-card text-slate-700 hover:border-orange-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>Показано {shown.length} из {filtered.length} товаров</span>
          <span>{ZAIDR_CATEGORIES.length} разделов из прайсов РИЧ</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((product) => {
            const key = `${product.sku}:${product.name}`;
            const active = selectedKeys.has(key);
            return (
              <article key={key} className="flex min-h-[25rem] flex-col rounded-xl border border-slate-200 bg-card p-3  transition hover:-translate-y-0.5 hover:shadow-xl">
                <ProductVisual product={product} />
                <div className="flex flex-1 flex-col p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Арт. {product.sku}</span>
                    {product.ral && product.ral !== "-" && <span>RAL {product.ral}</span>}
                  </div>
                  <h3 className="line-clamp-3 text-base font-bold text-slate-950">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{product.group}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span className="rounded-xl bg-slate-100 px-2 py-1">{product.weight || "вес уточняется"}</span>
                    <span className="rounded-xl bg-slate-100 px-2 py-1">{product.box ? `${product.box} шт/кор` : "короб уточняется"}</span>
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="mb-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-400">цена с НДС</p>
                        <p className="text-xl font-black text-slate-950">{formatZaidrPrice(product.price)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
                        active
                          ? "bg-slate-950 text-foreground hover:bg-slate-800"
                          : "bg-orange-500 text-foreground hover:bg-orange-600"
                      }`}
                    >
                      {active ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {active ? "Убрать" : "В заявку"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside id="request" className="lg:sticky lg:top-5 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-xl shadow-slate-950/10">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">заявка</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Собрать заказ</h2>
              <p className="mt-1 text-sm text-slate-500">Позиции попадут менеджеру в CRM, Арай подскажет следующий шаг.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-orange-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mb-5 rounded-xl bg-slate-950 p-4 text-foreground">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-300">Выбрано</span>
              <strong>{selected.length} поз.</strong>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-300">Ориентир</span>
              <strong>{formatZaidrPrice(total)}</strong>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="mb-5 max-h-48 space-y-2 overflow-y-auto pr-1">
              {selected.map((item) => (
                <div key={`${item.sku}:${item.name}`} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">арт. {item.sku} · {formatZaidrPrice(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct(item)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-card hover:text-slate-900"
                    title="Убрать из заявки"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submitLead} className="space-y-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ваше имя"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-orange-100"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7 ___ ___-__-__"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-orange-100"
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Что нужно: объем, доставка, объект, сроки"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-card focus:ring-4 focus:ring-orange-100"
            />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {sent && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Заявка сохранена в CRM. Менеджер видит список.
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black text-foreground transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {loading ? "Отправляем" : "Отправить заявку"}
            </button>
          </form>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={`tel:${ZAIDR_SITE.phoneHref}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 transition hover:border-orange-300 hover:text-orange-600"
            >
              <Phone className="h-4 w-4" />
              Позвонить
            </a>
            <button
              type="button"
              onClick={askAray}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              <Sparkles className="h-4 w-4" />
              Арай
            </button>
          </div>
        </div>

      </aside>
    </div>
  );
}
