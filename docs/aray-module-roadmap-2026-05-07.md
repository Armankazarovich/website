# ARAY Module Roadmap

Date: 2026-05-07

This roadmap turns Arman's latest product direction into module work. It must be read together with:

- `docs/aray-module-system-law-2026-05-07.md`
- `docs/ARAY_PRODUCT_BRAIN_INDEX_2026-05-07.md`
- `docs/aray-admin-live-checklist-2026-05-02.md`

## Product Rule

We do not deploy broken public releases just to move fast.

We keep developing locally and package the platform into modules. Deploy happens when the current release slice has:

- TypeScript green;
- module quality guard green;
- no known blocking UI bugs;
- browser smoke for admin/mobile/touch;
- honest beta labels where needed.

## Acceleration Strategy

The fast path is not writing every feature by hand from zero.

We first build the rails:

1. Module Passport type.
2. Module Registry.
3. Module Control Center.
4. Module Quality Gate.
5. Module Scaffolder.
6. Module Storefront.
7. ARAY module context and skill registry.

After that, each request becomes a product module instead of a pile of pages.

## P0: Finish ARAY Foundation

Goal: ARAY must be reliable enough to become the interface for the next module waves.

Modules/areas:

- ARAY Core;
- ARAY Voice;
- ARAY Provider Matrix;
- ARAY Connector Vault;
- ARAY Task/Notification relations;
- ARAY Module Assistant;
- Popup System;
- Motion System / Page Flow;
- App Identity / PWA System;
- Module Control Center.

Required outcomes:

- ARAY knows current page, role, device and enabled modules;
- ARAY can explain modules and missing setup;
- ARAY can open internal pages locally without expensive AI call;
- ARAY can prepare actions but asks confirmation for risky actions;
- voice works only with explicit consent and device rules;
- all popups use shared Popup System;
- page transitions use shared Motion System with light bottom-to-top journal flow;
- installed app names, favicons, PWA icons and manifest start URLs come from App Identity / PWA System;
- module registry powers ARAY suggestions.

## P0: Module Management Module

This is the module that manages modules.

Working name: `Module Control Center`.

It must include:

- module list;
- smart search;
- filters by category/status/paid/free/beta/missing setup;
- enable/disable switch;
- subscription state;
- connector state;
- usage analytics;
- module health;
- owner/admin permissions;
- settings entry;
- ARAY explanation and setup guide;
- super-admin observability.

This module is the first "meta-module" and unlocks faster platform growth.

Current local status, 2026-05-08:

- registry, first passports, quality guard, API and `/admin/aray/modules` page are implemented locally;
- screen now explains modules in normal language first, with technical passport details behind the modal;
- module state is now stored in `ArayModuleState` and local DB rows are seeded for the first 8 passports;
- switches check SUPER_ADMIN, locked core modules, tenant plan, module dependencies and required connectors before enabling;
- terminal and notification pages/API have server guards, and admin navigation/search/ARAY context hide disabled module routes;
- PWA install context was tightened for ARAY workspace/catalog/terminal and no longer promises native install when the browser cannot show it.

Next local slice:

- add module settings screens for role policy, subscription override and connector setup;
- add change history for module toggles;
- expand the guard from Terminal/Notifications to every passported module as each module becomes runtime-controlled;
- make quality gate assert module guards, navigation visibility and route ownership automatically.

## P1: Yandex Direct One-Click Advertising Module

Working name: `Yandex Direct Pro`.

Context: Direct API access is available, so we can start safely.

Scope:

- connect Yandex Direct account through Connector Vault;
- campaign audit;
- keyword draft from catalog and marketplace demand;
- ad group draft;
- budget/risk preview;
- region and schedule setup;
- UTM templates;
- landing/product mapping;
- moderation checklist;
- one-click draft creation;
- publish only after owner confirmation;
- ARAY explains every change before action.

Safety:

- no spending without confirmation;
- no fake performance numbers;
- every external action writes event log;
- campaign changes must be reversible where API allows.

## P1: Advertising Management Module

Working name: `Ads Hub`.

Providers:

- Yandex Direct;
- VK Ads;
- Google Ads;
- eLama;
- future providers through provider matrix.

Scope:

