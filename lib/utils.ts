import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  PROCESSING: "В обработке",
  SHIPPED: "Отгружен",
  IN_DELIVERY: "Доставляется",
  READY_PICKUP: "Готов к выдаче",
  DELIVERED: "Доставлен",
  COMPLETED: "Завершён (самовывоз)",
  CANCELLED: "Отменён",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  // Dark mode: light text on subtle backgrounds
  // Light mode: dark text on colored backgrounds (auto-inverted via CSS)
  NEW:          "bg-blue-500/15   text-blue-500   dark:text-blue-400   border border-blue-500/25 dark:border-blue-500/25",
  CONFIRMED:    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 dark:border-purple-500/25",
  PROCESSING:   "bg-amber-400/20   text-amber-700  dark:text-amber-400  border border-amber-400/50 dark:border-amber-500/25",
  SHIPPED:      "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/25 dark:border-orange-500/25",
  IN_DELIVERY:  "bg-sky-500/15    text-sky-600    dark:text-sky-400    border border-sky-500/25 dark:border-sky-500/25",
  READY_PICKUP: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25 dark:border-violet-500/25",
  DELIVERED:    "bg-green-500/15  text-green-600  dark:text-green-400  border border-green-500/25 dark:border-green-500/25",
  COMPLETED:    "bg-teal-500/15   text-teal-600   dark:text-teal-400   border border-teal-500/25 dark:border-teal-500/25",
  CANCELLED:    "bg-red-500/15    text-red-600    dark:text-red-400    border border-red-500/25 dark:border-red-500/25",
};
