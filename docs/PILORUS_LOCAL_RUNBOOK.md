# PiloRus Local Runbook

## Our Rule

One project, one local address, one launch path:

```text
http://localhost:3101/catalog
```

This avoids the old confusion between `3000`, `3101`, `localhost`, and `127.0.0.1`.

## For Arman

Double-click:

```text
START-PILORUS-3101.cmd
```

It will stop old local dev processes, start the site on `3101`, and open the catalog.

## For Codex

From `D:\проект\pilorus\website`:

```powershell
npm run local
```

For a faster restart when the page is already healthy:

```powershell
npm run local:fast
```

## If The Browser Shows A Next.js Red Error

Use the stable reset URL:

```text
http://localhost:3101/sw-reset.html?next=http%3A%2F%2Flocalhost%3A3101%2Fcatalog
```

Then open:

```text
http://localhost:3101/catalog
```

## Why This Exists

Next.js dev mode creates fresh client chunks after code changes and restarts. If the browser keeps an older page from another host or port, it can request a module that no longer exists in the active dev build. The visible symptom is often:

```text
Cannot read properties of undefined (reading 'call')
```

The stable launcher prevents that by cleaning the local build and keeping everyone on the same URL.

## After Design Or Code Changes

Run:

```powershell
npx tsc --noEmit
npm run design:check
```

Then inspect:

- `http://localhost:3101/catalog`
- `http://localhost:3101/promotions`
- mobile width around 390-430 px
- desktop width around 1440-1920 px

## Mobile Catalog Standard

Product cards must keep the size row stable:

- show two compact size chips plus a small `+N` chip in one row;
- do not use horizontal scrolling inside product cards;
- keep the cart CTA visible and aligned under the size row;
- use `store-mobile-safe-bottom` on mobile pages with forms, carts, footers, or empty states;
- run `npm run design:check` after changing product card UI.

Typography rule:

- large storefront page headings use Oswald for a sturdy production feel;
- product names use Inter 700 for Cyrillic readability;
- prices can keep Oswald as a numeric accent.

## Cart Persistence Standard

- Cart persistence is intentionally manual in `store/cart.ts`.
- The storage key is `pilo-rus-cart`, saved as `{ state: { items }, version: 0 }`.
- Client pages that depend on cart contents should call `useCartStore.getState().hydrateCart()` after mount and wait for `hasHydrated` before redirecting or showing a final empty state.
- After cart changes, test: add product -> hard open `/cart` -> hard open `/checkout`.
