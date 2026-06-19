# ARAY Admin Section Audit Queue

Date: 2026-06-09
Project: `D:\проект\pilorus\website`
Production domain: `pilo-rus.ru`

## Ground Rules

- This chat works on ARAY Production / PiloRus only.
- `D:\Zeder` and `zaidr.ru` are separate work and are not the source of truth here.
- Local `http://localhost:3101` must run from `D:\проект\pilorus\website`.
- Every section is checked in the same rhythm: open, load data, try safe action, save draft if possible, reload, check mobile/tablet/desktop, record status.
- Dangerous actions are not executed without confirmation: delete, publish, domain, payments, release, mass destructive import.

## Already Verified On 2026-06-09

- Correct folder confirmed: `D:\проект\pilorus\website`.
- Local 3101 switched away from Zeder to PiloRus.
- Production `pilo-rus.ru` health was checked earlier and responded healthy.
- Local health core works: database and orders are OK. Local status is degraded only because local Telegram token and Google AI secret are not configured.
- TypeScript passed: `npx tsc --noEmit`.
- Admin navigation passed: `npm run nav:check`.
- ARAY modules registry passed: `npm run modules:check`.
- Module navigation contract passed: `npm run module-nav:check`.
- Release smoke passed: `npm run release:smoke`.
- Release readiness passed: `npm run release:check`.
- ARAY assistant passed: `npm run aray:assistant`.
- Cart checkout contract passed: `npm run cart:check`.
- Store constructor contract passed: `npm run constructor:check`.
- Content tools passed: `npm run content:check`.
- Release protection passed: `npm run protection:check`.
- PWA icons passed: `npm run pwa:check`.
- Analytics passed: `npm run analytics:check`.
- Finance integration passed: `npm run finance:check`.
- Yandex Direct integration passed: `npm run direct:check`.
- Dynamic Role OS passed: `npm run role-os:check`.
- Popup layer guard passed: `npm run popups:check`.
- Store stories contract passed: `npm run stories:check`.
- Section approval protocol passed: `npm run section-approval:check`.
- Architecture audit passed: `npm run architecture:check`.
- Browser cart flow passed on local server: `npm run browser:cart:check:prod`.
- Browser mobile store flow passed on local server: `npm run browser:mobile:check:prod`.
- Browser stories responsive passed on local server: `npm run browser:stories:check:prod`.
- Design system guard was fixed and now passes: `npm run design:check`.

## Fixed In This Pass

- Old forbidden radii were moved to approved `rounded-xl` / `rounded-2xl` patterns.
- Hardcoded UI colors were moved toward design tokens and CSS variables.
- Permanent small/medium/large shadows and backdrop blur violations were removed from changed UI surfaces.
- Destructive inline alerts were moved to `admin-alert admin-alert-danger`.
- Filled selected states in ARAY CMS controls were softened to token-based selected styles.
- ARAY A mark colors now use CSS variables instead of raw hex/rgb values.

## Queue Order

### 1. Catalog Core

Status: completed in this pass.

