import { auth } from "@/lib/auth";
import {
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  PartyPopper,
  XCircle,
  Wrench,
  Bell,
  Mail,
  Users,
  ChevronRight,
} from "lucide-react";

const statuses = [
  {
    icon: Bell,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    label: "Новый",
    code: "NEW",
    desc: "Заказ только что поступил. Telegram уже отправил уведомление в группу. Нужно позвонить клиенту и подтвердить.",
  },
  {
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    label: "Подтверждён",
    code: "CONFIRMED",
    desc: "Менеджер созвонился с клиентом, детали уточнены. Клиент получает email-уведомление.",
  },
  {
    icon: Wrench,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    label: "В обработке",
    code: "PROCESSING",
    desc: "Заказ передан на склад. Материалы комплектуются для отгрузки.",
  },
  {
    icon: Package,
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    label: "Отгружен",
    code: "SHIPPED",
    desc: "Материалы отгружены со склада. Водитель готовится к выезду.",
  },
  {
    icon: Truck,
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    label: "Доставляется",
    code: "IN_DELIVERY",
    desc: "Водитель уже едет к клиенту. Клиент получает SMS и email — ждёт звонка водителя.",
  },
  {
    icon: MapPin,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    label: "Готов к выдаче",
    code: "READY_PICKUP",
    desc: "Заказ на складе, клиент может приехать за ним. Адрес: Химки, ул. Заводская 2А, стр.28",
  },
  {
    icon: PartyPopper,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    label: "Доставлен",
    code: "DELIVERED",
    desc: "Заказ выполнен. Клиент получил материалы. Считается как успешная сделка в дневном отчёте.",
  },
  {
    icon: XCircle,
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    label: "Отменён",
    code: "CANCELLED",
    desc: "Заказ отменён. Причину стоит уточнить у клиента и занести в комментарий.",
  },
];

const steps = [
  {
    num: "01",
    title: "Новый заказ поступает",
    desc: "В Telegram-группу «ПилоРус Заказы» приходит сообщение с полными деталями заказа: клиент, телефон, адрес, состав, сумма.",
  },
  {
    num: "02",
    title: "Нажмите нужный статус",
    desc: "Под каждым заказом в Telegram — кнопки со статусами. Нажмите нужную. Система автоматически обновит заказ в базе и отправит email клиенту.",
  },
  {
    num: "03",
    title: "Сообщение обновляется",
    desc: "Старое сообщение редактируется — статус меняется прямо в нём. Видно кто и в какое время изменил статус. История всегда перед глазами.",
  },
  {
    num: "04",
    title: "Клиент получает уведомление",
    desc: "На каждое изменение статуса клиент получает email с объяснением что происходит с его заказом. Ничего делать не нужно — всё автоматически.",
  },
];

const faq = [
  {
    q: "Можно менять статус и с телефона, и с компьютера?",
    a: "Да. Telegram работает на любом устройстве. Кнопки статусов работают везде одинаково.",
  },
  {
    q: "Что если нажал не тот статус случайно?",
    a: "Нажмите правильный статус — он перезапишет предыдущий. Всегда видно кто и когда менял статус, поэтому ошибку легко заметить.",
  },
  {
    q: "Клиент написал что не получил письмо — что делать?",
    a: "Попросите проверить папку «Спам». Письма приходят от info@pilo-rus.ru. Если всё равно нет — свяжитесь с менеджером.",
  },
  {
    q: "Почему иногда кнопки пропадают?",
    a: "Кнопки исчезают только когда заказ в финальном статусе — «Доставлен» или «Отменён». Это значит работа по заказу завершена.",
  },
  {
    q: "Можно изменить статус через сайт, а не Telegram?",
    a: "Да. В разделе «Заказы» в админке — нажмите на номер заказа, откроется детальная страница с выпадающим выбором статуса.",
  },
  {
    q: "Когда приходят утренние и вечерние сообщения?",
    a: "Утром в 09:00 МСК (пн–сб) — сводка активных заказов и совет дня. Вечером в 18:00 МСК (пн–сб) — итоги дня с выручкой и количеством заказов.",
  },
];

export default async function HelpPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "сотрудник";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          👋 Привет, <strong>{firstName}</strong>!
        </p>
        <h1 className="text-2xl font-bold mb-1">Помощь и инструкции</h1>
        <p className="text-muted-foreground">
          Как работает система управления заказами через Telegram и сайт
        </p>
      </div>

      {/* Telegram section */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Telegram-система заказов</h2>
            <p className="text-sm text-muted-foreground">Группа «ПилоРус Заказы» — ваш главный инструмент</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <span className="text-2xl font-bold text-primary/20 font-mono shrink-0 leading-tight">
                {step.num}
              </span>
              <div>
                <p className="font-semibold text-sm mb-1">{step.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Status guide */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Статусы заказов — что означает каждый</h2>
        <div className="space-y-3">
          {statuses.map((s, i) => (
            <div
              key={s.code}
              className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{s.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${s.badge}`}>
                    {s.code}
                  </span>
                  {i < statuses.length - 2 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Auto notifications */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Автоматические уведомления</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
              <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="font-semibold text-sm mb-1">Новый заказ</p>
            <p className="text-xs text-muted-foreground">Мгновенно в Telegram-группу с полными деталями и кнопками управления</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-semibold text-sm mb-1">Email клиенту</p>
            <p className="text-xs text-muted-foreground">Автоматически при каждом изменении статуса — клиент всегда в курсе</p>
          </div>
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="font-semibold text-sm mb-1">Отчёты команде</p>
            <p className="text-xs text-muted-foreground">09:00 МСК — утренняя сводка, 18:00 МСК — итоги дня с выручкой</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Часто задаваемые вопросы</h2>
        <div className="space-y-3">
          {faq.map((item) => (
            <div key={item.q} className="p-4 bg-card border border-border rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="font-medium text-sm">{item.q}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer tip */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-muted-foreground">
        💡 <strong>Совет:</strong> Добавьте бота <strong>@pilorus_orders_bot</strong> в избранные контакты Telegram — так уведомления о заказах всегда под рукой.
      </div>
    </div>
  );
}
