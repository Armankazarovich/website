# ARAY Original Modules Evidence Log

Date opened: 2026-05-21

This log records the history of original ARAY / PiloRus modules. It is an internal evidence trail, not legal advice.

## Evidence Fields

Each entry should include:

- `id`: stable evidence id;
- `date`: first recorded or updated date;
- `module`: module or feature name;
- `intent`: product meaning;
- `files`: main source files changed or inspected;
- `screenshots`: proof files when visual behavior matters;
- `checks`: commands or manual flows used;
- `status`: draft, beta, ready, or needs review;
- `ownerConfirmation`: pending or confirmed.

## Log

| ID | Date | Module | Intent | Files | Screenshots | Checks | Status | Owner Confirmation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ARAY-EV-2026-05-21-001 | 2026-05-21 | Online Seller / Stories Live Commerce | Make stories a serious side-popup/live-commerce tool with related products/services, share actions, and mobile-safe overlay behavior. | `components/store/stories-widget.tsx`, `components/store/stories-page-client.tsx`, `components/store/story-action-drawer.tsx`, `app/admin/media/media-client.tsx` | `.codex-screenshots/story-portal-fixed-mobile.png`, `.codex-screenshots/admin-stories-media-picker-index.png` | `npx tsc --noEmit --pretty false`, `npm run stories:check`, `npm run build`, mobile/admin browser checks | beta | pending |
| ARAY-EV-2026-05-21-002 | 2026-05-21 | Terminal Mobile Cart | Make mobile terminal cart easy to find after adding an item by moving the reopen action into the admin bottom dock. | `components/admin/admin-mobile-bottom-nav.tsx`, `app/admin/orders/new/page.tsx` | `.codex-screenshots/terminal-cart-mobile-dock.png` | `npx tsc --noEmit --pretty false`, `npm run nav:check`, `npm run build`, mobile Chrome flow: add item, close cart, reopen from bottom dock | ready for review | pending |
| ARAY-EV-2026-05-21-003 | 2026-05-21 | ARAY Production PWA | Separate ARAY Production app identity from PiloRus storefront identity: splash, manifest, icons, theme colors, shortcuts. | `lib/pwa-install-context.ts`, `app/api/pwa/manifest/route.ts`, `components/layout/pwa-launch-splash.tsx`, `components/pwa-manifest-sync.tsx`, `components/layout/theme-chrome-sync.tsx`, `components/admin/admin-pwa-install.tsx`, `public/sw.js` | pending | code audit by explorer, live manifest check | planned | pending |
| ARAY-EV-2026-05-21-004 | 2026-05-21 | ARAY Business Messenger / Trust Foundation | Fix the ARAY principle "Польза без вреда", business-message adaptation, document responsibility, API independence, and human-safe confirmations as product law. | `lib/aray-agent.ts`, `lib/aray-business-messenger.ts`, `docs/ARAY_BUSINESS_MESSENGER_BLUEPRINT_2026-05-21.md`, `docs/ARAY_FOUNDATION_AND_HISTORY_2026-05-21.md`, `docs/ARAY_TRUST_DOCUMENTS_AND_RESPONSIBILITY_2026-05-21.md`, `docs/aray-brand-architecture.md` | pending | `npx tsc --noEmit --pretty false`, `npm run quality`, `npm run build` | draft / foundation | pending |
| ARAY-EV-2026-05-21-005 | 2026-05-21 | ARAY Business Automation Director | Define ARAY as a real-time automation layer with director/client modes for sales, consultation, orders, CRM, documents, logistics, notifications and analytics across different business niches. | `lib/aray-agent.ts`, `docs/ARAY_BUSINESS_AUTOMATION_DIRECTOR_2026-05-21.md`, `docs/ARAY_BUSINESS_MESSENGER_BLUEPRINT_2026-05-21.md`, `docs/ARAY_FOUNDATION_AND_HISTORY_2026-05-21.md` | pending | `npx tsc --noEmit --pretty false`, `npm run quality`, `npm run build` | draft / foundation | pending |
| ARAY-EV-2026-05-21-006 | 2026-05-21 | ARAY Business Event Registry | Add the first code layer that turns story/order/CRM signals into ARAY director/client action plans with priority, confirmation law and suggested next steps. | `lib/aray-business-events.ts`, `app/api/stories/[id]/message/route.ts`, `app/api/orders/route.ts`, `docs/ARAY_BUSINESS_EVENT_REGISTRY_2026-05-21.md`, `docs/ARAY_BUSINESS_AUTOMATION_DIRECTOR_2026-05-21.md` | pending | `npx tsc --noEmit --pretty false`, `npm run quality`, `npm run build` | beta foundation | pending |
| ARAY-EV-2026-05-21-007 | 2026-05-21 | ARAY Smart Role Cabinets | Add the first smart cabinet layer where director, manager, seller, courier, accountant, warehouse and client roles get different dashboards, permissions and next actions. | `app/admin/director/page.tsx`, `lib/aray-smart-cabinets.ts`, `lib/aray-module-registry.ts`, `components/admin/admin-navigation-registry.ts`, `components/admin/admin-navigation-model.ts`, `docs/ARAY_SMART_ROLE_CABINETS_2026-05-21.md` | pending | `npx tsc --noEmit --pretty false`, `npm run quality`, `npm run build` | beta foundation | pending |

## Next Evidence To Add

- Services editor: media, SEO, ARAY description, leads.
- Articles/news editor: popup, media, SEO, ARAY generation.
- CRM leads and user relations: mobile flow, permissions, notifications.
- Direct / Metrics: OAuth, goals, organization, draft launch.
- Catalog/product cards: stock stickers, compare/favorite states, price/size views.
