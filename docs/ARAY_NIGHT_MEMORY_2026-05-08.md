# ARAY Night Memory - 2026-05-08

Time: 22:04 Europe/Moscow.

This note is the morning handoff for ARAY / PiloRus. Read it before continuing after sleep.

## Human Context

Arman is exhausted and stressed. He needs clarity, not more architecture noise.

Working rule for the next session:

- Do not overwhelm him with API terms.
- Do not invent features or analytics.
- Do not open new fantasy branches until the PiloRus demo slice is stable.
- Speak simply: what works, what does not, what is the next useful action.
- Focus on deployable value for the first real client: catalog, orders/terminal, CRM basics, Direct/promotion, assistant.

## What Was Stabilized Tonight

### PWA / Install UX

- Removed install-app action from the side capsule / ARAY rail.
- Kept a compact install banner only when install is requested or the app decides to show it.
- Banner can be closed; dismissal is remembered for 7 days.
- Admin/PWA icon uses ARAY Production icon through `/api/pwa/icon`.
- Public PiloRus site keeps PiloRus identity where appropriate.
- Current decision: PWA install is useful, but must stay quiet. It is not a core sales blocker tonight.

### Finance

- Removed the confusing "foundation" block from finance.
- Finance must stay light and honest:
  - show revenue from real orders;
  - show manual expenses;
  - show simple profit/P&L;
  - bank sync, wallet, points, transfers and automatic tax work stay planned until real providers are connected.
- User explicitly disliked the noisy finance additions. Do not re-add them without a clear reason.

### Market / Terminal Analytics

- Fixed market-demand 403 by protecting the terminal market helper with terminal staff access instead of the draft marketplace module.
- In terminal market modal, demand analytics was simplified:
  - no fake regional heatmap;
  - no invented internet demand numbers;
  - Yandex demand provider is shown only when real token + folder are available.
- Yandex demand provider now requires a folder id in addition to token/key.

### Yandex Direct

- Direct API connection was verified locally.
- Direct token is alive and returned the campaign:
  - `Пилорус каталог`
  - campaign id visible from API check, but do not print secrets or tokens.
- Metrika UI access exists, but the token used for Direct does not grant Metrika API access.
- Explain to Arman simply:
  - "Direct is connected."
  - "Metrika in browser is allowed, but API needs its own token/scope."
  - "We will not invent demand numbers until the source answers."

Added foundation:

- `lib/yandex-direct.ts`
- `app/api/admin/direct/status/route.ts`
- `lib/direct-campaign-draft.ts`
- `app/api/admin/direct/draft/route.ts`

Direct draft API currently builds safe draft-only advertising structure from catalog products:

- campaign name;
- groups by category;
- keywords;
- ad texts;
- quick links;
- negative words;
- checklist;
- safety statement: no paid launch without owner confirmation.

### Promotion Page

Rebuilt `/admin/promotion` as a useful working section:

- status of Yandex Direct;
- one-click Direct draft structure;
- campaign groups;
- copy buttons for structure, negative words, ARAY command and product texts;
- free channels: YML, Avito XML, maps/directories;
- SEO quick actions;
- readiness cards for catalog, Metrika, SEO, ARAY.

Important: this page should stay simple. It is not a dashboard for every possible marketing provider yet.

### Page Transitions

Admin already has a light route transition:

- `components/admin/admin-shell.tsx`
- `app/globals.css`
- `data-page-transition="enter"`
- `adminPageContentEnter` animation.

It avoids remounting pages with `key={pathname}` because that previously risked broken clicks/overlays. Do not reintroduce full-page remount animation.

## Verification Done

Passed:

- `npm run quality`
- `node scripts/audit-admin-routes.js`

Browser check:

- `/admin/promotion` opens.
- no runtime overlay;
- Direct draft appears;
- Direct ready signal appears after load.

Known minor browser-console note:

- There is an old React warning from `AdminPwaInstall` dependency history in the running dev session logs. It did not block the page. If it appears fresh again, inspect `components/admin/admin-pwa-install.tsx`, but do not make PWA the morning priority unless it breaks UX.

## Agent Findings To Triage Later

Terminal / Orders:

- Payment route needs stronger validation before anything can mark orders paid.
- Tenant scoping must be checked across terminal APIs.
- Payment buttons show planned modes; hide or clearly label what is not real.
- Deleted orders should not open by direct URL.

CRM / Clients / Tasks:

- CRM/clients/tasks are not yet fully registered as modules.
- Some UI roles and API role checks disagree.
- CRM templates can create demo leads in real DB; risky.
- Tasks API needs enum/status validation.
- Push APIs need module/role alignment.

Import / Media / Catalog:

- Some integrations look ready while APIs are not ready.
- Bulk price and media actions have role mismatch risks.
- Migration/import pages need honest labels.

These are important, but morning priority should be a release slice, not a full platform rewrite.

## Morning Priority Recommendation

Start with this order:

1. Run `git status --short` and do not revert unrelated/user changes.
2. Run `npm run quality`.
3. Smoke:
   - `/`
   - `/catalog`
   - `/admin`
   - `/admin/orders/new`
   - `/admin/promotion`
   - `/admin/finance`
4. Fix only P0 blockers:
   - runtime errors;
   - API 500/403 on working flows;
   - payment/order safety;
   - embarrassing UI confusion.
5. Then prepare a deploy/demo checklist for PiloRus client.

Do not start constructor, full APK, full Metrika API, all modules, or all providers before this slice is stable.

## Morning Message To Arman

"Брат, вчера мы не потеряли день полностью. Мы убрали часть хаоса, Direct реально увидели, продвижение стало рабочим черновиком, PWA успокоили, finance не раздуваем. Сегодня не строим весь космос. Делаем демо-срез ПилоРус: каталог, заказ, терминал, CRM-минимум, продвижение, качество, деплойный чек."