Pages:
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]`
- `/admin/products/audit`
- `/admin/products/import-prices`
- `/admin/import`
- `/admin/categories`
- `/admin/product-types`

What to verify:
- product list loads fast and filters/search do not break;
- create/edit product draft works;
- variant, price, stock, image, category, SEO fields save and survive reload;
- import/export gives clear preview and does not silently overwrite;
- product audit explains missing images/prices/categories;
- mobile layout does not hide important actions.

Manual audit progress:
- `Fixed` `/admin/products` on 2026-06-09: opened locally at `http://localhost:3101/admin/products`, product data loaded (60 products), mobile layout kept key actions visible, hidden-products filter worked (`3 из 60`), browser console had no app errors. Added URL-persisted product search by name, slug, category, and variant size; search survived reload (`q=ЦСП`), clear action returned to the full list, and filtered selection now drops products hidden by the current filter/search. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/products/new` on 2026-06-09: opened locally, categories loaded, required fields and variant controls were available, and a safe hidden draft was created: `ARAY audit draft 20260609131253` (`cmq6nv61s000212uizacm77fn`, `active: false`). Verified saved name, slug, category, inactive status, short/SEO descriptions, variant size, price per m³, price per piece, pieces per m³, and in-stock state in the database and after browser reload. Fixed the mobile save panel so it no longer overlays form fields, made status/recommended toggles stateful and accessible, and changed the hidden draft public link label from `На сайте` to `Предпросмотр`. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/products/[id]` on 2026-06-09: edited the same hidden audit draft safely, saved a new short description and changed the variant price per piece from `75` to `80`. Browser save returned `Сохранено`, reload preserved the values, and database verification confirmed the product stayed hidden (`active: false`) with size `25×100×6000`, price per m³ `12345`, price per piece `80`, pieces per m³ `67`, and `inStock: true`.
- `Fixed` `/admin/products/audit` on 2026-06-09: opened locally after first-load compile, data loaded (121 products, 967 variants, 171 issues), and the audit clearly explained variants without prices, products without photos, and empty categories. No catalog-changing action was executed. Fixed row-level audit actions so single `Скрыть` / `Показать` / `Деактивировать` actions now ask for confirmation before changing catalog data, matching the existing bulk-action protection. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/products/import-prices` on 2026-06-09: opened locally, CSV instructions and upload/paste field loaded, preview stayed disabled on empty input, and a safe supplier-price preview was run without applying changes. Preview showed matched rows, old/new prices, changed count, and zero unmatched rows for the test product `Брус обрезной 1 сорт ГОСТ (Сосна/Ель)`. Verified the two-step apply protection (`Применить изменения` → `Да, применить` / `Отмена`) and canceled before applying; database prices remained unchanged (`100×100×6000`: `17000` / `1065`). Fixed the mobile apply panel so it sits above the admin bottom navigation and confirmation buttons are reachable. Verified with `npx tsc --noEmit` and `npm run design:check`.

- `Fixed` `/admin/import` on 2026-06-09: opened locally at `http://localhost:3101/admin/import`, Google Sheets and Excel/CSV blocks loaded, export links were visible, and the Excel/CSV apply button stayed disabled before a file preview. Fixed the product import flow so uploaded CSV/XLSX files now run through a server-side `preview=1` dry run before any write, show rows/updated/created/errors in the UI, and require a second explicit confirmation before applying. The import API now skips all catalog writes during preview, returns preview counts, scopes variant/product/category lookup to the current tenant, revalidates catalog paths only after a real import, and rejects real imports with no matched changes. Verified a safe authenticated preview with a one-row CSV (`updated: 1`, `created: 0`, no errors) and confirmed the checked variant price stayed unchanged in the database. Cleaned table whitespace in `/admin/products/import-prices` preview tables to avoid React table hydration warnings. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Input received` `/admin/import` on 2026-06-11: received WooCommerce CSV `wc-product-export-11-6-2026-1781182114661.csv` from the user and parsed it safely without applying changes. File contains 1,937 product rows: 350 variable products, 1,250 variations, and 337 simple products. Next step is a dry-run mapping/import preview against the PiloRus catalog before any catalog write.
- `Fixed` `/admin/categories` on 2026-06-09: local in-app browser automation was unavailable after the `/admin/import` check, so this pass used authenticated local HTTP/API checks plus code review. The page responded 200, the categories API loaded 6 tenant-scoped categories, and an invalid empty-category create attempt returned 400 with the database count unchanged. Fixed the category UI so new categories start hidden from menu/footer by default instead of being silently published, and the row-level `show` / `hide` action now asks for confirmation before changing public navigation. Existing delete protection remains in place and the API blocks deleting categories with products or child categories. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/product-types` on 2026-06-09: verified locally through authenticated HTTP/API checks after the in-app browser automation became unavailable. The page responded 200, the product-types API loaded 22 items, and an invalid PATCH without an items array returned 400 with the saved `product_type_settings` value unchanged. Fixed the main save action so changes to catalog filters, SEO text, and sitemap now require an explicit confirmation before being written. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Started` `/admin/suppliers` multivendor foundation on 2026-06-11: added first controlled marketplace layer without changing the public catalog checkout path. New Prisma models `Supplier` and `SupplierOffer` attach seller offers to existing `ProductVariant` rows, so PiloRus keeps one SEO/catalog surface while admins can track vendor prices, stock, lead time, and preferred offers per size. Added admin page `/admin/suppliers`, supplier and offer APIs, navigation/search/permissions wiring, catalog action link, business settings link, `npm run multivendor:check`, and release readiness coverage. Verified with `npm run multivendor:check`, `npm run nav:check`, `npx tsc --noEmit --pretty false`, `npm run design:check`, `npm run text:check`, and `npm run release:check`. Local `prisma db push` is blocked until disk `C:` has free space because local PostgreSQL reports `No space left on device`; production deploy should apply schema where the server DB has space.
- `Fixed` marketplace home and seller offers on 2026-06-12: added public `/marketplace` as **ПилоРус Биржа пиломатериалов**, wired it into desktop/tablet/mobile navigation, and seeded the current PiloRus catalog as seller N1 offers without duplicating products. Candidate sellers `derevotrade`, `pilmos`, `derevo-lider`, and `faneragroup` now have source URLs/contact profiles and preliminary offer rows with controlled +/- 1-5% retail price spread for preview only. Added unpublished `marketing-draft` review templates with `approved: false` so real public reviews still require source verification. Updated `npm run multivendor:check` to guard marketplace home, no-duplicate offer seeding, review draft safety, and public navigation.
- `Fixed` vendor YML/XML feed preview on 2026-06-12: checked Pilmos feed `https://pilmos.ru/wp-content/uploads/feed001.xml` safely without applying changes. Feed contains 1,320 offers and 110 categories; preview matched 390 high-confidence offers, 219 medium, 28 low, and 683 unmatched against 51 active PiloRus products / 406 variants. Added reusable CLI `npm run vendor:feed:preview` and admin preview block on `/admin/suppliers` backed by `/api/admin/suppliers/feed-preview`. The preview reports match counts, price delta by nearest unit, high-confidence samples, and categories without pairs; it does not create products, update prices, publish sellers, or import reviews.
- `Fixed` controlled feed apply on 2026-06-12: `/admin/suppliers` feed preview now lets staff tick selected high-confidence rows and apply them as `SupplierOffer` rows only after an explicit confirmation checkbox. The API ignores client-provided matches, re-downloads the feed, recalculates matching server-side, accepts only selected `high` rows, updates the nearest price unit (`m3` or `piece`), and revalidates admin/catalog/vendor/product pages. It still does not create new catalog products, publish seller storefronts, or apply medium/low/unmatched rows.
- `Fixed` high-confidence feed worklist on 2026-06-12: expanded `/admin/suppliers` feed preview from a short sample into a controlled worklist of up to 100 `high` matches with search, 25/50/100 visible limits, visible-row selection, clear selection, and no automatic preselection. Apply remains limited to selected `high` rows and the server still recalculates every match before writing `SupplierOffer` rows.
- `Fixed` Vendor Storefront 2 on 2026-06-12: `/vendors/[slug]` now behaves more like a seller mini-storefront with offer counters, category count, minimum price, last update signal, search by seller product, category filter, quick category chips, reset path, and a clearer empty-filter state. Verified that `/marketplace`, `/vendors`, and `/vendors/pilorus` respond locally and that PiloRus storefront has active offers instead of the previous empty state.
- `Fixed` Seller Scan Preview on 2026-06-12: added `/api/admin/suppliers/site-scan-preview` and an `/admin/suppliers` preview block that reads a seller source site and extracts candidate title, description, logo, phone, email, and social links without applying anything to the seller card. Confirmed the product surface should reuse the existing PiloRus `ProductCard` and templates rather than inventing a second seller-card design.
- `Fixed` public seller business language on 2026-06-12: cleaned `/vendors` and `/vendors/[slug]` so buyer-facing copy reads as a finished supplier storefront, not an internal tool. Replaced scan/preview/moderation wording with supplier, assortment, prices, delivery, conditions, quick request, and added seller quick-story cards plus a `Написать продавцу` chat action using the existing ARAY chat.
- `Fixed` seller storefront lead capture on 2026-06-12: `/vendors/[slug]` now has a buyer request form for a specific seller. Submission creates a CRM `Lead` with seller tags (`seller:<slug>`, `supplier-id:<id>`), writes a `LeadActivity`, and records an internal notification that opens `/admin/crm?leadId=<id>`. This gives Vendor Orders And Leads a first working path without changing checkout or duplicating products.
- `Fixed` seller lead visibility on 2026-06-12: `/admin/suppliers` now shows each seller's active/total storefront requests and has a `Заявки` action that opens `/admin/crm?search=seller:<slug>`. CRM reads the `search` URL parameter on load and the leads API searches exact seller tags, so managers can jump from a seller card to the right requests.
- `Fixed` seller storefront business showcase on 2026-06-13: `/vendors/[slug]` now fills the seller hero with useful buyer signals, quick purchase steps, trust chips, scenario cards, and direct anchors to request and product sections. `/marketplace` public text was cleaned from internal preview/scan wording; the multivendor guard now checks marketplace and seller pages for finished business language.
- `Fixed` storefront/admin launch hardening on 2026-06-11: production checks showed intermittent slow HTTPS/static responses and a draft public product at `/product/bad-krasivyy`. Added explicit no-store headers for `/admin`, `/cabinet`, `/checkout`, `/login`, and `/api/admin`, bumped the PiloRus service-worker cache version so old PWA caches are purged on activate, and added an idempotent data migration that deactivates the draft storefront slugs `bad-krasivyy`, `bad-krasivy`, and `bad-krasivyj`. Server/network latency still needs VPS-level monitoring because even static assets sometimes respond slowly from production.
- `Fixed` `/admin/products/[id]` publication status on 2026-06-11: hidden products no longer show the misleading `Товар готов к публикации` readiness line or a public preview link that opens a 404. The editor now shows `Скрыт с сайта` and explains that the public page is unavailable until the product is activated. Verified with `npx tsc --noEmit --pretty false` and `npm run design:check`. In-app browser automation could not run because the local `C:` drive is full and the browser runtime fails with `Недостаточно места на диске`.

