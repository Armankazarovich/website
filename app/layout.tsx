import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Oswald } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { PushSubscription } from "@/components/push-subscription";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const oswald = Oswald({
  subsets: ["latin", "cyrillic"],
  variable: "--font-oswald",
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
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
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
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "ПилоРус (ООО ПИТИ)",
  "image": "https://pilo-rus.ru/logo.png",
  "description": "Производитель пиломатериалов в Химках. Доска обрезная, брус, вагонка, блок-хаус напрямую с завода.",
  "url": "https://pilo-rus.ru",
  "telephone": "+7-985-970-71-33",
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
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "09:00",
    "closes": "20:00"
  },
  "sameAs": ["https://pilmos.ru"]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="shortcut icon" href="/icons/icon-192x192.png" />
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
          {children}
          <Toaster />
          <SwRegister />
          <PushSubscription />
        </ThemeProvider>
      </body>
    </html>
  );
}