- connected account status;
- campaign list;
- budget overview;
- simple diagnostics;
- draft campaigns from catalog/CRM/market demand;
- segment/audience mapping;
- alerts and recommendations;
- role permissions for money/spend/publish.

This module should reuse provider-specific modules, not duplicate logic.

## P1: Automatic SEO and Indexing Module

Working name: `SEO Autopilot`.

Providers:

- Yandex Webmaster;
- Google Search Console;
- Yandex Metrika;
- Google Analytics;
- Merchant/YML where needed;
- sitemap/robots/schema generation.

Scope:

- dynamic SEO settings;
- meta title/description templates;
- product/category/service schema;
- sitemap refresh;
- robots validation;
- indexing request flow;
- Search Console/Webmaster status;
- Metrika/Analytics connection state;
- ARAY SEO suggestions;
- one-click setup wizard with confirmation.

Safety:

- no silent overwriting of custom SEO;
- old meta values preserved;
- source/date/status shown for indexing and analytics.

## P1: Smart Import/Export Module

Working name: `Smart Catalog Import/Export`.

Inputs:

- photo;
- article/SKU;
- product name;
- service name;
- supplier list;
- CSV/XLSX;
- Google Sheets;
- YML/XML;
- ZIP archive;
- document/PDF;
- manual paste;
- API/provider feeds.

Outputs:

- product draft;
- service draft;
- category draft;
- variant/price/stock draft;
- image/media draft;
- SEO draft;
- marketplace listing draft;
- export feed.

Rules:

- imports create drafts first;
- ARAY explains uncertain fields;
- duplicates are detected;
- destructive overwrites require confirmation;
- every import/export has a report.

## P1: Marketplace Analytics Module

Working name: `Marketplace Demand Intelligence`.

Sources:

- Wordstat;
- Google Keyword Planner;
- internal search events;
- catalog views/carts/orders;
- regional demand;
- price history where available.

Scope:

- demand by category/product/region;
- trend direction;
- price hints with source;
- competitor/comparison placeholders only with real source;
- no-data states;
- ARAY explanations and recommended actions.

## P2: Existing Module Packaging

Existing areas must be converted into module passports:

- App Identity / PWA System;
- Motion System / Page Flow;
- Terminal;
- Marketplace;
- Catalog;
- CRM;
- Orders;
- Notifications;
- ARAY Voice;
- Settings;
- Marketing;
- Finance;
- Delivery;
- Help/Knowledge Base;
- Media;
- Import/Export;
- PWA/App install;
- Popup System.

Each existing area must get:

- passport;
- settings;
- enable/disable behavior where safe;
- nav/search integration;
- ARAY context;
- permissions;
- analytics events;
- responsive smoke path;
- checklist status.

## P2: ARAY Production Module Storefront

Modules can be shown publicly on ARAY Production as a storefront.

Storefront must show:

- module value;
- plan/price;
- status: ready, beta, coming soon;
- provider requirements;
- screenshots/demo;
- "install/request/connect" action;
- what ARAY can do with it.

Public storefront install starts the safe internal enable flow. It does not bypass billing, permissions, connector setup or confirmations.

## Time Strategy

To move faster:

- build one module factory before many modules;
- convert 3-5 existing modules first to prove the contract;
- then scaffold new modules from the same pattern;
- use agents only for bounded audits/patches;
- keep every module small enough to test;
- prefer honest beta over fake finished;
- never create a one-off page when it should be a module.

## Immediate Next Engineering Step

Status 08.05.2026: first technical foundation is `READY_LOCAL`.

Done:

1. `lib/aray-module-registry.ts`;
2. Module Passport TypeScript types;
3. initial passports for Design System, Popup System, Motion System, App Identity / PWA System, Terminal, Marketplace, ARAY Voice and Notifications;
4. `scripts/validate-aray-modules.js`;
5. `npm run modules:check` and `npm run quality` now guard the registry.

Next engineering step:

1. `DONE / READY_LOCAL` Build the first Module Control Center page/API over `arayModuleRegistry`.
2. `DONE / READY_LOCAL` Add smart search/filter/status views for modules.
3. `DONE / READY_LOCAL` Connect registry data to navigation, admin search and ARAY hints where safe.
4. Add persistent enable/disable state, role/subscription visibility and connector status.
5. Start packaging 3-5 existing areas into richer module passports before new big modules.
