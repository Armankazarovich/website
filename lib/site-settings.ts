import { prisma } from "@/lib/prisma";

export async function getSiteSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSettings.findMany();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

// Default values
export const DEFAULT_SETTINGS: Record<string, string> = {
  phone: "8-985-970-71-33",
  phone_link: "+79859707133",
  phone2: "8-999-662-26-02",
  phone2_link: "+79996622602",
  phone3: "8-977-606-80-20",
  phone3_link: "+79776068020",
  email: "info@pilo-rus.ru",
  address: "Химки, ул. Заводская 2А, стр.28",
  address_map: "https://yandex.ru/maps/-/CHqJJGqe",
  working_hours: "Пн–Пт: 09:00–18:00, Сб: 09:00–15:00",
  company_name: "ООО ПИТИ (ПилоРус)",
  inn: "7735711780",
  ogrn: "1157746520813",
  about_text: "Производим и продаём пиломатериалы высокого качества с 2015 года. Собственное производство в Химках обеспечивает контроль качества на каждом этапе.",
  delivery_text: "Доставляем по Москве и МО собственным транспортом за 1–3 рабочих дня. Стоимость доставки рассчитывается индивидуально в зависимости от объёма и адреса.",
  footer_copyright: `© ${new Date().getFullYear()} ПилоРус. Все права защищены.`,
  contacts_description: "Мы работаем с физическими и юридическими лицами. Принимаем заказы по телефону, через сайт и электронную почту.",
  min_order: "1 м³",
  social_vk: "",
  social_telegram: "",
  social_whatsapp: "+79859707133",
  seo_title: "ПилоРус — пиломатериалы от производителя в Химках",
  seo_description: "Производство и продажа пиломатериалов в Химках. Доска, брус, вагонка, блок-хаус, фанера. Доставка по Москве и МО за 1–3 дня. ☎ 8-985-970-71-33",
  palettes_enabled: "timber,forest,ocean,midnight,slate,crimson,wildberries,ozon,yandex,aliexpress,amazon,avito,sber",
  photo_aspect_ratio: "1/1",
};

export function getSetting(settings: Record<string, string>, key: string): string {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? "";
}

export function getPhones(settings: Record<string, string>) {
  const all = [
    { display: getSetting(settings, "phone"), tel: getSetting(settings, "phone_link") },
    { display: getSetting(settings, "phone2"), tel: getSetting(settings, "phone2_link") },
    { display: getSetting(settings, "phone3"), tel: getSetting(settings, "phone3_link") },
  ];
  return all.filter((p) => p.display && p.tel);
}
