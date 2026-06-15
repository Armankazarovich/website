// Client-safe site settings helpers. Keep this file free of Prisma/server imports.

export const DEFAULT_SETTINGS: Record<string, string> = {
  phone: "+7 (495) 135-20-26",
  phone_link: "+74951352026",
  phone2: "",
  phone2_link: "",
  phone3: "",
  phone3_link: "",
  email: "info@pilo-rus.ru",
  business_type: "lumber",
  terminal_profile: "lumber",
  terminal_enabled_modules: "",
  address: "Химки, ул. Заводская 2А, стр.28",
  address_map: "https://yandex.ru/maps/-/CHqJJGqe",
  working_hours: "Пн-Пт: 09:00-18:00, Сб: 09:00-15:00",
  company_name: "ООО «ДЕРЕВОЛИДЕР»",
  legal_full_name: "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ «ДЕРЕВОЛИДЕР»",
  inn: "7733291699",
  ogrn: "1167746624902",
  kpp: "773301001",
  settlement_account: "40702810040000036989",
  bank_name: "ПАО Сбербанк",
  correspondent_account: "30101810400000000225",
  bik: "044525225",
  okpo: "03368545",
  okato: "45283555000",
  oktmo: "45366000000",
  about_text:
    "Производим и продаем пиломатериалы высокого качества с 2015 года. Собственное производство в Химках обеспечивает контроль качества на каждом этапе.",
  delivery_text:
    "Доставляем по Москве и МО собственным транспортом за 1-3 рабочих дня. Стоимость доставки рассчитывается индивидуально в зависимости от объема и адреса.",
  footer_copyright: `© ${new Date().getFullYear()} ПилоРус. Все права защищены.`,
  contacts_description:
    "Мы работаем с физическими и юридическими лицами. Принимаем заказы по телефону, через сайт и электронную почту.",
  min_order: "1 м³",
  delivery_region: "Москва и Московская область",
  company_city: "Химки",
  social_vk: "",
  social_telegram: "",
  social_whatsapp: "+74951352026",
  social_max: "https://max.ru/u/f9LHodD0cOKoOlL7NxRWbK5mRoS_CdJ9K0qX5LbbbFJXOW-acq-et78kUxo",
  whatsapp_enabled: "false",
  whatsapp_number: "+74951352026",
  whatsapp_message: "Здравствуйте! Хочу сделать заказ.",
  telegram_enabled: "false",
  telegram_username: "",
  telegram_message: "Здравствуйте! Хочу сделать заказ.",
  seo_title: "ПилоРус — пиломатериалы от производителя в Химках",
  seo_description:
    "Производство и продажа пиломатериалов в Химках. Доска, брус, вагонка, блок-хаус, фанера. Доставка по Москве и МО за 1-3 дня. ☎ +7 (495) 135-20-26",
  palettes_enabled: "timber,forest,ocean,midnight,slate,crimson,sber,avito,amazon",
  photo_aspect_ratio: "3/4",
  card_style: "classic",
  default_palette: "sber",
  aray_enabled: "false",
};

export function getSetting(
  settings: Record<string, string>,
  key: string,
): string {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export function getPhones(settings: Record<string, string>) {
  const all = [
    {
      display: getSetting(settings, "phone"),
      tel: getSetting(settings, "phone_link"),
    },
    {
      display: getSetting(settings, "phone2"),
      tel: getSetting(settings, "phone2_link"),
    },
    {
      display: getSetting(settings, "phone3"),
      tel: getSetting(settings, "phone3_link"),
    },
  ];
  return all.filter((p) => p.display && p.tel);
}
