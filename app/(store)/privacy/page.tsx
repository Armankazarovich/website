import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { getSiteSettings, getSetting } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Политика конфиденциальности ПилоРус. Правила обработки персональных данных, cookie и заявок на сайте.",
  alternates: { canonical: "https://pilo-rus.ru/privacy" },
  robots: { index: false, follow: true },
};

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const phoneLink = getSetting(settings, "phone_link") || "+74993720441";
  const phoneDisplay = getSetting(settings, "phone") || "+7 (499) 372-04-41";
  const email = getSetting(settings, "email") || "info@pilo-rus.ru";
  const address = getSetting(settings, "address") || "Химки, ул. Заводская 2А, стр.28";
  const companyName = getSetting(settings, "company_name") || "ООО «ДЕРЕВОЛИДЕР»";
  const legalFullName = getSetting(settings, "legal_full_name") || companyName;
  const inn = getSetting(settings, "inn") || "7733291699";
  const ogrn = getSetting(settings, "ogrn") || "1167746624902";
  const kpp = getSetting(settings, "kpp") || "773301001";

  return (
    <div className="container max-w-3xl py-12">
      <div className="flex items-start gap-3 mb-2">
        <BackButton href="/" label="Главная" className="mt-1 mb-0 shrink-0" />
        <h1 className="font-display font-bold text-3xl sm:text-4xl">
          Политика конфиденциальности
        </h1>
      </div>
      <p className="text-muted-foreground mb-10">
        {companyName} (торговая марка ПилоРус) · ИНН {inn} · Актуальна с 11.06.2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground/90">

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">1. Общие положения</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки персональных данных пользователей сайта pilo-rus.ru (далее — «Сайт») компанией {legalFullName} (далее — «Оператор»).</p>
            <p>1.2. Оператор обрабатывает персональные данные в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
            <p>1.3. Отправляя форму на Сайте, оформляя заказ, регистрируясь или оставляя отзыв, пользователь подтверждает согласие на обработку переданных данных на условиях настоящей Политики.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">2. Какие данные мы собираем</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>2.1. При оформлении заказа или заявки на сайте мы можем собирать:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Имя и фамилия</li>
              <li>Номер телефона</li>
              <li>Адрес электронной почты</li>
              <li>Адрес доставки</li>
              <li>Наименование организации, ИНН, КПП (для юридических лиц)</li>
              <li>Текст обращения, параметры заказа, выбранные товары и отзывы</li>
            </ul>
            <p>2.2. Автоматически при посещении сайта могут собираться технические данные: IP-адрес, тип браузера, данные об устройстве, страницы посещений, источник перехода, UTM-метки и файлы cookie.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">3. Цели обработки данных</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>3.1. Оператор обрабатывает персональные данные в следующих целях:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Обработка и исполнение заказов на пиломатериалы</li>
              <li>Связь с клиентом по вопросам заказа (звонки, SMS, email)</li>
              <li>Оформление бухгалтерских документов (счет, накладная)</li>
              <li>Рассылка информации об акциях и специальных предложениях (при согласии)</li>
              <li>Улучшение работы сайта и пользовательского опыта</li>
              <li>Аналитика эффективности рекламы и качества сервиса</li>
            </ul>
            <p>3.2. Правовые основания обработки: согласие пользователя, исполнение заказа или договора, выполнение требований законодательства РФ и законный интерес Оператора по поддержке работы сайта и обработке обращений.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">4. Файлы cookie</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>4.1. Сайт использует файлы cookie — небольшие текстовые файлы, сохраняемые на вашем устройстве. Cookie помогают нам запоминать ваши настройки, товары в корзине и улучшать работу сайта.</p>
            <p>4.2. Виды используемых cookie:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Необходимые:</strong> обеспечивают базовую работу сайта (авторизация, корзина)</li>
              <li><strong>Аналитические:</strong> помогают нам понять, как посетители используют сайт</li>
              <li><strong>Функциональные:</strong> запоминают ваши предпочтения (тема оформления)</li>
            </ul>
            <p>4.3. Для аналитики и оценки рекламных переходов на Сайте может использоваться Яндекс Метрика. Оператор не передает в Метрику намеренно введенные пользователем ФИО, телефон, email или адрес доставки как идентификаторы посетителя.</p>
            <p>4.4. Вы можете отключить cookie в настройках браузера, однако это может повлиять на работу некоторых функций сайта.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">5. Передача данных третьим лицам</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>5.1. Оператор не передаёт персональные данные третьим лицам без согласия субъекта, за исключением случаев, предусмотренных законодательством РФ.</p>
            <p>5.2. Для доставки заказов данные об адресе доставки могут быть переданы транспортным компаниям-партнёрам.</p>
            <p>5.3. Для приема заявок, уведомлений, учета продаж, аналитики и поддержки сайта могут использоваться технические сервисы, которым передаются только данные, необходимые для соответствующей операции.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">6. Хранение и защита данных</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>6.1. Персональные данные хранятся на защищённых серверах и обрабатываются только уполномоченными сотрудниками.</p>
            <p>6.2. Оператор принимает технические и организационные меры для защиты данных от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>
            <p>6.3. Данные хранятся в течение срока, необходимого для выполнения целей обработки, но не дольше 3 лет с последнего взаимодействия.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">7. Права субъекта данных</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>7.1. Вы имеете право:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Получить информацию об обрабатываемых персональных данных</li>
              <li>Требовать уточнения, блокировки или уничтожения данных</li>
              <li>Отозвать согласие на обработку данных в любой момент</li>
              <li>Обратиться с жалобой в Роскомнадзор</li>
            </ul>
            <p>7.2. Для реализации прав направьте запрос на email: <a href="mailto:info@pilo-rus.ru" className="text-primary hover:underline">info@pilo-rus.ru</a></p>
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold text-xl mb-3">8. Контактная информация</h2>
          <div className="space-y-2 text-muted-foreground">
            <p>По вопросам, связанным с обработкой персональных данных, обращайтесь:</p>
            <ul className="list-none space-y-1 ml-2">
              <li><strong>Оператор:</strong> {legalFullName}</li>
              <li><strong>ОГРН:</strong> {ogrn}</li>
              <li><strong>ИНН:</strong> {inn} / <strong>КПП:</strong> {kpp}</li>
              <li><strong>Адрес:</strong> {address}</li>
              <li><strong>Email:</strong> <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a></li>
              <li><strong>Телефон:</strong> <a href={`tel:${phoneLink}`} className="text-primary hover:underline">{phoneDisplay}</a></li>
            </ul>
          </div>
        </section>

        <section className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Настоящая Политика может быть изменена Оператором в одностороннем порядке. Актуальная версия всегда доступна по адресу{" "}
            <a href="https://pilo-rus.ru/privacy" className="text-primary hover:underline">pilo-rus.ru/privacy</a>
          </p>
        </section>
      </div>
    </div>
  );
}
