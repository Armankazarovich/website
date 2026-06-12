"use client";
/** * AdminMenuPopup — попап-меню админки в стиле магазинного search-modal. * * Сессия 39 (28.04.2026): после переезда на дизайн-систему магазина админка * больше не имеет постоянного sidebar. Навигация открывается из хедера по * клику на кнопку «Меню» или ⌘K / Ctrl+K. * * Стиль 1-в-1 как components/store/search-modal.tsx: * - bg-background/40 бэкдроп * - bg-card rounded-2xl border border-border shadow-2xl контейнер * - Секции с заголовками text-muted-foreground uppercase tracking-wider * - Карточки: bg-muted/50 border border-border rounded-xl * - Chip-кнопки: bg-accent rounded-full hover:bg-primary/10 * - List rows: hover:bg-accent transition-colors * * Структура: * 1. Search input (фильтрует все пункты меню) * 2. Быстрый переход — Рабочий стол, Терминал, Заказы, Управление бизнесом * 3. Группы навигации из shared admin nav structure */ import {
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  X,
  LayoutDashboard,
  ShoppingBag,
  Package,
  BookOpen,
  Megaphone,
  Settings,
  HelpCircle,
  UserCircle,
  Wallet,
} from "lucide-react";
import { ArayIcon } from "@/components/shared/aray-orb";
import { useAdminLang } from "@/lib/admin-lang-context";
import {
  ADMIN_NAV_PRIMARY_SURFACES,
  allNavItems,
  getAdminGroupLabel,
  type AdminNavigationSurface,
  type NavItem,
} from "@/components/admin/admin-navigation-registry";
import {
  ADMIN_NAV_GROUP_ORDER,
  buildAdminNavSections,
} from "@/components/admin/admin-nav-structure"; // ── Иконки для каждой группы ──
const GROUP_ICONS: Record<string, React.ElementType> = {
  main: LayoutDashboard,
  personal: UserCircle,
  sales: ShoppingBag,
  aray: ArayIcon,
  products: Package,
  content: BookOpen,
  marketing: Megaphone,
  finance: Wallet,
  arayCms: ArayIcon,
  settings: Settings,
  help: HelpCircle,
};
const ADMIN_QUICK_HREFS = [
  "/admin",
  "/admin/products",
  "/admin/suppliers",
  "/admin/promotion",
];
const USER_QUICK_HREFS = [
  "/cabinet",
  "/cabinet/orders",
  "/catalog",
  "/cabinet/profile",
];
const QUICK_HINTS_BY_HREF: Record<string, string> = {
  "/admin": "Сводка и показатели",
  "/admin/aray": "Модули, ключи и лимиты",
  "/admin/aray/orders": "Скан, заявка, превью и запуск",
  "/admin/aray/briefs": "Цели клиента, товары, фото и доступы",
  "/admin/aray/builder": "Блоки, черновик и конструктор",
  "/admin/products": "Каталог и карточки",
  "/admin/suppliers": "Продавцы, прайсы и предложения",
  "/admin/promotion": "SEO и реклама",
  "/admin/orders/new": "Терминал и новый заказ",
  "/admin/orders": "Очередь и история",
  "/admin/business/settings": "Сайт, витрина, SEO",
  "/cabinet": "Сводка кабинета",
  "/cabinet/orders": "Активные и история",
  "/catalog": "Товары магазина",
  "/cabinet/profile": "Имя, аватар, тема",
};
type AdminTranslate = (key: NonNullable<NavItem["labelKey"]>) => string;
function getNavItemLabel(item: NavItem, t: AdminTranslate) {
  return item.labelKey ? t(item.labelKey) : item.label;
}
function isNavItemVisible(item: NavItem, role: string) {
  return (!item.roles || item.roles.includes(role)) && isNavItemSurfaceVisible(item, "mobileMenu");
}
function isNavItemSurfaceVisible(item: NavItem, surface: AdminNavigationSurface) {
  return (item.surfaces || ADMIN_NAV_PRIMARY_SURFACES).includes(surface);
}
function isNavItemActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
function getGroupRank(group: string) {
  const index = ADMIN_NAV_GROUP_ORDER.indexOf(group);
  return index === -1 ? ADMIN_NAV_GROUP_ORDER.length : index;
}
interface Props {
  open: boolean;
  onClose: () => void;
  role: string;
}
export function AdminMenuPopup({ open, onClose, role }: Props) {
  const pathname = usePathname();
  const { t } = useAdminLang();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // ── Auto-focus + Escape ── useEffect(() => { if (!open) return; setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", handler); return () => document.removeEventListener("keydown", handler); }, [open, onClose]); // ── Закрыть при смене пути ── useEffect(() => { if (open) onClose(); // eslint-disable-next-line react-hooks/exhaustive-deps }, [pathname]); // ── Фильтрация ── const visible = useMemo( () => allNavItems .filter((item) => isNavItemVisible(item, role)) .sort((a, b) => getGroupRank(a.group) - getGroupRank(b.group)), [role] ); const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return visible; return visible.filter((i) => { const label = getNavItemLabel(i, t).toLowerCase(); const groupLabel = getAdminGroupLabel(i.group, t).toLowerCase(); const hint = (QUICK_HINTS_BY_HREF[i.href] || "").toLowerCase(); return label.includes(q) || groupLabel.includes(q) || hint.includes(q) || i.href.toLowerCase().includes(q); }); }, [visible, query, t]); // ── Группировка ── const groups = useMemo(() => { const map = new Map<string, NavItem[]>(); for (const item of filtered) { const arr = map.get(item.group) || []; arr.push(item); map.set(item.group, arr); } const result: { key: string; label: string; icon: React.ElementType; items: NavItem[]; sections: ReturnType<typeof buildAdminNavSections>; }[] = []; for (const key of ADMIN_NAV_GROUP_ORDER) { const items = map.get(key); if (!items || items.length === 0) continue; // Рабочий стол уже закреплен первым быстрым переходом. if (!query && key === "main") continue; result.push({ key, label: getAdminGroupLabel(key, t), icon: GROUP_ICONS[key] || LayoutDashboard, items, sections: buildAdminNavSections(key, items), }); } return result; }, [filtered, query, t]); const quickSections = useMemo(() => { const hrefs = role === "USER" ? USER_QUICK_HREFS : ADMIN_QUICK_HREFS; return hrefs .map((href) => visible.find((item) => item.href === href)) .filter((item): item is NavItem => Boolean(item)) .map((item) => ({ item, href: item.href, label: getNavItemLabel(item, t), hint: QUICK_HINTS_BY_HREF[item.href] || getAdminGroupLabel(item.group, t), icon: item.icon, })); }, [role, t, visible]); if (!open) return null; const showQuickSections = !query && quickSections.length > 0; const isEmpty = filtered.length === 0; return ( <div className="fixed inset-0 z-[200] bg-background/40 flex items-start justify-center pt-16 px-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Меню админки" > <div className="admin-popup-liquid w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()} > {/* ── Поиск ── */} <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border shrink-0"> <Search className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.75} /> <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти раздел или быстрое действие…" aria-label="Поиск по меню админки" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" style={{ fontSize: 16 }} /> <button onClick={onClose} aria-label="Закрыть меню" className="text-muted-foreground hover:text-foreground transition-colors" > <X className="w-5 h-5" strokeWidth={1.75} /> </button> </div> {/* ── Скролл контент ── */} <div className="overflow-y-auto flex-1"> {/* Быстрый переход */} {showQuickSections && ( <div className="px-4 pt-4 pb-2"> <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1"> Быстрый переход </h3> <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"> {quickSections.map((section) => { const isActive = isNavItemActive(section.item, pathname); const Icon = section.icon; return ( <Link key={section.href} href={section.href} onClick={onClose} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${ isActive ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-border hover:bg-accent" }`} > <div className="w-10 h-10 rounded-xl aray-icon-tone flex items-center justify-center shrink-0"> <Icon className="w-5 h-5" strokeWidth={1.75} /> </div> <div className="min-w-0 flex-1"> <p className={`text-sm font-medium leading-tight truncate ${isActive ? "text-primary" : "text-foreground"}`}> {section.label} </p> <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.hint}</p> </div> </Link> ); })} </div> </div> )} {/* Группы */} {groups.length > 0 && ( <div className="px-4 py-2"> {groups.map((g) => { const Icon = g.icon; const showSectionLabels = g.sections.length > 1; return ( <div key={g.key} className="mb-3"> <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1.5"> <Icon className="w-3 h-3 opacity-60" strokeWidth={2} /> <span className="min-w-0 truncate">{g.label}</span> </h3> <div className="rounded-xl border border-border bg-card p-1.5"> {g.sections.map((section, sectionIndex) => ( <div key={section.label} className={sectionIndex > 0 ? "border-t border-border/70 pt-2 mt-2" : ""} > {showSectionLabels && ( <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75 truncate"> {section.label} </p> )} <div className="space-y-1"> {section.items.map((item) => { const isActive = isNavItemActive(item, pathname); const ItemIcon = item.icon; const label = getNavItemLabel(item, t); return ( <Link key={item.href} href={item.href} onClick={onClose} className={`flex min-h-[2.75rem] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${ isActive ? "bg-primary/8" : "hover:bg-accent" }`} > <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} /> <span className="flex min-w-0 flex-1 items-center gap-2"> <span className={`min-w-0 truncate text-sm ${isActive ? "text-foreground font-medium" : "text-foreground/85"}`} > {label} </span> {item.badge && ( <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary"> {item.badge} </span> )} </span> {isActive && ( <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> )} </Link> ); })} </div> </div> ))} </div> </div> ); })} </div> )} {/* Empty state */} {isEmpty && query && ( <div className="px-4 py-10 text-center"> <p className="text-sm text-muted-foreground"> По запросу «{query}» ничего не найдено </p> <button onClick={() => setQuery("")} className="mt-2 text-primary hover:underline text-xs" > Сбросить </button> </div> )} </div> {/* Подсказка ⌘K */} <div className="px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between gap-3 shrink-0"> <span>Esc — закрыть</span> <span className="min-w-0 truncate text-right"> <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">⌘</kbd> <span className="mx-1">+</span> <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">K</kbd> <span className="ml-1.5 hidden sm:inline">— открыть из любого места</span> </span> </div> </div> </div> );
}
