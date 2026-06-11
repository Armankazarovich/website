"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CreditCard,
  HelpCircle,
  Image,
  Lightbulb,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Palette,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  type LucideIcon,
  UserCircle,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { PHONE_DISPLAY, PHONE_LINK } from "@/lib/phone-constants";

type AudienceKey = "all" | "sales" | "stock" | "admin" | "owner";
type CategoryKey =
  | "all"
  | "orders"
  | "clients"
  | "goods"
  | "site"
  | "team"
  | "numbers";

type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  category: Exclude<CategoryKey, "all">;
  audiences: AudienceKey[];
  popular?: boolean;
  icon: LucideIcon;
  steps: string[];
  tip: string;
  href?: string;
  buttonLabel?: string;
  assistantPrompt?: string;
};

type Faq = {
  id: string;
  question: string;
  answer: string;
  audiences: AudienceKey[];
  href?: string;
  buttonLabel?: string;
};

const AUDIENCES: {
  key: AudienceKey;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "all",
    label: "Все",
    description: "Показываем все рабочие инструкции",
    icon: Users,
  },
  {
    key: "sales",
    label: "Продажи",
    description: "Заказы, клиенты, звонки, доставки",
    icon: Phone,
  },
  {
    key: "stock",
    label: "Склад",
    description: "Остатки, товары, фотографии",
    icon: Warehouse,
  },
  {
    key: "admin",
    label: "Админ",
    description: "Настройки, команда, сайт",
    icon: ShieldCheck,
  },
  {
    key: "owner",
    label: "Руководитель",
    description: "Деньги, отчеты, контроль работы",
    icon: BarChart3,
  },
];

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "Все задачи" },
  { key: "orders", label: "Заказы" },
  { key: "clients", label: "Клиенты" },
  { key: "goods", label: "Товары" },
  { key: "site", label: "Сайт" },
  { key: "team", label: "Команда" },
  { key: "numbers", label: "Отчеты" },
];

