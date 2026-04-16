"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PHONE_DISPLAY } from "@/lib/phone-constants";
import {
  Mail,
  Send,
  Settings,
  Users,
  CheckCircle,
  Loader2,
  AlertCircle,
  TestTube2,
  ChevronDown,
  ChevronUp,
  Upload,
  Sparkles,
  Tag,
  Package,
  Sun,
  Clock,
  Heart,
  Newspaper,
  Search,
  X,
  ShoppingBag,
  Globe,
  Handshake,
  FileText,
  LayoutGrid,
  ScanLine,
  Monitor,
  Smartphone,
  FlaskConical,
} from "lucide-react";

// ── Email Templates ──────────────────────────────────────────────
const makeBase = (header: { title: string; sub?: string }, headerBg: string, body: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:Arial,sans-serif;background:#f5f5f5}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
.header{background:${headerBg};padding:32px 40px;text-align:center}
.header h1{color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px}
.header p{color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px}
.body{padding:32px 40px}
.body p{color:#444;line-height:1.7;margin:0 0 16px}
.btn{display:inline-block;background:${headerBg};color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0 24px}
.footer{background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center}
.footer p{color:#999;font-size:12px;margin:0}
@media(max-width:600px){.body,.header,.footer{padding-left:20px;padding-right:20px}.header h1{font-size:20px}}
</style></head>
<body><div style="padding:20px 0">
<div class="wrap">
<div class="header"><h1>${header.title}</h1>${header.sub ? `<p>${header.sub}</p>` : ''}</div>
<div class="body">${body}</div>
<div class="footer"><p>ПилоРус — Пиломатериалы в Химках · <a href="https://pilo-rus.ru" style="color:#e8700a">pilo-rus.ru</a> · ${PHONE_DISPLAY}</p></div>
</div></div></body></html>`;

const EMAIL_TEMPLATES: { key: string; icon: React.ElementType; label: string; desc: string; subject: string; html: () => string }[] = [
  {
    key: "promo",
    icon: Tag,
    label: "Акция",
    desc: "Скидка или специальное предложение",
    subject: "Специальное предложение от ПилоРус 🎁",
    html: () => makeBase(
      { title: "Специальное предложение", sub: "Только для наших клиентов" },
      "linear-gradient(135deg,#e8700a,#f59e0b)",
      `<p>Добрый день!</p>
<p>Хотим сообщить вам о нашем специальном предложении. В этом месяце мы подготовили для вас выгодные условия на пиломатериалы высшего качества.</p>
<p><b>🔥 Скидка 10% на доску обрезную</b> при заказе от 3 м³</p>
<p><b>🚚 Бесплатная доставка</b> при заказе от 10 м³ по Москве и МО</p>
<a href="https://pilo-rus.ru/catalog" class="btn">Смотреть каталог</a>
<p>Предложение действует до конца месяца. Свяжитесь с нашим менеджером для расчёта стоимости.</p>`
    ),
  },
  {
    key: "new_product",
    icon: Package,
    label: "Новинки",
    desc: "Анонс новых товаров в каталоге",
    subject: "Новые поступления в ПилоРус 📦",
    html: () => makeBase(
      { title: "Новые поступления", sub: "Свежая партия прямо с производства" },
      "linear-gradient(135deg,#059669,#10b981)",
      `<p>Добрый день!</p>
<p>Рады сообщить о новых поступлениях на склад. Мы регулярно обновляем ассортимент и следим за качеством каждой партии.</p>
<p><b>В наличии:</b></p>
<ul style="color:#444;line-height:2;padding-left:20px">
<li>Доска обрезная 50×150 — сосна, 1-2 сорт</li>
<li>Брус 100×100 — лиственница, камерная сушка</li>
<li>Вагонка штиль — ольха, класс A</li>
</ul>
<a href="https://pilo-rus.ru/catalog" class="btn">Посмотреть каталог</a>
<p>Наш склад работает Пн-Сб 09:00–20:00, Вс 09:00–18:00</p>`
    ),
  },
  {
    key: "seasonal",
    icon: Sun,
    label: "Сезонное",
    desc: "Сезонное предложение (весна/лето)",
    subject: "Строительный сезон открыт! Подготовьтесь заранее 🌿",
    html: () => makeBase(
      { title: "Строительный сезон открыт!", sub: "Лучшее время для закупки материалов" },
      "linear-gradient(135deg,#0ea5e9,#38bdf8)",
      `<p>Добрый день!</p>
<p>Строительный сезон набирает обороты. Самое время позаботиться о запасе качественных пиломатериалов для вашего проекта.</p>
<p>Мы рекомендуем заказывать заранее — спрос растёт, а склад ограничен. Успейте зафиксировать цены!</p>
<p><b>Почему ПилоРус?</b></p>
<ul style="color:#444;line-height:2;padding-left:20px">
<li>Собственный склад в Химках — всегда в наличии</li>
<li>Доставка по Москве и МО — от 1 дня</li>
<li>Официальные документы — счёт, УПД, договор</li>
</ul>
<a href="https://pilo-rus.ru/catalog" class="btn">Рассчитать заказ</a>`
    ),
  },
  {
    key: "reminder",
    icon: Clock,
    label: "Напоминание",
    desc: "Клиент не заказывал давно",
    subject: "Скучаем по вам! Пора пополнить запасы 😊",
    html: () => makeBase(
      { title: "Давно не виделись!", sub: "Готовы помочь с вашим следующим проектом" },
      "linear-gradient(135deg,#7c3aed,#a78bfa)",
      `<p>Добрый день!</p>
<p>Заметили, что вы давно не заглядывали в наш каталог. Надеемся, что ваши проекты идут успешно!</p>
<p>Если вы планируете новое строительство или ремонт — мы здесь и готовы помочь с подбором материалов и расчётом стоимости.</p>
<p><b>Актуальные цены и ассортимент — на сайте:</b></p>
<a href="https://pilo-rus.ru/catalog" class="btn">Посмотреть каталог</a>
<p>Звоните: <b>${PHONE_DISPLAY}</b> — менеджер ответит и поможет подобрать нужное.</p>`
    ),
  },
  {
    key: "thanks",
    icon: Heart,
    label: "Спасибо",
    desc: "Благодарность за заказ/сотрудничество",
    subject: "Спасибо, что выбрали ПилоРус! ❤️",
    html: () => makeBase(
      { title: "Спасибо за доверие!", sub: "Ваш отзыв очень важен для нас" },
      "linear-gradient(135deg,#dc2626,#f87171)",
      `<p>Добрый день!</p>
<p>Благодарим вас за сотрудничество с ПилоРус! Надеемся, что наши пиломатериалы полностью оправдали ваши ожидания.</p>
<p>Если у вас есть пара минут — нам очень важно ваше мнение. Оставьте отзыв о нашей работе:</p>
<a href="https://pilo-rus.ru" class="btn">Оставить отзыв</a>
<p>Ваш отзыв поможет другим покупателям сделать правильный выбор. Спасибо!</p>
<p>Будем рады видеть вас снова 🌲</p>`
    ),
  },
  {
    key: "news",
    icon: Newspaper,
    label: "Новости",
    desc: "Новости компании / важные изменения",
    subject: "Новости ПилоРус",
    html: () => makeBase(
      { title: "Новости компании", sub: "Апрель 2026" },
      "linear-gradient(135deg,#374151,#6b7280)",
      `<p>Добрый день!</p>
<p>Делимся важными новостями и обновлениями от ПилоРус.</p>
<p><b>📢 Расширяем ассортимент</b></p>
<p>В этом месяце добавили новые позиции в каталог...</p>
<p><b>🕐 Изменение режима работы</b></p>
<p>С мая работаем без выходных...</p>
<a href="https://pilo-rus.ru" class="btn">Подробнее на сайте</a>`
    ),
  },
  {
    key: "partnership",
    icon: Handshake,
    label: "Партнёрство",
    desc: "B2B приглашение к сотрудничеству",
    subject: "Предложение о сотрудничестве — ПилоРус (поставщик пиломатериалов)",
    html: () => makeBase(
      { title: "Предложение о сотрудничестве", sub: "Оптовые поставки пиломатериалов" },
      `linear-gradient(135deg, hsl(var(--brand-sidebar)), hsl(var(--primary)))`,
      `<p>Добрый день!</p>
<p>Меня зовут Арман, я представляю компанию <b>ПилоРус</b> — прямого поставщика пиломатериалов из Химок (МО).</p>
<p>Мы работаем с оптовыми покупателями, строительными компаниями и подрядчиками. Предлагаем:</p>
<ul style="color:#444;line-height:2;padding-left:20px">
<li><b>Доска обрезная, брус, вагонка, блок-хаус</b> — от производителя</li>
<li>Цены на 15–25% ниже розницы при объёмах от 3 м³</li>
<li>Доставка по Москве и МО за 1–3 дня</li>
<li>Официальные документы: счёт, УПД, договор поставки</li>
<li>Персональный менеджер и гибкие условия оплаты</li>
</ul>
<p>Если вам интересно сотрудничество — я готов выслать актуальный прайс-лист и ответить на вопросы.</p>
<a href="https://pilo-rus.ru/catalog" class="btn">Посмотреть каталог и цены</a>
<p style="color:#666;font-size:13px">Если вы не заинтересованы — просто проигнорируйте это письмо. Повторно писать не буду.</p>
<p><b>Арман Казарович</b><br>ПилоРус — пиломатериалы от производителя<br>📞 ${PHONE_DISPLAY} | 📧 info@pilo-rus.ru</p>`
    ),
  },
  {
    key: "pricelist",
    icon: FileText,
    label: "Прайс-лист",
    desc: "Актуальные цены на основные позиции",
    subject: "Актуальный прайс-лист ПилоРус — пиломатериалы от производителя",
    html: () => makeBase(
      { title: "Актуальный прайс-лист", sub: "Апрель 2026 · Химки, МО" },
      "linear-gradient(135deg,#065f46,#059669)",
      `<p>Добрый день!</p>
<p>Высылаем актуальные цены на основные позиции нашего склада:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
  <thead>
    <tr style="background:#f0fdf4">
      <th style="padding:10px 12px;text-align:left;font-size:13px;color:#065f46;border-bottom:2px solid #bbf7d0">Наименование</th>
      <th style="padding:10px 12px;text-align:right;font-size:13px;color:#065f46;border-bottom:2px solid #bbf7d0">Цена м³</th>
      <th style="padding:10px 12px;text-align:center;font-size:13px;color:#065f46;border-bottom:2px solid #bbf7d0">Наличие</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #f0fdf4">Доска обрезная 25×150 (сосна, 1-2 сорт)</td><td style="padding:9px 12px;font-size:13px;text-align:right;font-weight:700;color:#059669">от 18 000 ₽</td><td style="padding:9px 12px;text-align:center;font-size:12px">✅</td></tr>
    <tr style="background:#fafafa"><td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #f0fdf4">Доска обрезная 50×150 (сосна)</td><td style="padding:9px 12px;font-size:13px;text-align:right;font-weight:700;color:#059669">от 16 000 ₽</td><td style="padding:9px 12px;text-align:center;font-size:12px">✅</td></tr>
    <tr><td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #f0fdf4">Брус 100×100 (сосна)</td><td style="padding:9px 12px;font-size:13px;text-align:right;font-weight:700;color:#059669">от 20 000 ₽</td><td style="padding:9px 12px;text-align:center;font-size:12px">✅</td></tr>
    <tr style="background:#fafafa"><td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #f0fdf4">Вагонка штиль (ольха, класс A)</td><td style="padding:9px 12px;font-size:13px;text-align:right;font-weight:700;color:#059669">от 35 000 ₽</td><td style="padding:9px 12px;text-align:center;font-size:12px">✅</td></tr>
    <tr><td style="padding:9px 12px;font-size:13px">Блок-хаус (сосна, 36×136)</td><td style="padding:9px 12px;font-size:13px;text-align:right;font-weight:700;color:#059669">от 28 000 ₽</td><td style="padding:9px 12px;text-align:center;font-size:12px">✅</td></tr>
  </tbody>
</table>
<p style="font-size:12px;color:#666">* Цены указаны за 1 м³ с НДС. Окончательная цена зависит от объёма и условий доставки.</p>
<a href="https://pilo-rus.ru/catalog" class="btn">Полный каталог с ценами</a>
<p>Для расчёта стоимости вашего заказа — позвоните или напишите:<br><b>📞 ${PHONE_DISPLAY}</b> | 📧 info@pilo-rus.ru</p>`
    ),
  },
  {
    key: "categories",
    icon: LayoutGrid,
    label: "Категории",
    desc: "Обзор всех категорий товаров",
    subject: "Весь ассортимент ПилоРус — доска, брус, вагонка и не только",
    html: () => makeBase(
      { title: "Наш ассортимент", sub: "Пиломатериалы на любой проект" },
      "linear-gradient(135deg,#7c2d12,#ea580c)",
      `<p>Добрый день!</p>
<p>Рады напомнить о полном ассортименте нашего склада. Мы предлагаем всё для строительства и отделки:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
  ${[
    ["🌲 Доска обрезная", "Конструкционный материал для каркасов, перекрытий, заборов", "https://pilo-rus.ru/catalog?category=doska-obreznaya"],
    ["🏗️ Брус", "Строительный и профилированный брус для домов и бань", "https://pilo-rus.ru/catalog?category=brus"],
    ["🏠 Вагонка", "Отделочная вагонка из хвои и лиственных пород", "https://pilo-rus.ru/catalog?category=vagonka"],
    ["🪵 Блок-хаус", "Имитация бревна для фасадов и интерьеров", "https://pilo-rus.ru/catalog?category=blok-haus"],
    ["📐 Планкен", "Фасадная доска для современного облика", "https://pilo-rus.ru/catalog?category=planken"],
  ].map(([name, desc, link]) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;vertical-align:top">
      <p style="margin:0;font-size:15px;font-weight:700;color:#111">${name}</p>
      <p style="margin:4px 0 8px;font-size:13px;color:#666">${desc}</p>
      <a href="${link}" style="font-size:13px;color:#e8700a;font-weight:600;text-decoration:none">Смотреть →</a>
    </td>
  </tr>`).join("")}
</table>
<a href="https://pilo-rus.ru/catalog" class="btn">Весь каталог с ценами</a>
<p>Склад в Химках работает <b>Пн–Вс 09:00–20:00</b>. Доставка по Москве и МО.</p>`
    ),
  },
];

type Subscriber = {
  email: string;
  name: string;
  source: string;
  date: string;
};

type SmtpConfig = {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  smtp_from_name: string;
};

type Tab = "send" | "smtp" | "subscribers";
type Segment = "all" | "registered" | "order";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "send", label: "Рассылка", icon: Send },
  { key: "smtp", label: "SMTP настройки", icon: Settings },
  { key: "subscribers", label: "Подписчики", icon: Users },
];

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "registered", label: "Зарегистрированные" },
  { key: "order", label: "Покупатели" },
];

