# ПилоРус — Дизайн-система

> Единый закон для всех страниц, всех ролей, всех сессий Claude. Если стиль не описан здесь — его нет. Не придумывать.
>
> Версия: 1.0 (25.04.2026, сессия 30) Источник правды: магазин (`pilo-rus.ru/`, `/catalog`, `/contacts`). Замещает: манифест ARAYGLASS (deprecated — см. раздел «Anti-patterns»).

---

## 0. Манифест

**Один сайт — один стиль.** Магазин (для клиентов), кабинет (USER + сотрудники), админка (STAFF) — это разные **функции**, но **тот же визуальный язык**. Клиент не должен чувствовать что попал в «другое приложение» когда заходит в кабинет. Сотрудник не должен чувствовать что админка — это «третий сайт».

**Спокойствие важнее блеска.** Свечения, неон, glassmorphism — украшение, а не норма. Они «дорого» выглядят на десктопе и **уродливы на дешёвых мобильных** (тормозят backdrop-filter, мерцают при scroll, портят читаемость). Правило: если эффект не несёт **функцию** (показать активное состояние, привлечь к CTA) — он лишний.

**Mobile-first.** Дизайн делается сразу для 3 viewport: мобилка (&lt; 640px), планшет (640-1023px), десктоп (≥ 1024px). Не добавляется responsive «потом» — на мобилке сидит 80% клиентов ПилоРус.

**Tailwind classes &gt; inline styles &gt; custom CSS.** Не изобретать новый класс — есть готовые: `bg-card`, `border-border`, `text-foreground`, `rounded-2xl`. Custom CSS только в `globals.css` для системных вещей.

---

## 1. Tokens (взято из реального `globals.css` и `tailwind.config.ts`)

### 1.1 Цвета (CSS vars — light + dark)

TokenLight HSLDark HSLПрименение`--primary27 91% 48%` (тёплый оранж)`27 91% 55%`Бренд, активные состояния, CTA, ссылки`--primary-foreground0 0% 100%0 0% 100%`Текст на primary-фоне (всегда белый)`--background0 0% 100%20 14% 8%`Фон страницы`--foreground20 14% 10%27 30% 95%`Основной текст`--card0 0% 100%20 14% 11%`Фон карточек, попапов`--muted27 20% 96%20 4% 14%`Серый фон`--muted-foreground20 10% 45%27 20% 60%`Подписи`--border27 20% 88%20 14% 20%`Границы`--destructive0 84% 60%0 62% 50%`Удаление, ошибки

### 1.2 Tailwind classes (использовать только их для UI)

Что нужноКлассКогдаБренд-акцент`text-primary`, `bg-primary`Иконки разделов, ссылки, CTAОсновной текст`text-foreground`Заголовки, телоПодпись`text-muted-foreground`Дата, count, hintФон карточки`bg-card`Карточки, попапы (с border)Фон страницы`bg-background`Корневой контейнерСерый фон`bg-muted`Иконка-плейсхолдерHover на карточке`hover:border-primary/40`Кликабельная карточкаГраница`border-border`По умолчанию всеАктивная граница`border-primary`Selected, currentОшибка`text-destructive`, `bg-destructive/10`, `border-destructive/30`Validation, delete

**ЗАПРЕЩЕНО:** `bg-gray-*`, `text-gray-*`, `border-gray-*`, `bg-white`, `text-white`, `bg-black`, `text-black`, hex (`#fff`), `rgb()`, `rgba()`. Только tokens выше.

**Исключения:** декоративные точки онлайн-статуса, print-стили, фирменные цвета социальных сетей.

### 1.3 Типографика

```ts
fontFamily: {
  sans:    ["var(--font-inter)",  "sans-serif"],
  display: ["var(--font-oswald)", "sans-serif"],
}
```

КлассРазмерUse case`font-display font-bold text-2xl sm:text-3xl`24-30pxHero на главной`font-display font-bold text-xl`20px`<h1>` страницы кабинета`font-display font-semibold text-lg`18pxПодзаголовок`font-semibold text-base`16pxTitle карточки`text-sm`14pxBody`text-xs`12pxМетки, даты`text-[10px]`, `text-[11px]`10-11pxTag pills

**Минимум на мобилке: 12px.** Меньше — нечитаемо.

**Inputs всегда** `text-base` **на мобилке** + `style={{ fontSize: 16 }}` чтобы iOS не делал zoom при focus.

### 1.4 Border radius

ЧтоКлассГдеКарточки крупные`rounded-2xl` (16px)Все блоки контента, hero, секцииКонтролы, мелкие карточки`rounded-xl` (12px)Кнопки, инпуты, иконка-обёрткаАватары, status dots`rounded-full`User avatar, badges

