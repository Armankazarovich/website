"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Send, CheckCircle, AlertCircle, Loader2, Search,
  Bell, Globe, Palette, Shield, Database, Download,
  BarChart2, CreditCard, Users, Zap, Mail, MessageSquare,
  ChevronRight, ExternalLink, Settings2, Phone, MapPin,
  Clock, Package, Tag, Star, FileText, Truck, Wrench,
  ToggleLeft, Key, Monitor, RefreshCw, Image, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SettingSection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  tags: string[];
  status?: "ok" | "warn" | "error" | null;
  statusLabel?: string;
  actions?: { label: string; onClick: () => void }[];
  external?: boolean;
};

export default function AdminSettingsPage() {
  const [search, setSearch] = useState("");
  const [testingTg, setTestingTg] = useState(false);
  const [tgStatus, setTgStatus] = useState<"ok" | "error" | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<"ok" | "error" | null>(null);

  const testTelegram = async () => {
    setTestingTg(true);
    setTgStatus(null);
    try {
      const res = await fetch("/api/admin/test-telegram", { method: "POST" });
      const data = await res.json();
      setTgStatus(data.ok ? "ok" : "error");
    } catch { setTgStatus("error"); }
    finally { setTestingTg(false); }
  };

  const testSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatus(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_smtp" }),
      });
      const data = await res.json();
      setSmtpStatus(data.success ? "ok" : "error");
    } catch { setSmtpStatus("error"); }
    finally { setTestingSmtp(false); }
  };

  const sections: SettingSection[] = [
    // ── САЙТ ──
    {
      id: "contacts",
      icon: <Phone className="w-5 h-5" />,
      title: "Контакты и адрес",
      description: "Телефон, email, адрес склада, часы работы, соцсети",
      href: "/admin/site",
      tags: ["контакты", "телефон", "адрес", "часы", "вк", "whatsapp", "telegram"],
    },
    {
      id: "company",
      icon: <FileText className="w-5 h-5" />,
      title: "Компания и реквизиты",
      description: "Название, ИНН, КПП, ОГРН, юридический адрес",
      href: "/admin/site",
      tags: ["компания", "инн", "кпп", "огрн", "юридический", "реквизиты"],
    },
    {
      id: "seo",
      icon: <Globe className="w-5 h-5" />,
      title: "SEO и метатеги",
      description: "Title, Description, ключевые слова, robots.txt, Sitemap",
      href: "/admin/site",
      tags: ["seo", "title", "description", "мета", "sitemap", "keywords"],
    },
    {
      id: "appearance",
      icon: <Palette className="w-5 h-5" />,
      title: "Оформление сайта",
      description: "Цветовая тема, стиль карточек, соотношение фото, Арай",
      href: "/admin/appearance",
      tags: ["тема", "цвет", "оформление", "карточки", "фото", "арай", "палитра"],
    },
    {
      id: "watermark",
      icon: <Image className="w-5 h-5" />,
      title: "Водяной знак",
      description: "Логотип поверх фотографий товаров",
      href: "/admin/watermark",
      tags: ["водяной знак", "логотип", "фото", "защита"],
    },
    // ── УВЕДОМЛЕНИЯ ──
    {
      id: "telegram",
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Telegram уведомления",
      description: "Новые заказы и смена статусов — в Telegram группу",
      href: "/admin/notifications",
      tags: ["telegram", "уведомления", "заказы", "бот"],
      status: tgStatus,
      statusLabel: tgStatus === "ok" ? "Работает" : tgStatus === "error" ? "Ошибка" : undefined,
      actions: [{
        label: testingTg ? "Проверяю..." : "Тест Telegram",
        onClick: testTelegram,
      }],
    },
    {
      id: "smtp",
      icon: <Mail className="w-5 h-5" />,
      title: "Email / SMTP",
      description: "Настройки почтового сервера для отправки писем клиентам",
      href: "/admin/email",
      tags: ["smtp", "email", "почта", "письма", "уведомления"],
      status: smtpStatus,
      statusLabel: smtpStatus === "ok" ? "Работает" : smtpStatus === "error" ? "Ошибка" : undefined,
      actions: [{
        label: testingSmtp ? "Проверяю..." : "Тест Email",
        onClick: testSmtp,
      }],
    },
    {
      id: "push",
      icon: <Bell className="w-5 h-5" />,
      title: "Push уведомления",
      description: "Web Push подписки сотрудников и клиентов (VAPID)",
      href: "/admin/notifications",
      tags: ["push", "уведомления", "vapid", "браузер"],
    },
    // ── КАТАЛОГ И СКЛАД ──
    {
      id: "catalog",
      icon: <Package className="w-5 h-5" />,
      title: "Каталог товаров",
      description: "Добавление, редактирование товаров, категории",
      href: "/admin/products",
      tags: ["товары", "каталог", "добавить", "редактировать", "цены"],
    },
    {
      id: "inventory",
      icon: <Database className="w-5 h-5" />,
      title: "Склад / Остатки",
      description: "Управление остатками, пороги уведомлений",
      href: "/admin/inventory",
      tags: ["склад", "остатки", "количество", "наличие"],
    },
    {
      id: "import",
      icon: <Download className="w-5 h-5" />,
      title: "Импорт / Экспорт",
      description: "Загрузка и выгрузка товаров из Excel/CSV, Google Sheets",
      href: "/admin/import",
      tags: ["импорт", "экспорт", "excel", "csv", "google sheets", "xlsx"],
    },
    {
      id: "delivery",
      icon: <Truck className="w-5 h-5" />,
      title: "Доставка и тарифы",
      description: "Зоны доставки, стоимость по объёму, тарифы транспорта",
      href: "/admin/delivery",
      tags: ["доставка", "тарифы", "газель", "зоны", "стоимость"],
    },
    // ── МАРКЕТИНГ ──
    {
      id: "promos",
      icon: <Tag className="w-5 h-5" />,
      title: "Акции и промокоды",
      description: "Создание акций, промокоды со скидкой, бонусная система",
      href: "/admin/promotions",
      tags: ["акции", "промокоды", "скидки", "бонус", "купон"],
    },
    {
      id: "reviews",
      icon: <Star className="w-5 h-5" />,
      title: "Отзывы",
      description: "Модерация, публикация, импорт с Google/Яндекс/VK/2GIS",
      href: "/admin/reviews",
      tags: ["отзывы", "google", "яндекс", "vk", "2gis", "модерация"],
    },
    {
      id: "newsletter",
      icon: <Mail className="w-5 h-5" />,
      title: "Email рассылка",
      description: "Рассылка по клиентам, шаблоны, авторассылки",
      href: "/admin/email",
      tags: ["рассылка", "письма", "подписчики", "шаблоны", "авто"],
    },
    // ── АНАЛИТИКА ──
    {
      id: "analytics",
      icon: <BarChart2 className="w-5 h-5" />,
      title: "Аналитика",
      description: "Яндекс Метрика, Google Analytics, счётчики посещений",
      href: "/admin/analytics",
      tags: ["аналитика", "метрика", "яндекс", "google", "счётчик", "посещения"],
    },
    {
      id: "advertising",
      icon: <Monitor className="w-5 h-5" />,
      title: "Продвижение и реклама",
      description: "Яндекс Директ, Google Ads, Avito, Яндекс Маркет, 2GIS",
      href: "/admin/advertising",
      tags: ["реклама", "директ", "google ads", "avito", "яндекс маркет", "продвижение"],
    },
    // ── КОМАНДА ──
    {
      id: "staff",
      icon: <Users className="w-5 h-5" />,
      title: "Команда",
      description: "Сотрудники, роли, одобрение заявок, доступы",
      href: "/admin/staff",
      tags: ["команда", "сотрудники", "роли", "доступ", "менеджеры"],
    },
    // ── ФИНАНСЫ ──
    {
      id: "finance",
      icon: <CreditCard className="w-5 h-5" />,
      title: "Финансы",
      description: "Расходы, зарплаты, закупки, P&L отчёт",
      href: "/admin/finance",
      tags: ["финансы", "расходы", "зарплата", "закупки", "прибыль", "отчёт"],
    },
    // ── БЕЗОПАСНОСТЬ ──
    {
      id: "health",
      icon: <Shield className="w-5 h-5" />,
      title: "Здоровье системы",
      description: "10 автопроверок: БД, SMTP, Telegram, фото, цены, SEO",
      href: "/admin/health",
      tags: ["здоровье", "проверка", "ошибки", "система", "мониторинг"],
    },
  ];

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q))
    );
  }, [search, tgStatus, smtpStatus]);

  const groups = [
    { label: "Сайт и оформление", ids: ["contacts", "company", "seo", "appearance", "watermark"] },
    { label: "Уведомления", ids: ["telegram", "smtp", "push"] },
    { label: "Каталог и склад", ids: ["catalog", "inventory", "import", "delivery"] },
    { label: "Маркетинг", ids: ["promos", "reviews", "newsletter"] },
    { label: "Аналитика и реклама", ids: ["analytics", "advertising"] },
    { label: "Команда и финансы", ids: ["staff", "finance"] },
    { label: "Система", ids: ["health"] },
  ];

  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            Настройки
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Все настройки платформы в одном месте</p>
        </div>
        <Link href="/admin/health">
          <Button variant="outline" size="sm" className="gap-2">
            <Shield className="w-4 h-4" />
            Здоровье системы
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Найти настройку... (SMTP, реклама, отзывы, склад...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results */}
      {isSearching ? (
        <div>
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length === 0
              ? "Ничего не найдено"
              : `Найдено ${filtered.length} разделов`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((s) => <SettingCard key={s.id} section={s} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const items = sections.filter((s) => group.ids.includes(s.id));
            return (
              <div key={group.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {group.label}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((s) => <SettingCard key={s.id} section={s} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingCard({ section: s }: { section: SettingSection }) {
  const isExternal = s.external;

  const card = (
    <div
      className={`group flex items-start gap-4 p-4 rounded-2xl border bg-card hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer ${
        s.status === "ok"
          ? "border-emerald-500/30"
          : s.status === "error"
          ? "border-red-500/30"
          : "border-border"
      }`}
    >
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        s.status === "ok" ? "bg-emerald-500/10 text-emerald-500"
        : s.status === "error" ? "bg-red-500/10 text-red-500"
        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
      }`}>
        {s.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold group-hover:text-primary transition-colors">{s.title}</p>
          {s.status && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              s.status === "ok"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-600 dark:text-red-400"
            }`}>
              {s.statusLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>

        {s.actions && s.actions.length > 0 && (
          <div className="flex gap-2 mt-2" onClick={(e) => e.preventDefault()}>
            {s.actions.map((a) => (
              <button
                key={a.label}
                onClick={(e) => { e.stopPropagation(); a.onClick(); }}
                className="text-[11px] px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </div>
  );

  if (isExternal) {
    return <a href={s.href} target="_blank" rel="noopener noreferrer">{card}</a>;
  }

  return <Link href={s.href}>{card}</Link>;
}
