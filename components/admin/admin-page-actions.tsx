"use client";

/**
 * AdminPageActions — система контекстных действий страниц админки.
 *
 * Сессия 39 (28.04.2026), Заход 6 — единый паттерн action-кнопок.
 * Видение Армана: "одна кнопка назад в хедере спасёт от тысячи",
 * "вместо тысячи кнопок Обновить — одна в хедере".
 *
 * Как это работает:
 *  1. AdminShell оборачивает контент в <AdminPageActionsProvider>
 *  2. AppHeader читает actions/onRefresh из контекста и рендерит
 *     кнопки в left/right слотах
 *  3. Страницы регистрируют свои actions через хук:
 *
 *     useAdminPageActions({
 *       onRefresh: () => router.refresh(),
 *       actions: [
 *         { id: "create", label: "Создать", icon: Plus, onClick: ... },
 *         { id: "export", label: "Экспорт", icon: Download, onClick: ... },
 *       ],
 *     });
 *
 *  4. При unmount страницы actions автоматически очищаются
 *  5. На мобилке actions схлопываются в overflow menu
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

export type AdminAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  /** primary | ghost — primary рисуется синей кнопкой, ghost — outline */
  variant?: "primary" | "ghost";
  /** Скрыть на мобилке (например для редко используемых) */
  hideOnMobile?: boolean;
  /** Disabled state */
  disabled?: boolean;
};

export type AdminHeaderMeta = {
  title?: string;
  subtitle?: string;
  badge?: string;
  backLabel?: string;
  backHref?: string;
  logoSrc?: string;
  logoAlt?: string;
  context?: ReactNode;
  contextKey?: string;
};

type Ctx = {
  onRefresh: (() => void) | null;
  actions: AdminAction[];
  headerMeta: AdminHeaderMeta | null;
  setOnRefresh: (handler: (() => void) | null) => void;
  setActions: (actions: AdminAction[]) => void;
  setHeaderMeta: (meta: AdminHeaderMeta | null) => void;
};

const PageActionsContext = createContext<Ctx | null>(null);

export function AdminPageActionsProvider({ children }: { children: ReactNode }) {
  const [onRefresh, setOnRefreshState] = useState<(() => void) | null>(null);
  const [actions, setActionsState] = useState<AdminAction[]>([]);
  const [headerMeta, setHeaderMetaState] = useState<AdminHeaderMeta | null>(null);

  const setOnRefresh = useCallback((handler: (() => void) | null) => {
    setOnRefreshState(() => handler);
  }, []);

  const setActions = useCallback((next: AdminAction[]) => {
    setActionsState(next);
  }, []);

  const setHeaderMeta = useCallback((next: AdminHeaderMeta | null) => {
    setHeaderMetaState(next);
  }, []);

  const value = useMemo(
    () => ({ onRefresh, actions, headerMeta, setOnRefresh, setActions, setHeaderMeta }),
    [onRefresh, actions, headerMeta, setOnRefresh, setActions, setHeaderMeta]
  );

  return (
    <PageActionsContext.Provider value={value}>
      {children}
    </PageActionsContext.Provider>
  );
}

/**
 * Хук для чтения текущих actions (используется AppHeader).
 * Безопасный — если провайдер не обёрнут, возвращает пустое.
 */
export function useAdminPageActionsState() {
  const ctx = useContext(PageActionsContext);
  return {
    onRefresh: ctx?.onRefresh ?? null,
    actions: ctx?.actions ?? [],
    headerMeta: ctx?.headerMeta ?? null,
  };
}

/**
 * Хук для регистрации actions/refresh со страницы.
 * Автоматически чистит actions при unmount.
 *
 * Пример:
 *   const router = useRouter();
 *   useAdminPageActions({
 *     onRefresh: () => router.refresh(),
 *     actions: [
 *       { id: "new", label: "Новый заказ", icon: Plus, onClick: ..., variant: "primary" },
 *     ],
 *   });
 */
export function useAdminPageActions(config: {
  onRefresh?: () => void;
  actions?: AdminAction[];
}) {
  const ctx = useContext(PageActionsContext);
  const setOnRefresh = ctx?.setOnRefresh;
  const setActions = ctx?.setActions;
  // Stable refs чтобы избежать infinite loop из-за inline-функций
  const refreshRef = useRef(config.onRefresh);
  const actionsRef = useRef(config.actions);
  refreshRef.current = config.onRefresh;
  actionsRef.current = config.actions;

  useEffect(() => {
    if (!setOnRefresh || !setActions) return;
    setOnRefresh(refreshRef.current ? () => refreshRef.current?.() : null);
    setActions(actionsRef.current ?? []);
    return () => {
      setOnRefresh(null);
      setActions([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOnRefresh, setActions, JSON.stringify((config.actions ?? []).map((a) => a.id)), Boolean(config.onRefresh)]);
}

export function useAdminPageHeader(config: AdminHeaderMeta | null) {
  const ctx = useContext(PageActionsContext);
  const setHeaderMeta = ctx?.setHeaderMeta;
  const headerRef = useRef(config);
  headerRef.current = config;

  useEffect(() => {
    if (!setHeaderMeta) return;
    setHeaderMeta(headerRef.current);
    return () => setHeaderMeta(null);
  }, [
    setHeaderMeta,
    config?.title,
    config?.subtitle,
    config?.badge,
    config?.backLabel,
    config?.backHref,
    config?.logoSrc,
    config?.logoAlt,
    config?.contextKey,
  ]);
}
