import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Oswald } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { PaletteProvider } from "@/components/palette-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushSubscription } from "@/components/push-subscription";
import { SwRegister } from "@/components/sw-register";
import { getSiteSettings, DEFAULT_SETTINGS, getSetting } from "@/lib/site-settings";
import { Analytics } from "@/components/analytics";
import { HapticInit } from "@/components/haptic-init";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "cyrillic"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
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
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icons/icon-192x192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ПилоРус",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8700A",
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
  "name": "ПилоРус (ООО ПИТИ)",
  "image": "https://pilo-rus.ru/logo.png",
  "logo": "https://pilo-rus.ru/logo.png",
  "description": "Производитель пиломатериалов в Химках. Доска обрезная, брус, вагонка, блок-хаус напрямую с завода. Доставка по Москве и Московской области за 1-3 дня.",
  "url": "https://pilo-rus.ru",
  "telephone": ["+7-985-970-71-33", "+7-999-662-26-02"],
  "email": "info@pilo-rus.ru",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const yandexMetrikaId = getSetting(settings, "yandex_metrika_id");
  const googleAnalyticsId = getSetting(settings, "google_analytics_id");
  const yandexVerification = getSetting(settings, "yandex_verification");
  const googleVerification = getSetting(settings, "google_verification");
  const enabledIds = (settings.palettes_enabled ?? DEFAULT_SETTINGS.palettes_enabled)
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const defaultPalette = getSetting(settings, "default_palette") || "timber";

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/aray-192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/icons/aray-96.png" type="image/png" sizes="96x96" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/aray-apple-touch.png" sizes="180x180" />
        <link rel="shortcut icon" href="/icons/aray-192.png" />
        {yandexVerification && <meta name="yandex-verification" content={yandexVerification} />}
        {googleVerification && <meta name="google-site-verification" content={googleVerification} />}
        {/* Anti-flash: синхронно применяем палитру ДО гидратации React */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var allowed=${JSON.stringify(enabledIds)};
  var def=${JSON.stringify(defaultPalette)};
  var stored=localStorage.getItem('color-palette');
  var p=(stored&&allowed.includes(stored))?stored:def;
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
          <PaletteProvider enabledIds={enabledIds} defaultPalette={defaultPalette}>
            {children}
            <Toaster />
            <HapticInit />
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
