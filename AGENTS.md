# PiloRus Agent Start Here

This is the canonical working note for every new AI/Codex chat in this repo.

## Workspace

- Main project: `D:\проект\pilorus\website`
- Do not work in the older sibling folder `D:\проект\ПилоРус\website` unless the user explicitly asks.
- App stack: Next.js 14, React 18, Prisma/Postgres, Tailwind.

## Stable Local Address

- Use one local address for storefront work: `http://localhost:3101/catalog`
- Avoid switching between `localhost:3000`, `127.0.0.1:3000`, and `localhost:3101`.
- Switching hosts/ports can leave the browser with stale Next.js dev chunks and cause errors like `Cannot read properties of undefined (reading 'call')`.

## One-Click Start

For the user:

- Double-click `START-PILORUS-3101.cmd`
- It opens `http://localhost:3101/catalog`

For Codex/terminal:

```powershell
npm run local
```

Fast restart without cleaning `.next`:

```powershell
npm run local:fast
```

What `npm run local` does:

- stops Node dev processes for this workspace;
- frees port `3101`;
- clears `.next` safely inside this workspace;
- starts Next.js on port `3101`;
- writes logs to `tmp/local-dev/`;
- opens the catalog page.

If a browser tab is still stuck on a stale dev overlay, open:

```text
http://localhost:3101/sw-reset.html?next=http%3A%2F%2Flocalhost%3A3101%2Fcatalog
```

Then go back to:

```text
http://localhost:3101/catalog
```

## Required Checks

Run these after frontend/code edits:

```powershell
npx tsc --noEmit
npm run design:check
```

For visual work, inspect in the in-app browser on desktop and mobile widths.

## Storefront Design Priorities

- Mobile catalog must stay clean: compact cards, stable two-column grid, no overflowing size chips, visible cart CTA.
- Mobile product cards use a fixed size preview rule: two compact size chips plus a small `+N` overflow chip in one row. Do not add horizontal chip scrolling inside cards.
- Storefront typography: use Oswald only for large store page headings and numeric/price accents; keep product names and compact UI labels on Inter for readability.
- Mobile pages with forms, footers, carts, or empty states must use the shared `store-mobile-safe-bottom` spacing so the bottom navigation never covers final actions.
- Popups/drawers must not hide their submit action; long forms need sticky footer actions and safe mobile bottom spacing.
- Keep design within the existing PiloRus dark/wood/orange system and `DESIGN_SYSTEM.md` guard.
- Do not introduce unrelated refactors while fixing storefront UX.

## Cart State

- Cart state lives in `store/cart.ts` and uses a small manual `localStorage` layer under `pilo-rus-cart`.
- Hydrate the cart on client mount with `useCartStore.getState().hydrateCart()` before redirecting from checkout or showing a final empty-cart state.
- Do not replace it with automatic Zustand `persist` without re-testing hard reloads of `/cart` and `/checkout`; automatic hydration can run during render in Next dev and break store methods.

## Common Local Causes Of Problems

- Wrong port or mixed host: use `localhost:3101` only.
- Stale Next dev chunks: run `npm run local`.
- Service worker/cache leftovers: use the `sw-reset.html` URL above.
- Database down: Postgres should listen on `127.0.0.1:5432`.
- Dirty logs: local logs are ignored by git; do not commit them.
