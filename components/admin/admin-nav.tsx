"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAdminLang } from "@/lib/admin-lang-context";
import type { TranslationKey } from "@/lib/admin-i18n";
import { ChevronDown } from "lucide-react";
import {
  allNavItems,
  getAdminGroupLabel,
  isAdminNavItemMatch as registryIsNavItemMatch,
  type NavItem,
} from "@/components/admin/admin-navigation-registry";
import { ADMIN_NAV_GROUP_ORDER } from "@/components/admin/admin-nav-structure";

export {
  ALL_ROLES,
  ALL_STAFF,
  GROUP_LABELS,
  GROUP_LABEL_KEYS,
  SA,
  allNavItems,
  getAdminGroupLabel,
} from "@/components/admin/admin-navigation-registry";
export type { NavItem } from "@/components/admin/admin-navigation-registry";

// Группы которые будут collapsible (аккордеон)
const COLLAPSIBLE_GROUPS = new Set(["arayCms", "settings", "marketing", "personal"]);

function isNavItemMatch(item: NavItem, pathname: string): boolean {
  return registryIsNavItemMatch(item, pathname);
}

function findActiveNavItem(items: NavItem[], pathname: string): NavItem | null {
  return items
    .filter((item) => isNavItemMatch(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0] || null;
}

export function AdminNav({ role, onNavigate }: { role?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["settings"]));
  const { t } = useAdminLang();
  const visibleItems = allNavItems.filter(i => !i.roles || i.roles.includes(role || ""));
  const activeItem = findActiveNavItem(visibleItems, pathname);
  const activeHref = activeItem?.href;

  // Раскрыть группу если активная страница в ней
  useEffect(() => {
    if (activeItem && COLLAPSIBLE_GROUPS.has(activeItem.group)) {
      setCollapsed(prev => { const s = new Set(prev); s.delete(activeItem.group); return s; });
    }
  }, [activeItem]);

  // Fetch pending staff count
  useEffect(() => {
    if (!role || !["SUPER_ADMIN", "ADMIN"].includes(role)) return;
    fetch("/api/admin/staff")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const members: { staffStatus?: string }[] = data.members || data;
        setPendingCount(members.filter((m) => m.staffStatus === "PENDING").length);
      })
      .catch(() => {});
  }, [role]);

  // Группировка
  const groups: { group: string; groupKey?: TranslationKey; items: NavItem[] }[] = [];
  for (const item of visibleItems) {
    let g = groups.find(g => g.group === item.group);
    if (!g) { g = { group: item.group, groupKey: item.groupKey, items: [] }; groups.push(g); }
    g.items.push(item);
  }
  groups.sort((a, b) => {
    const ai = ADMIN_NAV_GROUP_ORDER.indexOf(a.group);
    const bi = ADMIN_NAV_GROUP_ORDER.indexOf(b.group);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const toggleGroup = (group: string) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(group) ? s.delete(group) : s.add(group);
      return s;
    });
  };

  return (
    <nav className="flex-1 p-3 overflow-y-auto">
      {groups.map((g) => {
        const isCollapsible = COLLAPSIBLE_GROUPS.has(g.group);
        const isCollapsed = isCollapsible && collapsed.has(g.group);
        const groupLabel = getAdminGroupLabel(g.group, t);
        const hasActiveItem = g.items.some(i => i.href === activeHref);

        return (
          <div key={g.group}>
            {/* Group header — separator + label */}
            {g.group !== "main" && groupLabel && (
              <div
                className={`px-3 pt-4 pb-1.5 ${isCollapsible ? "cursor-pointer select-none group/gh" : ""}`}
                onClick={isCollapsible ? () => toggleGroup(g.group) : undefined}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-colors ${
                    hasActiveItem ? "text-primary/70" : "text-foreground/35 group-hover/gh:text-foreground/55"
                  }`}>
                    {groupLabel}
                  </span>
                  <div className="flex-1 aray-nav-divider" />
                  {isCollapsible && (
                    <ChevronDown className={`w-3 h-3 text-foreground/25 group-hover/gh:text-foreground/50 transition-all duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                  )}
                </div>
                {/* Превью пунктов когда свёрнуто */}
                {isCollapsible && isCollapsed && (
                  <p className="text-[10px] text-foreground/28 mt-1 leading-relaxed truncate">
                    {g.items.slice(0, 4).map(i => i.labelKey ? t(i.labelKey) : i.label).join(" · ")}
                    {g.items.length > 4 && ` +${g.items.length - 4}`}
                  </p>
                )}
              </div>
            )}

            {/* Nav items */}
            <div className={`overflow-hidden transition-all duration-200 ${
              isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[1000px] opacity-100"
            }`}>
              {g.items.map((item) => {
                const isActive = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group mb-0.5 overflow-hidden aray-icon-spin ${
                      isActive ? "aray-nav-active text-foreground" : "text-foreground/60 hover:text-foreground aray-nav-hover"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                      isActive ? "text-primary" : "text-foreground/45 group-hover:text-primary/80"
                    }`} />
                    <span className="flex-1">{item.labelKey ? t(item.labelKey) : item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold leading-none text-primary">
                        {item.badge}
                      </span>
                    )}
                    {item.href === "/admin/staff" && pendingCount > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1 rounded-full bg-amber-400 text-[10px] font-bold text-amber-950 flex items-center justify-center leading-none">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