### 2. Inventory And Media

Status: completed in this pass.

Pages:
- `/admin/inventory`
- `/admin/images/fix`
- `/admin/media`
- `/admin/watermark`
- `/admin/watermark/recovery`

What to verify:
- stock table loads and edits safely;
- low stock/on order/out of stock states are clear;
- image repair tools do not damage good images;
- media upload/search/gallery actions are understandable;
- watermark recovery has confirmation and rollback path.

Manual audit progress:
- `Fixed` `/admin/inventory` on 2026-06-09: local in-app browser automation was unavailable, so this pass used authenticated local HTTP/API checks plus code review. The page responded 200 and the movement journal endpoint loaded through the page. Fixed the inventory page to show only variants for the current tenant and to allow only inventory roles. Fixed warehouse CSV import so selecting a file now runs a server-side `preview=1` dry run first, shows the selected file and update count, and requires a second explicit confirmation before applying stock/status/threshold changes. Verified dry-run import with English and Russian CSV headers (`updated: 1`, `rows: 1`, no errors) and confirmed the checked variant stayed unchanged in the database. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/images/fix` on 2026-06-09: verified locally through authenticated HTTP/API checks after in-app browser automation stayed unavailable. The page responded 200 and the image diagnostic API returned 60 tenant products with zero duplicates, zero broken refs, zero missing images, and zero wm duplicates. Fixed the `remove_wm_duplicates` repair action so it removes only a `wm-` image that has a matching original image beside it, instead of removing every `wm-` image whenever any original exists on the product. The UI now shows the wm repair action only when exact wm duplicates are detected, and products with only wm-duplicate issues appear in the problem list. No repair action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/media` on 2026-06-09: verified locally through authenticated HTTP/API checks. The page responded 200 and the media API returned 115 files without hitting the 1000-file limit (`hasMore: false`), with 69 used and 46 free. Single and bulk delete controls are limited to files the API reports as unused and still require confirmation. Fixed media usage detection so reviews, promotions, and site settings are included before a file can be shown/deleted as free; `media_alt_map` and `watermark_backup` are intentionally ignored so ALT metadata and rollback snapshots do not block cleanup. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/watermark` and `/admin/watermark/recovery` on 2026-06-09: verified locally through authenticated HTTP/API checks. `/admin/watermark`, `/api/admin/watermark`, `/admin/watermark/recovery`, and `/api/admin/watermark-recovery` responded 200. Recovery reported 60 tenant products, 10 orphaned originals, 0 orphaned `wm-` files, and 0 products needing restore; smart restore dry-run returned 0 matches and 0 unmatched, and no restore/apply/cleanup action was executed. Fixed `/admin/watermark` so only `SUPER_ADMIN` and `ADMIN` can open the page, matching the API. Hardened watermark upload/settings/apply: uploaded logos are now validated as PNG/WebP/SVG up to 5MB and converted to real PNG, watermark options are normalized server-side, and unsafe image paths are rejected (`/images/../secret.png` returned 400). Fixed watermark recovery API to scope all product reads/writes to the current tenant and to validate manual recovery image URLs before saving. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 3. Orders And Clients

Status: completed in this pass.

Pages:
- `/admin/orders`
- `/admin/orders/new`
- `/admin/orders/[id]`
- `/admin/orders/trash`
- `/admin/clients`
- `/admin/crm`
- `/admin/crm/automation`

What to verify:
- new order can be created from safe test data;
- status, manager, client, payment, delivery and comments save;
- trash/restore flow is protected;
- client card shows orders/history;
- CRM pipeline and automation do not expose fake buttons.

Manual audit progress:
- `Fixed` `/admin/orders` on 2026-06-09: opened locally through authenticated HTTP/API checks after in-app browser automation was unavailable. The page responded 200, order data loaded, and URL-persisted search was added for order number, client, phone, address/place, status/source labels, and UTM fields. Bulk delete now returns the actual deleted count, selection resets when search/filter changes, and API edits are blocked for trashed orders. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/new` on 2026-06-09: page responded 200, product picker now uses the sellable public terminal catalog instead of raw admin products, and an authenticated safe audit order was created locally then cancelled. Verified item creation, invalid empty order rejection, and no stock drift for the tested variant. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/[id]` on 2026-06-09: detail page responded 200, client/payment/delivery/comment edits saved and survived reload/API read. Added server validation so manually added order items can only use public, sellable variants from visible categories. Active orders can no longer be permanently deleted through the hard-delete endpoint. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/orders/trash` on 2026-06-09: page responded 200. Restore now has its own confirmation dialog, permanent delete is allowed only for orders already in trash, and restore only targets actually trashed orders. No destructive trash action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/clients` on 2026-06-09: page responded 200 and client history/contact data loaded. A temporary client address edit was saved then restored. Managers can edit basic client contacts, but password reset, delete, and staff promotion controls are hidden from them; the API also blocks manager role promotion and scopes client update/delete to the current tenant. Invalid admin promotion returned 400/403 without changing the user role. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/crm` on 2026-06-09: page responded 200 and CRM leads/orders APIs responded 200. Invalid lead create requests now return 400 for empty name, bad stage, and invalid assignee; assignees are validated as active staff in the current tenant. The order kanban no longer mutates trashed orders, repeated same-status updates return `unchanged` without re-sending side effects, order status changes from CRM now trigger real workflow events, and syncing orders into leads now requires confirmation. Existing active workflows were detected, so no audit lead was created to avoid triggering real automations. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/crm/automation` on 2026-06-09: page responded 200 and workflow/log APIs responded 200. Workflows and workflow logs are now tenant-scoped, missing workflow PATCH returns 404, preset application requires confirmation, new preset workflows are created disabled, and toggling a workflow active/inactive requires confirmation. The workflow engine now filters active rules by tenant and executes lead/order/task/document actions within the same tenant. Lead-created, lead-stage-changed, and CRM order-status-changed triggers are now wired to real events instead of being only visible labels. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 4. Operations

Status: completed in this pass.

Pages:
- `/admin/tasks`
- `/admin/workflows`
- `/admin/messenger`
- `/admin/notifications`
- `/admin/staff`
- `/admin/director`
- `/admin/health`

What to verify:
- tasks can be created/assigned/closed;
- workflow statuses are visible;
- messenger opens without blocking admin;
- notifications settings and bell are consistent;
- staff roles are understandable and protected;
- health page separates critical and optional services.

Manual audit progress:
- `Fixed` `/admin/tasks` on 2026-06-10: verified locally through authenticated HTTP/API checks. The page responded 200, task API loaded, invalid status returned 400, and a safe audit task was created then closed: `ARAY Operations audit task 20260610151509` (`cmq817hh90006slwngxo10l6y`). A comment save check also returned 200, and a blank-title PATCH returned 400. Hardened task APIs so reads/writes are tenant-scoped, deleted orders cannot be attached, blank titles/sort order/date/status/priority are validated server-side, assignees must belong to the current tenant, and task relation hrefs are limited to internal admin/cabinet links. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` `/admin/workflows` on 2026-06-10: page and workflow API responded 200. Empty workflow names now return 400. A safe disabled audit workflow draft was created and saved: `ARAY audit workflow 20260610151509` (`cmq817iu60009slwn3nye444z`, `active: false`). Workflow list/update/delete APIs are now tenant-scoped, new workflows are created disabled by default, default workflow seeding deduplicates by tenant/name and creates disabled rules, and enable/disable in the UI now requires confirmation. No workflow was activated. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/messenger` on 2026-06-10: page responded 200 and the route is protected for staff communication roles. The page only opens the embedded ARAY Messenger shell with URL-driven search/dial context and does not mutate data on load. No blocking behavior was found during code/API review and local page check.
- `Fixed` `/admin/notifications` on 2026-06-10: page, notification center, settings, push debug, and subscriber APIs responded 200; an empty push-send request returned 400 without sending. Added confirmations before manual push broadcast, duplicate cleanup, and Telegram webhook setup. Push send/debug/subscribers/cleanup now scope registered users to the current tenant, validate broadcast segment, trim title/body, and force notification URLs to internal paths. Telegram setup remains admin-only. No push broadcast, cleanup, or webhook setup action was executed. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` order status notifications on 2026-06-11: changing order status from `/admin/orders/[id]` or the CRM order kanban now records a guaranteed internal staff notification, passes previous status to workflows, records push deliveries with order metadata, and surfaces zero push subscribers as a visible failed delivery instead of a silent queued event. The admin bell feed now includes unread order-status events, and order-status notification settings are enabled for staff roles by default. PiloRus address remains `Химки, ул. Заводская 2А, стр.28`; customer status/email/Telegram texts use that address. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `Fixed` order status email delivery audit on 2026-06-13: checked the latest status-change case and found the customer order had no email and no registered account, while staff push subscriptions were also empty, so external notifications had no valid recipient. Added tracked status email delivery for `/admin/orders/[id]`, CRM order kanban, and Telegram status buttons: successful email, missing customer email, and SMTP failure now create visible notification-center events tied to the order. Verified with `npx tsc --noEmit --pretty false`, `npm run quality`, production GitHub Actions deploy `25c0e23`, and `npm run test:prod`.
- `Fixed` new-order Telegram delivery audit on 2026-06-13: customer checkout and admin-created orders now resolve Telegram credentials from server env or tenant site settings, wait for the Telegram response before saving `telegramMessageId`, retry with plain text if Telegram rejects Markdown, and record sent/failed Telegram delivery events in the notification center tied to the order. Telegram webhook setup, test endpoint, callback route, status edits, order edit messages, and health checks now use the same credential resolver and mask chat IDs in diagnostics. Verified with `npx tsc --noEmit --pretty false`, `npm run quality`, `npm run direct:check`, `npm run analytics:check`, and `node scripts/validate-admin-ui-integrity.js`.
- `Fixed` `/admin/staff` on 2026-06-10: page and staff API responded 200, and invalid status updates returned 400 without changing staff data. Removed predictable role default passwords (`admin123`, etc.); selecting a role now generates a random password only when the field is empty. Staff status changes now require confirmation before opening or blocking access, and staff APIs return 400 for malformed JSON instead of falling through. Delete still has an explicit inline confirmation and self-delete remains blocked. Verified with `npx tsc --noEmit` and `npm run design:check`.
- `OK` `/admin/director` on 2026-06-10: page responded 200. Director metrics and role-specific panels are tenant-scoped and respect smart-cabinet visibility for finance, staff, tasks, inventory, CRM, and operations links. No data-changing action was available or executed.
- `Fixed` `/admin/health` on 2026-06-10: page and health API responded 200. Health counters for products, orders, users, variants, SMTP settings, push subscribers, product image/price checks, and stale orders now use the current tenant. The missing ARAY AI provider key is now reported as a warning/optional capability instead of a critical system error, so health separates core breakage from optional integrations more honestly. Verified with `npx tsc --noEmit` and `npm run design:check`.

