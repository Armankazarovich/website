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
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  CONFIRMED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  PROCESSING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  SHIPPED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  IN_DELIVERY: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300",
  READY_PICKUP: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};
