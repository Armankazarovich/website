import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { PaletteProvider } from "@/components/palette-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushSubscription } from "@/components/push-subscription";
import { SwRegister } from "@/components/sw-register";
import { getSiteSettings, DEFAULT_SETTINGS, getSetting } from "@/lib/site-settings";
import { Analytics } from "@/components/analytics";
import { HapticInit } from "@/components/haptic-init";
import { UtmTracker } from "@/components/utm-tracker";
import { ThemeChromeSync } from "@/components/layout/theme-chrome-sync";
import { PwaLaunchSplash } from "@/components/layout/pwa-launch-splash";
import { UserPreferencesSync } from "@/components/user-preferences-sync";
import { PwaManifestSync } from "@/components/pwa-manifest-sync";
import {
  ADMIN_PALETTE_STORAGE_KEY,
  ALL_PALETTE_IDS,
  LEGACY_PALETTE_STORAGE_KEY,
  PILORUS_BRAND_PALETTE_ID,
  normalizePaletteId,
  normalizePaletteIds,
} from "@/lib/palettes";
import "./globals.css";

// Шрифты локальные (vendored в public/fonts/) — не зависим от fonts.gstatic.com при билде
const inter = localFont({
  src: [
    { path: "../public/fonts/inter-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/inter-cyrillic-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/inter-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/inter-cyrillic-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/inter-latin-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/inter-cyrillic-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/inter-latin-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/inter-cyrillic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

const oswald = localFont({
  src: [
    { path: "../public/fonts/oswald-latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/oswald-cyrillic-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/oswald-latin-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/oswald-cyrillic-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/oswald-latin-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/oswald-cyrillic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-oswald",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  applicationName: "ПилоРус",
  title: {
    default: "ПилоРус — Пиломатериалы от производителя",
    template: "%s | ПилоРус",
  },
  description:
    "ПилоРус — производитель пиломатериалов в Химках. Доски, брус, вагонка по ценам завода. Доставка по Москве и МО за 1-3 дня.",
  keywords: [
    "пиломатериалы", "доска", "брус", "вагонка", "купить пиломатериалы",
    "пиломатериалы от производителя", "химки", "москва", "пилорус",
  ],
  authors: [{ name: "ПилоРус" }],
  creator: "ПилоРус",
  metadataBase: new URL("https://pilo-rus.ru"),
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://pilo-rus.ru",
    siteName: "ПилоРус",
    title: "ПилоРус — Пиломатериалы от производителя",
    description: "Производитель пиломатериалов в Химках. Доставка по Москве и МО.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ПилоРус — Пиломатериалы от производителя" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ПилоРус — Пиломатериалы от производителя",
    description: "Производитель пиломатериалов в Химках.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/api/pwa/manifest?app=pilorus-site",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ПилоРус",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "ПилоРус",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F2EC" },
    { media: "(prefers-color-scheme: dark)", color: "#100B08" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual", // клавиатура не сжимает layout — fixed элементы не прыгают
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "ПилоРус",
  "legalName": DEFAULT_SETTINGS.legal_full_name,
  "image": "https://pilo-rus.ru/logo.png",
  "logo": "https://pilo-rus.ru/logo.png",
  "description": "Производитель пиломатериалов в Химках. Доска обрезная, брус, вагонка, блок-хаус напрямую с завода. Доставка по Москве и Московской области за 1-3 дня.",
  "url": "https://pilo-rus.ru",
  "telephone": [DEFAULT_SETTINGS.phone, DEFAULT_SETTINGS.phone2],
  "email": DEFAULT_SETTINGS.email,
  "taxID": DEFAULT_SETTINGS.inn,
  "vatID": DEFAULT_SETTINGS.kpp,
  "priceRange": "₽₽",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ул. Заводская 2А, стр.28",
    "addressLocality": "Химки",
    "addressRegion": "Московская область",
    "postalCode": "141400",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 55.8883,
    "longitude": 37.4297
  },
  "areaServed": [
    { "@type": "City", "name": "Москва" },
    { "@type": "AdministrativeArea", "name": "Московская область" },
    { "@type": "City", "name": "Химки" },
    { "@type": "City", "name": "Мытищи" },
    { "@type": "City", "name": "Красногорск" },
    { "@type": "City", "name": "Люберцы" },
    { "@type": "City", "name": "Балашиха" },
    { "@type": "City", "name": "Одинцово" }
  ],
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": { "@type": "GeoCoordinates", "latitude": 55.8883, "longitude": 37.4297 },
    "geoRadius": "100000"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Пиломатериалы",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Доска обрезная" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Брус" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Вагонка" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Блок-хаус" } },
      { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Доска пола" } }
    ]
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "19:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday"],
      "opens": "09:00",
      "closes": "17:00"
    }
  ],
  "sameAs": ["https://pilmos.ru"]
};

const localDevCacheResetScript =
  process.env.NODE_ENV !== "production"
    ? `
(function(){try{
  var host=location.hostname;
  var isLocal=host==="localhost"||host==="127.0.0.1"||host==="::1";
  if(!isLocal||!navigator.serviceWorker)return;
  var key="aray-local-sw-hard-reset-v3";
  if(sessionStorage.getItem(key)==="done")return;
  if(navigator.serviceWorker.controller){
    sessionStorage.setItem(key,"redirecting");
    location.replace("/sw-reset.html?next="+encodeURIComponent(location.href));
    return;
  }
  var changed=false;
  var jobs=[];
  jobs.push(navigator.serviceWorker.getRegistrations().then(function(regs){
    return Promise.all(regs.map(function(reg){changed=true;return reg.unregister().catch(function(){return false;});}));
  }).catch(function(){}));
  if(window.caches){
    jobs.push(caches.keys().then(function(keys){
      if(keys.length)changed=true;
      return Promise.all(keys.map(function(name){return caches.delete(name);}));
    }).catch(function(){}));
  }
  Promise.all(jobs).then(function(){
    sessionStorage.setItem(key,"done");
    if(changed||navigator.serviceWorker.controller)location.reload();
  });
}catch(e){}}());
`
    : null;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const yandexMetrikaId = getSetting(settings, "yandex_metrika_id");
  const googleAnalyticsId = getSetting(settings, "google_analytics_id");
  const yandexVerification = getSetting(settings, "yandex_verification");
  const googleVerification = getSetting(settings, "google_verification");
  const enabledIds = normalizePaletteIds(settings.palettes_enabled ?? DEFAULT_SETTINGS.palettes_enabled);
  const rawDefaultPalette = getSetting(settings, "default_palette");
  const preferredDefaultPalette = rawDefaultPalette === "timber" ? "sber" : rawDefaultPalette;
  const normalizedDefaultPalette = normalizePaletteId(preferredDefaultPalette, "sber");
  const defaultPalette = enabledIds.includes(normalizedDefaultPalette)
    ? normalizedDefaultPalette
    : "sber";

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {localDevCacheResetScript && (
          <script dangerouslySetInnerHTML={{ __html: localDevCacheResetScript }} />
        )}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icons/icon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="shortcut icon" href="/favicon.ico" />
        {yandexVerification && <meta name="yandex-verification" content={yandexVerification} />}
        {googleVerification && <meta name="google-site-verification" content={googleVerification} />}
        {/* Anti-flash: синхронно применяем палитру ДО гидратации React */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var adminDef=${JSON.stringify(defaultPalette)};
  var brand=${JSON.stringify(PILORUS_BRAND_PALETTE_ID)};
  var adminKey=${JSON.stringify(ADMIN_PALETTE_STORAGE_KEY)};
  var legacyKey=${JSON.stringify(LEGACY_PALETTE_STORAGE_KEY)};
  var valid=${JSON.stringify(ALL_PALETTE_IDS)};
  var isWorkspace=location.pathname.indexOf('/admin')===0||location.pathname.indexOf('/cabinet')===0;
  var stored=isWorkspace?localStorage.getItem(adminKey):null;
  var legacy=isWorkspace?localStorage.getItem(legacyKey):null;
  var themeKey='theme';
  var storedTheme=localStorage.getItem(themeKey);
  if(isWorkspace&&!storedTheme){
    localStorage.setItem(themeKey,'dark');
    storedTheme='dark';
  }
  var paintDark=storedTheme==='dark'||(storedTheme==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  if(paintDark)document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
  document.documentElement.style.backgroundColor='hsl(var(--background))';
  document.documentElement.style.colorScheme=paintDark?'dark':'light';
  if(isWorkspace&&!stored&&valid.indexOf(legacy)!==-1){
    localStorage.setItem(adminKey,legacy);
    stored=legacy;
  }
  var p=isWorkspace?(valid.indexOf(stored)!==-1?stored:adminDef):brand;
  if(isWorkspace&&stored&&valid.indexOf(stored)===-1)localStorage.removeItem(adminKey);
  if(p&&p!=='timber')document.documentElement.setAttribute('data-palette',p);
  else document.documentElement.removeAttribute('data-palette');
}catch(e){}}());
        `}} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeChromeSync />
          <PaletteProvider enabledIds={enabledIds} defaultPalette={defaultPalette}>
            <UserPreferencesSync />
            <PwaManifestSync />
            <Suspense fallback={null}>
              <PwaLaunchSplash />
            </Suspense>
            {children}
            <Toaster />
            <HapticInit />
            <UtmTracker />
            <SwRegister />
            <PushSubscription />
            <Analytics
              yandexMetrikaId={yandexMetrikaId || undefined}
              googleAnalyticsId={googleAnalyticsId || undefined}
            />
          </PaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