const fmt = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("send");

  // Subscribers state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsLoaded, setSubsLoaded] = useState(false);

  // Send tab state
  const [segment, setSegment] = useState<Segment>("all");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; errors: string[] } | null>(null);
  const [sendError, setSendError] = useState("");

  // SMTP tab state
  const [smtp, setSmtp] = useState<SmtpConfig>({
    smtp_host: "",
    smtp_port: "587",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    smtp_from_name: "ПилоРус",
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);

  // Preview state
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  // Test email state
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Import state
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Scanner state
  const [scanUrl, setScanUrl] = useState("");
  const [scanDeep, setScanDeep] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ emails: string[]; pages: number } | null>(null);
  const [scanError, setScanError] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [addingScanned, setAddingScanned] = useState(false);
  const [scanAdded, setScanAdded] = useState("");

  // Product insert
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productList, setProductList] = useState<{ id: string; name: string; slug: string; variants: { pricePerCube: number | null; pricePerPiece: number | null }[] }[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Load subscribers
  const loadSubscribers = async () => {
    setSubsLoading(true);
    try {
      const res = await fetch("/api/admin/email");
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
        setSubsLoaded(true);
      }
    } finally {
      setSubsLoading(false);
    }
  };

  // Load SMTP settings
  const loadSmtp = async () => {
    setSmtpLoading(true);
    try {
      const res = await fetch("/api/admin/email?action=smtp_settings");
      const data = await res.json();
      setSmtp((prev) => ({ ...prev, ...data }));
      setSmtpLoaded(true);
    } finally {
      setSmtpLoading(false);
    }
  };

  useEffect(() => {
    if (!subsLoaded) loadSubscribers();
  }, []);

  useEffect(() => {
    if (tab === "smtp" && !smtpLoaded) loadSmtp();
  }, [tab]);

  // Load products for inserting into email
  const loadProducts = async () => {
    if (productList.length > 0) return;
    const res = await fetch("/api/admin/products").catch(() => null);
    if (res?.ok) { const d = await res.json(); setProductList(Array.isArray(d) ? d : []); }
  };

  const insertProduct = (p: typeof productList[0]) => {
    const price = p.variants[0]?.pricePerCube ?? p.variants[0]?.pricePerPiece ?? 0;
    const priceStr = price > 0 ? `от ${price.toLocaleString("ru-RU")} ₽` : "Цена по запросу";
    const block = `\n<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <tr>
    <td style="padding:14px 16px;background:#fafafa">
      <p style="margin:0;font-size:15px;font-weight:700;color:#111">${p.name}</p>
      <p style="margin:4px 0 10px;font-size:13px;color:#666">Пиломатериалы ПилоРус</p>
      <p style="margin:0 0 12px;font-size:18px;font-weight:800;color:#e8700a">${priceStr}</p>
      <a href="https://pilo-rus.ru/product/${p.slug}" style="display:inline-block;background:#e8700a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600">Смотреть товар →</a>
    </td>
  </tr>
</table>\n`;
    setHtml((prev) => prev + block);
    setShowProductPicker(false);
    setProductSearch("");
  };

  // Send test email
  const handleTestSend = async () => {
    if (!testEmail.trim() || !html.trim()) return;
    setTestSending(true);
    setTestSent(false);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          subject: `[ТЕСТ] ${subject || "Тест рассылки"}`,
          html: html + `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#aaa">⚡ Тестовое письмо — отправлено из ПилоРус Admin</div>`,
          recipients: [testEmail.trim()],
        }),
      });
      const data = await res.json();
      if (data.sent > 0) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 4000);
      }
    } finally {
      setTestSending(false);
    }
  };

  // Filtered recipients
  const filteredSubscribers =
    segment === "all"
      ? subscribers
      : subscribers.filter((s) => s.source === segment);

  const recipients = filteredSubscribers.map((s) => s.email);

  // Send handler
  const handleSend = async () => {
    setSendError("");
    setSendResult(null);
    if (!subject.trim()) { setSendError("Укажите тему письма"); return; }
    if (!html.trim()) { setSendError("Напишите текст письма"); return; }
    if (recipients.length === 0) { setSendError("Нет получателей в выбранном сегменте"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", subject, html, recipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка отправки");
      setSendResult(data);
      setSubject("");
      setHtml("");
      setShowPreview(false);
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  // Save SMTP
  const handleSaveSmtp = async () => {
    setSmtpSaving(true);
    setSmtpSaved(false);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_smtp", ...smtp }),
      });
      const data = await res.json();
      if (data.ok) setSmtpSaved(true);
      setTimeout(() => setSmtpSaved(false), 3000);
    } finally {
      setSmtpSaving(false);
    }
  };

  // Test SMTP
  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_smtp" }),
      });
      const data = await res.json();
      setSmtpTestResult(data);
    } finally {
      setSmtpTesting(false);
    }
  };

  // Website scanner
  const handleScan = async () => {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setScanResult(null);
    setScanError("");
    setScanAdded("");
    setSelectedEmails(new Set());
    try {
      const res = await fetch("/api/admin/email/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl.trim(), depth: scanDeep ? 1 : 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сканирования");
      setScanResult(data);
      setSelectedEmails(new Set(data.emails));
    } catch (e: any) {
      setScanError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleAddScanned = async () => {
    if (selectedEmails.size === 0) return;
    setAddingScanned(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_emails", emails: [...selectedEmails] }),
      });
      const data = await res.json();
      if (data.ok) {
        setScanAdded(`Добавлено: ${data.count}`);
        setSelectedEmails(new Set());
        setScanResult(null);
        setScanUrl("");
        await loadSubscribers();
      }
    } finally {
      setAddingScanned(false);
    }
  };

  // Import emails
  const handleImport = async () => {
    const emails = importText
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (!emails.length) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_emails", emails }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult(`Добавлено адресов: ${data.count}`);
        setImportText("");
        await loadSubscribers();
      }
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">Email рассылка</h1>
          <p className="text-sm text-muted-foreground">
            Рассылка по клиентам, SMTP настройки и база подписчиков
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === "subscribers" && subscribers.length > 0 && (
              <span className="ml-0.5 text-xs text-primary">({subscribers.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Рассылка ── */}
      {tab === "send" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-base">Новая рассылка</h2>

          {/* Segment filter */}
          <div>
            <Label className="mb-2 block">Получатели</Label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => {
                const count =
                  s.key === "all"
                    ? subscribers.length
                    : subscribers.filter((sub) => sub.source === s.key).length;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSegment(s.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      segment === s.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {s.label}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        segment === s.key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {subsLoading && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка подписчиков...
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <Label className="mb-1 block">Тема письма *</Label>
            <Input
              placeholder="Например: Акция на обрезную доску — скидка 15%!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* Templates picker */}
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-2"
            >
              <Sparkles className="w-4 h-4" />
              Шаблоны писем
              {showTemplates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showTemplates && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {EMAIL_TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setSubject(t.subject);
                        setHtml(t.html());
                        setShowTemplates(false);
                      }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-primary/[0.08] text-left transition-all active:scale-[0.98]"
                    >
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product insert */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowProductPicker((v) => !v); if (!showProductPicker) loadProducts(); }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Вставить товар или категорию в письмо
              {showProductPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showProductPicker && (
              <div className="mb-3 border border-border rounded-xl overflow-hidden bg-card shadow-lg">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Поиск товара..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                    autoFocus
                  />
                  <button onClick={() => { setShowProductPicker(false); setProductSearch(""); }}
                    className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {productList.length === 0 && (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Загрузка...
                    </div>
                  )}
                  {productList
                    .filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                    .slice(0, 20)
                    .map((p) => {
                      const price = p.variants[0]?.pricePerCube ?? p.variants[0]?.pricePerPiece ?? 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => insertProduct(p)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/[0.05] transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm font-medium">{p.name}</span>
                          </div>
                          {price > 0 && (
                            <span className="text-xs text-primary font-semibold shrink-0 ml-3">
                              от {price.toLocaleString("ru-RU")} ₽
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
                <div className="px-4 py-2 bg-muted/30 border-t border-border text-[10px] text-muted-foreground">
                  Выберите товар — HTML-карточка вставится в конец письма
                </div>
              </div>
            )}
          </div>

          {/* HTML Body */}
          <div>
            <Label className="mb-1 block">Текст письма (HTML) *</Label>
            <textarea
              className="w-full min-h-[200px] rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors resize-y font-mono"
              placeholder="<p>Добрый день!</p><p>Хотим сообщить вам о нашей новой акции...</p>"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              disabled={sending}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Поддерживается HTML-форматирование: теги &lt;p&gt;, &lt;b&gt;, &lt;a&gt;, &lt;ul&gt; и др.
            </p>
          </div>

          {/* Preview toggle */}
          {html && (
            <div>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showPreview ? "Скрыть предпросмотр" : "Показать предпросмотр"}
              </button>
              {showPreview && (
                <div className="mt-2 border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 text-xs text-muted-foreground border-b border-border flex items-center justify-between gap-2">
                    <span>Тема: <span className="font-medium text-foreground">{subject || "(без темы)"}</span></span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewMode("desktop")}
                        className={`p-1 rounded-lg transition-colors ${previewMode === "desktop" ? "bg-primary/15 text-primary" : "hover:bg-primary/[0.08] text-muted-foreground"}`}
                        title="Десктоп"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPreviewMode("mobile")}
                        className={`p-1 rounded-lg transition-colors ${previewMode === "mobile" ? "bg-primary/15 text-primary" : "hover:bg-primary/[0.08] text-muted-foreground"}`}
                        title="Мобильный"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-100 py-4 flex justify-center">
                    <iframe
                      srcDoc={html}
                      sandbox="allow-same-origin"
                      className="bg-white rounded shadow-sm transition-all duration-300"
                      style={{ width: previewMode === "mobile" ? "375px" : "600px", minHeight: "300px", border: "none" }}
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        try { iframe.style.height = iframe.contentDocument?.body.scrollHeight + "px"; } catch {}
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test send */}
          {html && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="email"
                placeholder="Тест на email..."
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <button
                onClick={handleTestSend}
                disabled={testSending || !testEmail.trim()}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  testSent
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                }`}
              >
                {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                {testSent ? "Отправлено ✓" : "Тест"}
              </button>
            </div>
          )}

          {/* Error / Result */}
          {sendError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {sendError}
            </div>
          )}
          {sendResult && (
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-1">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" />
                Рассылка завершена: отправлено {sendResult.sent} писем
              </div>
              {sendResult.errors.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-destructive">Ошибки ({sendResult.errors.length}):</p>
                  {sendResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                  {sendResult.errors.length > 5 && (
                    <p>... и ещё {sendResult.errors.length - 5}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || recipients.length === 0}
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Отправить {recipients.length} получателям
              </>
            )}
          </Button>
        </div>
      )}

      {/* ── Tab: SMTP настройки ── */}
      {tab === "smtp" && (
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Для Яндекс Почты:</strong> smtp.yandex.ru, порт 587, включите доступ по паролю приложения в настройках почты.
            </p>
            <p>Пароль приложения генерируется в разделе «Безопасность» аккаунта Яндекс — используйте его вместо обычного пароля.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold">Параметры SMTP</h2>

            {smtpLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка настроек...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">SMTP сервер</Label>
                  <Input
                    placeholder="smtp.yandex.ru"
                    value={smtp.smtp_host}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Порт</Label>
                  <Input
                    placeholder="587"
                    value={smtp.smtp_port}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Логин (email)</Label>
                  <Input
                    placeholder="email@yandex.ru"
                    value={smtp.smtp_user}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Пароль приложения</Label>
                  <Input
                    type="password"
                    placeholder="Пароль приложения"
                    value={smtp.smtp_pass}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_pass: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Email отправителя</Label>
                  <Input
                    placeholder="email@yandex.ru"
                    value={smtp.smtp_from}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_from: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Обычно совпадает с логином</p>
                </div>
                <div>
                  <Label className="mb-1 block">Имя отправителя</Label>
                  <Input
                    placeholder="ПилоРус"
                    value={smtp.smtp_from_name}
                    onChange={(e) => setSmtp((s) => ({ ...s, smtp_from_name: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Test result */}
            {smtpTestResult && (
              <div
                className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
                  smtpTestResult.ok
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}
              >
                {smtpTestResult.ok ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {smtpTestResult.message || smtpTestResult.error}
              </div>
            )}

            {smtpSaved && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="w-4 h-4" /> Настройки сохранены
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={handleSaveSmtp} disabled={smtpSaving || smtpLoading}>
                {smtpSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Сохранение...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" /> Сохранить
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestSmtp}
                disabled={smtpTesting || smtpLoading}
              >
                {smtpTesting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Проверка...</>
                ) : (
                  <>
                    <TestTube2 className="w-4 h-4 mr-2" /> Проверить подключение
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Подписчики ── */}
      {tab === "subscribers" && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Всего: </span>
                <span className="font-bold text-primary">{subscribers.length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Зарег.: </span>
                <span className="font-bold">{subscribers.filter((s) => s.source === "registered").length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm">
                <span className="text-muted-foreground">Покупатели: </span>
                <span className="font-bold">{subscribers.filter((s) => s.source === "order").length}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubscribers} disabled={subsLoading}>
              {subsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Обновить"}
            </Button>
          </div>

          {/* Subscribers table */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {subsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Email</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Имя</th>
                      <th className="text-center px-4 py-3 font-semibold">Источник</th>
                      <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">Дата</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscribers.map((s) => (
                      <tr key={s.email} className="hover:bg-primary/[0.04] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{s.email}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {s.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s.source === "registered" ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary dark:bg-primary/15 rounded-full text-xs font-medium">
                              Зарегистрирован
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 rounded-full text-xs font-medium">
                              Покупатель
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">
                          {fmt(s.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscribers.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Нет подписчиков</p>
                )}
              </div>
            )}
          </div>

          {/* Import */}
          {/* Website scanner */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              Сканировать сайт — найти emails
            </h3>
            <p className="text-xs text-muted-foreground">
              Введите URL сайта конкурента или партнёра — система найдёт все email-адреса автоматически
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.ru или example.ru"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="flex-1"
              />
              <Button onClick={handleScan} disabled={scanning || !scanUrl.trim()} className="shrink-0">
                {scanning ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Сканирую...</> : <><Globe className="w-4 h-4 mr-1.5" />Сканировать</>}
              </Button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scanDeep}
                onChange={(e) => setScanDeep(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">Глубокое сканирование (до 6 страниц)</span>
            </label>
            {scanError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" /> {scanError}
              </div>
            )}
            {scanResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Найдено {scanResult.emails.length} email{scanResult.emails.length !== 1 ? "ов" : ""} на {scanResult.pages} стр.
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setSelectedEmails(new Set(scanResult.emails))} className="text-primary hover:underline">Выбрать все</button>
                    <span className="text-muted-foreground">·</span>
                    <button onClick={() => setSelectedEmails(new Set())} className="text-muted-foreground hover:underline">Снять</button>
                  </div>
                </div>
                {scanResult.emails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Emails не найдены на этом сайте</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {scanResult.emails.map((email) => (
                      <label key={email} className="flex items-center gap-3 px-3 py-2 hover:bg-primary/[0.06] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email)}
                          onChange={(e) => {
                            const next = new Set(selectedEmails);
                            if (e.target.checked) next.add(email); else next.delete(email);
                            setSelectedEmails(next);
                          }}
                        />
                        <span className="text-sm font-mono">{email}</span>
                      </label>
                    ))}
                  </div>
                )}
                {scanResult.emails.length > 0 && (
                  <Button
                    onClick={handleAddScanned}
                    disabled={addingScanned || selectedEmails.size === 0}
                    className="w-full"
                  >
                    {addingScanned
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Добавляю...</>
                      : <><Upload className="w-4 h-4 mr-2" />Добавить выбранные ({selectedEmails.size})</>
                    }
                  </Button>
                )}
              </div>
            )}
            {scanAdded && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {scanAdded}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              ⚠️ Используйте для B2B аутрича — персональные приглашения к сотрудничеству. Массовая рассылка без согласия нарушает ФЗ-38.
            </p>
          </div>

          {/* Register clients */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Загрузить клиентов и создать аккаунты</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Система создаст личный кабинет каждому клиенту и отправит письмо с паролем
                </p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Формат списка:</p>
              <p><span className="font-mono bg-muted px-1 rounded">email@mail.ru</span> — только email</p>
              <p><span className="font-mono bg-muted px-1 rounded">email@mail.ru, Иван Петров</span> — email + имя</p>
              <p>Каждый клиент — отдельная строка. Дубликаты пропускаются.</p>
            </div>

            <textarea
              className="w-full h-36 rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-colors resize-none font-mono"
              placeholder={"ivan@mail.ru, Иван Петров\ndima@yandex.ru\nstroy@gmail.com, Стройком МО"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {importText.trim()
                  ? `${importText.trim().split("\n").filter((l) => l.includes("@")).length} адресов`
                  : "Введите список"}
              </span>
            </div>

            {importResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 shrink-0" /> {importResult}
              </div>
            )}

            <Button
              onClick={async () => {
                const lines = importText.trim().split("\n").filter((l) => l.includes("@"));
                if (!lines.length) return;
                setImportLoading(true);
                setImportResult(null);
                try {
                  const res = await fetch("/api/admin/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "register_clients", lines }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setImportResult(
                      `✅ Создано аккаунтов: ${data.created} · Уже были: ${data.existing} · Писем отправлено: ${data.emailsSent}${data.errors?.length ? ` · Ошибок: ${data.errors.length}` : ""}`
                    );
                    setImportText("");
                    await loadSubscribers();
                  } else {
                    setImportResult(`❌ ${data.error}`);
                  }
                } finally {
                  setImportLoading(false);
                }
              }}
              disabled={importLoading || !importText.trim()}
              className="w-full"
            >
              {importLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Создаю аккаунты и отправляю пароли...</>
              ) : (
                <><Users className="w-4 h-4 mr-2" /> Создать аккаунты и отправить пароли</>
              )}
            </Button>

            <p className="text-[11px] text-muted-foreground/60">
              Клиенты получат письмо «Ваш личный кабинет на pilo-rus.ru» с логином и паролем.
              Пароль генерируется автоматически в формате «Слово99Слово».
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
