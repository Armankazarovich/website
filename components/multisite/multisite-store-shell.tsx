import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Search, ShoppingCart } from "lucide-react";
import {
  getMultisitePath,
  type MultisiteSiteProfile,
} from "@/lib/multisite-sites";

type MultisiteStoreShellProps = {
  profile: MultisiteSiteProfile;
  categories: Array<{ name: string; count: number }>;
  children: React.ReactNode;
};

export function MultisiteStoreShell({
  profile,
  categories,
  children,
}: MultisiteStoreShellProps) {
  const homeHref = getMultisitePath(profile, "/");
  const catalogHref = getMultisitePath(profile, "#catalog");
  const deliveryHref = getMultisitePath(profile, "#delivery");
  const contactsHref = getMultisitePath(profile, "#contacts");
  const requestHref = getMultisitePath(profile, "#request");

  return (
    <div className="min-h-screen bg-card text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-card/92 ">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-card ">
              <Image
                src={profile.markUrl || profile.logoUrl}
                alt={profile.name}
                width={40}
                height={40}
                className="h-9 w-9 object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <Image
                src={profile.logoUrl}
                alt={profile.name}
                width={150}
                height={44}
                className="h-8 w-auto max-w-[10rem] object-contain"
                priority
              />
              <span className="block truncate text-xs font-semibold text-slate-500">
                {profile.city}
              </span>
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {[
              ["Каталог", catalogHref],
              ["Доставка", deliveryHref],
              ["Контакты", contactsHref],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
              >
                {label}
              </Link>
            ))}
          </nav>

          <a
            href={`tel:${profile.phoneHref}`}
            className="ml-auto hidden h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-card px-4 text-sm font-black text-slate-950  transition hover:border-orange-300 hover:text-orange-700 md:inline-flex lg:ml-0"
          >
            <Phone className="h-4 w-4" />
            {profile.phoneDisplay}
          </a>

          <Link
            href={requestHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-foreground  shadow-orange-600/20 transition hover:bg-orange-700"
          >
            <ShoppingCart className="h-4 w-4" />
            Заявка
          </Link>
        </div>
      </header>

      {children}

      <footer id="contacts" className="border-t border-slate-200 bg-card">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr_0.9fr] lg:px-8">
          <div>
            <Image
              src={profile.logoUrl}
              alt={profile.name}
              width={190}
              height={58}
              className="h-10 w-auto object-contain"
            />
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              {profile.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.slice(0, 5).map((category) => (
                <Link
                  key={category.name}
                  href={catalogHref}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Контакты
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <a
                href={`tel:${profile.phoneHref}`}
                className="flex items-center gap-2 font-black text-slate-950 transition hover:text-orange-700"
              >
                <Phone className="h-4 w-4" />
                {profile.phoneDisplay}
              </a>
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                {profile.address}
              </p>
              <p>{profile.workingHours}</p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Быстрый поиск
            </h2>
            <Link
              href={catalogHref}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-950 transition hover:border-orange-300 hover:bg-orange-50"
            >
              <Search className="h-4 w-4" />
              Перейти в каталог
            </Link>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Домен: {profile.domain}. Источник каталога: {profile.catalogSource}.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
