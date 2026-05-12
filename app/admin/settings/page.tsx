"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Bell,
  Globe,
  Palette,
  Shield,
  Users,
  Zap,
  Mail,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Settings2,
  Phone,
  MapPin,
  Clock,
  Package,
  FileText,
  Truck,
  Wrench,
  ToggleLeft,
  Key,
  Monitor,
  RefreshCw,
  Image as ImageIcon,
  Hash,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearArayClientCaches } from "@/lib/pwa-cache";
import { ArayIcon } from "@/components/shared/aray-orb";

type SettingSection = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  tags: string[];
  status?: "ok" | "warn" | "error" | null;
  statusLabel?: string;
  actions?: { label: string; onClick: () => void; disabled?: boolean }[];
  external?: boolean;
};

export default function AdminSettingsPage() {
  const [search, setSearch] = useState("");
  const [testingTg, setTestingTg] = useState(false);
  const [tgStatus, setTgStatus] = useState<"ok" | "error" | null>(null);
  const [tgMessage, setTgMessage] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<"ok" | "error" | null>(null);
  const [smtpMessage, setSmtpMessage] = useState<string | null>(null);
  const [clearingPwaCache, setClearingPwaCache] = useState(false);
  const [pwaCacheStatus, setPwaCacheStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const testTelegram = async () => {
    setTestingTg(true);
    setTgStatus(null);
    setTgMessage(null);
    try {
      const res = await fetch("/api/admin/test-telegram", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.ok === true;
      setTgStatus(ok ? "ok" : "error");
      setTgMessage(
        ok
          ? data.message || "Telegram отвечает"
          : data.error || `Ошибка ${res.status}`,
      );
    } catch {
      setTgStatus("error");
      setTgMessage("Не удалось выполнить тест Telegram");
    } finally {
      setTestingTg(false);
    }
  };

  const testSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatus(null);
    setSmtpMessage(null);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_smtp" }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && (data.ok === true || data.success === true);
      setSmtpStatus(ok ? "ok" : "error");
      setSmtpMessage(
        ok
          ? data.message || "Почта подключена"
          : data.error || `Ошибка ${res.status}`,
      );
    } catch {
      setSmtpStatus("error");
      setSmtpMessage("Не удалось проверить почту");
    } finally {
      setTestingSmtp(false);
    }
  };

  const clearPwaCache = useCallback(async () => {
    if (clearingPwaCache) return;
    setClearingPwaCache(true);
    setPwaCacheStatus(null);
    try {
      const result = await clearArayClientCaches({
        includeAllOriginCaches: true,
      });
      setPwaCacheStatus({
        ok: true,
        message: `Очищено: ${result.deletedCaches.length} кэшей · SW: ${result.registrationsUpdated}`,
      });
    } catch {
      setPwaCacheStatus({
        ok: false,
        message: "Не удалось очистить кэш в этом браузере",
      });
    } finally {
      setClearingPwaCache(false);
    }
  }, [clearingPwaCache]);

  const openArayAppInstall = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("aray:pwa-install:open", {
        detail: { appId: "aray-workspace" },
      }),
    );
  }, []);

  const sections = useMemo<SettingSection[]>(
    () => [
      // ── САЙТ ──
      {
        id: "contacts",
        icon: <Phone className="w-5 h-5" />,
        title: "Контакты и адрес",
        description: "Телефон, почта, адрес склада, часы работы, соцсети",
        href: "/admin/site",
        tags: [
          "контакты",
          "телефон",
          "адрес",
          "часы",
          "вк",
          "whatsapp",
          "telegram",
        ],
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
        title: "Поиск и описание сайта",
        description: "Заголовок, описание, ключевые слова и карта сайта",
        href: "/admin/site",
        tags: ["seo", "title", "description", "мета", "sitemap", "keywords"],
      },
      {
        id: "appearance",
        icon: <Palette className="w-5 h-5" />,
        title: "Оформление сайта",
        description: "Цветовая тема, стиль карточек, сетка каталога и фото",
        href: "/admin/appearance",
        tags: [
          "тема",
          "цвет",
          "оформление",
          "карточки",
          "фото",
          "палитра",
        ],
      },
      {
        id: "aray-home",
        icon: <ArayIcon className="w-5 h-5" size={20} />,
        title: "ARAY",
        description: "Помощник, голос, агенты, лимиты и поведение",
        href: "/admin/aray",
        tags: [
          "aray",
          "арай",
          "ai",
          "чат",
          "голос",
          "помощник",
          "агенты",
          "лимиты",
          "расходы",
          "токены",
          "бюджет",
        ],
      },
      {
        id: "aray-connectors",
        icon: <Key className="w-5 h-5" />,
        title: "Подключения ARAY",
        description: "Ключи, голос, SEO, реклама, inbox, бухгалтерия и внешние сервисы",
        href: "/admin/aray/connectors",
        tags: [
          "aray",
          "ключи",
          "интеграции",
          "разрешения",
          "голос",
          "директ",
          "seo",
          "индексация",
          "бухгалтерия",
          "контур",
          "сбис",
          "google",
          "яндекс",
        ],
      },
      {
        id: "watermark",
        icon: <ImageIcon className="w-5 h-5" />,
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
        description:
          tgMessage || "Новые заказы и смена статусов — в Telegram группу",
        href: "/admin/notifications",
        tags: ["telegram", "уведомления", "заказы", "бот"],
        status: tgStatus,
        statusLabel:
          tgStatus === "ok"
            ? "Работает"
            : tgStatus === "error"
              ? "Ошибка"
              : undefined,
        actions: [
          {
            label: testingTg ? "Проверяю..." : "Тест Telegram",
            onClick: testTelegram,
            disabled: testingTg,
          },
        ],
      },
      {
        id: "smtp",
        icon: <Mail className="w-5 h-5" />,
        title: "Почта для писем",
        description:
          smtpMessage ||
          "Настройки почтового сервера для отправки писем клиентам",
        href: "/admin/email",
        tags: ["smtp", "email", "почта", "письма", "уведомления"],
        status: smtpStatus,
        statusLabel:
          smtpStatus === "ok"
            ? "Работает"
            : smtpStatus === "error"
              ? "Не прошёл"
              : undefined,
        actions: [
          {
            label: testingSmtp ? "Проверяю..." : "Проверить почту",
            onClick: testSmtp,
            disabled: testingSmtp,
          },
        ],
      },
      {
        id: "push",
        icon: <Bell className="w-5 h-5" />,
        title: "Уведомления в браузере",
        description: "Подписки сотрудников и клиентов на важные события",
        href: "/admin/notifications",
        tags: ["push", "уведомления", "vapid", "браузер"],
      },
      {
        id: "aray-app",
        icon: <Download className="w-5 h-5" />,
        title: "Приложение ARAY",
        description: "Установить отдельное окно ARAY для владельца, менеджера или клиента",
        href: "/admin/settings?install=1&app=aray-workspace",
        tags: [
          "приложение",
          "установить",
          "pwa",
          "aray",
          "арай",
          "менеджер",
          "клиент",
          "задачи",
          "финансы",
        ],
        actions: [
          {
            label: "Показать установку",
            onClick: openArayAppInstall,
          },
        ],
      },
      {
        id: "terminals",
        icon: <Monitor className="w-5 h-5" />,
        title: "Терминалы и устройства",
        description:
          "Рабочие места, онлайн-оплата, принтеры, сканеры, маршруты печати",
        href: "/admin/terminals",
        tags: [
          "терминал",
          "касса",
          "принтер",
          "сканер",
          "оплата",
          "кухня",
          "чек",
          "pos",
        ],
      },
      {
        id: "delivery",
        icon: <Truck className="w-5 h-5" />,
        title: "Доставка и тарифы",
        description: "Зоны доставки, стоимость по объёму, тарифы транспорта",
        href: "/admin/delivery",
        tags: ["доставка", "тарифы", "газель", "зоны", "стоимость"],
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
      // ── БЕЗОПАСНОСТЬ ──
      {
        id: "health",
        icon: <Shield className="w-5 h-5" />,
        title: "Здоровье системы",
        description:
          "Живые проверки: база данных, почта, Telegram, фото, цены, поиск и ARAY",
        href: "/admin/health",
        tags: ["здоровье", "проверка", "ошибки", "система", "мониторинг"],
      },
      {
        id: "pwa-cache",
        icon: <RefreshCw className="w-5 h-5" />,
        title: "Кэш и обновление интерфейса",
        description:
          pwaCacheStatus?.message ||
          "Очистка сохранённых данных интерфейса после обновления",
        href: "/admin/settings",
        tags: ["pwa", "кэш", "cache", "service worker", "обновить", "деплой"],
        status: pwaCacheStatus ? (pwaCacheStatus.ok ? "ok" : "error") : null,
        statusLabel: pwaCacheStatus
          ? pwaCacheStatus.ok
            ? "Очищено"
            : "Ошибка"
          : undefined,
        actions: [
          {
            label: clearingPwaCache ? "Очищаю..." : "Очистить PWA-кэш",
            onClick: clearPwaCache,
          },
        ],
      },
    ],
    [
      tgStatus,
      tgMessage,
      testingTg,
      smtpStatus,
      smtpMessage,
      testingSmtp,
      pwaCacheStatus,
      clearingPwaCache,
      clearPwaCache,
      openArayAppInstall,
    ],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q)),
    );
  }, [search, sections]);

  const groups = [
    {
      label: "Бизнес, сайт и оформление",
      ids: ["contacts", "company", "seo", "appearance", "watermark"],
    },
    {
      label: "ARAY",
      ids: ["aray-home", "aray-connectors"],
    },
    { label: "Коммуникации", ids: ["telegram", "smtp", "push"] },
    {
      label: "Продажи и рабочие места",
      ids: ["aray-app", "terminals", "delivery"],
    },
    {
      label: "Команда и доступ",
      ids: ["staff"],
    },
    {
      label: "Система",
      ids: ["health", "pwa-cache"],
    },
  ];

  const isSearching = search.trim().length > 0;

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            Настройки
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Бизнес, сайт, ARAY, коммуникации, рабочие места и система
          </p>
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
          placeholder="Найти настройку... (ARAY, почта, сайт, терминал, доставка, кэш...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
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
            {filtered.map((s) => (
              <SettingCard key={s.id} section={s} />
            ))}
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
                <div className={items.length === 1 ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
                  {items.map((s) => (
                    <SettingCard key={s.id} section={s} />
                  ))}
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
      className={`group flex items-start gap-4 p-4 rounded-2xl border bg-card hover:border-primary/30 hover:bg-primary/[0.04] transition-all cursor-pointer ${
        s.status === "ok"
          ? "border-emerald-500/30"
          : s.status === "error"
            ? "border-red-500/30"
            : "border-border"
      }`}
    >
      <div
        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          s.status === "ok"
            ? "bg-emerald-500/10 text-emerald-500"
            : s.status === "error"
              ? "bg-red-500/10 text-red-500"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors"
        }`}
      >
        {s.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
            {s.title}
          </p>
          {s.status && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                s.status === "ok"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}
            >
              {s.statusLabel}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 leading-5 line-clamp-2">
          {s.description}
        </p>

        {s.actions && s.actions.length > 0 && (
          <div className="flex gap-2 mt-2" onClick={(e) => e.preventDefault()}>
            {s.actions.map((a) => (
              <button
                key={a.label}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!a.disabled) a.onClick();
                }}
                disabled={a.disabled}
                className="text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
    return (
      <a href={s.href} target="_blank" rel="noopener noreferrer">
        {card}
      </a>
    );
  }

  return <Link href={s.href}>{card}</Link>;
}
