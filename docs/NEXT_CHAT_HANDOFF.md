# Next Chat Handoff

## 2026-05-15 — Current Continuation Point

### Read First

- Open `docs/ARAY_WORKING_AGREEMENT_2026-05-15.md` before continuing.
- Open `docs/ARAY_SAFETY_AND_CLEAN_WORK_STANDARD_2026-05-15.md` right after it. This is the protection rule: legal/clean ownership, data, money, access, backups, rollback, and clear explanation for Арман.
- Open `docs/ARAY_PRODUCT_DECISION_RULES_2026-05-15.md` as the product rule: many functions may exist in the system, but the visible UI must show only what the user needs now.
- The current strategy changed from "admin first" to "public PiloRus storefront as the ARAY Store Pro standard first, then admin/CMS constructor".
- Арман describes product quality through feelings and examples; Codex should translate that into design, code, tests and deployment without forcing Арман to think like a developer.

### Current Local State

- Project path: `D:\проект\pilorus\website`.
- Latest deployed production commit noted in the active work context: `ed393a9` — `Refine catalog UX and popup overlays`.
- Local dev server should be on `http://localhost:3101`.
- Current local uncommitted storefront work:
  - `app/globals.css`
  - `components/store/product-card.tsx`
  - `docs/ARAY_WORKING_AGREEMENT_2026-05-15.md`
  - `docs/ARAY_SAFETY_AND_CLEAN_WORK_STANDARD_2026-05-15.md`
  - `docs/ARAY_PRODUCT_DECISION_RULES_2026-05-15.md`
  - There is also this handoff file untracked/modified; do not accidentally commit unrelated docs unless intended.

### Current Product Direction

PiloRus public catalog is the immediate masterpiece/standard:

- Cards should feel premium, calm and useful.
- Price should become a real product system, not only text inside the orange button.
- Desktop card now follows: product/value first, size next, then compact "Купить как" price/unit panel, then clean "В корзину" CTA.
- Mobile product-size popup should keep the stronger dynamic system: variant, unit, quantity, total, add to cart.
- Desktop type rail should not be sticky; mobile type rail can stay sticky with a soft translucent background.
- Filters on desktop should stay usable and scroll locally when many filter groups are open.

### Immediate Checklist

1. Review the new desktop card price block:
   - it was moved lower in the card to reduce noise;
   - decide after visual review if single-unit products should keep the slim price panel or move price back into CTA;
   - reduce visual noise if needed;
   - keep CTA cleaner than before.
2. Re-check mobile:
   - type rail sticky background;
   - size popup not clipped;
   - add-to-cart visible and reachable;
   - click works from first tap.
3. Re-check desktop filters:
   - no loud scrollbars;
   - enough width on large screens;
   - no hidden controls when many filters are open.
4. Verify:
   - `npx tsc --noEmit --pretty false` — passed on 2026-05-15.
   - `npm run lint` — passed on 2026-05-15 with existing warnings only.
   - `npm run build` — passed on 2026-05-15 after stopping the local dev process that locked Prisma DLL.
5. Commit only intentional files and deploy.

### Larger Roadmap

- Finish public storefront standard.
- Then admin smart cart / terminal cart.
- Then callback automation to CRM/tasks/notifications.
- Then Yandex Direct and ARAY tasks.
- Then extract the pattern into ARAY CMS / Store Pro for the next стройматериалы client.

## 2026-05-14 — Current Continuation Point

### Current State

- Project: PiloRus website/admin at `D:\проект\pilorus\website`.
- Latest pushed/deployed commit: `403ac5e` — `Polish calculator header`.
- Deploy script pushed to `origin/main`; production smoke checks passed for home, catalog, catalog sizes, search noindex, product SEO/conversion, sitemap.
- `https://pilo-rus.ru/calculator` returned HTTP 200 after deploy.
- GitHub Actions status for `403ac5e` was not re-checked because GitHub API hit rate limit, but the previous deploys today completed successfully and prod checks are green.
- Local dev server was restarted and `http://localhost:3101/calculator` returned HTTP 200.
- Working tree should only have this handoff note uncommitted.

### What Was Finished Today

- Restored/fixed mobile catalog filters and mobile variant/card comfort.
- Unified mobile admin popups through the standard `AdminModal` / popup system.
- Converted terminal cash popups to the same standard modal style.
- Added popup reporting:
  - `npm run popups:check`
  - `npm run popups:report`