### 5. ARAY Production

Status: completed in this pass.

Pages:
- `/admin/aray`
- `/admin/aray/orders`
- `/admin/aray/builder`
- `/admin/aray/briefs`
- `/admin/aray/modules`
- `/admin/aray/connectors`
- `/admin/aray/partners`
- `/admin/aray/brand-kit`
- `/admin/aray/requisites`
- `/admin/aray/costs`
- `/admin/aray/arc`
- `/admin/aray/agents`

What to verify:
- ARAY orders move from lead to brief to builder;
- builder creates a clear site plan from blocks;
- modules show passport/status/route truthfully;
- connectors do not pretend connected services are active;
- partners/requisites/costs are protected;
- assistant opens the right admin section and asks confirmation for dangerous actions.

Manual audit progress:
- `Fixed` ARAY Production on 2026-06-10: verified locally through authenticated HTTP/API checks. All section pages responded 200: `/admin/aray`, `/admin/aray/orders`, `/admin/aray/builder`, `/admin/aray/briefs`, `/admin/aray/modules`, `/admin/aray/connectors`, `/admin/aray/partners`, `/admin/aray/brand-kit`, `/admin/aray/requisites`, `/admin/aray/costs`, `/admin/aray/arc`, and `/admin/aray/agents`. Read APIs for modules, connectors, costs, subscriptions, and release responded 200; `/api/admin/aray` is POST-only and returned 405 on GET as expected. Fixed ARAY order/brief/builder/partner reads so leads, tasks, task relations, connectors, and partner applications are scoped to the current tenant. Hardened public ARAY marketing and partnership forms so malformed JSON and invalid name/phone return 400, user text is length-limited, partnership email HTML is escaped, and created CRM records carry the current tenant. Added confirmation requirements before preparing launch tasks, saving block plans, creating site shells, creating sites from scan, cloning ARAY CMS sites, changing module state/policy, running Yandex connector write actions, and changing ARAY budget subscriptions; matching APIs now reject unconfirmed writes with 400. Removed inactive fake builder buttons and replaced them with honest non-clickable status rows. No site clone, site shell, module toggle, Yandex goal creation, subscription create/delete, or destructive action was executed. Verified with `npx tsc --noEmit`, `npm run design:check`, authenticated page/API smoke checks, and negative no-confirm POST/PATCH/DELETE checks.

