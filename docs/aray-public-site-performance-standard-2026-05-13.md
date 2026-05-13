# Aray Public Site Performance Standard

Date: 2026-05-13
Status: working standard for PiloRus and future public sites

## Core Promise

Public sites built by Aray must feel fast, calm and commercially clear. The user should see the product quickly, understand the offer without friction, and move from catalog to cart to request with the fewest possible doubts.

## Product Speed

- Product links in catalog cards use route prefetch.
- Category, type and next-page routes are warmed in idle time through `RoutePrefetcher`.
- Route-level skeletons are avoided on catalog/product flows when they cause visible flicker; old content should stay stable until the next screen is ready.
- Heavy visual hover effects are minimized: no surprise overlays, no title color jumps, no layout shift.
- Images must have stable containers and predictable aspect ratio.

## Catalog UX

- Products appear as early as possible; long SEO/support text lives below the product grid.
- Category stats are compact, clickable and stay in one row on desktop when space allows.
- Add-to-cart must work in one tap for the default sale unit.
- Size chips are readable, stable and do not resize the card.
- Mobile filters must be reachable without covering the product grid unnecessarily.

## Product Card Standard

- Catalog, hits, recommendations and similar product blocks must use the shared `ProductCard` component.
- Size chips use the centralized `store-size-chip` visual rule; do not hand-style pills per section.
- Stock uses `store-stock-badge`, a quiet status label, not a call-to-action button.
- Product names use the shared Oswald display rule for the PiloRus storefront; it is Cyrillic-safe and must stay consistent across catalog, hits and related products.
- Product descriptions in cards use `shortDescription`; full SEO text stays on the product page.
- If a product can be bought by both `м³` and `шт`, the card keeps one clean price button and opens a compact unit chooser only on intent.
- Future public sites should inherit card behavior from component/CSS standards instead of duplicating landing-section card styles.

## Checkout UX

- Phone is the primary required contact.
- Email is optional; if provided, it enables confirmation/PDF and account convenience.
- Cart has a clear empty state, continue-shopping action, calculator action and phone fallback.
- Checkout should avoid forcing registration before the order request.
- Success state must provide order number and tracking path.

## Offer Sync

- Promotions shown on the home page and on `/promotions` must use one shared component and one database source.
- Expired or inactive promotions must not appear publicly.
- Partnership terms can be a permanent card, but promo styling and behavior stay unified.

## Design Rules

- Use stable Cyrillic-safe typography for product cards and titles.
- Keep brand accent for actions, prices and selected states, not every hover.
- Avoid emoji in public UI; use the icon system instead.
- Buttons, cards and filters must not shift size during hover, active or loading states.
- Mobile headings and product card titles must be smaller and tighter than desktop.

## SEO And Trust

- Category and type pages need canonical metadata.
- Utility filters, search, sort and paginated variants should avoid unnecessary indexation.
- Product/category schema should reflect visible products and available offers.
- Commercial claims must be concrete: direct manufacturer, delivery timing, stock, manager support, documents.

## Verification Before Launch

- Run lint for touched files.
- Check catalog, product, cart, checkout, promotions and production/about pages in desktop and mobile viewport.
- Verify no public emoji leaks into the design layer except legal/footer symbols.
- Verify category/product navigation does not flash route skeletons.
- Confirm the order API accepts a phone-first request and does not reject an empty email.

## Reusable Module

- `components/shared/route-prefetcher.tsx` is the standard route warming module.
- Use it for high-intent adjacent routes: catalog categories, product lists, next pagination, major CTA destinations.
- It skips prefetch on data-saver and 2G-like connections.
- Keep limits conservative so speed does not become hidden network waste.