**ЗАПРЕЩЕНО:** `rounded-md`, `rounded-sm`, `rounded-lg` — устаревшие.

### 1.5 Spacing

ClassКогда`gap-2`, `gap-3` (8-12px)Между мелкими элементами в строке`gap-4` (16px)Между блоками внутри карточки`gap-6` (24px)Между секциями страницы`p-4 sm:p-5 lg:p-6`Адаптивный padding карточки`space-y-3 sm:space-y-4`Vertical spacing внутри секции`space-y-6`Между секциями

### 1.6 Responsive breakpoints

BreakpointWidthПрефикс TailwindМобилка (default)&lt; 640px(no prefix)Планшет640-1023px`sm:`Десктоп≥ 1024px`lg:`Большой экран≥ 1280px`xl:`

**Правило:** пишем mobile-first (без префикса), потом добавляем `sm:` и `lg:` для увеличения.

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
  ...
</div>
```

### 1.7 Shadows / Effects

**ЗАПРЕЩЕНО на постоянных элементах:**

- `shadow-sm`, `shadow-md`, `shadow-lg`
- `backdrop-blur` (тормозит мобилки)
- `box-shadow: 0 0 Npx hsl(...)` (свечения)
- `arayglass-glow`, `arayglass-shimmer` — deprecated
- Градиенты на фонах (`bg-gradient-to-*`)

**РАЗРЕШЕНО точечно:**

- `shadow-2xl` на drawer/modal — даёт ощущение глубины
- `box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3)` для focus ring
- `bg-black/50 backdrop-blur-sm` только на overlay под открытым drawer/dialog

### 1.8 Transitions

```tsx
className="transition-colors"               /* Default — для hover/active */
className="transition-all duration-200"     /* Для button/CTA */
className="active:scale-[0.98]"             /* Tactile feedback */
className="animate-pulse"                   /* ТОЛЬКО на skeleton loaders */
```

**ЗАПРЕЩЕНО:** `animate-pulse` на постоянных элементах (точка алерта), `animate-spin` где нет загрузки, длинные animations 1+ сек на UI.

---

## 2. Components

### 2.1 Карточка (универсальная)

```tsx
<div className="bg-card border border-border rounded-2xl p-4 sm:p-5 lg:p-6">
  {/* content */}
</div>
```

**Hover (если кликабельная):** `hover:border-primary/40 transition-colors`.

**Группа карточек (список):**

```tsx
<div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
  {items.map(item => (
    <Link key={item.id} href={...} className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
      ...
    </Link>
  ))}
</div>
```

### 2.2 Section row (иконка + label + desc + arrow)

Применение: `/cabinet` разделы, settings groups, navigation items.

```tsx
<Link
  href="/cabinet/orders"
  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors"
>
  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
    <ShoppingBag className="w-5 h-5 text-primary" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">Мои заказы</p>
    <p className="text-xs text-muted-foreground truncate">2 в работе · 10 готово</p>
  </div>
  {/* optional badge */}
  <span className="bg-primary text-primary-foreground text-xs font-semibold rounded-full min-w-[22px] h-[22px] inline-flex items-center justify-center px-2">2</span>
  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
</Link>
```

### 2.3 CTA primary

```tsx
<button className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-sm font-semibold hover:brightness-110 transition-all">
  <Phone className="w-4 h-4" /> Позвонить
</button>
```

**Высота 44px (h-11) на мобилке** — стандарт touch target.

### 2.4 CTA secondary (outline)

```tsx
<button className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">
  Действие
</button>
```

### 2.5 CTA destructive

```tsx
<button className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/5 transition-colors">
  <XCircle className="w-4 h-4" /> Отменить
</button>
```

### 2.6 Input

```tsx
<input
  type="text"
  className="w-full px-4 h-11 rounded-xl bg-background border border-border text-base sm:text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
  style={{ fontSize: 16 }}
/>
```

### 2.7 Status badge

```tsx
<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-900 dark:text-blue-400 border border-blue-500/25">
  NEW
</span>
```

См. `lib/utils.ts` → `ORDER_STATUS_COLORS` для всех статусов.

### 2.8 Иконка в обёртке

```tsx
<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
  <ShoppingBag className="w-5 h-5 text-primary" />
