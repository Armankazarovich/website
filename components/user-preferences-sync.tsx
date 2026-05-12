"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { usePalette } from "@/components/palette-provider";
import { ADMIN_PALETTE_STORAGE_KEY, isPaletteId } from "@/lib/palettes";

const BG_MODE_KEY = "aray-bg-mode";
const BG_MODE_MIGRATION_KEY = "aray-bg-clean-default-v2";
const SYNC_TIME_KEY = "aray-ui-preferences-updated-at";
const VALID_THEMES = new Set(["light", "dark", "system"]);

type ThemeMode = "light" | "dark" | "system";
type AdminBgMode = "clean";

type PreferencesPayload = {
  palette?: string;
  theme?: ThemeMode;
  adminBgMode?: AdminBgMode;
  updatedAt?: string;
};

function normalizeTheme(value: unknown): ThemeMode {
  return typeof value === "string" && VALID_THEMES.has(value) ? (value as ThemeMode) : "system";
}

function readBgMode(): AdminBgMode {
  if (typeof window === "undefined") return "clean";
  localStorage.setItem(BG_MODE_KEY, "clean");
  localStorage.setItem("aray-classic-mode", "1");
  return "clean";
}

function writeBgMode(_mode: AdminBgMode) {
  localStorage.setItem(BG_MODE_KEY, "clean");
  localStorage.setItem("aray-classic-mode", "1");
  window.dispatchEvent(new Event("aray-classic-change"));
}

function migrateAdminBgDefault() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(BG_MODE_MIGRATION_KEY) === "1") return;
  if (localStorage.getItem(BG_MODE_KEY) !== "clean") {
    writeBgMode("clean");
    touchLocalPreferences();
  }
  localStorage.setItem(BG_MODE_MIGRATION_KEY, "1");
}

function readLocalTimestamp() {
  const value = Number(localStorage.getItem(SYNC_TIME_KEY) || "0");
  return Number.isFinite(value) ? value : 0;
}

function touchLocalPreferences(timestamp = Date.now()) {
  localStorage.setItem(SYNC_TIME_KEY, String(timestamp));
}

export function UserPreferencesSync() {
  const { palette, setPalette } = usePalette();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith("/admin") ?? false;
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [canSync, setCanSync] = useState(false);
  const [bgMode, setBgMode] = useState<AdminBgMode>("clean");
  const applyingServerRef = useRef(false);
  const lastSavedRef = useRef("");
  const initialStateCapturedRef = useRef(false);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    migrateAdminBgDefault();
    setBgMode(readBgMode());

    const syncBg = () => setBgMode(readBgMode());
    window.addEventListener("aray-classic-change", syncBg);
    return () => window.removeEventListener("aray-classic-change", syncBg);
  }, []);

  useEffect(() => {
    bootstrappedRef.current = false;
    initialStateCapturedRef.current = false;
  }, [isAdminPath]);

  useEffect(() => {
    if (!mounted) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let alive = true;

    fetch("/api/me/preferences", { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) return null;
        if (!response.ok) return null;
        setCanSync(true);
        return response.json();
      })
      .then((data: { preferences?: PreferencesPayload } | null) => {
        if (!alive) return;

        const server = data?.preferences || {};
        const serverTimestamp = Date.parse(server.updatedAt || "") || 0;
        const localTimestamp = readLocalTimestamp();
        const localPalette = localStorage.getItem(ADMIN_PALETTE_STORAGE_KEY);
        const localTheme = normalizeTheme(localStorage.getItem("theme") || theme);
        const localBgMode = readBgMode();

        if (serverTimestamp > localTimestamp) {
          applyingServerRef.current = true;

          if (isAdminPath && server.palette && isPaletteId(server.palette)) {
            setPalette(server.palette);
          }

          if (server.theme) {
            setTheme(server.theme);
          }

          if (server.adminBgMode) {
            writeBgMode(server.adminBgMode);
            setBgMode(server.adminBgMode);
          }

          touchLocalPreferences(serverTimestamp);
          window.setTimeout(() => {
            applyingServerRef.current = false;
          }, 250);
        } else if (localTimestamp > serverTimestamp && data) {
          void savePreferences({
            ...(isAdminPath
              ? { palette: localPalette && isPaletteId(localPalette) ? localPalette : palette }
              : {}),
            theme: localTheme,
            adminBgMode: localBgMode,
          });
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });

    return () => {
      alive = false;
    };
  }, [isAdminPath, mounted, palette, setPalette, setTheme, theme]);

  useEffect(() => {
    if (!mounted || !ready || applyingServerRef.current) return;

    const next = {
      ...(isAdminPath ? { palette } : {}),
      theme: normalizeTheme(theme),
      adminBgMode: bgMode,
    };
    const serialized = JSON.stringify(next);
    if (lastSavedRef.current === serialized) return;

    if (!initialStateCapturedRef.current) {
      initialStateCapturedRef.current = true;
      lastSavedRef.current = serialized;
      return;
    }

    lastSavedRef.current = serialized;

    const timestamp = Date.now();
    touchLocalPreferences(timestamp);

    if (!canSync) return;

    const timer = window.setTimeout(() => {
      void savePreferences(next);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [bgMode, canSync, isAdminPath, mounted, palette, ready, theme]);

  return null;
}

async function savePreferences(payload: {
  palette?: string;
  theme: ThemeMode;
  adminBgMode: AdminBgMode;
}) {
  await fetch("/api/me/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}
