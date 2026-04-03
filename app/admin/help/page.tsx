"use client";

import { useState, useMemo } from "react";
import {
  BookOpen, Search, ChevronDown, ChevronUp, Star, Users,
  ShoppingCart, Package, Truck, Settings, BarChart3, Bell,
  MessageSquare, CreditCard, FileText, HelpCircle, Phone,
  Lightbulb, CheckCircle2, ArrowRight, ExternalLink, User,
  Shield, Briefcase, TrendingUp, Zap, Mail, Camera,
} from "lucide-react";
import Link from "next/link";

/* ─── Roles ─── */
const ROLES = [
  { key: "all",      label: "Все",           icon: Users,    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",   ring: "ring-slate-400" },
  { key: "client",   label: "Клиент",        icon: User,     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",    ring: "ring-blue-400" },
  { key: "manager",  label: "Менеджер",      icon: Phone,    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", ring: "ring-green-400" },
  { key: "admin",    label: "Администратор", icon: Shield,   color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", ring: "ring-orange-400" },
  { key: "director", label: "Директор",      icon: TrendingUp, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", ring: "ring-purple-400" },
];

/* ─── Articles ─── */
const ARTICLES = [
  // CLIENT
  {
    id: "c1", roles: ["client","all"], category: "Заказы", popular: true,
    icon: ShoppingCart, title: "Как оформить заказ на сайте",
    steps: [
      "Откройте каталог и выберите нужный товар",
      "Укажите размер и количество, нажмите «В корзину»",
      "Перейдите в корзину и нажмите «Оформить заказ»",
      "Заполните контактные данные и адрес доставки",
      "Выберите способ связи и подтвердите заказ",
      "На вашу почту придёт подтверждение с номером заказа",
    ],
    tip: "Сохраните номер заказа — он нужен для отслеживания. Менеджер свяжется с вами в течение 30 минут.",
    link: { href: "/catalog", label: "Открыть каталог" },
  },
  {
    id: "c2", roles: ["client","all"], category: "Заказы", popular: false,
    icon: Package, title: "Как отследить статус заказа",
    steps: [
      "Зайдите в Личный кабинет на сайте",
      "Откройте раздел «Мои заказы»",
      "Найдите нужный заказ по номеру или дате",
      "Статус обновляется автоматически — следите за изменениями",
      "При каждом изменении вам приходит email-уведомление",
    ],
    tip: "Email-уведомления приходят с адреса info@pilo-rus.ru. Если не видите — проверьте папку «Спам».",
    link: { href: "/account", label: "Личный кабинет" },
  },
  {
    id: "c3", roles: ["client","all"], category: "Доставка", popular: true,
    icon: Truck, title: "Условия доставки и самовывоза",
    steps: [
      "Доставка осуществляется по Москве и МО собственным транспортом",
      "При оформлении заказа выберите «Доставка» или «Самовывоз»",
      "Для самовывоза: Химки, ул. Заводская 2А, стр.28",
      "Время работы склада: пн–сб, 8:00–18:00",
      "Стоимость доставки рассчитывается менеджером индивидуально",
      "Водитель позвонит за 1–2 часа до приезда",
    ],
    tip: "При самовывозе возьмите с собой паспорт или копию заказа. Крупные партии лучше согласовать заранее.",
  },
  {
    id: "c4", roles: ["client","all"], category: "Оплата", popular: false,
    icon: CreditCard, title: "Способы оплаты",
    steps: [
      "Наличными при получении — курьеру или на складе",
      "Банковской картой при получении (терминал)",
      "Безналичный расчёт для юридических лиц",
      "Для юр. лиц запросите счёт у менеджера — укажите ИНН при оформлении",
    ],
    tip: "Для получения закрывающих документов (накладная, счёт-фактура) укажите ваши реквизиты при оформлении заказа.",
  },
  {
    id: "c5", roles: ["client","all"], category: "Товары", popular: false,
    icon: BookOpen, title: "Как рассчитать нужный объём",
    steps: [
      "Для досок и бруса: длина × ширина × высота = объём в м³",
      "Пример: доска 6м × 0.15м × 0.025м = 0.0225 м³ за штуку",
      "Укажите площадь или количество — менеджер рассчитает объём",
      "Добавьте 5–10% запаса на отходы при монтаже",
    ],
    tip: "Позвоните или напишите менеджеру — мы бесплатно рассчитаем нужное количество материала по вашему проекту.",
  },
  {
    id: "c6", roles: ["client","all"], category: "Аккаунт", popular: false,
    icon: User, title: "Регистрация и личный кабинет",
    steps: [
      "Нажмите «Войти» в верхнем меню → «Зарегистрироваться»",
      "Введите имя, email и пароль",
      "Подтвердите email — письмо придёт в течение 2 минут",
      "В личном кабинете: история заказов, контактные данные, реквизиты",
    ],
    tip: "Зарегистрированным клиентам проще оформлять повторные заказы — все данные заполняются автоматически.",
    link: { href: "/auth/register", label: "Зарегистрироваться" },
  },

  // MANAGER
  {
    id: "m1", roles: ["manager","admin","director","all"], category: "Заказы", popular: true,
    icon: Bell, title: "Работа с заказами через Telegram",
    steps: [
      "Новый заказ — мгновенное уведомление в группу «ПилоРус Заказы»",
      "В сообщении: клиент, телефон, состав, сумма, адрес",
      "Под сообщением — кнопки смены статуса: нажмите нужную",
      "Клиент автоматически получает email при каждом изменении статуса",
      "Статус меняется и в админке, и в Telegram одновременно",
    ],
    tip: "Добавьте @pilorus_orders_bot в избранное в Telegram — так уведомления всегда под рукой даже без звука.",
    link: { href: "/admin/orders", label: "Открыть заказы" },
  },
  {
    id: "m2", roles: ["manager","admin","director","all"], category: "Заказы", popular: false,
    icon: Phone, title: "Заказ по телефону — POS-терминал",
    steps: [
      "Откройте раздел «Заказ по телефону» в меню",
      "Слева — каталог с категориями, справа — корзина заказа",
      "Нажмите на товар → выберите вариант (размер) → количество",
      "Товар добавляется в правую панель — корзину заказа",
      "Введите данные клиента: имя, телефон, адрес",
      "Выберите способ оплаты и нажмите «Создать заказ»",
      "Telegram уведомление уходит автоматически",
    ],
    tip: "Используйте скрипты продаж (кнопка «Скрипты» в интерфейсе) — готовые фразы для разных ситуаций: приветствие, уточнение, работа с возражениями.",
    link: { href: "/admin/orders/new", label: "POS-терминал" },
  },
  {
    id: "m3", roles: ["manager","admin","director","all"], category: "Клиенты", popular: false,
    icon: Users, title: "Работа с карточкой клиента",
    steps: [
      "Раздел «Клиенты» → найдите клиента по имени, телефону, email",
      "Нажмите на клиента — откроется карточка с историей заказов",
      "Просматривайте все заказы, суммы, статусы",
      "Можно написать заметку к клиенту (видна только команде)",
    ],
    tip: "Постоянным клиентам с крупными заказами стоит предлагать индивидуальные условия — обсудите с директором.",
    link: { href: "/admin/customers", label: "Клиенты" },
  },
  {
    id: "m4", roles: ["manager","admin","director","all"], category: "Товары", popular: false,
    icon: Package, title: "Проверка наличия товара",
    steps: [
      "Раздел «Каталог товаров» → найдите товар по названию",
      "В карточке товара — статус «В наличии» / «Нет в наличии»",
      "Нажмите на вариант — видны количество и цена",
      "Если товара нет — предложите аналог или уточните срок поступления",
    ],
    tip: "Всегда уточняйте наличие на складе перед подтверждением заказа — информация на сайте может отставать.",
    link: { href: "/admin/products", label: "Каталог" },
  },
  {
    id: "m5", roles: ["manager","admin","director","all"], category: "Скрипты", popular: true,
    icon: MessageSquare, title: "Скрипты продаж для менеджеров",
    steps: [
      "Приветствие: «ПилоРус, добрый день! Чем могу помочь?»",
      "Уточнение объёма: «Какой объём вам нужен? Могу помочь рассчитать»",
      "Апсейл: «К этому материалу часто берут... — подойдёт вашему проекту»",
      "Качество: «Наш лес сушится в собственных камерах — влажность 14-16%»",
      "Срочность: «Этот размер пользуется спросом, лучше бронировать сейчас»",
      "Возражение по цене: «Давайте посчитаем — с учётом качества и доставки...»",
      "Закрытие: «Оформляем? Мне нужны ваш телефон и адрес доставки»",
    ],
    tip: "Скрипты — это основа, не шаблон. Слушайте клиента и адаптируйте разговор. Лучшие продажи — когда клиент чувствует, что его понимают.",
  },

  // ADMIN
  {
    id: "a1", roles: ["admin","director","all"], category: "Товары", popular: true,
    icon: Package, title: "Добавление нового товара",
    steps: [
      "Каталог → «+ Добавить товар»",
      "Заполните: название, описание, категория, единица измерения",
      "Добавьте фотографии (рекомендуется 3–5 фото, формат JPG/PNG)",
      "Создайте варианты: размер → цена м³ → цена шт → шт/м³",
      "Установите статус «В наличии» и активируйте товар",
      "Нажмите «Сохранить» — товар появится в каталоге",
    ],
    tip: "SEO: заполняйте поле «Описание» с ключевыми словами — это влияет на позиции в поиске. Slug генерируется автоматически.",
    link: { href: "/admin/products", label: "Каталог товаров" },
  },
  {
    id: "a2", roles: ["admin","director","all"], category: "Настройки", popular: false,
    icon: Settings, title: "Основные настройки сайта",
    steps: [
      "Раздел «Настройки» — название магазина, телефон, адрес, режим работы",
      "Раздел «Оформление» — цвет акцента, стиль карточек, соотношение фото",
      "Раздел «Уведомления» — настройка Telegram бота и webhook",
      "Раздел «Email рассылка» — шаблоны и история рассылок",
      "После изменений — сохраните и проверьте сайт через «Предпросмотр»",
    ],
    tip: "Изменения в настройках вступают в силу сразу. Перед крупными изменениями сделайте снапшот сервера в Beget.",
    link: { href: "/admin/settings", label: "Настройки" },
  },
  {
    id: "a3", roles: ["admin","director","all"], category: "Команда", popular: false,
    icon: Users, title: "Управление сотрудниками",
    steps: [
      "Раздел «Команда» — список всех сотрудников и их роли",
      "PENDING — ожидает одобрения, нажмите ✅ Одобрить или ❌ Отклонить",
      "Смена роли: нажмите на сотрудника → выберите новую роль",
      "Приостановить доступ: статус → SUSPENDED (войти не сможет)",
      "Новые сотрудники регистрируются через /join на сайте",
    ],
    tip: "Роли: Менеджер (заказы), Курьер (доставка), Кладовщик (склад), Бухгалтер (финансы), Продавец (касса), Администратор (всё).",
    link: { href: "/admin/staff", label: "Команда" },
  },
  {
    id: "a4", roles: ["admin","director","all"], category: "Медиа", popular: false,
    icon: Camera, title: "Работа с медиабиблиотекой",
    steps: [
      "Раздел «Медиабиблиотека» — все загруженные фото и файлы",
      "Загрузка: перетащите файлы или нажмите «Загрузить»",
      "Поддерживаются: JPG, PNG, WebP (рекомендуется WebP — меньше размер)",
      "Нажмите на фото → можно скопировать URL или удалить",
      "Фото без связи с товаром — безопасно удалять",
    ],
    tip: "Оптимальный размер фото: 1200×900px, до 500KB. Большие файлы замедляют сайт. Используйте squoosh.app для сжатия.",
    link: { href: "/admin/media", label: "Медиабиблиотека" },
  },
  {
    id: "a5", roles: ["admin","director","all"], category: "Аналитика", popular: false,
    icon: BarChart3, title: "Аналитика и отчёты",
    steps: [
      "Раздел «Аналитика» — посещаемость, заказы, выручка",
      "Яндекс.Метрика — детальная статистика поведения пользователей",
      "YML-фид для маркетплейсов — экспорт каталога в Яндекс.Маркет",
      "Отчёты Telegram: утро 09:00 и вечер 18:00 — сводка за день",
    ],
    tip: "Яндекс.Метрика показывает откуда приходят клиенты. Если большой трафик с мобильных — проверяйте мобильную версию сайта чаще.",
    link: { href: "/admin/analytics", label: "Аналитика" },
  },
  {
    id: "a6", roles: ["admin","director","all"], category: "Система", popular: false,
    icon: Zap, title: "Здоровье системы — что проверять",
    steps: [
      "Раздел «Здоровье системы» — 15 проверок всех компонентов",
      "Красный — критическая ошибка, нужно исправить немедленно",
      "Жёлтый — предупреждение, сайт работает, но стоит улучшить",
      "Зелёный — всё в порядке",
      "После изменений нажмите «Перепроверить всё»",
      "Проверяйте здоровье системы раз в неделю",
    ],
    tip: "Если увидели красную ошибку — сначала прочитайте «Как исправить» под карточкой. Большинство проблем решается в 1–2 клика.",
    link: { href: "/admin/health", label: "Здоровье системы" },
  },
  {
    id: "a7", roles: ["admin","director","all"], category: "Email", popular: false,
    icon: Mail, title: "Email рассылка и шаблоны",
    steps: [
      "Раздел «Email рассылка» — создание и отправка рассылок",
      "Выберите шаблон или напишите письмо с нуля",
      "Добавьте товар в письмо — кнопка «+ Добавить товар»",
      "Укажите тему, выберите получателей (все / сегмент)",
      "Нажмите «Отправить» или «Сохранить черновик»",
    ],
    tip: "Рассылки работают лучше всего во вторник–четверг с 10:00 до 12:00. Тема письма должна быть конкретной: «Скидка 15% на доску — только до пятницы».",
    link: { href: "/admin/email", label: "Email рассылка" },
  },

  // DIRECTOR
  {
    id: "d1", roles: ["director","all"], category: "Финансы", popular: true,
    icon: CreditCard, title: "Финансовый дашборд",
    steps: [
      "Раздел «Финансы» — выручка, расходы, прибыль по периодам",
      "Фильтр по дате: сегодня / неделя / месяц / квартал",
      "Топ товаров по выручке — видно что продаётся лучше",
      "Топ клиентов — кто приносит больше всего денег",
      "Экспорт данных в Excel для бухгалтерии",
    ],
    tip: "Сравнивайте текущий месяц с прошлым — кнопка «vs прошлый период». Если выручка падает — смотрите на конверсию в разделе Аналитика.",
    link: { href: "/admin/finance", label: "Финансы" },
  },
  {
    id: "d2", roles: ["director","all"], category: "Отчёты", popular: false,
    icon: FileText, title: "Ежедневные отчёты в Telegram",
    steps: [
      "Утром в 09:00 МСК — активные заказы и задачи на день",
      "Вечером в 18:00 МСК — выручка, количество заказов, новые клиенты",
      "Каждый новый заказ — мгновенное уведомление с деталями",
      "Статистика нарастающим итогом за месяц",
    ],
    tip: "Если отчёты не приходят — проверьте Здоровье системы → раздел Telegram. Возможно, нужно переустановить webhook.",
  },
  {
    id: "d3", roles: ["director","all"], category: "Команда", popular: false,
    icon: Briefcase, title: "Управление командой и правами",
    steps: [
      "Раздел «Команда» — полный список сотрудников",
      "SUPER_ADMIN — владелец, доступ ко всему без ограничений",
      "ADMIN — управляет заказами, товарами, командой",
      "Менеджер — только заказы и клиенты",
      "Подозрительная активность — проверьте журнал действий",
      "Уволенный сотрудник — статус SUSPENDED, доступ закрыт мгновенно",
    ],
    tip: "Правило минимальных прав: давайте сотруднику только тот доступ, который ему нужен. Это защищает бизнес от ошибок и злоупотреблений.",
    link: { href: "/admin/staff", label: "Команда" },
  },
  {
    id: "d4", roles: ["director","all"], category: "Стратегия", popular: false,
    icon: TrendingUp, title: "Рост продаж — инструменты",
    steps: [
      "Акции → создайте скидку или специальное предложение",
      "Email рассылка → напомните о себе тёплой базе клиентов",
      "Push уведомления → мгновенный охват подписчиков",
      "Отзывы → собирайте обратную связь, отвечайте на всё",
      "Яндекс.Маркет → YML фид уже готов, подключите в личном кабинете ЯМ",
    ],
    tip: "Лучший источник новых клиентов — довольный старый. Попросите клиента оставить отзыв через 3 дня после доставки.",
    link: { href: "/admin/promotions", label: "Акции" },
  },
];

/* ─── FAQ ─── */
const FAQS = [
  {
    roles: ["client","all"],
    q: "Не пришёл email с подтверждением заказа",
    a: "Проверьте папку «Спам» — письма приходят с info@pilo-rus.ru. Если нет — позвоните менеджеру, заказ мог быть принят без письма.",
  },
  {
    roles: ["client","all"],
    q: "Можно изменить адрес доставки после оформления?",
    a: "Да, пока заказ не в статусе «Отгружен». Позвоните менеджеру или напишите через сайт — изменим.",
  },
  {
    roles: ["manager","admin","director","all"],
    q: "Не приходят уведомления в Telegram",
    a: "Проверьте Здоровье системы → раздел Telegram. Скорее всего нужно переустановить webhook: Уведомления → Telegram Bot → «Настроить вебхук».",
    link: { href: "/admin/health", label: "Проверить" },
  },
  {
    roles: ["manager","admin","director","all"],
    q: "Кнопки статусов в Telegram не работают",
    a: "Telegram bot работает только через webhook. Перейдите в Уведомления → Telegram Bot → нажмите «Настроить вебхук» → проверьте статус.",
    link: { href: "/admin/notifications", label: "Уведомления" },
  },
  {
    roles: ["admin","director","all"],
    q: "Сайт показывает 502 Bad Gateway",
    a: "Приложение не запущено на сервере. Зайдите в Beget → VPS «Stylish Yelena» → Консоль и выполните: pm2 restart pilo-rus --update-env",
  },
  {
    roles: ["admin","director","all"],
    q: "Как сделать бэкап сайта?",
    a: "Beget → VPS → Бэкапы → Снапшоты → «Создать снапшот». Это полная копия сервера. Делайте снапшот перед крупными изменениями.",
  },
  {
    roles: ["director","all"],
    q: "Как посмотреть что делали сотрудники?",
    a: "Раздел «Команда» → выберите сотрудника → вкладка «Активность». Там видны все изменения с датой и временем.",
  },
  {
    roles: ["all","client","manager","admin","director"],
    q: "Как связаться с поддержкой?",
    a: "Позвоните: +7 (495) xxx-xx-xx, напишите в Telegram: @pilorus_support или на почту info@pilo-rus.ru. Время работы: пн–сб, 9:00–18:00.",
  },
];

/* ─── Category icons ─── */
const CATEGORY_ICONS: Record<string, any> = {
  "Заказы": ShoppingCart,
  "Доставка": Truck,
  "Оплата": CreditCard,
  "Товары": Package,
  "Аккаунт": User,
  "Клиенты": Users,
  "Скрипты": MessageSquare,
  "Настройки": Settings,
  "Команда": Users,
  "Медиа": Camera,
  "Аналитика": BarChart3,
  "Система": Zap,
  "Email": Mail,
  "Финансы": CreditCard,
  "Отчёты": FileText,
  "Стратегия": TrendingUp,
};

/* ─── ArticleCard ─── */
function ArticleCard({ article, roleKey }: { article: typeof ARTICLES[0]; roleKey: string }) {
  const [open, setOpen] = useState(false);
  const Icon = article.icon;
  const role = ROLES.find(r => r.key === roleKey) || ROLES[0];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl ${role.color} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{article.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{article.category}</p>
        </div>
        {article.popular && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
            <Star className="w-2.5 h-2.5 fill-current" /> Популярное
          </span>
        )}
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <ol className="space-y-2">
            {article.steps.map((step, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {article.tip && (
            <div className="flex gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{article.tip}</p>
            </div>
          )}
          {article.link && (
            <Link
              href={article.link.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {article.link.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function HelpPage() {
  const [roleKey, setRoleKey] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const role = roleKey === "all";
    const q = query.toLowerCase().trim();
    return ARTICLES.filter(a => {
      const matchRole = role || a.roles.includes(roleKey);
      const matchQuery = !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
        || a.steps.some(s => s.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  }, [roleKey, query]);

  const filteredFaqs = useMemo(() => {
    const role = roleKey === "all";
    const q = query.toLowerCase().trim();
    return FAQS.filter(f => {
      const matchRole = role || f.roles.includes(roleKey);
      const matchQuery = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [roleKey, query]);

  const popular = filtered.filter(a => a.popular);

  // Group by category
  const categories = useMemo(() => {
    const map = new Map<string, typeof ARTICLES>();
    filtered.forEach(a => {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    });
    return map;
  }, [filtered]);

  const currentRole = ROLES.find(r => r.key === roleKey) || ROLES[0];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl leading-tight">Обучение и помощь</h1>
          <p className="text-xs text-muted-foreground">Инструкции от клиента до директора</p>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map(r => {
          const Icon = r.icon;
          const active = roleKey === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setRoleKey(r.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? `${r.color} ring-2 ${r.ring}`
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по инструкциям..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* No results */}
      {filtered.length === 0 && filteredFaqs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Ничего не найдено</p>
          <p className="text-sm mt-1">Попробуйте другой запрос или смените роль</p>
        </div>
      )}

      {/* Popular — only when no search */}
      {!query && popular.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Популярные</h2>
          </div>
          {popular.map(a => <ArticleCard key={a.id} article={a} roleKey={roleKey} />)}
        </section>
      )}

      {/* By category */}
      {Array.from(categories.entries()).map(([cat, articles]) => {
        if (!query && articles.every(a => a.popular)) return null; // already shown in popular
        const nonPopular = query ? articles : articles.filter(a => !a.popular);
        if (nonPopular.length === 0) return null;
        const CatIcon = CATEGORY_ICONS[cat] || BookOpen;
        return (
          <section key={cat} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <CatIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{cat}</h2>
            </div>
            {nonPopular.map(a => <ArticleCard key={a.id} article={a} roleKey={roleKey} />)}
          </section>
        );
      })}

      {/* FAQ */}
      {filteredFaqs.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Частые вопросы</h2>
          </div>
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="font-semibold text-sm">{faq.q}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">{faq.a}</p>
              {faq.link && (
                <div className="pl-6 mt-2">
                  <Link
                    href={faq.link.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <ArrowRight className="w-3 h-3" /> {faq.link.label}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Footer contact */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Не нашли ответ?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Позвоните или напишите — поможем разобраться
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="tel:+74951234567"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Позвонить
          </a>
          <a
            href="https://t.me/pilorus_support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-500 text-white rounded-xl text-xs font-semibold hover:bg-sky-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