</div>
```

Размеры:

- Маленькая: `w-8 h-8 rounded-lg` + `w-4 h-4` иконка
- Средняя: `w-10 h-10 rounded-xl` + `w-5 h-5` иконка
- Крупная: `w-14 h-14 rounded-2xl` + `w-7 h-7` иконка

### 2.9 Avatar

```tsx
<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
  {avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
  ) : (
    <span className="text-primary font-display font-bold">{initials}</span>
  )}
</div>
```

### 2.10 Skeleton loader

```tsx
<div className="bg-card border border-border rounded-2xl p-4 animate-pulse">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-muted" />
    <div className="flex-1 space-y-2">
      <div className="h-4 rounded bg-muted w-3/4" />
      <div className="h-3 rounded bg-muted w-1/2" />
    </div>
  </div>
</div>
```

`animate-pulse` — единственное место где допустима пульсация.

---

## 3. Patterns

### 3.1 Hero страницы кабинета

Простая карточка, **без градиента**, аватар + приветствие + статистика.

```tsx
<Link href="/cabinet/profile" className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-primary/40 transition-colors">
  <Avatar />
  <div className="flex-1 min-w-0">
    <p className="text-xs text-muted-foreground">Доброе утро,</p>
    <h1 className="font-display font-bold text-lg sm:text-xl">{firstName}</h1>
    <p className="text-xs text-muted-foreground mt-1">12 заказов · 340 000 ₽</p>
  </div>
  <ChevronRight />
</Link>
```

### 3.2 Empty state

```tsx
<div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
    <ShoppingBag className="w-7 h-7 text-primary" />
  </div>
  <p className="text-sm font-medium mb-1">У вас пока нет заказов</p>
  <p className="text-xs text-muted-foreground mb-5">Перейдите в каталог</p>
  <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-sm font-semibold">
    В каталог
  </Link>
