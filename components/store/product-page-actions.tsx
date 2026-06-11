"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  PackageCheck,
  Send,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { trackArayMetrikaGoal } from "@/lib/aray-metrika-goals";

type ArayPromptPayload = {
  text: string;
  displayText?: string;
  context?: string;
};

type ProductShareButtonProps = {
  title: string;
  url: string;
  className?: string;
};

type ProductSmartSummaryProps = {
  sku: string;
  category: string;
  tags: string[];
};

type ProductArayButtonProps = {
  productName: string;
  productSku: string;
  productUrl: string;
  category: string;
  className?: string;
};

type ProductSellerPanelProps = {
  productName: string;
  productSlug: string;
  productSku: string;
  productUrl: string;
  category: string;
  phoneDisplay: string;
  phoneLink: string;
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
};

const REQUEST_MODES = [
  { id: "question", label: "Вопрос", helper: "лид и задача" },
  { id: "offer", label: "Предложение", helper: "условия" },
  { id: "review", label: "Отзыв", helper: "на модерацию" },
  { id: "comment", label: "Комментарий", helper: "контекст" },
] as const;

const CHANNELS = [
  { id: "aray", label: "ARAY", helper: "единая история" },
  { id: "telegram", label: "Telegram", helper: "если подключен" },
  { id: "whatsapp", label: "WhatsApp", helper: "быстрый чат" },
  { id: "email", label: "Почта", helper: "заявка/рассылка" },
  { id: "phone", label: "Звонок", helper: "сразу голосом" },
  { id: "zangi", label: "Zangi", helper: "видео/связь" },
] as const;

type RequestMode = (typeof REQUEST_MODES)[number]["id"];

