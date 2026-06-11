export type ArayPaymentProfileStatus =
  | "received_needs_accountant_review"
  | "ready_for_invoices"
  | "planned"
  | "inactive";

export type ArayPaymentProfile = {
  id: string;
  title: string;
  entityType: string;
  country: string;
  currency: string;
  role: string;
  status: ArayPaymentProfileStatus;
  bankDataState: string;
  visibilityRule: string;
  safeNote: string;
};

export const ARAY_PARTNER_MONTHLY_PRICE_RUB = 150_000;
export const ARAY_PARTNER_MONTHLY_ARAY_SHARE_RUB = 75_000;
export const ARAY_PARTNER_MONTHLY_PARTNER_SHARE_RUB = 75_000;

export const ARAY_PAYMENT_PROFILE_STATUS_LABELS: Record<ArayPaymentProfileStatus, string> = {
  received_needs_accountant_review: "получен, нужна проверка",
  ready_for_invoices: "готов для счетов",
  planned: "планируем",
  inactive: "выключен",
};

export const ARAY_PAYMENT_PROFILE_STATUS_CLASSES: Record<ArayPaymentProfileStatus, string> = {
  received_needs_accountant_review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  ready_for_invoices: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  planned: "border-border bg-muted/40 text-muted-foreground",
  inactive: "border-border bg-muted/20 text-muted-foreground",
};

export const ARAY_PAYMENT_PROFILES: ArayPaymentProfile[] = [
  {
    id: "ip-vardanyan-araik-yurievich-ru",
    title: "ИП Варданян Араик Юрьевич",
    entityType: "ИП",
    country: "Россия",
    currency: "RUB",
    role: "пилотный получатель 75 000 ₽ от партнера",
    status: "received_needs_accountant_review",
    bankDataState: "реквизиты сохранены в закрытом профиле",
    visibilityRule: "полные номера счетов не публикуются в бренд-комплекте и публичных документах",
    safeNote: "Перед первым счетом бухгалтер подтверждает данные, назначение платежа, договорную схему и налоговый режим.",
  },
  {
    id: "ooo-aray-ru",
    title: "ООО ARAY / Yuva Россия",
    entityType: "ООО",
    country: "Россия",
    currency: "RUB",
    role: "будущий основной получатель для масштабирования по России",
    status: "planned",
    bankDataState: "ожидает регистрацию и банковский профиль",
    visibilityRule: "появится в счетах только после юридической и бухгалтерской проверки",
    safeNote: "Нужно подготовить договоры, акты, правила НДС/УСН и полномочия подписанта.",
  },
  {
    id: "ooo-aray-am",
    title: "ARAY Armenia LLC",
    entityType: "ООО / LLC",
    country: "Армения",
    currency: "AMD / USD",
    role: "будущий международный профиль для Армении и внешних рынков",
    status: "planned",
    bankDataState: "ожидает регистрацию, банк и правила валютного контроля",
    visibilityRule: "нельзя включать в продажи до локальной правовой настройки",
    safeNote: "Проверяем налоги, договоры, валютные платежи, платежные системы и требования страны клиента.",
  },
];

export const ARAY_PAYMENT_CONTROL_RULES = [
  "Партнер выставляет клиенту счет от своей компании или ИП и сам принимает 150 000 ₽.",
  "После оплаты клиентом партнер оплачивает ARAY/Yuva 75 000 ₽ по счету на активный платежный профиль.",
  "Система не удаляет старые реквизиты, если по ним уже были счета: профиль переводится в архив.",
  "Смена банка, счета или юрлица проходит через черновик, проверку бухгалтера и ручное включение.",
  "Полные банковские данные не попадают в публичные страницы, брендбук, ZIP-пакеты и рекламные материалы.",
  "Для каждой страны будет отдельная карточка правил: договор, счет, акт, налоги, валюта и ответственный.",
];

export const ARAY_PAYMENT_SETUP_STEPS = [
  {
    title: "Профиль юрлица",
    text: "Создаем карточку ИП, ООО или иностранной компании: страна, валюта, роль, статус проверки.",
  },
  {
    title: "Закрытые реквизиты",
    text: "Номера счетов и банковские поля лежат в закрытом хранилище и не попадают в публичную сборку.",
  },
  {
    title: "Проверка",
    text: "Бухгалтер и юрист подтверждают, что счет можно использовать для договора, счета и акта.",
  },
  {
    title: "Активный получатель",
    text: "Только один профиль включается как получатель для конкретной страны, валюты и услуги.",
  },
  {
    title: "Счет на 75 000 ₽",
    text: "После оплаты клиентом система готовит партнеру счет ARAY/Yuva на долю производства.",
  },
  {
    title: "Архив и история",
    text: "При смене банка старые данные остаются в истории документов, но новые счета идут на новый профиль.",
  },
];

export const ARAY_PAYMENT_PROFILE_ACTIONS = [
  "добавить ИП или ООО",
  "поменять банк или расчетный счет",
  "выключить старые реквизиты без удаления истории",
  "назначить получателя по стране и валюте",
  "подготовить счет, акт и назначение платежа",
  "открыть профиль Армении или другой страны после проверки правил",
];