### 6. Site Factory And Settings

Status: completed in this pass.

Pages:
- `/admin/site`
- `/admin/site/constructor`
- `/admin/site/releases`
- `/admin/site/benchmarks`
- `/admin/appearance`
- `/admin/settings`
- `/admin/business/settings`
- `/admin/delivery`
- `/admin/delivery/rates`
- `/admin/email`

What to verify:
- site settings save and are visible on public pages;
- constructor has a clear next step and preview;
- releases are protected;
- delivery and email settings do not expose secrets;
- appearance changes do not break the design system.

Manual audit progress:
- `Fixed` Site Factory And Settings on 2026-06-10: verified locally through authenticated HTTP/API checks. Pages responded 200: `/admin/site`, `/admin/site/constructor`, `/admin/site/releases`, `/admin/site/benchmarks`, `/admin/appearance`, `/admin/settings`, `/admin/business/settings`, `/admin/delivery`, `/admin/delivery/rates`, and `/admin/email`. Read APIs responded 200 for site settings, appearance, site constructor blueprints/sites, delivery rates, email, SMTP settings, PiloRus PWA manifest, favicon, apple-touch, and 192px icon assets. Hardened site settings, appearance, site constructor, delivery rates, delivery status changes, and email tools so important writes require explicit confirmation, settings are tenant-scoped, SMTP secrets stay masked, email send/import/register paths are bounded and tenant-aware, HTML is sanitized, and email URL scanning blocks localhost/private/internal targets. Unified PiloRus PWA/favicons so `public/logo.png` is the single source: the generator now also writes a valid `public/favicon.ico` with 16/32/48 PNG entries, the static manifest uses install-safe icons, and the site icon cache version was bumped. Negative no-confirm checks returned 400 for site settings, appearance, site constructor save, delivery rate create/delete, email SMTP save/send/import, and private URL scan. No publish, site clone, delivery tariff write, SMTP save, email send, email import/register, or destructive action was executed. Verified with `npx tsc --noEmit`, `npm run design:check`, `npm run pwa:check`, authenticated page/API smoke checks, and negative no-confirm checks.

### 7. Marketing And Content

Status: completed in this pass.

Pages:
- `/admin/promotion`
- `/admin/promotions`
- `/admin/posts`
- `/admin/stories`
- `/admin/reviews`
- `/admin/services`
- `/admin/help`
- `/admin/analytics`
- `/admin/finance`
- `/admin/exchange`
- `/admin/terminals`
- `/admin/terminals/training`

What to verify:
- promotion pages show real campaigns and next action;
- posts/stories/reviews/services can be edited safely;
- analytics and finance explain missing integrations;
- terminals/training have a usable path for managers.

Manual audit progress:
- `Fixed` Marketing And Content on 2026-06-11: verified locally through authenticated HTTP/API checks. Pages responded 200: `/admin/promotion`, `/admin/promotions`, `/admin/posts`, `/admin/stories`, `/admin/reviews`, `/admin/services`, `/admin/help`, `/admin/analytics`, `/admin/finance`, `/admin/terminals`, and `/admin/terminals/training`; `/admin/exchange` returned its expected 307 redirect. Public `/contacts` and `/about` responded 200 after contact/requisite updates. Hardened marketing/content writes so promotions, posts, stories, reviews, services, review admin replies, finance expenses, Direct readiness, Metrika goals, SEO actions, terminal integrations, terminal autoconfig, workstations, shifts, payments, print jobs, and ARAY terminal module actions require explicit confirmation server-side and in the UI where applicable. Confirmed no-confirm negative checks returned 400 for all newly protected endpoints. Updated PiloRus contacts and requisites to `ООО «ДЕРЕВОЛИДЕР»`, then superseded the public launch phones on 2026-06-15 with the single active PiloRus number from the Catalog Core cleanup entry below. PiloRus address remains `Химки, ул. Заводская 2А, стр.28`. Added the new legal/bank fields to `/admin/site`, public contacts/about pages, defaults, footer, and current tenant site settings. Rechecked PWA/favicons with `npm run pwa:check`. Verified with `npx tsc --noEmit`, `npm run design:check`, `npm run pwa:check`, authenticated page/API smoke checks, and contact HTML checks.
- `Deploy data` Marketing And Content on 2026-06-11: added an idempotent `prisma/data-migrate.ts` settings step so production deploy also upserts the new PiloRus phones, address, legal requisites, bank details, and MAX link for the default tenant instead of relying only on code defaults.
- `Fixed` PWA icons and Direct legal readiness on 2026-06-11: regenerated PiloRus PWA/favicons from the clean transparent `logo.svg` mark instead of the detailed full logo tile, bumped the site icon cache version, and updated the release guard. Cleaned public legal identity for launch: `/privacy`, `/terms`, schema.org, `/about`, home FAQ/about text, product JSON-LD seller, footer/header fallbacks, and the legacy admin migrate helper now use `ООО «ДЕРЕВОЛИДЕР»`, OGRN/INN/KPP and the existing PiloRus address `Химки, ул. Заводская 2А, стр.28`. Added explicit personal-data consent to public contact, service, product request, promo, checkout registration, account drawer registration, registration page, product review and home review forms; matching public APIs now reject missing consent for contacts, orders, promo requests, registration, and reviews. Verified old `ООО «ПИТИ»`/old phones are no longer found in public code, and checked against official Yandex Direct requirements for page correctness and seller/contact data. Verified with `npx tsc --noEmit --pretty false`, `npm run design:check`, `npm run pwa:check`, `npm run direct:check`, `npm run text:check`, `npm run cart:check`, `npm run release:check`, and `npm run release:smoke`.
- `Needs mapped sync` pil-mos catalog parity on 2026-06-11: found a reliable public source at `https://pil-mos.ru/wp-json/wc/store/products`; it returned 176 products while current PiloRus admin API returned 60 products, and automatic slug/name matching found 0 safe matches. No mass catalog import was applied in this Marketing pass because it would create a second catalog beside the current one instead of safely updating existing products. Next Catalog Core follow-up should build an explicit pil-mos -> PiloRus mapping/import preview before applying assortment and price changes, with prices equal or up to 2% lower as requested.

