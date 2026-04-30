"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

const LIGHT_CHROME = "#F6F2EC";
const DARK_CHROME = "#100B08";

function ensureMeta(name: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }
  return meta;
}

export function ThemeChromeSync() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const color = isDark ? DARK_CHROME : LIGHT_CHROME;
    const themeColor = ensureMeta("theme-color");
    themeColor.content = color;

    const msTile = ensureMeta("msapplication-TileColor");
    msTile.content = color;

    const statusBar = ensureMeta("apple-mobile-web-app-status-bar-style");
    statusBar.content = isDark || pathname?.startsWith("/admin") ? "black-translucent" : "default";

    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
  }, [pathname, resolvedTheme]);

  return null;
}