</div>
```

### 3.3 Filter pills

```tsx
<div className="flex items-center gap-1.5 overflow-x-auto pb-1">
  {filters.map(f => (
    <Link key={f.value} href={...} className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border ${
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
    }`}>
      {f.label}
    </Link>
  ))}
</div>
```

### 3.4 Modal / Bottom sheet

Bottom sheet на мобилке, центрированный модал на десктопе:

```tsx
<div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
  <div className="bg-card rounded-t-2xl sm:rounded-2xl border border-border p-5 w-full max-w-sm space-y-4">
    {/* content */}
  </div>
</div>
```

### 3.5 Адаптивная сетка карточек

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### 3.6 Stepper статусов (mini)

```tsx
<div className="flex items-center gap-1">
  {steps.map((step, idx) => (
    <div key={step.key} className={`h-1 flex-1 rounded-full transition-colors ${
      idx < currentIdx ? "bg-emerald-500" : idx === currentIdx ? "bg-primary" : "bg-muted"
    }`} />
  ))}
</div>
```

---

## 4. Anti-patterns (что больше НЕ делаем)

### 4.1 ARAYGLASS (deprecated)

**Что было:** манифест ARAYGLASS — стекло, неон, swimmer, glow на каждой карточке.

**Что не сработало:** на мобилках backdrop-blur тормозит и мерцает. Свечения везде = всё кричит. Несоответствие магазину.

**Миграция:**

- `arayglass` → `bg-card border-border rounded-2xl`
- `arayglass-glow` → удалить (или `border-primary` для активного)
- `arayglass-shimmer` → удалить
- `arayglass-icon` → удалить
- `arayglass-badge` → `rounded-full px-2 py-0.5 text-[10px] font-semibold border` + цвет

CSS классы оставить в `globals.css` пока — не удалять чтобы не сломать staging. Удалим когда все usages мигрированы.

### 4.2 Эмодзи в UI

**Запрещено:** 🛒 📦 ⭐ ✨ ❌ ✅ 🔔 💬 🎉 🚚 🪵 ☎ — рендерятся по-разному на iOS/Android/Windows.

**Замена:** `lucide-react` иконки.

БылСтало🛒`<ShoppingCart />`📦`<Package />`⭐`<Star />`🔔`<Bell />`👍`<ThumbsUp />`✨`<Sparkles />`❌`<X />` или `<XCircle />`✅`<Check />`

**Исключение:** эмодзи в данных пользователя (отзывы, посты) — контент, не UI.

### 4.3 Множественный polling

Не ставить `setInterval` без нужды. Если данные меняются раз в минуту — `revalidate = 60` + `router.refresh()` через AutoRefresh.

**Не делать:** 3+ разных `setInterval` из одного компонента (раньше было в admin-shell — мерцание).

### 4.4 force-dynamic без необходимости

`/cabinet/*`, `/admin/*` — да, dynamic из-за auth.

`/`, `/catalog`, `/contacts` — НЕ dynamic. `revalidate = 60`.

---

## 5. Roles & Layouts

### 5.1 Магазин (`/`, `/catalog`, etc.)

Layout: `app/(store)/layout.tsx`. Стек: Header + main + Footer + SideIconRail + ArayDock + AccountDrawer.

**Эталон. Не трогать без causa belli.**

### 5.2 Кабинет (`/cabinet/*`)

Layout: `app/cabinet/layout.tsx`. Стек: **тот же** что у магазина (с auth-guard).

### 5.3 Админка (`/admin/*`)

Layout: `app/admin/layout.tsx` → `AdminShell`.

**В долгосрочной перспективе мигрировать на calm-стиль.** Но не ломать рабочий процесс сотрудников — отдельный план после Директа и Стройматериалов.

---

## 6. Migration plan

#РазделСтатус1`/cabinet/*` layout — на StoreLayout✅ Сессия 30 (commit 317f2cf)2`/cabinet` дашборд — calm UI rev 2✅ Сессия 30 (commit 8337c54)3DESIGN_SYSTEM.md — этот документ✅ Сессия 304Skeleton loaders для cabinet🟡 Сессия 30 (этот коммит)5Mini-stepper в активном заказе🟡 Сессия 30 (этот коммит)6Avatar клик → /cabinet/profile🟡 Сессия 30 (этот коммит)7Pull-to-refresh🔴 Отложено (требует тестов на устройствах)8`/cabinet/orders` — responsive аудит🔴 Следующая сессия9`/cabinet/orders/[id]` — responsive аудит🔴 Следующая сессия10`/cabinet/profile`, reviews, media, subscriptions, history — calm UI🔴 Следующая сессия11Удалить `arayglass-*` CSS классы из globals.css🔴 После всех миграций12`/admin/*` миграция на calm style🔴 После Директа

---

## 7. Чеклист перед коммитом UI

- \[ \] Только tokens из `tailwind.config.ts` (`text-foreground`, `text-muted-foreground`, `text-primary`, `text-destructive`)
- \[ \] Нет `bg-gray-*`, `text-gray-*`, `#hex`, `rgba()`
- \[ \] Нет эмодзи в UI — только `lucide-react`
- \[ \] Нет `arayglass*` классов в новом коде
- \[ \] Нет `shadow-sm/md/lg`, `backdrop-blur` (кроме overlay)
- \[ \] Нет градиентов на фонах
- \[ \] `rounded-2xl` для карточек, `rounded-xl` для контролов, `rounded-full` для аватаров
- \[ \] Touch targets ≥ 44px на мобилке (`h-11` для кнопок)
- \[ \] `text-base sm:text-sm` на инпутах + `style={{ fontSize: 16 }}` для iOS
- \[ \] **Responsive проверен на 3 viewport: &lt; 640px, 640-1023px, ≥ 1024px**
- \[ \] Тёмная и светлая тема — обе работают
- \[ \] Палитра меняется (timber → ocean → crimson) — все элементы переключают цвет

---

## 8. Что делать в следующих сессиях

1. **Перед началом любой UI-задачи** — открыть этот файл, найти раздел.
2. **Перед коммитом** — пройти чеклист п.7.
3. **Если нужен новый паттерн** — обсудить с Арманом, добавить в этот файл, потом кодить.
4. **Если видишь старый ARAYGLASS** — записать в баги, мигрировать только когда переделываешь раздел целиком.

---

> Этот файл — закон. Если в коде встречается что-то противоречащее этому файлу — это **баг по дизайн-системе**, фиксить как любой другой баг.


---

## 9. Admin patterns (для админки `/admin/*` — миграция в roadmap п.11)

> Сейчас админка использует AdminShell с ARAYGLASS. После миграции — те же tokens что в магазине + специфические admin паттерны ниже.

### 9.1 Data table (таблица данных)

**Использование:** список заказов, товаров, клиентов, лидов, etc.

```tsx
<div className="bg-card border border-border rounded-2xl overflow-hidden">
  {/* Header bar — фильтры + действия */}
  <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-wrap">
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">Заказы ({total})</span>
      {selectedCount > 0 && (
        <span className="text-xs text-muted-foreground">· выбрано {selectedCount}</span>
      )}
    </div>
    <div className="flex items-center gap-2">
      {/* Bulk actions — если есть выбранные */}
      {selectedCount > 0 && (
        <>
          <button className="px-3 h-9 rounded-xl border border-border text-xs font-medium hover:bg-muted/40">Действие</button>
          <button className="px-3 h-9 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/5">Удалить</button>
        </>
      )}
      {/* Search */}
      <input className="px-3 h-9 rounded-xl bg-background border border-border text-sm w-64" placeholder="Поиск..." />
    </div>
  </div>

  {/* Table — desktop */}
  <table className="w-full text-sm hidden lg:table">
    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
      <tr>
        <th className="px-4 py-3 text-left w-10"><input type="checkbox" /></th>
        <th className="px-4 py-3 text-left font-semibold">№</th>
        <th className="px-4 py-3 text-left font-semibold">Клиент</th>
        <th className="px-4 py-3 text-left font-semibold">Статус</th>
        <th className="px-4 py-3 text-right font-semibold">Сумма</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      {rows.map(r => (
        <tr key={r.id} className="hover:bg-muted/40 transition-colors">
          <td className="px-4 py-3"><input type="checkbox" /></td>
          <td className="px-4 py-3 font-medium">#{r.number}</td>
          <td className="px-4 py-3">{r.name}</td>
          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
          <td className="px-4 py-3 text-right font-semibold">{formatPrice(r.amount)}</td>
        </tr>
      ))}
    </tbody>
  </table>

  {/* Cards — mobile (тот же data, другая раскладка) */}
  <div className="divide-y divide-border lg:hidden">
    {rows.map(r => (
      <Link key={r.id} href={`/admin/orders/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/40">
        <input type="checkbox" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">#{r.number}</span>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted-foreground truncate">{r.name}</p>
        </div>
        <span className="text-sm font-semibold shrink-0">{formatPrice(r.amount)}</span>
      </Link>
    ))}
  </div>

  {/* Pagination footer */}
  <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
    <span>Показано {start}-{end} из {total}</span>
    <div className="flex items-center gap-1">
      {/* prev/next кнопки */}
    </div>
  </div>
