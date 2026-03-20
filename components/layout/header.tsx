"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ShoppingCart,
  User,
  Sun,
  Moon,
  Phone,
  Search,
  ChevronDown,
  ArrowRight,
  Handshake,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchModal } from "@/components/store/search-modal";
import { PartnershipModal } from "@/components/store/partnership-modal";
import { WishlistCount } from "@/components/store/wishlist-count";

export interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  _count?: { products: number };
}

interface HeaderProps {
  categories?: HeaderCategory[];
}

const infoLinks = [
  { label: "Доставка и оплата", href: "/delivery" },
  { label: "Акции и скидки", href: "/promotions" },
  { label: "О производстве", href: "/about" },
  { label: "Контакты", href: "/contacts" },
];

/* ── Монохромные SVG-иконки категорий ─────────────────────── */
const CAT_ICONS: Record<string, React.ReactNode> = {
  "sosna-el": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L7 9h3L6 16h5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2l5 7h-3l4 7h-5v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  "listvennitsa": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C9 7 6 9 4 10c2 0 4 1 5 2L6 19h12l-3-7c1-1 3-2 5-2-2-1-5-3-8-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M12 19v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  "kedr": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L8 8h2.5L7 14h3L8 20h8l-2-6h3l-3.5-6H16L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 20v2h4v-2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  "fanera": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="3" y="10" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ),
  "dsp-mdf-osb": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6"/>
    </svg>
  ),
  "lipa-osina": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3C8 5 5 9 5 13c0 3 2 5 5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 3c4 2 7 6 7 10 0 3-2 5-5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M12 22v-9M12 13l-3-3M12 13l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Типы материалов с SVG ─────────────────────────────────── */
const MATERIAL_TYPES = [
  { label: "Доска", type: "доска", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="2" y="14" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>
  )},
  { label: "Брус", type: "брус", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M6 6v12M18 6v12" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5"/></svg>
  )},
  { label: "Вагонка", type: "вагонка", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 7h20M2 12h20M2 17h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  )},
  { label: "Блок-хаус", type: "блок-хаус", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 8c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V8z" stroke="currentColor" strokeWidth="1.7"/><path d="M2 15c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-2z" stroke="currentColor" strokeWidth="1.7"/></svg>
  )},
  { label: "Планкен", type: "планкен", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6"/></svg>
  )},
  { label: "Фанера", type: "фанера", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="10" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/><rect x="3" y="16" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.7"/></svg>
  )},
  { label: "Строганная", type: "строганная", icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  )},
];

/* ── Популярные сечения ──────────────────────────────────────── */
const COMMON_SIZES = ["25×100", "25×150", "50×150", "50×200", "100×100", "150×150", "40×150", "50×100"];

