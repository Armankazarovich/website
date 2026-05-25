# Current Tasks: PiloRus / ARAY

Date: 2026-05-21
Project: `D:\проект\pilorus\website`

This file is the clean continuation point after the old chat stalled during context compression with background agents.

## 2026-05-24 Recovered Chat Notes

- New continuation file: `docs/ARAY_RECOVERED_TASKS_2026-05-24.md`.
- Priority from Arman: protect availability/status changes, make product edit actions sticky, re-check PWA install, then plan ARAY default-open and visible operator mode.
- First pass completed: confirmations for availability toggles, sticky product save block, zero-stock availability fix, early PWA install prompt capture.

## Rule

- Work only in `D:\проект\pilorus\website`.
- Do not use `D:\проект\ПилоРус\website` for this task; it is an older dirty copy and is behind remote.
- Do not mix unrelated changes into one commit.
- After every feature block, run focused checks before moving on.

## Already Done / Confirmed

- Story commerce MVP exists:
  - admin page `/admin/stories`;
  - public page `/stories`;
  - API for stories;
  - image/video upload;
  - pinned/hidden/order/views support;
  - sticky public stories widget.
- `npm run stories:check` exists.
- General quality gate runs the stories check.
- `npm run build` was recorded as passing on 2026-05-21.
- `npm run direct:check` was recorded as passing.
- Browser checks recorded on 2026-05-21:
  - `/stories` opens and shows 3 stories;
  - `/catalog` opens, product cards and sizes are visible, stories widget opens/closes;
  - `/admin/stories` opens and sees 3 stories;
  - `/admin/promotion` opens without browser errors.
- Direct OAuth is connected.
- Direct campaign found: `Пилорус каталог`, status `ACCEPTED`, state `OFF`.
- Metrika goal IDs are recorded in `docs/ARAY_QA_STORIES_DIRECT_2026-05-21.md`.
- Added 2026-05-21 store UI standard to `DESIGN_SYSTEM.md`:
  - text filter chips may use full primary selected state;
  - header icon actions stay neutral and show count only with the small primary badge;
  - product-card icon actions use separate serious icon buttons, not a shared dark capsule;
  - future design guard prevents header icon selected state from becoming orange again.

## P0: Finish The Stuck Chat Work

1. Done on 2026-05-21: review and polish the public stories widget shell.
2. Done on 2026-05-21: make the small widget less intrusive and move it lower on desktop.
3. Done on 2026-05-21: add a collapse/hide behavior for the stories widget:
   - expanded widget opens stories;
   - user can hide it to the side;
   - after hiding, a sticky small icon remains, similar in spirit to mobile catalog filters;
   - the icon can reopen the widget;
   - it must not cover important buttons, product cards, cart, bottom nav, or admin controls.
4. Done on 2026-05-21: tighten product-card top controls:
   - stock badge is denser and less transparent;
   - compare/wishlist controls no longer use blurry glass;
   - the style stays closer to serious minimal tooling.
   - later polish: shared background capsule removed; compare/wishlist now behave as separate neutral icon buttons with a small checkmark when active.
   - final polish: product-card top controls are minimal ink controls over media; no orange selected fill, no green availability capsule, just a status dot and strong readable text.
5. Done on 2026-05-21: polish header icon system:
   - header icon buttons use one neutral frame style;
   - hover is consistent across search, wishlist, compare, theme, cart and account;
   - selected/count state no longer paints the whole icon or border orange;
   - only the numeric badge stays primary.
6. Done on 2026-05-21: stories popup is now a responsive right-side panel:
   - uses 9:16 story frame;
   - aligns to the right edge with viewport-aware sizing;
   - shared bottom action drawer shows description, action and related products/services;
   - opening a story hides competing floating chrome through the shared overlay guard.
7. Done on 2026-05-21: mobile floating chrome has one control logic:
   - story widget, compare/wishlist drawer, PWA install and scroll-to-top step away when another important panel is open;
   - mobile compare/wishlist moved from bottom overlay to side “Мой выбор” drawer.
8. Re-check stories pages:
   - `/stories`;
   - `/catalog`;
   - product/service pages where related stories can appear;
   - `/admin/stories`.
9. Re-check media library and uploads:
   - admin media page;
   - story upload;
   - service image upload;
   - product/promotion/post media fields if touched.
10. Check visible launch bugs found while testing, but only fix bugs related to stories/media/services/editors in this pass.

## Checks Passed On 2026-05-21

- `npm run stories:check`
- `npm run content:check`
- `npm run design:check`
- `npx tsc --noEmit --pretty false`
- `npm run quality`
- `npm run build`
- Local HTTP smoke after dev restart:
  - `/catalog` -> 200
  - `/stories` -> 200
  - `/admin/stories` -> 200

Additional checks passed after the stories/header/product-card polish:

- `npm run design:check`
- `npm run content:check`
- `npm run stories:check`
- `npx tsc --noEmit --pretty false`
- `npm run quality`
- Local HTTP smoke:
  - `/catalog` -> 200
  - `/stories` -> 200
  - `/admin/stories` -> 200

## P1: Editors / Content System

1. Bring services and posts/articles closer to the same editor logic:
   - media selection/upload behavior;
   - preview behavior;
   - ARAY text/content helper behavior;
   - save flow and validation.
2. Keep the visible UI simple: powerful system inside, only useful controls shown outside.
3. Do not start a broad CMS constructor yet.

## P2: Services Next Layer

- Service views.
- Conversion chain: view -> request -> deal.
- Manager notifications for new service requests.
- Staff/roles/schedule binding.
- Service settings: duration, place, visit/online/offline.
- Packages and repeat visits.
- ARAY suggestions for services.

## P3: Direct / Metrika Safety

1. Export Direct only as a stopped draft.
2. Manually verify in Yandex:
   - UTM;
   - region;
   - daily limit;
   - counter;
   - campaign text and links.
3. Enable impressions manually only after final review.
4. Later: connect Metrika OAuth so ARAY can create/sync goals.
5. Do not guess `order`, `cart`, `checkout` goals without exact Metrika match.

## Required Checks Before Calling It Done

Run the relevant checks for the touched block:

- `npm run stories:check`
- `npm run content:check`
- `npm run direct:check` if Direct files were touched
- `npm run nav:check` if navigation/admin menu files were touched
- `npm run quality`
- `npm run build`

Browser smoke:

- `/stories`
- `/catalog`
- `/admin/stories`
- `/admin/media`
- `/admin/services`
- `/admin/posts`
- `/admin/promotion`

## Next Best Action

Start with P0: polish the stories widget collapse/hide behavior, then run stories/media checks.