### 8. Marketplace Direction And Vendor Core

Status: started.

Pages:
- `/admin`
- `/admin/products`
- `/admin/suppliers`
- `/admin/promotion`
- `/admin/analytics`
- `/admin/settings`
- service-only ARAY routes

What to verify:
- daily admin navigation starts from marketplace work, not old site-builder work;
- sellers/vendors are discoverable from menu, search, mobile menu, account drawer, and catalog quick actions;
- ARAY builder/project/release routes stay available for owner/service use but do not distract normal PiloRus operators;
- the next Vendor Core layer can build on `/admin/suppliers` without renaming confusion.

Manual audit progress:
- `Fixed` marketplace direction on 2026-06-12: created `docs/PILORUS_MARKETPLACE_LAW_2026-06-12.md` as the project law. It fixes PiloRus as the timber marketplace etalon, keeps future sport nutrition/biohacking on separate domains and servers, defines timber monetization as monthly service/ads-first, defines sport nutrition as future commission/referral-friendly, and sets the Vendor Core order.
- `Fixed` admin navigation packaging on 2026-06-12: changed visible admin language from generic shop/constructor toward marketplace terms. The products group is now `Биржа`, suppliers are shown as `Продавцы / Поставщики`, current site editing is `Редактор витрины`, and old ARAY launch/builder/project/release routes are service/search/direct-only instead of normal daily menu paths. Header search, side search, mobile menu, account drawer context, business settings, quick actions, nav rail subtitles, and the constructor guard now prioritize catalog, sellers, orders, Direct/SEO, analytics, roles, and current storefront settings. Verified with `npm run constructor:check`, `npm run nav:check`, `npm run multivendor:check`, `npx tsc --noEmit --pretty false`, `npm run design:check`, and `npm run text:check`.
- `Fixed` ARAY CMS visibility on 2026-06-12: decided to keep ARAY CMS as an internal platform engine for future cloning, separate servers, new niches, and owner/developer service routes, but remove it from daily PiloRus navigation. The desktop rail, mobile menu, and account drawer no longer expose the ARAY CMS group; the top active-site switcher was removed from the normal admin header so PiloRus operators see the marketplace workflow first. Direct/search/service access remains available for owner/developer work. Verified with `npm run nav:check`, `npx tsc --noEmit --pretty false`, and `npm run design:check`.
- `Fixed` Vendor Core storefront layer on 2026-06-12: extended sellers from supplier-price rows into marketplace profiles with source site URL, logo, public description, specialization, delivery summary, storefront publish flag, featured seller marker, and marketplace order. Added public seller pages `/vendors` and `/vendors/[slug]`, with PiloRus seeded as seller N1 and ДеревоТрейд, Pilmos, ДеревоЛидер, and ФанераГрупп seeded as scan candidates. `/admin/suppliers` now manages sellers, storefront readiness, source URLs for future scans, and seller offers. Seller PWA is accepted as a later layer after storefronts, permissions, and scan/import preview.
- `Fixed` PiloRus client-site pivot on 2026-06-13: marketplace/vendor public entry points are hidden for launch. `/marketplace`, `/vendors`, and `/vendors/[slug]` redirect to `/catalog` with noindex metadata; public header no longer shows `Биржа` or `Сотрудничество`; `/admin/suppliers` and `/admin/site/constructor` stay direct/service-only; business settings focus on PiloRus site, catalog, orders, SEO, Direct and PWA. Public search now uses the same sellable-catalog rules as `/catalog` and the footer has one website-development lead popup for `Разработка сайта — Юва студия`.
- `Fixed` PiloRus SEO/search launch polish on 2026-06-13: `/robots.txt` is now a single static public file with launch rules, disallows `/marketplace` and `/vendors`, and points to the sitemap. Verified `/sitemap.xml` has catalog pages and no marketplace/vendor URLs. Public search now tokenizes words and dimensions separately, so queries like `50x150` and `брус 150х150` return sellable catalog results instead of empty output.
- `Fixed` PiloRus final launch polish on 2026-06-13: added a fifth neutral promotion (`Расчет спецификации под объект`) and increased the home promotions block to show three cards. PWA/favicons now use the same `/logo.png` source as the public header; the temporary cropped `logo-icon.png` was removed to avoid brand mismatch. Launch settings now force the public domain, Direct region, Metrika counter, tenant domain, and PiloRus logo into both tenant settings and site settings. Public Metrika script is installed, while admin analytics and Direct spend remain dependent on Yandex OAuth access.

