# ARAY Design System — Справочник стилей

> Этот файл — стандарт для ВСЕХ новых компонентов и страниц.
> Всегда смотри сюда перед добавлением новой фичи.

---

## 1. Цвета и тема

### Primary (оранжевый брендовый цвет)
```tsx
text-primary          // основной текст акцента
text-primary/70       // приглушённый акцент
bg-primary            // заливка кнопок
bg-primary/10         // очень лёгкий фон (светлая тема)
bg-primary/15         // минимальный фон (тёмная тема) — НЕ /5, это невидимо!
bg-primary/25         // графики, индикаторы
hover:bg-primary/90   // hover на кнопках с bg-primary
border-primary/40     // акцентная рамка
ring-primary/25       // focus ring
hsl(var(--primary))   // CSS переменная для inline-стилей
hsl(var(--primary)/0.15) // inline версия bg-primary/15
```

### Семантические статусные цвета (заказы, лиды)
```tsx
// Работают И в светлой И в тёмной теме (прозрачные):
NEW:          "bg-blue-500/15   text-blue-400   border border-blue-500/25"
CONFIRMED:    "bg-purple-500/15 text-purple-400 border border-purple-500/25"
PROCESSING:   "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
SHIPPED:      "bg-orange-500/15 text-orange-400 border border-orange-500/25"
IN_DELIVERY:  "bg-sky-500/15    text-sky-400    border border-sky-500/25"
READY_PICKUP: "bg-violet-500/15 text-violet-400 border border-violet-500/25"
DELIVERED:    "bg-green-500/15  text-green-400  border border-green-500/25"
COMPLETED:    "bg-teal-500/15   text-teal-400   border border-teal-500/25"
CANCELLED:    "bg-red-500/15    text-red-400    border border-red-500/25"
```

### ЗАПРЕЩЕНО в UI-хроме:
```
❌ text-blue-400/500    → ✅ text-primary/70
❌ bg-blue-100          → ✅ bg-primary/10
❌ bg-blue-50           → ✅ bg-primary/10
❌ border-blue-400      → ✅ border-primary/40
❌ ring-blue-400        → ✅ ring-primary/25
❌ hover:bg-blue-500/15 → ✅ hover:bg-primary/15
❌ bg-primary/5         → ✅ bg-primary/15 (5% невидимо в оранжевой теме!)
```

---

## 2. Dark Glass (Nature Mode)

Все карточки, инпуты, модалки АВТОМАТИЧЕСКИ получают тёмное стекло через CSS.
Не нужно добавлять вручную — только нужные классы:

```tsx
// Карточка (автоматически тёмная в nature-mode):
className="bg-card rounded-2xl border border-border p-4"

// Инпут (автоматически тёмный в nature-mode):
className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl
           focus:outline-none focus:ring-2 focus:ring-primary/30"

// Кнопка выбора (active state):
className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
  active
    ? "border-primary/70 bg-card"
    : "border-border bg-card hover:bg-accent"
}`}
style={active ? { boxShadow: "inset 0 0 0 1.5px hsl(var(--primary)/0.35), 0 0 16px hsl(var(--primary)/0.12)" } : undefined}
```

---

## 3. Типография

```tsx
// Заголовок раздела (скрывается в nature-mode на desktop):
<h1 className="text-2xl font-bold">Раздел</h1>

// Заголовок карточки:
<p className="font-display font-semibold text-lg">Заголовок</p>

// Подпись:
<p className="text-xs text-muted-foreground">Подпись</p>

// Акцентный текст:
<p className="text-sm font-semibold text-primary">Акцент</p>

// Моноширинный (цены, коды):
<span className="font-mono tabular-nums">123 456 ₽</span>
```

### Шрифт-дисплей (Playfair Display):
```tsx
// Только для больших цифр/заголовков:
className="font-display font-bold text-2xl"
```

---

## 4. Иконки

Используем ТОЛЬКО Lucide React:
```tsx
import { ShoppingCart, Package, Users, Star, ... } from "lucide-react";

// Размеры:
w-3.5 h-3.5  // мелкие (в тексте)
w-4 h-4      // стандартные (в кнопках)
w-5 h-5      // крупные (заголовки секций)
w-6 h-6      // иконки в больших карточках
w-8 h-8      // иллюстративные иконки

