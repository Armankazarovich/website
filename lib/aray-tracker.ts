"use client";

/**
 * АРАЙ — Клиентский трекер поведения
 * Отслеживает навигацию, действия пользователя и события на сайте
 * Предоставляет контекст для ARАЙ ассистента
 */

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface ArayAction {
  type: string;           // 'click' | 'cart:add' | 'search:query' | 'product:view' | 'order:created' | другое
  timestamp: number;
  data?: Record<string, any>;
  element?: string;       // selector или текст элемента
}

export type ArayZone = "admin" | "store" | "cabinet";

export interface ArayContext {
  page: string;           // current pathname
  pageTitle: string;      // document.title
  zone: ArayZone;         // detected from pathname
  navHistory: string[];   // last 10 pages (pathnames)
  actions: ArayAction[];  // last 20 user actions
  isMobile: boolean;      // window.innerWidth < 768
  timestamp: number;      // current Date.now()
}

// ─── Глобальное состояние ────────────────────────────────────────────────────

interface TrackerState {
  currentPage: string;
  pageTitle: string;
  navHistory: string[];
  actions: ArayAction[];
  initialized: boolean;
}

let state: TrackerState = {
  currentPage: typeof window !== "undefined" ? window.location.pathname : "/",
  pageTitle: typeof window !== "undefined" ? document.title : "",
  navHistory: [],
  actions: [],
  initialized: false,
};

// ─── Определение зоны из pathname ────────────────────────────────────────────

function detectZone(pathname: string): ArayZone {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/cabinet")) return "cabinet";
  return "store";
}

// ─── Обновить текущую страницу ───────────────────────────────────────────────

function updateCurrentPage(pathname: string): void {
  state.currentPage = pathname;
  state.pageTitle = document.title;

  // Добавить в историю, если отличается от последней
  if (state.navHistory[state.navHistory.length - 1] !== pathname) {
    state.navHistory.push(pathname);
    // Сохранять только последние 10 страниц
    if (state.navHistory.length > 10) {
      state.navHistory.shift();
    }
  }
}

// ─── Добавить действие ───────────────────────────────────────────────────────

export function trackAction(type: string, data?: any): void {
  const action: ArayAction = {
    type,
    timestamp: Date.now(),
    data,
  };

  state.actions.push(action);

  // Сохранять только последние 20 действий
  if (state.actions.length > 20) {
    state.actions.shift();
  }
}

// ─── Получить контекст ───────────────────────────────────────────────────────

export function getArayContext(): ArayContext {
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

  return {
    page: state.currentPage,
    pageTitle: state.pageTitle,
    zone: detectZone(state.currentPage),
    navHistory: [...state.navHistory],
    actions: [...state.actions],
    isMobile,
    timestamp: Date.now(),
  };
}

// ─── Обработчик popstate (кнопки браузера) ──────────────────────────────────

function handlePopState(): void {
  updateCurrentPage(window.location.pathname);
}

// ─── Перехват history.pushState и history.replaceState ──────────────────────

function interceptHistoryMethods(): void {
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    const state = args[0];
    const unused = args[1];
    const url = args[2];

    // Next.js проходит pathname как третий аргумент
    if (typeof url === "string") {
      const pathname = url.split("?")[0].split("#")[0];
      updateCurrentPage(pathname);
    }

    return result;
  };

  window.history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    const state = args[0];
    const unused = args[1];
    const url = args[2];

    if (typeof url === "string") {
      const pathname = url.split("?")[0].split("#")[0];
      updateCurrentPage(pathname);
    }

    return result;
  };
}

// ─── Слушать custom события ──────────────────────────────────────────────────

function setupCustomEventListeners(): void {
  // cart:add
  document.addEventListener("cart:add", ((e: any) => {
    trackAction("cart:add", {
      productId: e.detail?.productId,
      productName: e.detail?.productName,
      quantity: e.detail?.quantity,
      price: e.detail?.price,
    });
  }) as EventListener);

  // search:query
  document.addEventListener("search:query", ((e: any) => {
    trackAction("search:query", {
      query: e.detail?.query,
      resultsCount: e.detail?.resultsCount,
    });
  }) as EventListener);

  // product:view
  document.addEventListener("product:view", ((e: any) => {
    trackAction("product:view", {
      productId: e.detail?.productId,
      productName: e.detail?.productName,
      category: e.detail?.category,
    });
  }) as EventListener);

  // order:created
  document.addEventListener("order:created", ((e: any) => {
    trackAction("order:created", {
      orderId: e.detail?.orderId,
      orderNumber: e.detail?.orderNumber,
      totalAmount: e.detail?.totalAmount,
    });
  }) as EventListener);
}

// ─── Слушать клики на [data-aray-track] ──────────────────────────────────────

function setupClickTracking(): void {
  document.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const tracked = target.closest("[data-aray-track]");

    if (tracked) {
      const trackValue = tracked.getAttribute("data-aray-track");
      const label = tracked.getAttribute("data-aray-label") || tracked.textContent?.trim() || "element";

      trackAction("click", {
        element: trackValue || label,
        label,
        url: (tracked as HTMLAnchorElement).href || undefined,
      });
    }
  });
}

// ─── Инициализация ───────────────────────────────────────────────────────────

export function initArayTracker(): void {
  if (state.initialized) return;

  // Инициализировать начальное состояние
  if (typeof window !== "undefined") {
    updateCurrentPage(window.location.pathname);
  }

  // Слушать popstate (кнопки браузера)
  window.addEventListener("popstate", handlePopState);

  // Перехватить history.pushState и history.replaceState
  interceptHistoryMethods();

  // Слушать custom события
  setupCustomEventListeners();

  // Слушать клики на элементах с data-aray-track
  setupClickTracking();

  state.initialized = true;

  // Debug: Логировать инициализацию в консоль
  if (process.env.NODE_ENV === "development") {
    console.log("[ARAY Tracker] Initialized at", new Date().toISOString());
  }
}

// ─── Вспомогательная функция: отправить контекст на сервер ──────────────────

export async function sendArayContextToServer(): Promise<void> {
  try {
    const context = getArayContext();
    await fetch("/api/aray/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ARAY Tracker] Failed to send context:", err);
    }
  }
}

// ─── Экспорт для использования в компонентах ─────────────────────────────────

/**
 * Использование в компонентах:
 *
 * 1. В root layout инициализировать:
 *    import { initArayTracker } from "@/lib/aray-tracker";
 *    useEffect(() => { initArayTracker(); }, []);
 *
 * 2. Отправить контекст ARAY:
 *    const context = getArayContext();
 *
 * 3. Отправить на сервер:
 *    await sendArayContextToServer();
 *
 * 4. Логировать действие:
 *    trackAction("custom:event", { data: "value" });
 *
 * 5. Элементы отслеживаются через:
 *    <button data-aray-track="button-name" data-aray-label="Action">Click</button>
 *
 * Custom события диспатчатся так:
 *    document.dispatchEvent(new CustomEvent("cart:add", {
 *      detail: { productId: "123", quantity: 1, price: 100 }
 *    }));
 */
