"use client";

import { useEffect } from "react";
import { parseAttributionFromUrl, saveFirstTouch } from "@/lib/utm";

/**
 * Лёгкий компонент (ноль рендера) — на клиентском mount читает URL + referrer,
 * и если найдены UTM/gclid/yclid или внешний реферер, сохраняет first-touch attribution в localStorage.
 * Далее при оформлении заказа checkout прикрепит эти метки к заказу.
 *
 * Зачем first-touch: клиент приходит с рекламы → уходит → возвращается через поиск → покупает.
 * Мы хотим приписать заказ РЕКЛАМЕ (первый касание), не поиску.
 */
export function UtmTracker() {
  useEffect(() => {
    try {
      const url = window.location.href;
      const referrer = document.referrer || null;
      const attribution = parseAttributionFromUrl(url, referrer);
      if (attribution) {
        saveFirstTouch(attribution);
      }
    } catch {
      // noop
    }
  }, []);

  return null;
}