</div>
```

**Правила data table:**
- Desktop — таблица с колонками. Mobile — список карточек с теми же данными (`hidden lg:table` / `lg:hidden`).
- Bulk actions появляются только когда есть selected. До этого — обычный header.
- Sort — clickable headers с иконкой ↑↓.
- Pagination в footer карточки. На мобилке — компактные кнопки «← / →».
- AutoRefresh раз в 30 сек для активных списков (заказы, лиды) — НЕ чаще.

### 9.2 Multi-step form (мастер создания)

**Использование:** создание заказа, нового товара, импорт.

```tsx
<div className="bg-card border border-border rounded-2xl overflow-hidden">
  {/* Stepper */}
  <div className="px-5 py-4 border-b border-border">
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <div key={step.key} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {isDone ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${
              isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
            }`}>{step.label}</span>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${isDone ? "bg-emerald-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  </div>

  {/* Step content */}
  <div className="p-5 sm:p-6 space-y-4">
    {/* form fields для текущего шага */}
  </div>

  {/* Navigation footer */}
  <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
    <button className="px-5 h-11 rounded-xl border border-border text-sm font-medium" disabled={currentStep === 0}>← Назад</button>
    <button className="px-5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
      {currentStep === steps.length - 1 ? "Сохранить" : "Далее →"}
    </button>
  </div>
</div>
```

### 9.3 Filter panel (боковой/верхний)

**Desktop — слева:**
```tsx
<div className="grid lg:grid-cols-[260px_1fr] gap-6">
  <aside className="space-y-3">
    <FilterGroup label="Статус">
      {/* checkboxes */}
    </FilterGroup>
    <FilterGroup label="Дата">
      {/* date range */}
    </FilterGroup>
  </aside>
  <main>{/* table */}</main>
</div>
```

**Mobile — кнопка «Фильтры» открывает bottom sheet:**
```tsx
<button onClick={() => setOpen(true)} className="px-4 h-10 rounded-xl border border-border text-sm font-medium inline-flex items-center gap-2">
  <SlidersHorizontal className="w-4 h-4" /> Фильтры {activeCount > 0 && `(${activeCount})`}
</button>
{/* bottom sheet с теми же FilterGroup */}
```

### 9.4 Bulk actions toolbar

Появляется ВЕРХУ таблицы когда есть selected:
```tsx
{selectedCount > 0 && (
  <div className="sticky top-0 z-10 bg-card border-b border-border p-3 flex items-center gap-3 flex-wrap">
    <span className="text-sm font-medium">Выбрано: {selectedCount}</span>
    <div className="ml-auto flex items-center gap-2">
      <button className="px-3 h-9 rounded-xl border border-border text-xs font-medium">Изменить статус</button>
      <button className="px-3 h-9 rounded-xl border border-border text-xs font-medium">Экспорт CSV</button>
      <button className="px-3 h-9 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold">Удалить</button>
      <button onClick={clearSelection} className="text-xs text-muted-foreground hover:text-foreground">Отмена</button>
    </div>
  </div>
)}
```

### 9.5 Stat cards (метрики дашборда)

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {stats.map(s => (
    <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{s.label}</span>
        <s.Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="font-display font-bold text-2xl">{s.value}</p>
      {s.trend && (
        <p className={`text-xs mt-1 ${s.trend > 0 ? "text-emerald-600" : "text-destructive"}`}>
          {s.trend > 0 ? "↑" : "↓"} {Math.abs(s.trend)}% за неделю
        </p>
      )}
    </div>
  ))}
</div>
```

**Правило:** иконка нейтральная (`text-muted-foreground`), цвет — только в trend (semantic emerald/destructive).

### 9.6 Sidebar навигация (для админки)

После миграции AdminShell — sidebar в стиле магазина:
- Фон: `bg-card border-r border-border` (вместо тёмного `bg-brand-sidebar`)
- Активный пункт: `bg-primary/10 text-primary border-l-2 border-primary` (без glass свечения)
- Иконки: `lucide-react`, `text-muted-foreground` неактивные, `text-primary` активные
- Группы collapsible: `<details>` с `<summary>` — мин CSS, max доступность

---

## 10. Правила создания новых компонентов

> Когда нужен новый компонент / паттерн — следуй этому процессу.

### 10.1 Где располагать

| Тип | Локация | Пример |
|-----|---------|--------|
| Универсальный UI (button, input, dialog) | `components/ui/` | Button, Input, Label |
| Магазин (для клиентов) | `components/store/` | ProductCard, CartDrawer |
| Кабинет (USER + STAFF личное) | `components/cabinet/` | RepeatOrderButton, Skeleton |
| Админка (только STAFF) | `components/admin/` | OrderEditPanel, AdminNav |
| Общие layout | `components/layout/` | Header, Footer |
| Shared между всеми | `components/shared/` | PhoneLinks, ArayOrb |

### 10.2 Naming

- Компоненты: `PascalCase` (`OrderCard`, не `order-card`)
- Файлы: `kebab-case.tsx` (`order-card.tsx`)
- Props interface: `XxxProps` (`OrderCardProps`)
- Hooks: `useXxx` (`useCart`, `useAccountDrawer`)

### 10.3 Props patterns

**Default values:** через destructuring.
```tsx
function OrderCard({ status = "NEW", compact = false }: OrderCardProps) { ... }
```

**Optional callbacks:** не кастомизируй — пиши `?`.
```tsx
type Props = {
  onClose?: () => void;  // ✅
  onClose: () => void;   // ❌ если он реально опциональный
};
```

**Variant prop:** для нескольких стилей одного компонента.
```tsx
type Props = { variant?: "inline" | "button" | "icon" };
```

См. `components/cabinet/repeat-order-button.tsx` как эталон.

### 10.4 Стилизация — порядок выбора

1. **Tailwind utility classes** — 95% случаев. Используй tokens из этого документа.
2. **CSS variables (`hsl(var(--primary) / X)`)** — для полупрозрачных вариантов tokens.
3. **inline style** — только для динамических значений из props/state, никогда для цветов.
4. **Custom CSS в globals.css** — последний выбор. Только если нужна анимация или selector которые Tailwind не покрывает. Обсуди с Арманом.

### 10.5 Чеклист перед написанием нового компонента

- [ ] Не существует ли похожего? Проверь `components/ui/`, `components/store/`, аналогичные разделы.
- [ ] Соответствует ли паттернам из этого документа?
- [ ] Mobile-first дизайн? Touch targets ≥ 44px?
- [ ] Тёмная и светлая тема — обе работают?
- [ ] Доступность: aria-label, keyboard navigation, focus visible?
- [ ] Минимум JS на клиенте? Если SSR-only нужно — server component.

### 10.6 Когда добавлять новый паттерн в DESIGN_SYSTEM.md

**ОБЯЗАТЕЛЬНО**, если паттерн используется в 2+ местах. Иначе — следующая сессия Claude переизобретёт.

Процесс:
1. Реализовал паттерн в коде — проверил, работает.
2. Обсудил с Арманом — одобрил.
3. Добавил раздел в DESIGN_SYSTEM.md с примером кода.
4. Закоммитил оба изменения вместе.

---

## 11. Admin migration plan (детально)

> 25 разделов админки. После Директа и запуска Стройматериалов. **НЕ начинать без явного разрешения Армана.**

### 11.1 Стратегия

- **Один раздел = один коммит = один деплой.** Не смешивать.
- **Не ломать функциональность.** Только визуал. Если видишь баг логики — записать, не фиксить попутно.
- **Тестировать каждый раздел с реальным STAFF-аккаунтом** перед деплоем (Арман залогинен → проходит сценарий).
- **AdminShell остаётся** (sidebar + mobile dock структура), но все его внутренности постепенно переписываются.

### 11.2 Очередь миграции (по важности и частоте использования)

**Этап A — критичные для ежедневной работы (8 разделов, ~8 сессий):**

| # | Раздел | URL | Сложность | Время |
|---|--------|-----|-----------|-------|
| 1 | Дашборд | `/admin` | Средняя — много карточек stat | 1 сессия |
| 2 | Заказы — список | `/admin/orders` | Высокая — таблица + фильтры + bulk + AutoRefresh | 1-2 сессии |
| 3 | Заказы — детальная | `/admin/orders/[id]` | Средняя — форма редактирования + статусы | 1 сессия |
| 4 | Доставка | `/admin/delivery` | Средняя — список + фильтры | 1 сессия |
| 5 | Клиенты | `/admin/clients` | Средняя — таблица + действия | 1 сессия |
| 6 | Товары — список | `/admin/products` | Высокая — таблица + bulk + поиск | 1-2 сессии |
| 7 | Товары — детальная | `/admin/products/[id]` | Высокая — большая форма с галереей | 1-2 сессии |
| 8 | CRM лиды + автоматизация | `/admin/crm` | Высокая — kanban + workflows | 2 сессии |

**Этап B — средняя частота (10 разделов, ~10 сессий):**

| # | Раздел | URL | Время |
|---|--------|-----|-------|
| 9 | Категории | `/admin/categories` | 0.5 сессии |
| 10 | Склад / Остатки | `/admin/inventory` | 1 сессия |
| 11 | Импорт / Экспорт | `/admin/import` | 1 сессия |
| 12 | Медиа | `/admin/media` | 0.5 сессии |
| 13 | Отзывы | `/admin/reviews` | 0.5 сессии |
| 14 | Команда | `/admin/staff` | 0.5 сессии |
| 15 | Аналитика | `/admin/analytics` | 1-2 сессии — графики |
| 16 | Финансы | `/admin/finance` | 1 сессия |
| 17 | Задачи | `/admin/tasks` | 0.5 сессии |
| 18 | Помощь | `/admin/help` | 0.3 сессии |

**Этап C — низкая частота (7 разделов, ~5 сессий):**

| # | Раздел | URL | Время |
|---|--------|-----|-------|
| 19 | Настройки сайта | `/admin/site` | 1 сессия |
| 20 | Настройки общие | `/admin/settings` | 0.5 сессии |
| 21 | Оформление | `/admin/appearance` | 0.3 сессии |
| 22 | Watermark | `/admin/watermark` | 0.3 сессии |
| 23 | Email рассылка | `/admin/email` | 0.5 сессии |
| 24 | Промоакции | `/admin/promotions` | 0.5 сессии |
| 25 | Здоровье системы | `/admin/health` | 0.3 сессии |

**Этап D — финальный cleanup (1 сессия):**

- Удалить `arayglass-*` CSS классы из `globals.css` когда все usages мигрированы
- Удалить `ARAY Control` (старый сайдбар-попап) — функция перенесена в `/cabinet/appearance`
- Удалить старые `admin-*` компоненты которые больше не используются
- Финальный E2E-аудит всей админки

**Итого:** ~25 сессий. Реалистично 2-3 месяца параллельно с другими задачами.

### 11.3 Порядок внутри одного раздела

Каждый раздел мигрируется по чеклисту:
1. Прочитать текущий код раздела (page.tsx, нужные компоненты).
2. Найти все нарушения дизайн-системы (см. п.7 чеклист).
3. Переписать UI по паттернам из разделов 2, 3, 9.
4. Проверить responsive (моб/планшет/десктоп).
5. Проверить тёмную и светлую тему.
6. TSC: 0 ошибок.
7. Деплой.
8. Production test: 0 FAIL.
9. Сообщить Арману: «раздел X мигрирован, проверь в живую».
10. Получить подтверждение → следующий раздел.

### 11.4 Что СОХРАНИТЬ при миграции

- Логику бизнес-процессов (Telegram кнопки, email уведомления, PDF генерация, Push)
- Все API endpoints — не трогать
- Prisma schema — не трогать
- Permissions / role-checks
- Auto-refresh интервалы (но НЕ создавать новые)

### 11.5 Что УДАЛИТЬ при миграции

- `arayglass`, `arayglass-glow`, `arayglass-shimmer`, `arayglass-icon`, `arayglass-badge` классы
- `bg-gray-*`, `text-gray-*`, hex-цвета
- Эмодзи в UI (заменить на lucide-react)
- backdrop-blur на постоянных элементах
- Градиенты на фонах
- Множественные polling

---

## 12. Process — как поддерживать систему

### 12.1 Правило одного источника правды

**DESIGN_SYSTEM.md — единственный источник.** Если CLAUDE.md, ROADMAP или другие доки противоречат — правит DESIGN_SYSTEM.md.

При обновлении системы — сначала меняешь этот документ, потом код. Не наоборот.

### 12.2 Когда обсуждать с Арманом перед кодом

**ОБЯЗАТЕЛЬНО:**
- Новый паттерн которого нет в DESIGN_SYSTEM.md
- Изменение существующего паттерна
- Любая визуальная переделка раздела
- Удаление функционала

**МОЖНО БЕЗ ОБСУЖДЕНИЯ:**
- Применение существующего паттерна к новому экрану
- Багфиксы вёрстки (ломанная сетка, пересекающиеся элементы)
- Замена устаревших классов (`rounded-md` → `rounded-xl`, эмодзи → lucide)
- TypeScript ошибки

### 12.3 Дрейф системы — как избежать

Признаки что система начинает дрейфовать:
- Появляются новые `bg-XXX-50` цвета не из tokens
- В двух разных местах одного и того же компонента — разный padding/radius
- Новые сессии создают новые компоненты вместо переиспользования
- В коде `// TODO: переделать в стиле магазина` — без сроков

Что делать:
- Регулярно (раз в 5-10 сессий) — аудит: один файл `D:\pilorus\docs\DRIFT_AUDIT.md` с найденными нарушениями.
- Перед началом новой большой задачи — прочитать DESIGN_SYSTEM.md полностью.
- Если приходит idea «давайте сделаем нестандартное X» — отложить, обсудить с Арманом, добавить в систему или отказаться.

### 12.4 Эволюция системы

Система не догма. Можно (и нужно) обновлять:
- Когда найден лучший паттерн — заменяем старый, мигрируем существующие места.
- Когда `tailwind.config.ts` обновляется (новые tokens, цвета) — обновляем раздел 1.
- Когда выходит новая версия Tailwind / Next / lucide — пересматриваем правила.

**Версионирование:** в начале документа `Версия: X.Y` + дата. Минорные правки = +0.1, мажорные (breaking) = +1.0.

---

## 13. FAQ для будущих сессий

**Q: Хочу сделать новый раздел в кабинете. С чего начать?**
A: 1) Прочитать раздел 5.2. 2) Использовать паттерн «Section row» (2.2) для навигации, «Hero» (3.1) для приветствия, «Empty state» (3.2) для пустого состояния. 3) Перед коммитом — чеклист п.7.

