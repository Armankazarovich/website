"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaInstall } from "@/components/admin/admin-pwa-install";
import { AdminPushPrompt } from "@/components/admin/admin-push-prompt";
import { usePalette, PALETTES } from "@/components/palette-provider";

interface AdminShellProps {
  role: string;
  email: string | null | undefined;
  children: React.ReactNode;
}

export function AdminShell({ role, email, children }: AdminShellProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();

  return (
    <div className="flex min-h-screen aray-admin-bg">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 aray-sidebar text-white flex-col fixed top-0 left-0 h-screen z-30 relative">
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
          {/* Compact palette + theme row */}
          <div className="px-3 py-2">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Тема</p>
            <div className="flex items-center gap-1 flex-wrap">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  title={p.name}
                  className={`w-5 h-5 rounded-md transition-all ${
                    palette === p.id
                      ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110"
                      : "opacity-50 hover:opacity-90 hover:scale-105"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                />
              ))}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all opacity-60 hover:opacity-100"
              >
                {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="px-3 py-1 text-[11px] text-white/40 truncate">{email}</div>
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 aray-sidebar text-white flex items-center px-4 h-14 shadow-md">
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
        className={`lg:hidden fixed top-0 left-0 h-full w-64 z-50 aray-sidebar text-white flex flex-col transform transition-transform duration-300 ease-in-out relative ${
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
          {/* Compact palette + theme row */}
          <div className="px-3 py-2">
            <p className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Тема</p>
            <div className="flex items-center gap-1 flex-wrap">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  title={p.name}
                  className={`w-5 h-5 rounded-md transition-all ${
                    palette === p.id
                      ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-110"
                      : "opacity-50 hover:opacity-90 hover:scale-105"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${p.sidebar} 50%, ${p.accent} 50%)` }}
                />
              ))}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                className="w-5 h-5 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all opacity-60 hover:opacity-100"
              >
                {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="px-3 py-1 text-[11px] text-white/40 truncate">{email}</div>
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
