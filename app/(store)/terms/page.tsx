import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Пользовательское соглашение и политика конфиденциальности",
  description: "Условия использования сайта pilo-rus.ru, политика конфиденциальности и обработки персональных данных ООО ПИТИ (ПилоРус).",
  openGraph: {
    title: "Пользовательское соглашение — ПилоРус",
    url: "https://pilo-rus.ru/terms",
    type: "website",
  },
  alternates: { canonical: "https://pilo-rus.ru/terms" },
  robots: { index: false },
};

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const phoneLink = getSetting(settings, "phone_link") || "+79859707133";
  const phoneDisplay = getSetting(settings, "phone") || "8-985-970-71-33";
  return (
    <div className="container py-12 max-w-3xl">
      <div className="flex items-start gap-3 mb-3">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-3xl">Пользовательское соглашение</h1>
      </div>
      <p className="text-muted-foreground mb-10">Редакция от 1 апреля 2025 года</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="font-display font-bold text-xl mb-3">1. Общие положения</h2>
          <p className="text-muted-foreground leading-relaxed">
            Настоящее Соглашение регулирует отношения между ООО «ПИТИ» (далее — «Компания», ОГРН/ИНН по данным ЕГРЮЛ, адрес: Московская обл., г. Химки, ул. Заводская, д. 2А, стр. 28) и пользователем сайта pilo-rus.ru (далее — «Сайт»).
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Используя Сайт, вы подтверждаете, что ознакомились с настоящим Соглашением и принимаете его условия в полном объёме.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">2. Предмет соглашения</h2>
          <p className="text-muted-foreground leading-relaxed">
            Сайт предоставляет информацию о продукции ООО «ПИТИ», позволяет оформить заявку на покупку пиломатериалов, воспользоваться калькулятором расчёта объёма и стоимости, а также связаться с менеджерами компании.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">3. Политика конфиденциальности</h2>
          <h3 className="font-semibold mb-2">3.1 Какие данные мы собираем</h3>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Имя и контактный номер телефона при оформлении заявки или регистрации</li>
            <li>Email-адрес при регистрации или подписке на уведомления</li>
            <li>Адрес доставки при оформлении заказа</li>
            <li>Технические данные: IP-адрес, тип браузера, страницы посещений (в обезличенном виде)</li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">3.2 Как мы используем данные</h3>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Обработка и исполнение заказов</li>
            <li>Связь с клиентом по вопросам заказа</li>
            <li>Отправка уведомлений об изменении статуса заказа</li>
            <li>Улучшение работы Сайта и качества обслуживания</li>
          </ul>

          <h3 className="font-semibold mt-4 mb-2">3.3 Хранение и защита данных</h3>
          <p className="text-muted-foreground leading-relaxed">
            Персональные данные хранятся на защищённых серверах на территории РФ. Мы не передаём данные третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством РФ, а также службам доставки в объёме, необходимом для исполнения заказа.
          </p>

          <h3 className="font-semibold mt-4 mb-2">3.4 Cookie-файлы</h3>
          <p className="text-muted-foreground leading-relaxed">
            Сайт использует cookie-файлы для корректной работы корзины, сохранения пользовательских настроек и аналитики посещаемости. Продолжая использовать Сайт, вы соглашаетесь на использование cookie. Вы можете отключить cookie в настройках браузера, однако это может ограничить функциональность Сайта.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">4. Права и обязанности пользователя</h2>
          <p className="text-muted-foreground leading-relaxed">Пользователь обязуется:</p>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc mt-2">
            <li>Предоставлять достоверные контактные данные при оформлении заказов</li>
            <li>Не использовать Сайт в незаконных целях</li>
            <li>Не распространять вредоносное программное обеспечение через Сайт</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">5. Права субъекта персональных данных</h2>
          <p className="text-muted-foreground leading-relaxed">
            В соответствии с ФЗ №152-ФЗ «О персональных данных» вы вправе:
          </p>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc mt-2">
            <li>Запросить информацию о хранящихся персональных данных</li>
            <li>Потребовать исправления неточных данных</li>
            <li>Отозвать согласие на обработку персональных данных</li>
            <li>Потребовать удаления ваших данных</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-2">
            Для реализации прав обратитесь по email:{" "}
            <a href="mailto:info@pilo-rus.ru" className="text-primary hover:underline">info@pilo-rus.ru</a> или по телефону{" "}
            <a href={`tel:${phoneLink}`} className="text-primary hover:underline">{phoneDisplay}</a>.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">6. Ответственность</h2>
          <p className="text-muted-foreground leading-relaxed">
            Компания не несёт ответственности за технические сбои, временную недоступность Сайта или ошибки в информации о ценах и наличии товаров. Актуальные цены и наличие уточняйте у менеджеров.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">7. Изменение соглашения</h2>
          <p className="text-muted-foreground leading-relaxed">
            Компания вправе вносить изменения в настоящее Соглашение в одностороннем порядке. Актуальная редакция размещается на данной странице. Продолжение использования Сайта после внесения изменений означает согласие с новой редакцией.
          </p>
        </section>

        <section>
          <h2 className="font-display font-bold text-xl mb-3">8. Контакты</h2>
          <div className="text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Компания:</strong> ООО «ПИТИ»</p>
            <p><strong className="text-foreground">Адрес:</strong> Московская обл., г. Химки, ул. Заводская, д. 2А, стр. 28</p>
            <p><strong className="text-foreground">Email:</strong>{" "}
              <a href="mailto:info@pilo-rus.ru" className="text-primary hover:underline">info@pilo-rus.ru</a>
            </p>
            <p><strong className="text-foreground">Телефон:</strong>{" "}
              <a href={`tel:${phoneLink}`} className="text-primary hover:underline">{phoneDisplay}</a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