// Цвета:
text-primary         // акцентные
text-muted-foreground // нейтральные
text-destructive     // удаление/ошибки
```

---

## 5. Кнопки

```tsx
// Primary (главное действие):
<button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground
                   rounded-xl text-sm font-semibold hover:bg-primary/90
                   transition-colors active:scale-[0.98] disabled:opacity-40">
  <Icon className="w-4 h-4" /> Действие
</button>

// Secondary (вторичное):
<button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground
                   rounded-xl text-sm font-semibold hover:bg-muted/80 transition-colors">
  <Icon className="w-4 h-4" /> Действие
</button>

// Destructive (удаление):
<button className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground
                   rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors">
  <Trash2 className="w-4 h-4" /> Удалить
</button>

// Ghost (призрачная):
<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border
                   border-border text-muted-foreground hover:text-foreground hover:border-primary/30
                   transition-colors">
  <Icon className="w-3.5 h-3.5" /> Действие
</button>

// Icon-only:
<button className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground
                   hover:text-foreground hover:bg-muted/50 transition-colors">
  <Icon className="w-4 h-4" />
</button>
```

### Мобильные touch targets (ОБЯЗАТЕЛЬНО):
```tsx
// Минимум 44px высота на мобильных:
className="min-h-[44px] px-4 py-2.5 ..."

// Для маленьких кнопок используй padding:
className="p-3 ..."  // 12px со всех сторон = 44px если иконка 20px
```

---

## 6. Карточки

```tsx
// Базовая карточка:
<div className="bg-card rounded-2xl border border-border p-4">

// Кликабельная карточка:
<div className="bg-card rounded-2xl border border-border p-4 cursor-pointer
                hover:border-primary/40 active:scale-[0.99] transition-all">

// Карточка с акцентом (метрика):
<div className="bg-card rounded-2xl border border-border p-5">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
       style={{ background: "hsl(var(--primary)/0.12)" }}>
    <Icon className="w-5 h-5 text-primary" />
  </div>
  <p className="text-3xl font-display font-bold leading-tight">42</p>
  <p className="text-sm text-muted-foreground mt-1">Описание метрики</p>
</div>

// Предупреждение (alert):
<div className="flex items-center gap-3 px-4 py-3.5 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl">
  <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
  <p className="text-sm text-yellow-700 dark:text-yellow-300">Текст предупреждения</p>
</div>
```

---

## 7. Инпуты и формы

```tsx
// Текстовый инпут:
<input
  type="text"
  placeholder="Плейсхолдер..."
  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl
             focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
/>

// С иконкой поиска:
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <input
    type="text"
    placeholder="Поиск..."
    className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-xl
               focus:outline-none focus:ring-2 focus:ring-primary/30"
  />
</div>

// Textarea:
<textarea
  rows={3}
  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl
             focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
/>

// Select:
<select className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl
                   focus:outline-none focus:ring-2 focus:ring-primary/30">
  <option>Вариант</option>
</select>

// Label:
<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
  Название поля
</label>

// ВАЖНО: font-size на мобильных инпутах = 16px (иначе iOS делает zoom)
// Уже настроено глобально в globals.css через media query
```

---

## 8. Таблицы

```tsx
// Всегда оборачивать в overflow-x-auto:
<div className="bg-card rounded-2xl border border-border overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="text-left px-4 py-3 font-semibold">Колонка</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        <tr className="hover:bg-muted/30 transition-colors cursor-pointer">
          <td className="px-4 py-3">Данные</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

// МОБИЛЬНАЯ версия (обязательна при > 4 колонках):
// Карточки с md:hidden, таблица с hidden md:block
<div className="md:hidden space-y-2">
  {items.map(item => (
    <div key={item.id} className="bg-card rounded-2xl border border-border p-4 cursor-pointer">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{item.name}</p>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
    </div>
  ))}
</div>
<div className="hidden md:block">
  {/* обычная таблица */}
</div>
```

---

## 9. Статусные бейджи

```tsx
// Бейдж из ORDER_STATUS_COLORS (lib/utils.ts):
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils";
<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[status]}`}>
  {ORDER_STATUS_LABELS[status]}
</span>

// Кастомный бейдж:
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                 bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
  Активен
</span>
```

---

## 10. Грид и отступы

```tsx
// Метрики (2 или 4 карточки):
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

// Быстрые действия (иконки):
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">

// Товарные карточки в каталоге:
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

// Сотрудники/карточки с аватарами:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Формы:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// Отступы страниц:
<div className="space-y-5 p-4 md:p-6">

// Отступ от шапки + нижний нав на мобильном:
// Уже автоматически в admin-shell через paddingBottom
```