- `Fixed` Catalog Core Pilmos parity on 2026-06-15: built a repeatable WooCommerce CSV snapshot from `C:/Users/StormPC/Downloads/wc-product-export-11-6-2026-1781182114661.csv`, generated `686` PiloRus products and `1582` variants from the Pilmos assortment, and applied the requested price rule: PiloRus price = Pilmos CSV price * `0.99` with clean rounding. The idempotent data migration now upserts categories, products, images, SEO descriptions, sale units and variant prices on deploy without duplicating slugs or variants. Local DB after sync: `746` products total, `735` public sellable products, `2065` variants. YML was tightened to the current tenant, public sellable products only, clean 5 categories, stable numeric category ids, and correct external image URLs. Verified locally with `/catalog` search, a new product page, `/api/yml` (`1973` offers, no `pilo-rus.ruhttps://` image bug), `/sitemap.xml` (`785` product URLs including new imported products), `npx tsc --noEmit --pretty false`, `npm run text:check`, `npm run release:check`, `npm run direct:check`, `npm run analytics:check`, `npm run pwa:check`, and `npm run build`.
- `Fixed` Catalog Core storefront normalization on 2026-06-15: replaced the raw one-row-per-CSV-product public import with a grouped client storefront. The repeatable snapshot now produces `70` active product cards and `791` clean public variants across 5 launch categories (`20` Sosna/El, `18` Listvennitsa, `22` Fanera/list materials, `6` Kedr, `4` Lipa/Osina). Old raw/manual duplicates in those categories are retired from the public site on deploy (`746` local legacy products hidden, not deleted), while opilki/schepa/drova/meshki are excluded from the launch catalog. Variant labels are normalized to readable sizes only (`25x150x6000 mm`, sort/forest when needed), with promotion text and duplicated size fragments removed; imported grouped cards keep one main image to avoid broken galleries. Local public checks passed: old raw product slug returns 404, `/catalog`, product page, `/api/yml` (`790` offers, 5 categories), and `/sitemap.xml` contain no `Акции на пиломатериалы`, no raw `7321`, and no lowercase `сорт с`. Verified with `npx tsc --noEmit --pretty false`, `npm run text:check`, `npm run release:check`, `npm run direct:check`, `npm run analytics:check`, `npm run pwa:check`, and `npm run build`.

- `Fixed` Catalog Core final launch cleanup on 2026-06-15: checked the sheet-material layer and normalized the final storefront snapshot to `69` active product cards and `753` generated variants, with local public DB showing `69` sellable cards and `752` in-stock public variants. `Fanera/list materials` now has `21` clean cards covering MDF, DSP, DVP, CSP, OSB and plywood families; variants with missing sheet thickness or timber size are excluded instead of showing `0 mm` or grade-only labels. Timber variants without an explicit length now publish as `x6000 mm`, while sheet formats keep their own `1220x2440`, `1500x3000`, `2800x2070`, etc. Local data audit found `0` bad variant labels and `0` timber sizes missing length. Deploy data sync now archives obsolete variants and deletes obsolete variants with no order history, so old imported sizes do not keep polluting admin/product selectors. Public PiloRus phone defaults, DB settings, WhatsApp fields, header/form fallbacks and Avito export fallback now use the single launch number `+7 (495) 135-20-26` / `+74951352026`. The public product page no longer shows the extra `Ask ARAY` action, and `/admin/products` now defaults to 20 visible rows per screen with 20/40/80/manual page-size controls and page navigation. Verified with `npx tsc --noEmit --pretty false`, `npm run text:check`, `npm run release:check`, `npm run direct:check`, `npm run analytics:check`, `npm run pwa:check`, and `npm run build`.
- `Fixed` Catalog Core parity/admin clarity on 2026-06-15: split `Фанера` from `ДСП, ДВП, МДФ, ЦСП, OSB` in the repeatable Pilmos snapshot instead of keeping sheet materials hidden inside one broad category. Local DB now shows 6 public catalog categories: `20` Sosna/El, `18` Listvennitsa, `12` Fanera, `9` DSP/DVP/MDF/CSP/OSB, `6` Kedr, `4` Lipa/Osina. Checked the live Pilmos YML source `https://pilmos.ru/wp-content/uploads/feed001.xml`: it returns `1320` offers, while PiloRus intentionally publishes the assortment as grouped cards with variants, not one duplicate card per offer. `/admin/products` no longer shows inactive legacy products as `На витрине`; hidden rows are labelled `Скрыт от клиентов`, and active/ready rows get a direct open-on-site button. Heavy production photos used by the homepage/manifest were replaced with WebP runtime assets (`sklad-3.webp`, `sklad-4.webp`, `pwa-screenshot.webp`) to reduce first-screen image weight from about 3 MB each to about 170-220 KB.
- `Fixed` Catalog Core size cleanup on 2026-06-15: normalized all Pilmos-derived `2-6 м` timber variant labels to explicit `×6000 мм`, removed the duplicate variants that appeared after normalization, and reapplied the snapshot locally. Current public DB check: `69` active grouped cards, `745` variants, `0` old `2-6 м` labels, `0` `мм 6000 мм` labels, `0` duplicate sizes inside a product, `0` products without images, and `0` variants without price.