function absoluteProductUrl(url: string) {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

function dispatchArayPrompt(payload: ArayPromptPayload) {
  const arayWindow = window as Window & { __arayPendingPrompt?: ArayPromptPayload };
  arayWindow.__arayPendingPrompt = payload;
  window.dispatchEvent(new CustomEvent("aray:prompt", { detail: payload }));
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

export function ProductShareButton({ title, url, className }: ProductShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const href = absoluteProductUrl(url);
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: href });
      } else {
        await writeClipboardText(href);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
      trackArayMetrikaGoal("product_share", { product: title, url: href });
      toast({ title: "Ссылка на товар готова", description: "Можно отправить клиенту или менеджеру." });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      toast({ title: "Не получилось поделиться", description: "Скопируйте ссылку из адресной строки.", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      data-product-share
      className={cn("store-action-button store-action-button-inline", className)}
    >
      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Скопировано" : "Поделиться"}
    </button>
  );
}

export function ProductArayButton({
  productName,
  productSku,
  productUrl,
  category,
  className,
}: ProductArayButtonProps) {
  const askAray = () => {
    const context = [
      `Товар: ${productName}`,
      `Артикул: ${productSku}`,
      `Категория: ${category}`,
      `Ссылка: ${absoluteProductUrl(productUrl)}`,
    ].join("\n");

    dispatchArayPrompt({
      text: [
        "Открой единый ARAY-виджет и помоги клиенту по товару ПилоРус.",
        context,
        "Спроси коротко: нужен объем, размер, доставка или оформление заказа.",
      ].join("\n\n"),
      displayText: "Спросить Арая по товару",
      context,
    });
    trackArayMetrikaGoal("product_aray_open", { product: productName, sku: productSku });
  };

  return (
    <button
      type="button"
      onClick={askAray}
      data-product-aray-action
      className={cn("store-action-button store-action-button-inline", className)}
    >
      <Bot className="h-4 w-4" />
      Спросить Арая
    </button>
  );
}

export function ProductSmartSummary({ sku, category, tags }: ProductSmartSummaryProps) {
  return (
    <div data-product-smart-summary className="store-product-smart-summary mt-3 rounded-xl border px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="store-product-smart-id">
          <Tag className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Артикул</span>
          <span data-product-sku className="max-w-full truncate text-[12.5px] font-bold text-foreground">{sku}</span>
        </span>
        <span className="store-product-smart-chip store-product-smart-chip-muted">
          <PackageCheck className="h-3.5 w-3.5 text-primary" />
          {category}
        </span>
        {tags.map((tag) => (
          <span key={tag} className="store-product-smart-chip">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProductSellerPanel({
  productName,
  productSlug,
  productSku,
  productUrl,
  category,
  phoneDisplay,
  phoneLink,
  whatsappUrl,
  telegramUrl,
}: ProductSellerPanelProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<RequestMode>("question");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const modeLabel = useMemo(
    () => REQUEST_MODES.find((item) => item.id === mode)?.label || "Вопрос",
    [mode],
  );

  const arayContext = [
    `Товар: ${productName}`,
    `Артикул: ${productSku}`,
    `Категория: ${category}`,
    `Ссылка: ${absoluteProductUrl(productUrl)}`,
  ].join("\n");

  const askAray = (customMessage?: string) => {
    const text = [
      "Помоги клиенту по товару ПилоРус.",
      arayContext,
      customMessage ? `Сообщение клиента: ${customMessage}` : "Подскажи следующий лучший шаг: уточнить объем, размер, доставку или оформить заявку.",
    ].join("\n\n");

    dispatchArayPrompt({
      text,
      displayText: "Вопрос по товару",
      context: arayContext,
    });
    trackArayMetrikaGoal("product_aray_open", { product: productName, sku: productSku });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanMessage = message.trim();
    const cleanContact = contact.trim();

    if (!cleanMessage && !cleanContact) {
      toast({ title: "Напишите вопрос или контакт", description: "Так менеджер быстрее поймёт, что нужно клиенту." });
      return;
    }
    if (!legalConsent) {
      toast({ title: "Нужно согласие", description: "Подтвердите обработку персональных данных перед отправкой." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "PRODUCT",
          name: cleanContact || "Посетитель сайта",
          contact: cleanContact,
          message: [`Тип: ${modeLabel}`, cleanMessage].filter(Boolean).join("\n"),
          productTitle: productName,
          productSlug,
          productSku,
          legalConsent,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Не получилось сохранить заявку");
      }

      trackArayMetrikaGoal("product_request_sent", { product: productName, sku: productSku, mode });
      toast({ title: "Заявка по товару сохранена", description: "Она попадёт менеджеру и в CRM." });
      askAray(cleanMessage || cleanContact);
      setMessage("");
      setLegalConsent(false);
    } catch (error) {
      toast({
        title: "Заявка не ушла",
        description: error instanceof Error ? error.message : "Попробуйте ещё раз или позвоните.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-product-seller-panel className="store-product-seller-panel rounded-2xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="store-icon-tile h-10 w-10 rounded-xl">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight">Вопрос по товару</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Напишите менеджеру. Арай привяжет вопрос к товару и CRM.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => askAray()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-2.5 text-xs font-bold text-primary transition hover:bg-primary/15"
        >
          <Bot className="h-3.5 w-3.5" />
          ARAY
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => askAray()}
          className="store-product-seller-tool"
        >
          <MessageSquare className="h-4 w-4" />
          Чат
        </button>
        <ProductShareButton title={productName} url={productUrl} className="store-product-seller-tool" />
        <a href={`tel:${phoneLink}`} className="store-product-seller-tool">
          <Link2 className="h-4 w-4" />
          {phoneDisplay}
        </a>
      </div>

      <div className="mt-3 rounded-xl border border-border/70 bg-background/55 p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-foreground">Канал связи</p>
            <p className="truncate text-[10px] text-muted-foreground">Скажите Араю: кому, где найти и через что написать.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
            через ARAY
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {CHANNELS.map((channel) => {
            const href =
              channel.id === "telegram"
                ? telegramUrl
                : channel.id === "whatsapp"
                  ? whatsappUrl
                  : channel.id === "email"
                    ? `mailto:?subject=${encodeURIComponent(productName)}&body=${encodeURIComponent(`${productName}\n${absoluteProductUrl(productUrl)}`)}`
                    : channel.id === "phone"
                      ? `tel:${phoneLink}`
                      : null;
            const disabled = (channel.id === "telegram" && !telegramUrl) || (channel.id === "whatsapp" && !whatsappUrl);
            const content = (
              <>
                <span>{channel.label}</span>
                <small>{disabled ? "подключить" : channel.helper}</small>
              </>
            );

            if (href && !disabled) {
              return (
                <a
                  key={channel.id}
                  href={href}
                  data-product-channel={channel.id}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="store-product-channel"
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={channel.id}
                type="button"
                data-product-channel={channel.id}
                onClick={() => askAray(`${channel.label}: подготовь общение по этому товару и сохрани контекст в CRM.`)}
                className={cn("store-product-channel", disabled && "is-disabled")}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {REQUEST_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={cn("store-product-request-mode", mode === item.id && "is-active")}
            >
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="store-product-request-field min-h-[92px]"
          data-product-request-message
          placeholder="Напишите вопрос, нужный объём, размер или короткий комментарий..."
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className="store-product-request-field sm:flex-1"
            data-product-request-contact
            placeholder="Имя, телефон или email"
          />
          <button
            type="submit"
            disabled={submitting}
            data-product-request-submit
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Отправить
          </button>
        </div>
        <label className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
          <input
            type="checkbox"
            checked={legalConsent}
            onChange={(event) => setLegalConsent(event.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-border text-primary"
          />
          <span>
            Я соглашаюсь на обработку персональных данных и принимаю{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              политику конфиденциальности
            </Link>
          </span>
        </label>
        <p className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Заявка сохраняется как входящий лид: дальше её можно вести через почту, рассылку, мессенджер, звонок или видео.
        </p>
      </form>
    </section>
  );
}
