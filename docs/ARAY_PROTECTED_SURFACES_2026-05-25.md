# ARAY Protected Ready Surfaces

Date: 2026-05-25

Purpose: keep working modules stable while launch fixes are added. These areas are protected: change them only for a tracked queue item, and run `npm run release:check` plus `npm run quality` before deploy.

## Protected Modules

- PWA identity and install: PiloRus icon source, manifest, splash, install button, ARAY/admin install contexts.
- Store header and mobile shell: PiloRus logo/name, mobile bottom nav, side rail, search, cart targets.
- Cart and checkout: add-to-cart animation, cart drawer, cart page, checkout route, order creation.
- ARAY Messenger: embedded messenger, ARAY widget, AR Phone, internal dial, video handoff, task creation.
- CRM and tasks: CRM mobile stages, task queue, client history, orders-to-leads sync.
- Media and stories: media picker, story filters, story publish/public API.
- Admin navigation/search: ARAY capsule, section navigation, global admin search overlays.
- Site builder and multi-site constructor: site/PWA identity must be tenant-aware without breaking PiloRus defaults.
- Release/deploy gates: static readiness, smoke routes, quality gate, full build gate.

## Rules

- Do not redesign a protected module while fixing an unrelated bug.
- If a protected module must change, add or update a queue item in `docs/ARAY_RELEASE_FIX_QUEUE_2026-05-25.md`.
- Keep one source of truth for brand assets. PiloRus PWA uses prepared transparent PNG icons from `public/icons`.
- Public store PWA install stays a simple logo button. Detailed install guidance belongs inside the opened panel.
- Mobile store header must always show both the PiloRus icon and the PiloRus name.
- New site-builder work must add tenant-specific behavior without changing the locked PiloRus baseline.

