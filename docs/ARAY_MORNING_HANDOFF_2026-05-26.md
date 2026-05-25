# ARAY Morning Handoff

Date: 2026-05-26
Status: ready to continue in the morning
Last deployed commit: `3ed4fd2 Open ARAY channels in popup windows`

## Done Tonight

1. AR Phone external channels:
   - Telegram, WhatsApp, Zangi, MAX, VK, email, mailings and Meet are collected in AR Phone.
   - Services that block iframe login open as a real browser popup window instead of a broken black embedded page.
   - Release guards now protect this behavior.

2. Product page:
   - The noisy SKU/tags strip was hidden from live product pages.
   - The idea is saved for a future Woodmart-style card/template constructor.
   - Variant cards and their nice product icons were not touched.

3. Cart/product release protection:
   - Browser add-to-cart and product page checks still pass.
   - Production smoke and production test passed after deploy.

## Do Not Touch First

- Do not redesign the product variant cards or their icon style.
- Do not spend morning time polishing the hidden SKU/tags block.
- Do not try to force Telegram/WhatsApp/VK/MAX into iframe: they block it by policy. Use the popup-window path.

## Morning Order

1. Verify AR Phone visually:
   - Desktop admin page.
   - Mobile width.
   - Click Telegram, WhatsApp, Zangi, MAX, VK and confirm they open as popup windows.

2. Finish ARAY messenger clarity:
   - Make the purpose of "Вопрос по товару" obvious.
   - Keep CRM/channel context, but reduce the feeling of an admin panel on the public product page.
   - Decide whether this block should stay near purchase actions or move lower near reviews/video.

3. Continue release queue:
   - Cart performance and mini-cart behavior.
   - PWA mobile logo/install behavior.
   - Mobile stories.
   - ARAY mobile messenger everywhere.

## Checks To Run Before Any Deploy

- `npm run text:check`
- `npm run release:check`
- `npm run protection:check`
- `npm run browser:cart:check`
- `npm run quality`

## Notes For Future Constructor

- Optional compact product meta template:
  - SKU/articul.
  - Category chip.
  - Availability.
  - Unit type.
  - Delivery/self-pickup chips.
- Keep it optional and template-driven, not forced on every product page.