const ARTICLES: HelpArticle[] = [
  {
    id: "aray-production-partner-sales",
    title: "Как менеджеру продавать сайты ARAY Production",
    summary: "Пошагово: заявка, превью, реферальный код, счет, запуск и вознаграждение.",
    category: "site",
    audiences: ["sales", "admin", "owner"],
    popular: true,
    icon: Megaphone,
    steps: [
      "Откройте «Конструктор магазина» или лендинг ARAY Production.",
      "Укажите менеджера, реферальный код и план вознаграждения.",
      "Заполните анкету клиента: название, город, домен, контакты, доставка и оплата.",
      "Загрузите логотип и прайс, затем нажмите «Собрать превью».",
      "Откройте живое превью и покажите клиенту будущий сайт.",
      "Если клиент готов, нажмите «Добавить сайт» или «Опубликовать».",
      "Счет выставляет ARAY Production или проверенный партнер по выбранной модели.",
      "После оплаты клиентского сайта менеджер или реферал получает вознаграждение по правилам программы.",
    ],
    tip: "Для первых клиентов безопаснее: ARAY Production выставляет счет клиенту, менеджер получает процент после оплаты. Режим партнера-перепродавца включаем только проверенным партнерам.",
    href: "/admin/site/constructor",
    buttonLabel: "Открыть конструктор",
    assistantPrompt: "Покажи пошагово, как менеджеру продать сайт ARAY Production и заработать реферальное вознаграждение",
  },
  {
    id: "orders-new",
    title: "Новый заказ с сайта",
    summary: "Что сделать сразу после появления заказа, чтобы клиент не ждал.",
    category: "orders",
    audiences: ["sales", "admin", "owner"],
    popular: true,
    icon: ShoppingBag,
    steps: [
      "Откройте «Заказы» и начните с заказов со статусом «Новый».",
      "Откройте заказ: проверьте имя, телефон, адрес, состав и сумму.",
      "Позвоните клиенту, подтвердите наличие товара, адрес и удобное время доставки.",
      "Поставьте статус «Подтвержден», если все согласовано.",
      "Если клиент передумал, добавьте комментарий и выберите понятный статус отмены.",
    ],
    tip: "Начинайте смену с новых заказов. Так меньше пропущенных звонков и спокойнее день.",
    href: "/admin/orders",
    buttonLabel: "Открыть заказы",
    assistantPrompt: "Подскажи порядок обработки нового заказа",
  },
  {
    id: "orders-phone",
    title: "Заказ по телефону",
    summary: "Быстрый сценарий для менеджера, когда клиент звонит сам.",
    category: "orders",
    audiences: ["sales", "admin"],
    popular: true,
    icon: Phone,
    steps: [
      "Откройте «Новый заказ» из раздела заказов.",
      "Запишите имя и телефон клиента. Это главное, без этого заказ легко потерять.",
      "Добавьте товары, количество и вариант, который выбрал клиент.",
      "Выберите доставку или самовывоз, затем укажите способ оплаты.",
      "Перед сохранением вслух повторите клиенту состав заказа, сумму и адрес.",
    ],
    tip: "Если клиент не уверен в размере или количестве, сначала создайте заказ с комментарием, а потом уточните детали.",
    href: "/admin/orders/new",
    buttonLabel: "Создать заказ",
    assistantPrompt: "Помоги принять заказ по телефону",
  },
  {
    id: "clients-follow-up",
    title: "Клиент просит изменить заказ",
    summary: "Как аккуратно поправить состав, адрес или комментарий.",
    category: "orders",
    audiences: ["sales", "admin"],
    icon: ClipboardList,
    steps: [
      "Откройте нужный заказ по номеру, имени или телефону клиента.",
      "Если заказ еще не передан курьеру, измените позиции, количество или адрес.",
      "Если заказ уже в пути, сначала свяжитесь с курьером и только потом меняйте данные.",
      "Добавьте комментарий, что именно изменили и кто попросил правку.",
      "Сообщите клиенту итоговую сумму и новый порядок доставки.",
    ],
    tip: "Комментарий в заказе защищает команду от путаницы, особенно когда заказ ведут несколько человек.",
    href: "/admin/orders",
    buttonLabel: "Найти заказ",
  },
  {
    id: "delivery",
    title: "Доставка без путаницы",
    summary: "Что проверить перед передачей заказа курьеру.",
    category: "orders",
    audiences: ["sales", "admin", "owner"],
    icon: Truck,
    steps: [
      "Откройте «Доставка» и проверьте заказы на сегодня.",
      "Убедитесь, что у каждого заказа есть телефон, адрес и понятный комментарий.",
      "Перед выездом позвоните клиенту и подтвердите время.",
      "После передачи заказа курьеру поставьте статус «В пути».",
      "После вручения поставьте «Доставлен», чтобы история заказа была полной.",
    ],
    tip: "Самая частая причина срыва доставки - неуточненный адрес. Проверяйте подъезд, этаж и удобное время.",
    href: "/admin/delivery",
    buttonLabel: "Открыть доставку",
  },
  {
    id: "clients-base",
    title: "База клиентов",
    summary: "Как быстро найти клиента, историю покупок и повод для повторного звонка.",
    category: "clients",
    audiences: ["sales", "admin", "owner"],
    popular: true,
    icon: UserCircle,
    steps: [
      "Откройте «Клиенты» и найдите человека по имени или телефону.",
      "Откройте карточку клиента: проверьте историю заказов, сумму покупок и комментарии.",
      "Если клиент давно не покупал, позвоните и предложите актуальный товар или акцию.",
      "После разговора добавьте короткую заметку, чтобы следующий сотрудник видел контекст.",
      "Если данные устарели, обновите телефон, адрес или имя в карточке.",
    ],
    tip: "Короткая заметка после звонка экономит время всей команде при следующем обращении клиента.",
    href: "/admin/clients",
    buttonLabel: "Открыть клиентов",
  },
  {
    id: "crm-simple",
    title: "Заявки и сделки (CRM: рабочий список клиентов)",
    summary: "CRM здесь значит список обращений и сделок, которые нужно довести до продажи.",
    category: "clients",
    audiences: ["sales", "admin", "owner"],
    icon: CheckSquare,
    steps: [
      "Откройте «Заявки и сделки». Если в меню написано CRM, это тот же рабочий список клиентов.",
      "Каждая карточка - один клиент или одна сделка, по которой нужен следующий шаг.",
      "Откройте карточку, проверьте контакт, потребность клиента и последнюю заметку.",
      "Перенесите карточку на следующий этап: связались, готовим предложение, договорились или отказ.",
      "Записывайте итог звонка сразу. Тогда сделка не зависнет без ответа.",
    ],
    tip: "Смысл раздела простой: каждый клиент должен иметь понятный следующий шаг и ответственного сотрудника.",
    href: "/admin/crm",
    buttonLabel: "Открыть заявки и сделки",
    assistantPrompt: "Объясни как вести заявки и сделки без сложных терминов",
  },
  {
    id: "tasks",
    title: "Задачи сотрудникам",
    summary: "Как поставить задачу так, чтобы ее выполнили без лишних уточнений.",
    category: "team",
    audiences: ["sales", "admin", "owner"],
    icon: CheckCircle2,
    steps: [
      "Откройте «Задачи» и нажмите создание новой задачи.",
      "Напишите действие в названии: например, «Позвонить клиенту Иванову».",
      "Добавьте детали: номер заказа, телефон, что нужно уточнить.",
      "Выберите исполнителя и срок выполнения.",
      "После выполнения проверьте результат и закройте задачу.",
    ],
    tip: "Хорошая задача отвечает на три вопроса: что сделать, для кого и до какого времени.",
    href: "/admin/tasks",
    buttonLabel: "Открыть задачи",
  },
  {
    id: "product-new",
    title: "Добавить товар",
    summary: "Минимальный набор полей, чтобы товар нормально появился на сайте.",
    category: "goods",
    audiences: ["stock", "admin", "owner"],
    popular: true,
    icon: Package,
    steps: [
      "Откройте «Каталог товаров» и нажмите добавление товара.",
      "Заполните название, категорию, единицу измерения и понятное описание.",
      "Добавьте размеры или варианты товара, цену и остаток.",
      "Загрузите 3-5 четких фотографий: общий вид, фактура, торец или упаковка.",
      "Включите показ на сайте и сохраните товар.",
    ],
    tip: "Покупателю проще выбрать, когда фото и размеры заполнены сразу. Не оставляйте карточку наполовину пустой.",
    href: "/admin/products",
    buttonLabel: "Открыть каталог",
  },
  {
    id: "prices-stock",
    title: "Цены и остатки",
    summary: "Как обновлять наличие, чтобы менеджеры не обещали лишнего.",
    category: "goods",
    audiences: ["stock", "admin", "owner", "sales"],
    icon: Warehouse,
    steps: [
      "Откройте «Склад» или карточку нужного товара.",
      "Проверьте остаток по каждому размеру или варианту.",
      "Обновите цену, если закупка или условия изменились.",
      "Если товара нет, временно снимите его с показа или поставьте нулевой остаток.",
      "Сообщите менеджерам, если изменилась цена на ходовую позицию.",
    ],
    tip: "Лучше обновлять остатки небольшими порциями каждый день, чем исправлять много ошибок в конце недели.",
    href: "/admin/inventory",
    buttonLabel: "Открыть склад",
  },
  {
    id: "media",
    title: "Фотографии товаров",
    summary: "Как поддерживать аккуратные карточки без лишних дублей.",
    category: "goods",
    audiences: ["stock", "admin"],
    icon: Image,
    steps: [
      "Откройте «Медиа» и загрузите только четкие фотографии без лишнего фона.",
      "Назовите файл так, чтобы было понятно, к какому товару он относится.",
      "Удаляйте явные дубли и неудачные снимки.",
      "В карточке товара поставьте лучшее фото первым.",
      "После сохранения проверьте карточку товара глазами покупателя.",
    ],
    tip: "Первое фото должно сразу показывать товар, а не склад, упаковку или случайный фрагмент.",
    href: "/admin/media",
    buttonLabel: "Открыть медиа",
  },
  {
    id: "categories",
    title: "Категории товаров",
    summary: "Как держать каталог понятным для клиента.",
    category: "goods",
    audiences: ["admin", "stock", "owner"],
    icon: BookOpen,
    steps: [
      "Откройте «Категории» и проверьте список разделов каталога.",
      "Создавайте категорию только если в ней будет несколько товаров.",
      "Пишите короткое название, которое клиент поймет без пояснений.",
      "Проверьте порядок категорий: важные и ходовые должны быть выше.",
      "Если категория пустая, скройте ее до появления товаров.",
    ],
    tip: "Каталог должен помогать выбирать, а не показывать внутреннюю структуру склада.",
    href: "/admin/categories",
    buttonLabel: "Открыть категории",
  },
  {
    id: "promotions",
    title: "Акции и скидки",
    summary: "Как запустить предложение и не забыть выключить его вовремя.",
    category: "site",
    audiences: ["sales", "admin", "owner"],
    icon: Megaphone,
    steps: [
      "Откройте «Акции» и создайте новое предложение.",
      "Укажите понятное название, срок действия и условия.",
      "Проверьте, к каким товарам или заказам относится скидка.",
      "Перед запуском прочитайте текст как клиент: нет ли двусмысленности.",
      "После окончания срока отключите акцию или продлите ее осознанно.",
    ],
    tip: "Хорошая акция отвечает на вопрос клиента: что я получу, до какого числа и что нужно сделать.",
    href: "/admin/promotions",
    buttonLabel: "Открыть акции",
  },
  {
    id: "mailings",
    title: "Рассылки клиентам",
    summary: "Как отправить клиентам новость или предложение без лишней сложности.",
    category: "site",
    audiences: ["admin", "owner", "sales"],
    icon: Mail,
    steps: [
      "Откройте «Рассылки» и создайте новое сообщение.",
      "Выберите понятную тему: акция, новый товар, изменение условий или напоминание.",
      "Пишите коротко: один повод, одно главное предложение, одна кнопка действия.",
      "Проверьте текст на ошибки и отправьте тестовое письмо себе.",
      "После отправки посмотрите, были ли вопросы от клиентов, и передайте их менеджерам.",
    ],
    tip: "Не отправляйте все всем. Чем точнее повод, тем меньше раздражения и больше ответов.",
    href: "/admin/email",
    buttonLabel: "Открыть рассылки",
  },
  {
    id: "reviews",
    title: "Отзывы",
    summary: "Как быстро обработать отзыв и не пропустить проблему клиента.",
    category: "site",
    audiences: ["sales", "admin", "owner"],
    icon: MessageSquare,
    steps: [
      "Откройте «Отзывы» и начните с новых сообщений.",
      "Если отзыв хороший, проверьте имя и текст, затем опубликуйте.",
      "Если есть жалоба, сначала свяжитесь с клиентом и разберите ситуацию.",
      "Не публикуйте личные данные клиента в открытом тексте.",
      "После решения проблемы добавьте внутренний комментарий для команды.",
    ],
    tip: "Жалоба в отзыве - это не только риск, но и шанс вернуть доверие, если ответить быстро.",
    href: "/admin/reviews",
    buttonLabel: "Открыть отзывы",
  },
  {
    id: "site-contacts",
    title: "Телефоны, адрес и режим работы",
    summary: "Где менять контакты, которые видят покупатели.",
    category: "site",
    audiences: ["admin", "owner"],
    icon: Phone,
    steps: [
      "Откройте «Настройки сайта» и перейдите к контактам.",
      "Обновите телефоны, адрес, время работы и текст для связи.",
      "Проверьте, что номер написан без лишних пробелов и ошибок.",
      "Сохраните изменения.",
      "Откройте сайт как клиент и убедитесь, что контакты обновились.",
    ],
    tip: "После смены телефона или режима работы проверьте не только главную страницу, но и карточку товара.",
    href: "/admin/site",
    buttonLabel: "Открыть настройки сайта",
  },
  {
    id: "appearance",
    title: "Оформление сайта",
    summary: "Как менять внешний вид аккуратно и без визуального шума.",
    category: "site",
    audiences: ["admin", "owner"],
    icon: Palette,
    steps: [
      "Откройте «Оформление» и меняйте один параметр за раз.",
      "Проверяйте, хорошо ли читаются заголовки, цены и кнопки.",
      "Не смешивайте много ярких цветов на одной странице.",
      "Сохраните изменения только после просмотра на телефоне и большом экране.",
      "Если стало хуже читать, верните спокойный вариант.",
    ],
    tip: "Главная задача оформления - помочь купить, а не отвлекать от товара и цены.",
    href: "/admin/appearance",
    buttonLabel: "Открыть оформление",
  },
  {
    id: "staff",
    title: "Сотрудники и доступы",
    summary: "Как добавить человека и не дать лишние права.",
    category: "team",
    audiences: ["admin", "owner"],
    popular: true,
    icon: Users,
    steps: [
      "Откройте «Команда» и проверьте новые заявки сотрудников.",
      "Сверьте имя, телефон и роль человека.",
      "Выберите доступ по работе: менеджер, склад, курьер, бухгалтер или администратор.",
      "Одобрите заявку только после проверки.",
      "Если сотрудник уволился или сменил роль, сразу обновите доступ.",
    ],
    tip: "Давайте человеку только те разделы, которые нужны для его работы. Так меньше случайных ошибок.",
    href: "/admin/staff",
    buttonLabel: "Открыть команду",
  },
  {
    id: "notifications",
    title: "Уведомления",
    summary: "Что проверить, если команда не видит новые заказы вовремя.",
    category: "team",
    audiences: ["sales", "admin", "owner"],
    icon: Bell,
    steps: [
      "Откройте «Уведомления» и проверьте, какие каналы включены.",
      "Убедитесь, что получатели указаны верно.",
      "Отправьте проверочное уведомление.",
      "Если уведомление не пришло, проверьте связь, права на устройстве и настройки получателя.",
      "После правки создайте пробный заказ или попросите коллегу проверить получение.",
    ],
    tip: "Не ждите реального заказа для проверки. Тестовое уведомление быстрее покажет, где проблема.",
    href: "/admin/notifications",
    buttonLabel: "Открыть уведомления",
  },
  {
    id: "finance",
    title: "Финансы",
    summary: "Как вести доходы и расходы без больших разборов в конце месяца.",
    category: "numbers",
    audiences: ["admin", "owner"],
    icon: CreditCard,
    steps: [
      "Откройте «Финансы» и выберите нужный период.",
      "Проверьте доходы по выполненным заказам.",
      "Добавляйте расходы сразу: закупка, доставка, аренда, зарплата, реклама.",
      "Пишите короткий комментарий к каждой крупной операции.",
      "В конце недели сверяйте итог с реальными платежами.",
    ],
    tip: "Финансы полезны только тогда, когда данные свежие. Обновляйте их регулярно, небольшими шагами.",
    href: "/admin/finance",
    buttonLabel: "Открыть финансы",
  },
  {
    id: "analytics",
    title: "Отчеты по продажам",
    summary: "Что смотреть руководителю и администратору каждую неделю.",
    category: "numbers",
    audiences: ["admin", "owner"],
    icon: BarChart3,
    steps: [
      "Откройте «Аналитика» и выберите неделю или месяц.",
      "Посмотрите выручку, количество заказов и средний чек.",
      "Сравните с прошлым периодом: выросли продажи или просели.",
      "Проверьте товары, которые продаются лучше всего.",
      "Запишите одно решение по итогам отчета: закупка, акция, звонки или правка цен.",
    ],
    tip: "Отчет без решения быстро превращается в красивую цифру. Всегда завершайте просмотр конкретным действием.",
    href: "/admin/analytics",
    buttonLabel: "Открыть отчеты",
  },
];

