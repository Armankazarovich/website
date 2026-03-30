"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User, Bell, LogOut, ChevronRight, LayoutDashboard } from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarUser {
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  role: string;
}

const NAV_ITEMS = [
  { href: "/cabinet",                  icon: ShoppingBag, label: "Мои заказы",     desc: "История и статусы" },
  { href: "/cabinet/profile",          icon: User,        label: "Профиль",         desc: "Данные и настройки" },
  { href: "/cabinet/notifications",    icon: Bell,        label: "Уведомления",     desc: "Push-подписка" },
];

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  }
  return email[0].toUpperCase();
}

export function CabinetSidebar({ user }: { user: SidebarUser | null }) {
  const pathname = usePathname();

  return (
    <aside className="lg:w-64 shrink-0">
      {/* User card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-3">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            {getInitials(user?.name ?? null, user?.email ?? "")}
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold truncate">
              {user?.name || "Пользователь"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            {user?.phone && (
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isActive ? "bg-primary/15" : "bg-muted group-hover:bg-accent"
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-none mb-0.5 ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin link — только для сотрудников */}
      {user?.role && user.role !== "USER" && (
        <Link
          href="/admin"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-brand-orange bg-brand-orange/8 hover:bg-brand-orange/15 border border-brand-orange/25 hover:border-brand-orange/40 transition-all group mb-3"
        >
          <LayoutDashboard className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Панель управления
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      )}

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-border hover:border-destructive/20 transition-all group"
      >
        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
        Выйти из аккаунта
      </button>
    </aside>
  );
}