**Q: Арман просит «сделать как в Instagram/Telegram/Avito».**
A: Не копировать. Спросить что именно нравится: переход (slide?), цвет (акцент?), плотность контента? — и сравнить с нашими паттернами. Если ничего не подходит — предложить добавить новый паттерн в систему.

**Q: Нужна анимация — какую брать?**
A: Только framer-motion (уже в зависимостях) или CSS `transition-colors`. Длительность 150-220ms. Нет blur, нет glow, нет pulse на постоянных элементах.

**Q: Можно ли использовать `@/components/ui/dialog` или нужен свой?**
A: Сначала смотри `components/ui/`. Если подходит — используй. Если нет — обсуди с Арманом перед созданием.

**Q: Когда server component, когда client component?**
A: Default — server. Client (`"use client"`) только если нужен `useState`/`useEffect`/event handlers/`localStorage`. Чем меньше client JS — тем быстрее сайт.

**Q: Hardcode телефона/email/адреса в коде?**
A: НИКОГДА. Только через `getSiteSettings()` или `lib/phone-constants.ts` для client. См. CLAUDE.md → Телефонная система.

**Q: Что с темами палитры (timber, ocean, crimson, etc.)?**
A: Пользователь выбирает палитру в `/cabinet/appearance`. Все цвета через `--primary` CSS var автоматически меняются. Никогда не хардкодь оранжевый — он зависит от палитры.

---

> **Последнее обновление:** 25.04.2026 (сессия 30, версия 1.1).
> **Следующее запланированное обновление:** при добавлении первого admin паттерна в реальный код (сессия миграции п.11).
