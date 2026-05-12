import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  Monitor,
  Printer,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { AdminBack } from "@/components/admin/admin-back";

const ROLE_LESSONS = [
  {
    title: "Фрилансер / выездной сотрудник",
    icon: Smartphone,
    lessons: ["создать заказ с телефона", "показать QR или отправить ссылку", "создать инцидент, если оплата не прошла"],
  },
  {
    title: "Кассир / продавец",
    icon: ReceiptText,
    lessons: ["пробить заказ", "выбрать оплату и чек", "проверить смену и статус оплаты"],
  },
  {
    title: "Менеджер / администратор",
    icon: UserRound,
    lessons: ["повторить заказ клиента", "поправить профиль сферы", "передать проблему Араю"],
  },
  {
    title: "Владелец",
    icon: Monitor,
    lessons: ["смотреть оплаты и расхождения", "контролировать инциденты", "понимать, что ещё не сертифицировано"],
  },
];

const QUICK_START = [
  ["1. Выбрать профиль", "Терминалы → профиль сферы: ресторан, розница, услуги, стройка или универсальный."],
  ["2. Открыть терминал", "Добавить позиции, выбрать сценарий получения, оплату и режим чека."],
  ["3. Создать заказ", "Заказ попадает в заказы и CRM, клиент подтягивается по телефону, повтор работает из истории."],
  ["4. Проверить обмен", "Терминалы → синхронизации: коннекторы, индекс, QR-уведомления и очередь событий."],
  ["5. При проблеме", "Арай ведёт диагностику. Если не решил, создаёт инцидент с контекстом."],
];

const SELF_SETUP = [
  ["Профиль", "Выберите сферу и проверьте, что поля терминала стали понятны вашей команде."],
  ["Рабочая точка", "Создайте мобильную точку, кассу, кухню, склад или объект."],
  ["Смена", "Откройте смену, внесите стартовые наличные и сделайте тестовый заказ."],
  ["Синхронизация", "Подготовьте коннекторы, пересоберите индекс, проверьте QR и уведомления."],
  ["Устройства", "Проверьте сканер, тест печати и статус устройства. USB-принтеру нужен коннектор."],
  ["Поддержка", "Если сотрудник не понял шаг, Арай ведёт по диагностике или создаёт инцидент."],
];

const MODULE_RULES = [
  ["Чистая касса", "Терминал показывает только включённые модули. Нет принтера — нет кнопки принтера."],
  ["Автонастройка", "После создания сайта товары, доставка, самовывоз, реквизиты и профиль сферы собирают кассу автоматически."],
  ["Честные статусы", "Непроверенные внешние функции получают метку бета, провайдер или коннектор."],
  ["Арай-мастер", "Арай может спросить недостающие данные и применить настройки после подтверждения администратора."],
];

const SALES_SCRIPTS = [
  ["Как работает", "Скрипты подтягиваются от профиля сферы и не пишутся вручную каждый раз: терминал сам подсказывает вопросы под текущий бизнес."],
  ["Пиломатериалы", "Материал и объём, цель покупки, доставка или самовывоз, оформление документов и способ оплаты."],
];

const TROUBLESHOOTING = [
  {
    title: "Не проходит оплата",
    icon: CreditCard,
    steps: ["проверить способ оплаты", "проверить sync jobs", "не обещать оплату без провайдера", "создать инцидент high"],
  },
  {
    title: "Не печатает чек",
    icon: Printer,
    steps: ["проверить режим чека", "проверить устройство и сеть", "для USB нужен коннектор", "создать инцидент с моделью принтера"],
  },
  {
    title: "Сканер не вводит код",
    icon: ScanLine,
    steps: ["поставить курсор в поиск", "проверить USB-HID Keyboard mode", "проверить раскладку", "создать инцидент с моделью"],
  },
  {
    title: "Клиент не найден",
    icon: AlertCircle,
    steps: ["ввести минимум 7 цифр", "проверить хвост телефона", "создать клиента через заказ", "проверить CRM после создания"],
  },
];

const ARAY_SCRIPTS = [
  ["Настрой профиль", "Арай, настрой терминал под ресторан: столы, доставка, с собой, кухня."],
  ["Проблема с оплатой", "Арай, QR не проходит, заказ 123, сотрудник с телефона."],
  ["Проблема с принтером", "Арай, касса не печатает чек, принтер Star, рабочее место касса 1."],
  ["Повтор заказа", "Арай, найди клиента по телефону и повтори последний заказ."],
  ["Проверка QR", "Арай, проверь уведомления QR, статусы оплаты и очередь синхронизации."],
];

export default function TerminalTrainingPage() {
  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <AdminBack />
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="font-display text-2xl font-bold">Обучение терминала</h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Короткие сценарии для сотрудников, фрилансеров и владельца: как работать, что проверять и когда звать Арая.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            <Smartphone className="h-4 w-4" />
            Терминал
          </Link>
          <Link
            href="/admin/terminals"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
          >
            <Monitor className="h-4 w-4" />
            Настройки
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Быстрый запуск</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {QUICK_START.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Самостоятельная настройка</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SELF_SETUP.map(([title, text], index) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Модули терминала</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MODULE_RULES.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Скрипты продаж</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {SALES_SCRIPTS.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Обучение по ролям</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_LESSONS.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.title} className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">{role.title}</p>
                <div className="mt-3 space-y-2">
                  {role.lessons.map((lesson) => (
                    <div key={lesson} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Что делать при проблеме</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {TROUBLESHOOTING.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {item.steps.map((step, index) => (
                    <div key={step} className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-[10px] font-semibold text-primary">{index + 1}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Команды для Арая</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {ARAY_SCRIPTS.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Что ещё не готово как настоящая интеграция</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["QR-оплата", "Нужен выбранный платёжный провайдер, webhooks и тестовый режим."],
            ["Тихая печать", "Нужен сетевой принтер с vendor SDK или локальный connector."],
            ["Фискализация", "Нужна законная касса/ОФД или провайдер с фискальным контуром."],
            ["Процессор очереди", "Нужен фоновый worker для повторов, dead-letter и автоматической доставки событий."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
