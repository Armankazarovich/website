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
