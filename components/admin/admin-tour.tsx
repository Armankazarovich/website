"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  X, ChevronRight, ChevronLeft, LayoutDashboard, ShoppingBag,
  Target, Package, Warehouse, Users, Globe, Bell, HelpCircle,
  Sparkles, CheckCircle2, ArrowRight, Star, Zap, Trophy,
  BarChart2, Settings, Megaphone, BookOpen,
} from "lucide-react";

const LS_KEY = "aray-tour-completed-v1";
const LS_SEEN = "aray-tour-seen-v1";

/* ─── Tour Steps ──────────────────────────────────────────────── */
const STEPS = [
  {
    id: "welcome",
    icon: Sparkles,
    color: "from-orange-500 to-amber-400",
    bg: "bg-gradient-to-br from-orange-500/10 to-amber-400/10",
    title: "Добро пожаловать в ARAY Admin",
    subtitle: "Пройдите быстрый тур — 2 минуты и вы профи",
    desc: "Система управляет вашим магазином, командой и клиентами. Мы покажем каждый раздел с конкретными советами.",
    tips: [
      "Весь тур займёт около 2 минут",
      "Можно вернуться к обучению в любой момент через раздел «Помощь»",
      "Каждый раздел — отдельная инструкция",
    ],
    link: null,
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    color: "from-blue-500 to-cyan-400",
    bg: "bg-gradient-to-br from-blue-500/10 to-cyan-400/10",
    title: "Дашборд",
    subtitle: "Ваш пульт управления",
    desc: "Здесь всё самое важное: выручка за сегодня, новые заказы, активные клиенты. Открывайте каждое утро — за 30 секунд поймёте состояние бизнеса.",
    tips: [
      "Красная карточка = нужно внимание (новые заказы без обработки)",
      "График продаж — сравниваете текущий месяц с прошлым",
      "«Быстрый доступ» — частые действия в 1 клик",
    ],
    link: { href: "/admin", label: "Открыть Дашборд" },
  },
  {
    id: "orders",
    icon: ShoppingBag,
    color: "from-green-500 to-emerald-400",
    bg: "bg-gradient-to-br from-green-500/10 to-emerald-400/10",
    title: "Заказы",
    subtitle: "Центр обработки заказов",
    desc: "Здесь все заказы от клиентов. Нажмите на любой заказ — откроется попап с деталями. Меняйте статус прямо там: Новый → Подтверждён → В пути → Доставлен.",
    tips: [
      "Фильтр по статусу — быстро найти заказы в работе",
      "Кнопка телефона — позвонить клиенту прямо из заказа",
      "Telegram уведомление приходит менеджеру при каждом новом заказе",
    ],
    link: { href: "/admin/orders", label: "Открыть Заказы" },
  },
  {
    id: "crm",
    icon: Target,
    color: "from-purple-500 to-violet-400",
    bg: "bg-gradient-to-br from-purple-500/10 to-violet-400/10",
    title: "CRM — Лиды",
    subtitle: "Воронка продаж",
    desc: "Отслеживайте потенциальных клиентов от первого контакта до покупки. Добавляйте заметки, ставьте задачи, не теряйте ни одной сделки.",
    tips: [
      "Карточка лида — полная история взаимодействий",
      "Переносите карточки между стадиями перетаскиванием",
      "Задача с дедлайном = вам придёт напоминание",
    ],
    link: { href: "/admin/crm", label: "Открыть CRM" },
  },
  {
    id: "catalog",
    icon: Package,
    color: "from-orange-500 to-red-400",
    bg: "bg-gradient-to-br from-orange-500/10 to-red-400/10",
    title: "Каталог товаров",
    subtitle: "Управление ассортиментом",
    desc: "Добавляйте, редактируйте, скрывайте товары. Каждый товар имеет варианты (размеры), фотографии, цены за м³ и за штуку.",
    tips: [
      "Переключатель «Активен» — мгновенно скрыть товар с сайта",
      "Drag & drop для сортировки порядка отображения",
      "Загружайте фото из медиабиблиотеки или по URL",
    ],
    link: { href: "/admin/products", label: "Открыть Каталог" },
  },
  {
    id: "inventory",
    icon: Warehouse,
    color: "from-cyan-500 to-teal-400",
    bg: "bg-gradient-to-br from-cyan-500/10 to-teal-400/10",
    title: "Склад / Остатки",
    subtitle: "Управление запасами",
    desc: "Следите за остатками по каждому варианту товара. Система предупреждает когда товар заканчивается. Каждое изменение логируется.",
    tips: [
      "Жёлтый индикатор — товар заканчивается (ниже порога)",
      "Красный — товар закончился, нужно пополнить",
      "Импорт из Excel — обновить цены и остатки сразу по всем",
    ],
    link: { href: "/admin/inventory", label: "Открыть Склад" },
  },
  {
    id: "clients",
    icon: Users,
    color: "from-pink-500 to-rose-400",
    bg: "bg-gradient-to-br from-pink-500/10 to-rose-400/10",
    title: "Клиенты",
    subtitle: "База покупателей",
    desc: "Полная история каждого клиента: все заказы, сумма покупок, последний визит. Звоните, пишите, отправляйте уведомления прямо из карточки.",
    tips: [
      "Поиск по имени, телефону, email — находит мгновенно",
      "Сортировка по «сумма заказов» — найти VIP клиентов",
      "Метка «давно не заказывал» — поводи для повторного контакта",
    ],
    link: { href: "/admin/clients", label: "Открыть Клиентов" },
  },
  {
    id: "staff",
    icon: Users,
    color: "from-indigo-500 to-blue-400",
    bg: "bg-gradient-to-br from-indigo-500/10 to-blue-400/10",
    title: "Команда",
    subtitle: "Управление сотрудниками",
    desc: "Добавляйте сотрудников, назначайте роли. Каждая роль видит только свои разделы: менеджер — заказы и CRM, кладовщик — склад, курьер — доставку.",
    tips: [
      "Новый сотрудник регистрируется через /join — получает одобрение здесь",
      "Кнопки «Одобрить / Отклонить» прямо в карточке",
      "SUPER_ADMIN видит всё и управляет остальными админами",
    ],
    link: { href: "/admin/staff", label: "Открыть Команду" },
  },
  {
    id: "site",
    icon: Globe,
    color: "from-teal-500 to-green-400",
    bg: "bg-gradient-to-br from-teal-500/10 to-green-400/10",
    title: "Настройки сайта",
    subtitle: "Всё про ваш магазин",
    desc: "Телефоны, адрес, режим работы, SEO, WhatsApp, Telegram — всё меняется без программиста. Изменил → сохранил → мгновенно на сайте.",
    tips: [
      "«Контакты» — телефоны которые видят клиенты",
      "«Продвижение» — включить/выключить WhatsApp кнопку, добавить Yandex.Metrica",
      "«SEO» — описание сайта для поисковиков",
    ],
    link: { href: "/admin/site", label: "Открыть Настройки" },
  },
  {
    id: "notifications",
    icon: Bell,
    color: "from-yellow-500 to-orange-400",
    bg: "bg-gradient-to-br from-yellow-500/10 to-orange-400/10",
    title: "Уведомления",
    subtitle: "Telegram, Push, Email",
    desc: "Настройте Telegram бот для моментальных уведомлений о заказах. Push-уведомления — рассылка прямо в браузер подписчикам. Email-рассылка для маркетинга.",
    tips: [
      "Telegram webhook — нажмите «Настроить» один раз → кнопки в боте заработают",
      "Push-диагностика покажет число подписчиков и статус VAPID ключей",
      "Отправьте тестовое уведомление перед первой рассылкой",
    ],
    link: { href: "/admin/notifications", label: "Открыть Уведомления" },
  },
  {
    id: "finish",
    icon: Trophy,
    color: "from-amber-500 to-yellow-400",
    bg: "bg-gradient-to-br from-amber-500/10 to-yellow-400/10",
    title: "Вы готовы!",
    subtitle: "Теперь вы профи ARAY Admin",
    desc: "Вы прошли полный тур по системе. Если понадобится помощь — раздел «Помощь» всегда доступен в меню. Там детальные инструкции по каждому разделу.",
    tips: [
      "Раздел «Помощь» — пошаговые инструкции для всех ролей",
      "Горячие клавиши: Ctrl+K — быстрый поиск по системе",
      "Arай-ассистент в правом нижнем углу — спросите всё что угодно",
    ],
    link: { href: "/admin/help", label: "Открыть Помощь" },
  },
];

