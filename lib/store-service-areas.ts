export type StoreServiceArea = {
  slug: string;
  name: string;
  to: string;
  where: string;
  distanceKm: number;
  deliveryWindow: string;
  routeHint: string;
};

export const STORE_SERVICE_AREAS: StoreServiceArea[] = [
  { slug: "moscow", name: "Москва", to: "в Москву", where: "в Москве", distanceKm: 22, deliveryWindow: "1-2 дня", routeHint: "МКАД, Ленинградское шоссе и городские адреса" },
  { slug: "khimki", name: "Химки", to: "в Химки", where: "в Химках", distanceKm: 0, deliveryWindow: "в день согласования или 1 день", routeHint: "самовывоз со склада и короткая доставка по Химкам" },
  { slug: "krasnogorsk", name: "Красногорск", to: "в Красногорск", where: "в Красногорске", distanceKm: 18, deliveryWindow: "1-2 дня", routeHint: "через МКАД, Волоколамское или Новорижское направление" },
  { slug: "dolgoprudny", name: "Долгопрудный", to: "в Долгопрудный", where: "в Долгопрудном", distanceKm: 12, deliveryWindow: "1-2 дня", routeHint: "через Лихачевское шоссе и север Москвы" },
  { slug: "lobnya", name: "Лобня", to: "в Лобню", where: "в Лобне", distanceKm: 20, deliveryWindow: "1-2 дня", routeHint: "через Дмитровское или Ленинградское направление" },
  { slug: "mytishchi", name: "Мытищи", to: "в Мытищи", where: "в Мытищах", distanceKm: 27, deliveryWindow: "1-2 дня", routeHint: "через МКАД и Ярославское шоссе" },
  { slug: "balashikha", name: "Балашиха", to: "в Балашиху", where: "в Балашихе", distanceKm: 43, deliveryWindow: "1-3 дня", routeHint: "через МКАД и восточное направление" },
  { slug: "korolev", name: "Королёв", to: "в Королёв", where: "в Королёве", distanceKm: 34, deliveryWindow: "1-2 дня", routeHint: "через Ярославское шоссе" },
  { slug: "pushkino", name: "Пушкино", to: "в Пушкино", where: "в Пушкино", distanceKm: 42, deliveryWindow: "1-3 дня", routeHint: "по Ярославскому направлению" },
  { slug: "shchelkovo", name: "Щёлково", to: "в Щёлково", where: "в Щёлково", distanceKm: 50, deliveryWindow: "1-3 дня", routeHint: "через Щёлковское шоссе" },
  { slug: "reutov", name: "Реутов", to: "в Реутов", where: "в Реутове", distanceKm: 35, deliveryWindow: "1-2 дня", routeHint: "через МКАД и Носовихинское направление" },
  { slug: "lyubertsy", name: "Люберцы", to: "в Люберцы", where: "в Люберцах", distanceKm: 45, deliveryWindow: "1-3 дня", routeHint: "через МКАД и юго-восток Москвы" },
  { slug: "kotelniki", name: "Котельники", to: "в Котельники", where: "в Котельниках", distanceKm: 48, deliveryWindow: "1-3 дня", routeHint: "через МКАД и Новорязанское шоссе" },
  { slug: "dzerzhinsky", name: "Дзержинский", to: "в Дзержинский", where: "в Дзержинском", distanceKm: 49, deliveryWindow: "1-3 дня", routeHint: "через МКАД и юго-восточное направление" },
  { slug: "vidnoe", name: "Видное", to: "в Видное", where: "в Видном", distanceKm: 44, deliveryWindow: "1-3 дня", routeHint: "через МКАД и юг Москвы" },
  { slug: "podolsk", name: "Подольск", to: "в Подольск", where: "в Подольске", distanceKm: 63, deliveryWindow: "1-3 дня", routeHint: "через МКАД и Симферопольское шоссе" },
  { slug: "domodedovo", name: "Домодедово", to: "в Домодедово", where: "в Домодедово", distanceKm: 68, deliveryWindow: "1-3 дня", routeHint: "через Каширское направление" },
  { slug: "odintsovo", name: "Одинцово", to: "в Одинцово", where: "в Одинцово", distanceKm: 38, deliveryWindow: "1-3 дня", routeHint: "через МКАД, Минское или Можайское шоссе" },
  { slug: "zvenigorod", name: "Звенигород", to: "в Звенигород", where: "в Звенигороде", distanceKm: 58, deliveryWindow: "1-3 дня", routeHint: "через Новорижское или Минское направление" },
  { slug: "istra", name: "Истра", to: "в Истру", where: "в Истре", distanceKm: 55, deliveryWindow: "1-3 дня", routeHint: "по Новорижскому направлению" },
  { slug: "dedovsk", name: "Дедовск", to: "в Дедовск", where: "в Дедовске", distanceKm: 37, deliveryWindow: "1-3 дня", routeHint: "через Волоколамское направление" },
  { slug: "solnechnogorsk", name: "Солнечногорск", to: "в Солнечногорск", where: "в Солнечногорске", distanceKm: 48, deliveryWindow: "1-3 дня", routeHint: "по Ленинградскому шоссе" },
  { slug: "klin", name: "Клин", to: "в Клин", where: "в Клину", distanceKm: 76, deliveryWindow: "1-3 дня", routeHint: "по Ленинградскому направлению" },
  { slug: "dmitrov", name: "Дмитров", to: "в Дмитров", where: "в Дмитрове", distanceKm: 65, deliveryWindow: "1-3 дня", routeHint: "через Дмитровское шоссе" },
  { slug: "sergiev-posad", name: "Сергиев Посад", to: "в Сергиев Посад", where: "в Сергиевом Посаде", distanceKm: 83, deliveryWindow: "1-3 дня", routeHint: "через Ярославское направление" },
  { slug: "ramenskoe", name: "Раменское", to: "в Раменское", where: "в Раменском", distanceKm: 72, deliveryWindow: "1-3 дня", routeHint: "через юго-восточное направление" },
  { slug: "zhukovsky", name: "Жуковский", to: "в Жуковский", where: "в Жуковском", distanceKm: 67, deliveryWindow: "1-3 дня", routeHint: "через Новорязанское направление" },
  { slug: "elektrostal", name: "Электросталь", to: "в Электросталь", where: "в Электростали", distanceKm: 80, deliveryWindow: "1-3 дня", routeHint: "через Горьковское направление" },
  { slug: "noginsk", name: "Ногинск", to: "в Ногинск", where: "в Ногинске", distanceKm: 74, deliveryWindow: "1-3 дня", routeHint: "через Горьковское шоссе" },
  { slug: "kolomna", name: "Коломна", to: "в Коломну", where: "в Коломне", distanceKm: 130, deliveryWindow: "2-3 дня", routeHint: "через Новорязанское направление" },
  { slug: "serpukhov", name: "Серпухов", to: "в Серпухов", where: "в Серпухове", distanceKm: 117, deliveryWindow: "2-3 дня", routeHint: "через Симферопольское шоссе" },
  { slug: "chekhov", name: "Чехов", to: "в Чехов", where: "в Чехове", distanceKm: 90, deliveryWindow: "1-3 дня", routeHint: "через Симферопольское направление" },
  { slug: "naro-fominsk", name: "Наро-Фоминск", to: "в Наро-Фоминск", where: "в Наро-Фоминске", distanceKm: 83, deliveryWindow: "1-3 дня", routeHint: "через Киевское направление" },
  { slug: "voskresensk", name: "Воскресенск", to: "в Воскресенск", where: "в Воскресенске", distanceKm: 106, deliveryWindow: "2-3 дня", routeHint: "через Новорязанское направление" },
  { slug: "orekhovo-zuevo", name: "Орехово-Зуево", to: "в Орехово-Зуево", where: "в Орехово-Зуево", distanceKm: 112, deliveryWindow: "2-3 дня", routeHint: "через Горьковское направление" },
  { slug: "egoryevsk", name: "Егорьевск", to: "в Егорьевск", where: "в Егорьевске", distanceKm: 134, deliveryWindow: "2-3 дня", routeHint: "через Егорьевское направление" },
];

export function getServiceAreaBySlug(slug: string) {
  return STORE_SERVICE_AREAS.find((area) => area.slug === slug);
}

export function getPrimaryServiceAreas(limit = 18) {
  return STORE_SERVICE_AREAS.slice(0, limit);
}
