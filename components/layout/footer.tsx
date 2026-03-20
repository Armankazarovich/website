import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { PwaInstall } from "@/components/store/pwa-install";
import { FooterPartnershipButton } from "@/components/store/footer-partnership-button";
import { getSetting } from "@/lib/site-settings";

interface FooterProps {
  settings?: Record<string, string>;
}

export function Footer({ settings = {} }: FooterProps) {
  const s = (key: string) => getSetting(settings, key);
  return (
    <footer className="bg-zinc-950 text-white mt-auto border-t-[3px] border-brand-orange">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & About */}
          <div>
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12">
                <Image src="/logo.png" alt="ПилоРус" fill className="object-contain" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-white">ПилоРус</p>
                <p className="text-xs text-zinc-500">Пиломатериалы от производителя</p>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed mb-5">
              ООО «ПИТИ» — производитель пиломатериалов в Подмосковье.
              Работаем без посредников напрямую с производства.
            </p>
            <div className="flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 rounded-xl px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse shrink-0" />
              <span className="text-sm text-zinc-300">Работаем ежедневно 09:00–18:00</span>
            </div>
          </div>

          {/* Catalog */}
          <div>
            <h3 className="font-display font-semibold text-base mb-4 text-brand-orange uppercase tracking-wide">
              Каталог
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link href="/catalog?category=sosna-el" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Сосна и Ель
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=listvennitsa" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Лиственница
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=kedr" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Кедр
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=fanera" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Фанера
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=dsp-mdf-osb" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  ДСП / МДФ / ОСБ
                </Link>
              </li>
              <li>
                <Link href="/catalog?category=lipa-osina" className="hover:text-brand-orange transition-colors flex items-center gap-2 group">
                  <span className="w-1 h-1 rounded-full bg-zinc-600 group-hover:bg-brand-orange transition-colors" />
                  Липа и Осина
                </Link>
              </li>
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
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-brand-orange shrink-0" />
                <a href={`tel:${s("phone_link")}`} className="hover:text-brand-orange transition-colors">
                  {s("phone")}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-brand-orange shrink-0" />
                <a href={`mailto:${s("email")}`} className="hover:text-brand-orange transition-colors">
                  {s("email")}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-brand-orange shrink-0" />
                <span>{s("working_hours")}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* PWA Install */}
      <div className="container">
        <PwaInstall />
      </div>

      <div className="border-t border-zinc-800 mt-4">
        <div className="container py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-zinc-600">
          <p>{s("footer_copyright") || `© ${new Date().getFullYear()} ООО «ПИТИ» (ПилоРус). Все права защищены.`}</p>
          <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
            <span>ИНН {s("inn")} / ОГРН {s("ogrn")}</span>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors underline underline-offset-2">
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
