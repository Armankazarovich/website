"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  children: React.ReactNode;
}

export function AdminShell({ role, email, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-brand-brown text-white flex-col fixed top-0 left-0 h-screen z-30">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-white">ПилоРус</span>
          </Link>
          <p className="text-xs text-white/50 mt-0.5">Панель управления</p>
        </div>
        <AdminNav role={role} />
        <AdminPushPrompt />
        <div className="p-3 border-t border-white/10 space-y-1">
          <AdminPwaInstall />
          <div className="px-3 py-2 text-xs text-white/50 truncate">{email}</div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-brand-brown text-white flex items-center px-4 h-14 shadow-md">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Открыть меню"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/admin" className="ml-3">
          <span className="font-display font-bold text-lg">ПилоРус</span>
          <span className="text-xs text-white/50 ml-2">Админ</span>
        </Link>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-64 z-50 bg-brand-brown text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="font-display font-bold text-xl text-white">ПилоРус</span>
            <p className="text-xs text-white/50 mt-0.5">Панель управления</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <AdminNav role={role} onNavigate={() => setOpen(false)} />
        <AdminPushPrompt />
        <div className="p-3 border-t border-white/10 space-y-1">
          <AdminPwaInstall />
          <div className="px-3 py-2 text-xs text-white/50 truncate">{email}</div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(false)}
          >
            <LogOut className="w-4 h-4" />
            На сайт
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto lg:ml-60">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
