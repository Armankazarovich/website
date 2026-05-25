# ARAY Production PWA Standard

Date: 2026-05-21

Goal: ARAY Production must feel like its own installed work app, not like a renamed PiloRus storefront tab.

## Current Foundation

Already present:

- dynamic manifest endpoint: `app/api/pwa/manifest/route.ts`;
- PWA context registry: `lib/pwa-install-context.ts`;
- ARAY icon generation: `lib/aray-pwa-icon.ts`;
- storefront/client icon generation: `lib/site-pwa-icon.ts`, `app/api/pwa/site-icon/route.ts`;
- admin manifest wiring: `app/admin/layout.tsx`;
- site manifest wiring: `app/layout.tsx`;
- install UI: `components/admin/admin-pwa-install.tsx`, `components/store/pwa-install.tsx`;
- launch splash: `components/layout/pwa-launch-splash.tsx`;
- service worker and offline base: `public/sw.js`, `components/sw-register.tsx`, `app/offline/page.tsx`;
- ARAY logo source: `public/aray/aray-production-logo.png`.

## Product Standard

ARAY Production PWA should have:

- app name: `ARAY Production`;
- start URL: `/admin`;
- scope: `/admin`;
- ARAY logo on icon and splash;
- dark and light splash behavior;
- module shortcuts: Terminal, Orders, CRM, Catalog, Tasks, Media, Settings, ARAY;
- theme colors controlled by App Identity / PWA System;
- no storefront text on ARAY splash;
- no duplicate manifest source of truth.

Storefront/client PWA should have:

- app name from the business/storefront context;
- start URL and scope for the storefront, not `/admin`;
- client logo from `pwa_logo_url`, `site_logo_url`, `logo_url`, tenant `logoUrl`, then `/logo.png` as fallback;
- client theme/background from the storefront context;
- no ARAY icon on customer-facing PWA unless the installed app is an ARAY work module.

## Known Risks

- `components/layout/pwa-launch-splash.tsx` currently behaves like a PiloRus splash and should become app-context aware.
- `components/pwa-manifest-sync.tsx` and `components/layout/theme-chrome-sync.tsx` can compete for theme color.
- `public/admin-manifest.json` may drift from dynamic `/api/pwa/manifest`.
- `public/sw.js` push icon behavior should distinguish storefront and ARAY identity.
- uploaded SVG logos must be tested through `sharp`; if a client logo fails, `/logo.png` is the safe fallback.

## Implementation Order

1. Add or finalize `aray-production` in `lib/pwa-install-context.ts`.
2. Make `pwa-launch-splash.tsx` context-aware: PiloRus storefront vs ARAY Production.
3. Make theme color ownership single-source through App Identity / PWA System.
4. Update admin install copy and shortcuts.
5. Update service worker cache version and ARAY assets.
6. Verify storefront icons through `/api/pwa/site-icon?s=192&app=pilorus-site`.
7. Verify Android/Chrome, iOS manual install instructions, and desktop Chrome/Edge.

## Acceptance Checks

- `/admin` manifest returns ARAY Production name, scope, start URL, shortcuts, and icon.
- Installed ARAY opens on `/admin`, not storefront.
- Splash shows ARAY logo and correct dark/light background.
- Storefront install still shows PiloRus identity.
- Storefront manifest icons point to `/api/pwa/site-icon`, not ARAY icon routes.
- No duplicate install banners fight each other.
- Mobile admin bottom dock remains usable after install.