const FAQS: Faq[] = [
  {
    id: "notifications",
    question: "Не пришло уведомление о новом заказе",
    answer:
      "Откройте «Уведомления», отправьте проверочное сообщение и проверьте получателей. Если тест не пришел, проверьте связь и разрешения на устройстве сотрудника.",
    audiences: ["sales", "admin", "owner"],
    href: "/admin/notifications",
    buttonLabel: "Проверить уведомления",
  },
  {
    id: "order-letter",
    question: "Клиент не получил письмо по заказу",
    answer:
      "Попросите клиента проверить папку со спамом. Затем откройте заказ, проверьте адрес почты и при необходимости отправьте информацию клиенту вручную.",
    audiences: ["sales", "admin"],
    href: "/admin/orders",
    buttonLabel: "Открыть заказы",
  },
  {
    id: "access",
    question: "Не вижу нужный раздел в меню",
    answer:
      "Скорее всего, у вашей роли нет доступа. Попросите администратора проверить права в разделе «Команда».",
    audiences: ["all"],
    href: "/admin/staff",
    buttonLabel: "Открыть команду",
  },
  {
    id: "find-order",
    question: "Как быстро найти заказ клиента",
    answer:
      "Откройте «Заказы» и ищите по номеру, имени или телефону. Если заказов много, сначала выберите нужный статус.",
    audiences: ["sales", "admin", "owner"],
    href: "/admin/orders",
    buttonLabel: "Открыть заказы",
  },
  {
    id: "site-contacts",
    question: "Как поменять телефон или время работы на сайте",
    answer:
      "Откройте «Настройки сайта», обновите контакты и сохраните. После этого проверьте сайт как покупатель.",
    audiences: ["admin", "owner"],
    href: "/admin/site",
    buttonLabel: "Открыть настройки сайта",
  },
  {
    id: "site-down",
    question: "Сайт временно не открывается",
    answer:
      "Подождите пару минут и обновите страницу. Если проблема осталась, сообщите администратору: укажите время, страницу и что именно увидели.",
    audiences: ["all"],
  },
];