---

## 11. Мобильные требования (ВАЖНО!)

```tsx
// Минимальная высота кнопок:
min-h-[44px]  // или py-2.5 + достаточный текст

// Высота канбан-досок (CRM, Tasks):
h-[calc(100dvh-148px)] lg:h-[calc(100vh-64px)]
// 148px = 64px (topbar) + 80px (mobile bottom nav) + 4px

// Нижний отступ контента (уже в admin-shell):
paddingBottom: "calc(80px + max(12px, env(safe-area-inset-bottom, 12px)))"

// Safe area для fixed bottom элементов:
style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}

// Предотвращение iOS zoom на инпутах (уже в globals.css):
font-size: 16px !important  // на всех инпутах при hover:none

// dvh вместо vh на мобильных (правильная высота с клавиатурой):
h-[100dvh]  // не h-[100vh]!
```

---

## 12. Разделитель секций навигации

```tsx
// В admin-nav.tsx — группы уже настроены:
// ПРОДАЖИ: Заказы, CRM, Задачи, Доставка
// ТОВАРЫ: Каталог, Категории, Склад, Импорт
// МАРКЕТИНГ: Акции, Отзывы, Email
// КЛИЕНТЫ: Клиенты
// НАСТРОЙКИ: Оформление, Сайт, Настройки, Команда, Уведомления, Помощь

// Добавить новый пункт в nav:
{ href: "/admin/новая-страница", label: "Название", icon: IconName, group: "ТОВАРЫ" }
```

---

## 13. Заголовки разделов (AdminSectionTitle)

```tsx
import { AdminSectionTitle } from "@/components/admin/admin-section-title";

<AdminSectionTitle icon={Package} title="Название раздела" />
// или с кастомным margin:
<AdminSectionTitle icon={Package} title="Без отступа снизу" className="mb-0" />
```

---

## 14. Шаблон новой страницы

```tsx
// app/admin/новая-страница/page.tsx

export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { IconName } from "lucide-react";

export default async function НоваяСтраница() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Данные из БД...

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* h1 скрывается в nature-mode через CSS */}
      <h1 className="text-2xl font-bold">Название раздела</h1>

      {/* Метрики */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Метрика</p>
          <p className="text-2xl font-bold mt-1">42</p>
        </div>
      </div>

      {/* Основной контент */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <AdminSectionTitle icon={IconName} title="Подраздел" />
        {/* контент */}
      </div>
    </div>
  );
}
```

---

## 15. Шаблон нового клиентского компонента

```tsx
// components/admin/новый-компонент.tsx

"use client";
import { useState } from "react";
import { IconName } from "lucide-react";

interface Props {
  initialData: DataType[];
}

export function НовыйКомпонент({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-4">
      {/* Поиск/фильтры */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {/* Мобильные карточки */}
      <div className="md:hidden space-y-2">
        {data.map(item => (
          <div key={item.id} className="bg-card rounded-2xl border border-border p-4 cursor-pointer active:scale-[0.99] transition-all">
            {/* содержимое карточки */}
          </div>
        ))}
      </div>

      {/* Десктопная таблица */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* таблица */}
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 16. formatPrice — форматирование цен

```tsx
import { formatPrice } from "@/lib/utils";

formatPrice(45000)  // → "45 000 ₽"

// Или напрямую:
amount.toLocaleString("ru-RU") + " ₽"
```

---

## 17. Частые ошибки (НЕ ДЕЛАЙ ТАК)

```tsx
❌ bg-primary/5              // невидимо в оранжевой теме → bg-primary/15
❌ text-blue-400 в UI-хроме  // синий не соответствует палитре → text-primary
❌ bg-blue-100               // яркое в dark mode → bg-primary/10 или прозрачный вариант
❌ h-[100vh] на мобильном   // неправильная высота с клавиатурой → h-[100dvh]
❌ w-6 h-6 кнопки без py   // маленький touch target → min-h-[44px]
❌ overflow-hidden на таблице без overflow-x-auto → таблица обрезается
❌ grid-cols-4 без sm: → на мобильном 4 узкие колонки → grid-cols-2 sm:grid-cols-4
❌ fixed bottom-0 без safe-area → iPhone X+ обрезает → + env(safe-area-inset-bottom)
```
