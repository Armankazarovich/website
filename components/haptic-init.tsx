"use client";

import { useEffect } from "react";
import { initGlobalHaptics } from "@/lib/haptic";

/**
 * Подключает глобальный haptic feedback одним разом.
 * Все кнопки и ссылки автоматически вибрируют при тапе на мобильном.
 */
export function HapticInit() {
  useEffect(() => {
    initGlobalHaptics();
  }, []);

  return null;
}