/* ─── Mini Step Dot ───────────────────────────────────────────── */
function StepDot({ active, done, idx }: { active: boolean; done: boolean; idx: number }) {
  return (
    <div
      className={`
        w-2 h-2 rounded-full transition-all duration-300
        ${active ? "w-5 bg-orange-500" : done ? "bg-orange-500/60" : "bg-white/20"}
      `}
    />
  );
}

/* ─── Main Tour Component ─────────────────────────────────────── */
export function AdminTour({ autoShow = true }: { autoShow?: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1=forward, -1=back
  const current = STEPS[step];
  const Icon = current.icon;
  const total = STEPS.length;

  // Auto-show on first visit
  useEffect(() => {
    if (!autoShow) return;
    const seen = localStorage.getItem(LS_SEEN);
    if (!seen) {
      setTimeout(() => {
        setOpen(true);
        localStorage.setItem(LS_SEEN, "1");
      }, 1200);
    }
  }, [autoShow]);

  const next = useCallback(() => {
    if (step < total - 1) {
      setDirection(1);
      setStep(s => s + 1);
    } else {
      localStorage.setItem(LS_KEY, "1");
      setOpen(false);
    }
  }, [step, total]);

  const prev = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  }, [step]);

  const close = () => {
    setOpen(false);
    localStorage.setItem(LS_KEY, "1");
  };

  // Expose open method for external trigger
  useEffect(() => {
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener("aray-open-tour", handler);
    return () => window.removeEventListener("aray-open-tour", handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: "rgba(12,12,14,0.82)",
                backdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
                WebkitBackdropFilter: "blur(48px) saturate(220%) brightness(0.85)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header gradient strip */}
              <div className={`h-1 w-full bg-gradient-to-r ${current.color}`} />

              {/* Content */}
              <div className="p-6">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-6">
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5">
                    {STEPS.map((_, i) => (
                      <StepDot key={i} active={i === step} done={i < step} idx={i} />
                    ))}
                  </div>
                  {/* Step counter + close */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30 font-mono">
                      {step + 1} / {total}
                    </span>
                    <button
                      onClick={close}
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: direction * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -40 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-2xl ${current.bg} flex items-center justify-center mb-4 border border-white/10`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Title */}
                    <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-1">
                      {current.subtitle}
                    </p>
                    <h2 className="text-xl font-bold text-white mb-3 leading-tight">
                      {current.title}
                    </h2>
                    <p className="text-sm text-white/65 leading-relaxed mb-5">
                      {current.desc}
                    </p>

                    {/* Tips */}
                    <div className="space-y-2 mb-5">
                      {current.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-orange-400" />
                          </div>
                          <p className="text-[13px] text-white/55 leading-snug">{tip}</p>
                        </div>
                      ))}
                    </div>

                    {/* Link */}
                    {current.link && (
                      <Link
                        href={current.link.href}
                        onClick={close}
                        className="inline-flex items-center gap-1.5 text-[13px] text-orange-400 hover:text-orange-300 transition-colors mb-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        {current.link.label}
                      </Link>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/8">
                  <button
                    onClick={prev}
                    disabled={step === 0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all disabled:opacity-0 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Назад
                  </button>

                  <button
                    onClick={next}
                    className={`
                      flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                      ${step === total - 1
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:scale-[1.03]"
                        : "bg-white/10 hover:bg-white/15"
                      }
                    `}
                  >
                    {step === total - 1 ? (
                      <>
                        <Trophy className="w-4 h-4" />
                        Завершить
                      </>
                    ) : (
                      <>
                        Дальше
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Trigger Button (inline use) ────────────────────────────── */
export function TourTriggerButton({ className = "" }: { className?: string }) {
  const startTour = () => window.dispatchEvent(new Event("aray-open-tour"));
  return (
    <button
      onClick={startTour}
      className={`flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-orange-400 transition-colors ${className}`}
    >
      <Zap className="w-3.5 h-3.5" />
      Обучение
    </button>
  );
}