- Current popup report numbers:
  - `33` standardized files.
  - `22` reviewed manual fixed/dialog layers.
  - `9` files need triage or possible migration later.
- Added desktop header hover contact dropdown with all phones, address, schedule, and "Заказать звонок".
- Added PiloRus-style subtle grid/background to admin.
- Added calculator back button, removed breadcrumbs, and polished calculator header benefits into icon mini-cards.

### Start Tomorrow Here

#### Do First: Bugs Found Before Pause

0. **2026-05-15 morning fixes completed locally.**
   - Fixed storefront search and cart drawers on iPhone/PWA by adding top/bottom `safe-area` padding to their full-height panels.
   - Fixed catalog top type chips after footer/category navigation: drag-scroll no longer starts when the pointer begins on a link/button, so chips like `Террасная доска`, `Вагонка`, `Планкен` click normally.
   - Added desktop left/right scroll buttons for the catalog type chip rail.
   - Removed the duplicate phone CTA from the desktop mega menu; header contact dropdown remains.
   - Verification: `npm run lint` passed with existing warnings; `npm run build` passed after restarting local dev server to release Prisma DLL; local dev server is back on `http://localhost:3101`.

1. **Catalog category/type chips after footer navigation.**
   - Status: fixed locally on 2026-05-15, keep in this note only until deployed/confirmed on phone.
   - Path from user: footer link `Лиственница` opens catalog category, then top type chip like `Террасная доска` does not react.
   - Reproduce on local `/catalog?category=listvennitsa` or equivalent footer path.
   - Check `components/store/catalog-type-filter.tsx`, catalog URL building, and whether the desktop mega-menu/overlay is intercepting clicks.
   - Fix, then verify chips update URL and product list for `Террасная доска`, `Доска обрезная`, `Вагонка`, etc.

2. **Mega menu cleanup.**
   - Status: fixed locally on 2026-05-15, keep in this note only until deployed/confirmed.
   - User asked to hide the phone row from the mega menu because the header already has the nicer contact dropdown.
   - Keep useful links/sections, but remove the duplicated phone CTA from the mega menu right column.

3. **Catalog horizontal chip rail comfort.**
   - Status: improved locally on 2026-05-15 with desktop scroll arrows and safer click behavior.
   - On desktop/dark catalog the top product-type chip row is inconvenient to scroll left/right.
   - Add clear left/right controls, edge fade, or another lightweight scroll affordance.
   - Must work on desktop and mobile without breaking the restored mobile filter behavior.

4. **Full site bug pass.**
   - Do a layered check instead of trying to fix everything at once:
     1. Storefront critical path: home, catalog, category from footer, product card variants, cart, calculator, contacts/callback.
     2. Mobile/PWA: header safe area, bottom nav, filters, popups, product cards.
     3. Admin critical path: dashboard, new order terminal, cash shift, CRM leads/tasks, standardized popups.
     4. Build/lint and quick production smoke after deploy.

#### Existing Queue

1. **Small first fix: calculator benefits on desktop.**
   - Screenshot issue: the third benefit card text `Добавление в корзину` wraps too tightly / feels squeezed.
   - Make the three benefit cards look balanced on desktop and mobile.
   - Likely options: widen feature area, use shorter label, improve card min-width, line-height, or responsive grid.
   - Re-check `/calculator` at mobile width and wide desktop.

2. **Then build smart admin cart module.**
   - Goal: unified admin/terminal cart state.
   - Suggested shape: `AdminCartProvider` + `AdminCartDock`.
   - Appears only when there are positions.
   - Syncs terminal product selection, variants, quantity, order creation, and mobile popup view.
   - Should use our new popup/modal standard on mobile.

3. **Then make "Заказать звонок" real automation.**
   - Header dropdown button should not just link visually.
   - Target behavior: create CRM lead/request, create manager task "перезвонить", send notification, store source like `header_callback`, attach to customer history if phone exists.
   - Use existing CRM/notifications patterns instead of inventing a separate channel.

4. **Later popup cleanup.**
   - Use `npm run popups:report`.
   - Triage the 9 files listed by the report.
   - Do not mass-migrate blindly; prioritize actual broken dialogs/popups before banners/toasts.

### Verification To Run After Next Changes

- `npm run lint`
- `npm run build`
- For popup-related work:
  - `npm run popups:check`
  - `npm run popups:report`
- Browser check:
  - `/calculator`
  - `/admin/orders/new`
  - relevant CRM/cart screens when cart work starts.
