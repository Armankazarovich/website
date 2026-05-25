export type ServiceBlueprintKey =
  | "lumber"
  | "construction"
  | "beauty"
  | "auto"
  | "education"
  | "universal";

export type ServiceCapabilityKey =
  | "seo"
  | "page"
  | "lead"
  | "booking"
  | "map"
  | "gallery"
  | "automation";

export type ServiceTemplate = {
  title: string;
  slug: string;
  description: string;
  content: string;
  price: string;
  unit: string;
  icon: string;
  image?: string;
  active: boolean;
  sortOrder: number;
  capabilityTags: ServiceCapabilityKey[];
};

export type ServiceBlueprint = {
  key: ServiceBlueprintKey;
  label: string;
  role: string;
  summary: string;
  templates: ServiceTemplate[];
};

export const SERVICE_MODULE_CAPABILITIES: Array<{
  key: ServiceCapabilityKey;
  label: string;
  description: string;
}> = [
  {
    key: "seo",
    label: "SEO",
    description: "Название, описание и отдельная посадочная страница услуги.",
  },
  {
    key: "page",
    label: "Страница",
    description: "У каждой услуги есть ссылка, которую можно продвигать отдельно.",
  },
  {
    key: "lead",
    label: "Лиды",
    description: "Заявка с услуги попадает в CRM с понятной меткой.",
  },
  {
    key: "booking",
    label: "Бронь",
    description: "Клиент может указать желаемый день и время.",
  },
  {
    key: "map",
    label: "Карта",
    description: "Подходит для выезда, филиалов, зон доставки и точек обслуживания.",
  },
  {
    key: "gallery",
    label: "Фото",
    description: "Можно добавить одно фото или несколько ссылок для лёгкого слайдера.",
  },
  {
    key: "automation",
    label: "Арай",
    description: "Арай понимает смысл услуги и помогает довести заявку до сделки.",
  },
];

const SERVICE_CONTENT_ENDING =
  "<p><strong>Как работаем:</strong> уточняем задачу, фиксируем сроки и стоимость, после подтверждения передаём заявку ответственному менеджеру.</p>";

