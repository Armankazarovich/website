import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Clock } from "lucide-react";
import { FooterPartnershipButton } from "@/components/store/footer-partnership-button";
import { PwaFooterBadges } from "@/components/store/pwa-footer-badges";
import { getSetting, getPhones } from "@/lib/site-settings";
import { PhoneLinks } from "@/components/shared/phone-links";

interface FooterCategory {
  id: string;
  name: string;
  slug: string;
}

interface FooterProps {
  settings?: Record<string, string>;
  categories?: FooterCategory[];
}

export function Footer({ settings = {}, categories = [] }: FooterProps) {
  const s = (key: string) => getSetting(settings, key);
  return (
    <footer className="bg-zinc-950 text-white mt-auto border-t-[3px] border-brand-orange">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & About */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-16 h-16 shrink-0">
                <Image src="/logo.png" alt="ПилоРус" fill className="object-contain" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-white">ПилоРус</p>
                <p className="text-xs text-zinc-500">Пиломатериалы от производителя</p>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              ООО «ПИТИ» — производитель пиломатериалов в Подмосковье.
              Работаем без посредников напрямую с производства.
            </p>

            {/* Share buttons — glassmorphism */}
            <div className="mb-4">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">Поделиться</p>
              <div className="flex items-center gap-2">
                <a
                  href="https://vk.com/share.php?url=https://pilo-rus.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Поделиться ВКонтакте"
                  className="w-9 h-9 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-[#0077FF]/80 hover:border-[#0077FF]/50 transition-all duration-200 flex items-center justify-center group"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400 group-hover:text-white transition-colors">
                    <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.26h-1.6c-.6 0-.79-.48-1.87-1.57-1-.93-1.4-.93-1.64-.93-.33 0-.43.1-.43.57v1.43c0 .4-.13.64-1.17.64-1.73 0-3.65-1.05-5-3-2.03-2.85-2.58-5-2.58-5.43 0-.24.1-.46.57-.46h1.6c.43 0 .59.19.75.65.83 2.38 2.2 4.47 2.77 4.47.21 0 .31-.1.31-.64V9.5c-.07-1.15-.67-1.25-.67-1.65 0-.2.16-.4.42-.4h2.52c.36 0 .48.19.48.62v3.33c0 .36.16.48.26.48.21 0 .38-.12.77-.5 1.19-1.33 2.04-3.38 2.04-3.38.11-.24.31-.46.74-.46h1.6c.48 0 .59.25.48.62-.2.93-2.13 3.65-2.13 3.65-.17.27-.23.4 0 .7.17.23.72.7 1.09 1.12.67.77 1.19 1.41 1.33 1.86.14.43-.08.65-.52.65z"/>
                  </svg>
                </a>
                <a
                  href="https://wa.me/?text=Пиломатериалы от производителя ПилоРус https://pilo-rus.ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Поделиться в WhatsApp"
                  className="w-9 h-9 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-[#25D366]/80 hover:border-[#25D366]/50 transition-all duration-200 flex items-center justify-center group"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400 group-hover:text-white transition-colors">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a
                  href="https://t.me/share/url?url=https://pilo-rus.ru&text=Пиломатериалы от производителя ПилоРус"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Поделиться в Telegram"
                  className="w-9 h-9 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-[#2AABEE]/80 hover:border-[#2AABEE]/50 transition-all duration-200 flex items-center justify-center group"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400 group-hover:text-white transition-colors">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* PWA platform badges — clickable, open install guide popup */}
            <div className="mb-5">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">Установить приложение</p>
              <PwaFooterBadges />
            </div>
          </div>

          {/* Catalog — dynamic from DB */}
          <div>
            <h3 className="font-display font-semibold text-base mb-4 text-brand-orange uppercase tracking-wide">
              Каталог
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/catalog?category=${cat.slug}`} className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link href="/catalog" className="text-zinc-300 hover:text-brand-orange transition-colors font-medium">
                  Весь каталог →
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-display font-semibold text-base mb-4 text-brand-orange uppercase tracking-wide">
              Покупателям
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link href="/delivery" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Доставка и оплата
                </Link>
              </li>
              <li>
                <Link href="/promotions" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Акции и скидки
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  О производстве
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/cabinet" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Конфиденциальность
                </Link>
              </li>
              <li className="pt-1">
                <FooterPartnershipButton />
              </li>
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="font-display font-semibold text-base mb-4 text-brand-orange uppercase tracking-wide">
              Контакты
            </h3>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-brand-orange shrink-0" />
                <span>{s("address")}</span>
              </li>
              <PhoneLinks phones={getPhones(settings)} variant="footer" />
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-orange shrink-0" />
                <a href={`mailto:${s("email")}`} className="hover:text-brand-orange transition-colors">
                  {s("email")}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-brand-orange shrink-0" />
                <span>{s("working_hours") || "Пн–Сб: 09:00–20:00, Вс: 09:00–18:00"}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800 mt-4">
        <div className="container py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-zinc-600">
          <p>{s("footer_copyright") || `© ${new Date().getFullYear()} ООО «ПИТИ» (ПилоРус). Все права защищены.`}</p>
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            <span>ИНН {s("inn") || "5047121641"} / ОГРН {s("ogrn") || "1235000042474"}</span>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors underline underline-offset-2">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors underline underline-offset-2">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