- `Fixed` PiloRus client launch handoff cleanup on 2026-06-15: locked the public storefront back to a clean client shop by setting `aray_enabled=false` in DB defaults, client defaults, and deploy data migration, so the visible site no longer shows the ARAY dock/mobile AI entry or `Ask ARAY` actions. Final local catalog audit after rebuild: `69` active cards, `745` variants, 6 categories (`20` Sosna/El, `18` Listvennitsa, `12` Fanera, `9` DSP/DVP/MDF/CSP/OSB, `6` Kedr, `4` Lipa/Osina), `0` old `2-6 m` labels, `0` `mm 6000 mm` labels, `0` duplicate variant labels, `0` missing images, `0` missing prices. Local browser smoke passed for `/catalog`, `/catalog?category=dsp-mdf-osb`, and a product page: no visible ARAY text, no old size labels, cart button present, launch phone `+7 (495) 135-20-26` visible. Local HTTP smoke passed for `/`, `/catalog`, `/catalog?category=dsp-mdf-osb`, `/catalog?category=fanera`, `/api/yml`, `/sitemap.xml`, and `/manifest.json` with status 200. YML currently exports `744` public in-stock offers and 6 categories; the single DB variant not exported is intentionally out of stock (`Terrasnaya doska iz listvennitsy 28x140 mm 2 m, sort a`). Verified with `npm run db:deploy`, `npx tsc --noEmit --pretty false`, `npm run text:check`, `npm run pwa:check`, `npm run direct:check`, `npm run analytics:check`, `npm run release:check`, `npm run design:check`, `npm run cart:check`, and `npm run build`.
- `Fixed` PiloRus final storefront polish on 2026-06-16: the home hero desktop call button now shows the launch phone `+7 (495) 135-20-26`, while the mobile hero keeps the shorter `Позвонить нам` label. The home `Каталог продукции` block was repacked into a stable 6-category grid so Sosna/El, Listvennitsa, Fanera, DSP/DVP/MDF/CSP/OSB, Kedr, and Lipa/Osina are all visible without a cropped bottom banner. The home data query now explicitly uses the PiloRus tenant so old `main` draft categories cannot appear on the client storefront. Catalog side and mobile filters use the neutral label `Размеры`; grouped size details now say `варианты` instead of implying only lengths. Fresh local DB audit: `69` public cards, `744` public in-stock variants, `0` missing images, `0` missing public variants, `0` old `2-6 м`, `0` bad `мм 6000 мм`, `0` duplicate cards, and `0` duplicate variant labels. Live Pilmos YML source `https://pilmos.ru/wp-content/uploads/feed001.xml` responded with `1321` offers; live PiloRus YML responded with `6` categories and `744` grouped offers. Local browser smoke passed for desktop `/`, mobile `/`, `/catalog`, and `/catalog?category=dsp-mdf-osb`: no public ARAY text, all 6 categories visible, filters show `Размеры`, and old size labels are absent. Verified with `npm run text:check`, `npx tsc --noEmit`, `npm run pwa:check`, `npm run build`, `npm run release:check`, `npm run analytics:check`, `npm run direct:check`, and live `/api/yml` HTTP check.
- `Fixed` PiloRus launch speed and SEO pass on 2026-06-16: removed unused global preloads/preconnects from the public shell, enabled Next image optimization for category/product cards and product galleries, converted the remaining heavy launch-local `listvennitsa`, `terrasnaya-doska-listv`, and `mdf-list` images to WebP, and updated local DB image references. Public ARAY helper UI was disabled for the PiloRus tenant and customer-facing ARAY labels in product/compare helpers were replaced with neutral manager/help copy. Home metadata now targets `пиломатериалы от производителя в Химках`, and the hero adds a short trust paragraph about сорт, сечение, наличие, счет for ИП/ООО/private orders. Mobile and 1280px desktop hero layouts were compacted so the next section is visible without horizontal overflow; large screens keep the immersive production image. Catalog metadata now uses public brand settings (`ПилоРус`) and the cleaner title `Каталог пиломатериалов с ценами | ПилоРус` instead of legal-company wording. Local browser smoke passed for `/`, mobile `/`, `/catalog`, and a product page: no visible ARAY/marketplace text, no horizontal overflow, optimized catalog images load at `384px`, product main image at `640px`, and launch phone `+7 (495) 135-20-26` is present. Verified with `npm run text:check`, `npx tsc --noEmit`, `npm run pwa:check`, `npm run build`, `npm run release:check`, `npm run analytics:check`, and `npm run direct:check`.
- `Fixed` PiloRus final client launch gate on 2026-06-17: restored the global ARAY assistant as the site helper while keeping the product page clean without the extra `Спросить Арая` product action. Public catalog/home/product pages now use the default PiloRus tenant directly and ISR caching, product/category links avoid heavy prefetch, and `/catalog` defaults to 20 cards to reduce first load. The mobile compare/favorites drawer now closes safely when the last item is removed, without losing the side rail or mobile bottom menu. Product chips were changed from unclear icon-only hints to readable buyer labels. SEO redirects now catch old category paths and legacy `/catalog`, `/category`, `/product-category`, and `/shop` category URLs. Fanera and DSP/DVP/MDF/CSP/OSB were cleaned as separate public/SEO categories, and the home quick buttons now link to them separately. Fresh local DB audit for tenant `pilorus`: `69` active grouped cards, `745` variants, 6 categories (`20` Sosna/El, `18` Listvennitsa, `12` Fanera, `9` DSP/DVP/MDF/CSP/OSB, `6` Kedr, `4` Lipa/Osina), `0` bad `2-6`/`?` sizes, and `0` suspicious high timber prices left as `за штуку`. Verified with `npm run text:check`, `npm run pwa:check`, `npm run browser:cart:check`, `npm run browser:mobile:check`, `npm run browser:stories:check`, `npm run quality:full`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- `Fixed` PiloRus client catalog/admin speed and price-unit pass on 2026-06-19: checked the new WooCommerce export `C:/Users/StormPC/Downloads/wc-product-export-19-6-2026-1781860375144.csv` in dry-run mode. The parsed source still contains `1937` CSV rows and normalizes to the same grouped launch catalog: `69` public product cards and `745` variants, with `0` product additions/removals and `0` price changes versus the current canonical Pilmos snapshot. Local DB remains `69` public cards and `744` public in-stock variants; the only missing CSV variant is still the intentionally non-public out-of-stock larch terrace board size. Found the admin slowdown cause: `/admin/products` was loading the full hidden legacy archive (`816` products / `2811` variants / about `2.54 MB` JSON) on initial open, while managers only need the active storefront (`69` products / `745` variants / about `372 KB`). The admin products API now supports active, hidden, and ids-only scopes; `/admin/products` opens on active products and lazy-loads the hidden archive only when hidden/no-photo/inactive filters need it. Hidden readiness also counts manually inactive products. Fixed public price-unit selection so catalog cards, product pages, search, compare, wishlist/compare dock, metadata, and JSON-LD prefer `m3` prices for non-piece timber products; conflicting piece prices are not offered in the cart selector, and the product page now opens a cube-priced variant first. Browser smoke confirmed `/catalog` and `/product/doska-obreznaya-iz-sosny-i-eli` have no horizontal overflow, the product starts on `25x100x6000 mm`, shows `Цена за 1 м³`, and disables the misleading `шт` switch for that cube variant. HTTP smoke passed for `/catalog`, `/product/doska-obreznaya-iz-sosny-i-eli`, `/sitemap.xml`, `/robots.txt`, `/api/yml` with status 200, and `/admin/products` redirects unauthenticated users to `/login`. Verified with `npx tsc --noEmit --pretty false`, `npm run design:check`, `npm run text:check`, `npm run pwa:check`, `npm run release:check`, `npm run cart:check`, and `npm run build`.
- `Fixed` Admin product consumers on 2026-06-19: `/admin/email` product insertion and `/admin/promotion` product stats now use the same active product scope instead of loading the hidden legacy archive through the full products API.
- `Fixed` Admin marketing alias on 2026-06-19: `/admin/marketing` now redirects to the working `/admin/promotion` marketing/Direct page so old manager links do not land on 404.

## Status Labels

- `OK`: opened, data loaded, safe action works, reload works, no obvious layout break.
- `Fixed`: issue found and repaired in this pass.
- `Needs work`: issue found, repair queued.
- `Blocked`: needs credential, production-only service, or user confirmation.

## Recommended Next Step

Start the next clean chat with this file and the first manual audit target:

`D:\проект\pilorus\website\docs\ARAY_ADMIN_SECTION_AUDIT_QUEUE_2026-06-09.md`

Next section to audit manually: PiloRus client launch polish: order/request flows, speed/browser smoke, production deploy verification, then Catalog Core pil-mos assortment/price parity with a mapped import preview from the WooCommerce Store API.