function getCategoryLabel(key: CategoryKey) {
  return CATEGORIES.find((category) => category.key === key)?.label ?? "";
}

function articleMatchesAudience(article: HelpArticle, audience: AudienceKey) {
  return audience === "all" || article.audiences.includes(audience);
}

function faqMatchesAudience(faq: Faq, audience: AudienceKey) {
  return (
    audience === "all" ||
    faq.audiences.includes("all") ||
    faq.audiences.includes(audience)
  );
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function ArticleCard({
  article,
  open,
  onToggle,
}: {
  article: HelpArticle;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = article.icon;
  const bodyId = `guide-body-${article.id}`;

  return (
    <article
      id={`guide-${article.id}`}
      data-guide-card={article.id}
      className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        data-guide-toggle={article.id}
        onClick={onToggle}
        className="w-full px-4 py-4 text-left sm:px-5"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold leading-snug text-foreground">
                {article.title}
              </span>
              {article.popular && (
                <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Star className="h-3 w-3" />
                  Часто нужно
                </span>
              )}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
              {article.summary}
            </span>
            <span className="mt-2 inline-flex text-xs font-medium text-muted-foreground">
              {getCategoryLabel(article.category)}
            </span>
          </span>
          <span className="mt-1 shrink-0 text-muted-foreground">
            {open ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </span>
        </div>
      </button>

      {open && (
        <div id={bodyId} className="border-t border-border px-4 pb-4 sm:px-5">
          <ol className="mt-4 space-y-3">
            {article.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {step}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-4 border-l-2 border-primary/30 pl-3">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {article.tip}
              </p>
            </div>
          </div>

          {(article.href || article.assistantPrompt) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {article.href && (
                <Link
                  href={article.href}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {article.buttonLabel ?? "Открыть раздел"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {article.assistantPrompt && (
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("aray:prompt", {
                        detail: { text: article.assistantPrompt },
                      }),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  <MessageSquare className="h-4 w-4" />
                  Спросить помощника
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  const bodyId = `faq-${faq.id}`;

  return (
    <div
      data-faq-item={faq.id}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        data-faq-toggle={faq.id}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">
          {faq.question}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>
      {open && (
        <div id={bodyId} className="border-t border-border px-4 pb-4">
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {faq.answer}
          </p>
          {faq.href && (
            <Link
              href={faq.href}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80"
            >
              {faq.buttonLabel ?? "Открыть раздел"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [audience, setAudience] = useState<AudienceKey>("all");
  const [category, setCategory] = useState<CategoryKey>("all");
  const [search, setSearch] = useState("");
  const [openArticle, setOpenArticle] = useState<string | null>(
    "orders-new",
  );

  const selectedAudience = AUDIENCES.find((item) => item.key === audience);
  const query = normalizeText(search);

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
      const matchesAudience = articleMatchesAudience(article, audience);
      const matchesCategory =
        category === "all" || article.category === category;
      const haystack = normalizeText(
        [
          article.title,
          article.summary,
          getCategoryLabel(article.category),
          article.tip,
          ...article.steps,
        ].join(" "),
      );
      const matchesSearch = query.length === 0 || haystack.includes(query);

      return matchesAudience && matchesCategory && matchesSearch;
    });
  }, [audience, category, query]);

  const popularArticles = useMemo(
    () => ARTICLES.filter((article) => article.popular).slice(0, 6),
    [],
  );

  const filteredFaqs = useMemo(
    () => FAQS.filter((faq) => faqMatchesAudience(faq, audience)),
    [audience],
  );

  const revealGuide = (id: string) => {
    setAudience("all");
    setCategory("all");
    setSearch("");
    setOpenArticle(id);
    window.setTimeout(() => {
      document
        .getElementById(`guide-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Помощь для команды
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Что нужно сделать?
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Короткие рабочие инструкции без сложных слов: выберите задачу,
                откройте шаги и перейдите в нужный раздел.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            Показано:{" "}
            <span className="font-semibold text-foreground">
              {filteredArticles.length}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {popularArticles.map((article) => {
          const Icon = article.icon;
          return (
            <button
              key={article.id}
              type="button"
              data-guide-shortcut={article.id}
              onClick={() => revealGuide(article.id)}
              className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              <span className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-foreground">
                    {article.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {article.summary}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск: заказ, товар, сотрудник, доставка..."
            data-help-search
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
          />
          {search && (
            <button
              type="button"
              aria-label="Очистить поиск"
              data-clear-search
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4 rotate-45" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {AUDIENCES.map((item) => {
            const Icon = item.icon;
            const active = audience === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-audience-filter={item.key}
                onClick={() => setAudience(item.key)}
                title={item.description}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((item) => {
            const active = category === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-category-filter={item.key}
                onClick={() => setCategory(item.key)}
                className={`h-8 shrink-0 rounded-xl border px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-foreground/20 bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {selectedAudience && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {selectedAudience.description}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        {filteredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            open={openArticle === article.id}
            onToggle={() =>
              setOpenArticle((current) =>
                current === article.id ? null : article.id,
              )
            }
          />
        ))}
      </section>

      {filteredArticles.length === 0 && (
        <section className="rounded-xl border border-border bg-card px-4 py-10 text-center">
          <HelpCircle className="mx-auto h-9 w-9 text-muted-foreground/50" />
          <h2 className="mt-3 text-base font-semibold text-foreground">
            Ничего не найдено
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Попробуйте другое слово или сбросьте фильтры.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setAudience("all");
              setCategory("all");
            }}
            className="mt-4 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Сбросить фильтры
          </button>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Частые вопросы
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {filteredFaqs.map((faq) => (
              <FaqItem key={faq.question} faq={faq} />
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Не нашли ответ?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Позвоните или напишите. Хороший вопрос добавим сюда, чтобы
                команда не искала его снова.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={`tel:${PHONE_LINK}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Phone className="h-4 w-4" />
              {PHONE_DISPLAY}
            </a>
            <a
              href="https://t.me/pilorus_orders_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <MessageSquare className="h-4 w-4" />
              Telegram
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