export const SERVICE_BUSINESS_BLUEPRINTS: ServiceBlueprint[] = [
  {
    key: "lumber",
    label: "Пиломатериалы",
    role: "производство, склад, доставка",
    summary:
      "Услуги вокруг товара: обработка, распил, доставка, расчёт и подготовка комплекта.",
    templates: [
      {
        title: "Распил и подготовка комплекта",
        slug: "raspil-i-komplektatsiya",
        description:
          "Распилим материал по размерам, подпишем позиции и подготовим комплект к отгрузке.",
        content: `<p>Удобно для строек, отделки, мебели и объектов, где важны точные размеры и быстрый монтаж.</p>
<ul>
  <li>проверяем размеры перед запуском в работу</li>
  <li>делаем поперечный и продольный распил</li>
  <li>собираем комплект по проекту или списку</li>
  <li>передаём задачу в CRM, чтобы менеджер не потерял заявку</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 50 ₽",
        unit: "за рез",
        icon: "Scissors",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "gallery", "automation"],
      },
      {
        title: "Покраска и защитная обработка",
        slug: "pokraska-i-zashchitnaya-obrabotka",
        description:
          "Антисептик, огнезащита, масло или декоративная покраска под задачу клиента.",
        content: `<p>Подходит для фасадов, террас, бань, каркасов и деревянных конструкций, где важна долговечность.</p>
<ul>
  <li>подбираем состав под условия эксплуатации</li>
  <li>показываем клиенту понятный результат и цену</li>
  <li>можно привязать фото примеров работ</li>
  <li>Арай поможет оформить заявку и напомнить менеджеру о сроках</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 150 ₽/м²",
        unit: "за м²",
        icon: "Paintbrush",
        active: true,
        sortOrder: 20,
        capabilityTags: ["seo", "page", "lead", "booking", "gallery", "automation"],
      },
      {
        title: "Доставка и разгрузка",
        slug: "dostavka-i-razgruzka",
        description:
          "Организуем доставку на объект, согласуем время, объём машины и условия разгрузки.",
        content: `<p>Клиент сразу понимает, что можно заказать не только материал, но и готовую логистику до объекта.</p>
<ul>
  <li>подбираем машину под объём и вес</li>
  <li>учитываем адрес, время и ограничения подъезда</li>
  <li>заявка уходит в CRM с пометкой доставки</li>
  <li>карта и зоны доставки легко добавляются следующим слоем</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 3 000 ₽",
        unit: "за рейс",
        icon: "Truck",
        active: true,
        sortOrder: 30,
        capabilityTags: ["seo", "page", "lead", "booking", "map", "automation"],
      },
    ],
  },
  {
    key: "construction",
    label: "Стройка",
    role: "бригады, ремонт, монтаж",
    summary:
      "Услуги с выездом, сметой, бронью времени и понятной страницей под рекламу.",
    templates: [
      {
        title: "Выезд замерщика",
        slug: "vyezd-zamershchika",
        description:
          "Приедем на объект, снимем размеры, зафиксируем задачу и подготовим смету.",
        content: `<p>Хорошая первая услуга для строительных и ремонтных компаний: она быстро переводит интерес клиента в понятную заявку.</p>
<ul>
  <li>клиент выбирает удобный день и время</li>
  <li>адрес и комментарий попадают в CRM</li>
  <li>менеджер видит, что нужно подготовить до выезда</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 1 500 ₽",
        unit: "за выезд",
        icon: "MapPin",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "map", "automation"],
      },
      {
        title: "Монтаж под ключ",
        slug: "montazh-pod-klyuch",
        description:
          "Подберём материалы, рассчитаем работы и организуем монтаж одной командой.",
        content: `<p>Услуга подходит для направлений, где важно продать не отдельную работу, а спокойное решение под ключ.</p>
<ul>
  <li>описание этапов помогает клиенту быстрее принять решение</li>
  <li>заявка сразу уходит ответственному</li>
  <li>Арай может подготовить задачу менеджеру и подсказать следующий шаг</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "по смете",
        unit: "после расчёта",
        icon: "Wrench",
        active: true,
        sortOrder: 20,
        capabilityTags: ["seo", "page", "lead", "booking", "gallery", "automation"],
      },
    ],
  },
  {
    key: "beauty",
    label: "Красота",
    role: "салон, мастер, запись",
    summary:
      "Услуги с записью, ценой, длительностью, фото результата и повторными визитами.",
    templates: [
      {
        title: "Консультация и подбор услуги",
        slug: "konsultatsiya-i-podbor-uslugi",
        description:
          "Поможем выбрать процедуру, время записи и подготовку перед посещением.",
        content: `<p>Подходит для салонов и мастеров, где клиенту нужно мягко объяснить разницу между услугами.</p>
<ul>
  <li>клиент оставляет телефон и желаемое время</li>
  <li>заявка попадает в CRM с меткой услуги</li>
  <li>Арай помогает не забыть перезвонить</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "бесплатно",
        unit: "перед записью",
        icon: "Sparkles",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "gallery", "automation"],
      },
    ],
  },
  {
    key: "auto",
    label: "Авто",
    role: "сервис, детейлинг, выезд",
    summary:
      "Услуги с диагностикой, записью, фото до/после и понятной ценой.",
    templates: [
      {
        title: "Диагностика и запись в сервис",
        slug: "diagnostika-i-zapis-v-servis",
        description:
          "Проверим задачу, согласуем время визита и подготовим мастера к приёму.",
        content: `<p>Услуга помогает быстро превратить обращение клиента в запись, не теряя детали по машине и проблеме.</p>
<ul>
  <li>фиксируем автомобиль, симптомы и удобное время</li>
  <li>можно добавить карту сервиса или зоны выезда</li>
  <li>Арай создаёт напоминание и помогает менеджеру закрыть заявку</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 1 000 ₽",
        unit: "за диагностику",
        icon: "Gauge",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "map", "automation"],
      },
    ],
  },
  {
    key: "education",
    label: "Обучение",
    role: "курсы, наставники, консультации",
    summary:
      "Услуги с программой, записью, оплатой, расписанием и сопровождением клиента.",
    templates: [
      {
        title: "Пробная консультация",
        slug: "probnaya-konsultatsiya",
        description:
          "Разберём цель клиента, предложим программу и договоримся о следующем шаге.",
        content: `<p>Подходит для школ, экспертов и наставников: клиент оставляет заявку, а менеджер получает контекст разговора.</p>
<ul>
  <li>фиксируем тему, уровень и желаемое время</li>
  <li>страницу можно продвигать отдельной рекламой</li>
  <li>Арай помогает подготовить follow-up и задачу</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "от 0 ₽",
        unit: "за встречу",
        icon: "GraduationCap",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "automation"],
      },
    ],
  },
  {
    key: "universal",
    label: "Универсально",
    role: "любой бизнес услуг",
    summary:
      "Базовая услуга для бизнеса, который хочет быстро собрать страницу и начать получать заявки.",
    templates: [
      {
        title: "Индивидуальная услуга под задачу",
        slug: "individualnaya-usluga",
        description:
          "Опишите задачу, а мы предложим формат, стоимость, сроки и следующий шаг.",
        content: `<p>Универсальный шаблон для любой ниши: от мастера до агентства. Его можно быстро адаптировать под конкретный бизнес.</p>
<ul>
  <li>короткое описание для карточки</li>
  <li>полный SEO-текст для страницы услуги</li>
  <li>заявка в CRM с желаемым временем</li>
  <li>готовность к фото, карте, броне и автоматизации</li>
</ul>
${SERVICE_CONTENT_ENDING}`,
        price: "по запросу",
        unit: "после уточнения",
        icon: "Wrench",
        active: true,
        sortOrder: 10,
        capabilityTags: ["seo", "page", "lead", "booking", "map", "gallery", "automation"],
      },
    ],
  },
];