export function Header({ categories = [] }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const catalogRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Закрываем мобильное меню при смене страницы
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Блокируем скролл при открытом мобильном меню
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const handleCatalogEnter = () => {
    clearTimeout(closeTimeout.current);
    if (categories.length > 0) setCatalogOpen(true);
  };

  const handleCatalogLeave = () => {
    closeTimeout.current = setTimeout(() => {
      setCatalogOpen(false);
      setSelectedType("");
      setSelectedSize("");
    }, 200);
  };

  const handleApplyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedType) params.set("type", selectedType);
    if (selectedSize) params.set("size", selectedSize);
    router.push(`/catalog${params.toString() ? `?${params}` : ""}`);
    setCatalogOpen(false);
    setSelectedType("");
    setSelectedSize("");
  }, [selectedType, selectedSize, router]);

  return (
    <>
      {/* Top bar */}
      <div className="bg-brand-brown text-white text-xs py-1.5 hidden md:block">
        <div className="container flex justify-between items-center">
          <span className="text-white/70">Московская обл., г. Химки, Заводская 2А, стр.28</span>
          <div className="flex items-center gap-5">
            <a href="tel:+79859707133" className="flex items-center gap-1.5 hover:text-brand-cream transition-colors font-medium">
              <Phone className="w-3 h-3" />
              8-985-970-71-33
            </a>
            <a href="tel:+79996622602" className="flex items-center gap-1.5 hover:text-brand-cream transition-colors font-medium">
              <Phone className="w-3 h-3" />
              8-999-662-26-02
            </a>
            <span className="text-white/50">09:00–18:00, ежедневно</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header
        className={cn(
          "sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border/60 transition-all duration-300",
          scrolled && "shadow-lg bg-background/95"
        )}
      >
        <div className="container flex items-center justify-between h-[68px] gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-12 h-12 lg:w-14 lg:h-14 shrink-0">
              <Image
                src="/logo.png"
                alt="ПилоРус"
                fill
                sizes="56px"
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="font-display font-bold text-lg lg:text-xl leading-tight text-foreground tracking-wide">
                ПилоРус
              </p>
              <p className="text-[10px] lg:text-[11px] text-muted-foreground leading-none hidden xs:block">
                Пиломатериалы от производителя
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {/* Catalog with mega-dropdown */}
            <div
              ref={catalogRef}
              className="relative"
              onMouseEnter={handleCatalogEnter}
              onMouseLeave={handleCatalogLeave}
            >
              <Link
                href="/catalog"
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === "/catalog" || pathname.startsWith("/catalog")
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent"
                )}
              >
                Каталог
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    catalogOpen && "rotate-180"
                  )}
                />
              </Link>

              {/* Mega-menu dropdown */}
              <AnimatePresence>
                {catalogOpen && categories.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full left-0 pt-3 z-50"
                    onMouseEnter={handleCatalogEnter}
                    onMouseLeave={handleCatalogLeave}
                  >
                    <div className="w-[680px] bg-background dark:bg-neutral-950 border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="flex">

                        {/* ── Категории ── */}
                        <div className="flex-1 p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Категории</p>
                          <div className="grid grid-cols-2 gap-1">
                            {categories.map((cat) => (
                              <Link
                                key={cat.id}
                                href={`/catalog?category=${cat.slug}`}
                                onClick={() => { setCatalogOpen(false); setSelectedType(""); setSelectedSize(""); }}
                                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-all duration-150"
                              >
                                <div className="w-8 h-8 rounded-lg bg-muted border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shrink-0">
                                  {CAT_ICONS[cat.slug] ?? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="2" y="14" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">{cat.name}</p>
                                  {cat._count && <p className="text-[11px] text-muted-foreground mt-0.5">{cat._count.products} товаров</p>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>

                        {/* ── Разделитель ── */}
                        <div className="w-px bg-border/40 my-5" />

                        {/* ── Параметры ── */}
                        <div className="w-[240px] p-5 shrink-0 flex flex-col gap-4">
                          {/* Тип */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Тип материала</p>
                            <div className="flex flex-wrap gap-1.5">
                              {MATERIAL_TYPES.map((f) => (
                                <button
                                  key={f.type}
                                  onClick={() => setSelectedType(selectedType === f.type ? "" : f.type)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                    selectedType === f.type
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "border-border bg-muted/40 text-foreground/60 hover:border-primary/40 hover:text-foreground hover:bg-accent"
                                  }`}
                                >
                                  <span className={selectedType === f.type ? "text-primary-foreground" : "text-muted-foreground"}>{f.icon}</span>
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Сечение */}
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">Сечение (мм)</p>
                            <div className="flex flex-wrap gap-1.5">
                              {COMMON_SIZES.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setSelectedSize(selectedSize === s ? "" : s)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
                                    selectedSize === s
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "border-border bg-muted/40 text-foreground/60 hover:border-primary/40 hover:text-foreground hover:bg-accent"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Кнопка */}
                          <button
                            onClick={handleApplyFilters}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all mt-auto ${
                              selectedType || selectedSize
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            {selectedType || selectedSize ? "Показать товары" : "Весь каталог"}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* ── Нижняя полоса ── */}
                      <div className="border-t border-border/40 px-5 py-2.5 bg-muted/20 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {categories.reduce((s, c) => s + (c._count?.products ?? 0), 0)} товаров в каталоге
                        </span>
                        {(selectedType || selectedSize) && (
                          <button onClick={() => { setSelectedType(""); setSelectedSize(""); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                            Сбросить
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Info links */}
            {infoLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-foreground hover:bg-accent"
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Partnership button */}
            <button
              onClick={() => setPartnershipOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-brand-orange hover:bg-brand-orange/10"
            >
              <Handshake className="w-3.5 h-3.5" />
              Сотрудничество
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Partnership button (md only) */}
            <button
              onClick={() => setPartnershipOpen(true)}
              className="hidden md:flex lg:hidden items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors px-2 rounded-lg py-1.5 hover:bg-accent"
            >
              <Handshake className="w-4 h-4 text-brand-orange" />
              <span className="text-xs">Сотрудничество</span>
            </button>

            {/* Search — hidden on mobile (есть в нижнем меню) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Поиск"
              className="hidden sm:flex"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Wishlist */}
            <WishlistCount />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Переключить тему"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Корзина"
              asChild
            >
              <Link href="/cart">
                <ShoppingCart className="w-5 h-5" />
                {mounted && totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </Link>
            </Button>

            {/* User — only desktop */}
            <Button variant="ghost" size="icon" asChild className="hidden lg:flex">
              <Link href="/cabinet" aria-label="Личный кабинет">
                <User className="w-5 h-5" />
              </Link>
            </Button>

            {/* ── Hamburger (mobile only) ── */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex flex-col items-center justify-center w-9 h-9 rounded-xl hover:bg-accent transition-colors gap-1.5 ml-0.5"
              aria-label="Открыть меню"
            >
              <span className="w-5 h-0.5 bg-foreground rounded-full transition-all" />
              <span className="w-5 h-0.5 bg-foreground rounded-full transition-all" />
              <span className="w-3.5 h-0.5 bg-foreground/60 rounded-full transition-all" />
            </button>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      {/* Partnership Modal */}
      {partnershipOpen && <PartnershipModal onClose={() => setPartnershipOpen(false)} />}

      {/* ══════════════════════════════════════════════════
          GLASSMORPHISM MOBILE MENU
      ══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-full w-[300px] max-w-[85vw] z-[201] lg:hidden flex flex-col bg-background/95 dark:bg-neutral-950/95 backdrop-blur-xl border-r border-border/60 shadow-2xl"
            >
              {/* ── Шапка ── */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                  <div className="relative w-10 h-10 shrink-0">
                    <Image src="/logo.png" alt="ПилоРус" fill sizes="40px" className="object-contain" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base leading-tight">ПилоРус</p>
                    <p className="text-[10px] text-muted-foreground">от производителя</p>
                  </div>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* ── Контент (скроллится) ── */}
              <div className="flex-1 overflow-y-auto py-4">

                {/* Звонок */}
                <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-primary/8 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Позвонить нам</p>
                  <a href="tel:+79859707133" className="flex items-center gap-2 font-display font-bold text-base text-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .27h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1-1.06a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    8-985-970-71-33
                  </a>
                  <a href="tel:+79996622602" className="flex items-center gap-2 font-medium text-sm text-muted-foreground mt-1 ml-6">
                    8-999-662-26-02
                  </a>
                </div>

                {/* Навигация */}
                <div className="px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2">Навигация</p>

                  {/* Каталог с раскрытием */}
                  <div>
                    <button
                      onClick={() => setMobileCatalogOpen(!mobileCatalogOpen)}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
                          </svg>
                        </div>
                        <span className="font-medium text-sm">Каталог</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", mobileCatalogOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {mobileCatalogOpen && categories.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="pl-5 pr-2 pb-2 space-y-0.5">
                            <Link
                              href="/catalog"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                              Все товары
                            </Link>
                            {categories.map((cat) => (
                              <Link
                                key={cat.id}
                                href={`/catalog?category=${cat.slug}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent text-sm transition-colors"
                              >
                                <span className="text-muted-foreground/60 shrink-0">
                                  {CAT_ICONS[cat.slug] ?? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="8" width="20" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>
                                  )}
                                </span>
                                <span className="flex-1 line-clamp-1">{cat.name}</span>
                                {cat._count && <span className="text-[10px] text-muted-foreground/50 shrink-0">{cat._count.products}</span>}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Остальные ссылки */}
                  {[
                    { label: "Доставка и оплата", href: "/delivery", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 4h13v13H1V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 9h4.5L22 13v4h-8V9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="5" cy="19" r="2" stroke="currentColor" strokeWidth="1.6"/><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.6"/></svg>
                    )},
                    { label: "Акции и скидки", href: "/promotions", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                    )},
                    { label: "О производстве", href: "/about", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M2 22V9L12 3L22 9V22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22v-7h6v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                    )},
                    { label: "Контакты", href: "/contacts", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.6"/></svg>
                    )},
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                        pathname === link.href ? "text-primary bg-primary/10" : "hover:bg-accent text-foreground/80 hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        pathname === link.href ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {link.icon}
                      </div>
                      {link.label}
                    </Link>
                  ))}

                  {/* Сотрудничество */}
                  <button
                    onClick={() => { setMobileMenuOpen(false); setPartnershipOpen(true); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-brand-orange hover:bg-brand-orange/10 transition-colors mt-1"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
                      <Handshake className="w-4 h-4" />
                    </div>
                    Сотрудничество
                  </button>
                </div>
              </div>

              {/* ── Подвал ── */}
              <div className="px-4 py-4 border-t border-border/60 space-y-2">
                {/* Тема */}
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 relative overflow-hidden">
                    <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                  {mounted ? (theme === "dark" ? "Светлая тема" : "Тёмная тема") : "Тема"}
                </button>

                {/* Кабинет */}
                <Link
                  href="/cabinet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  Личный кабинет
                </Link>

                <p className="text-center text-[10px] text-muted-foreground/40 pt-1">ООО ПИТИ · Химки, МО · 2025</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
