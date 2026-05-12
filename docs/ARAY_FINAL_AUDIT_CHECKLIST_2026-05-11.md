# ARAY final audit checklist

Date: 2026-05-11
Environment: local dev and production build check, `http://127.0.0.1:3100`

## Summary

Status: deploy candidate after required keys and production environment setup.

The main product surface is stable: admin navigation, ARAY assistant shell, Direct, analytics, finance, terminal, module registry, responsive guards and production build pass.

The remaining blockers are not visual UI bugs. They are external configuration and business launch items: required Yandex/Wordstat keys, OAuth apps, payment/fiscal provider for subscriptions and ARC wallet rules.

## Checks Passed

- Production build: passed with `npm run build:ci`.
- Yandex Direct integration: passed 8 gates with `npm run direct:check`.
- Analytics integration: passed 6 gates with `npm run analytics:check`.
- Finance integration: passed 7 gates with `npm run finance:check`.
- ARAY assistant smoke-check: passed, 30 tools detected, confirmations/voice/TTS/navigation are wired.
- ARAY TTS pronunciation: passed for prices, dimensions, VAT, percent, phone, order numbers, decimals, codes, UTM/CTR/CPC, Direct/Metric, JSON/CSV and empty states.
- ARAY module registry: passed, 13 passports.
- ARAY module navigation: passed, 13 passports, 8 navigation module ids, 15 owned routes.
- Dynamic Role OS: passed.
- Admin responsive guard: passed.
- Admin UI integrity guard: passed.
- Admin performance guard: passed.
- Secret scan inside quality gate: passed.
- Browser console during route smoke: no `error` logs captured.

## Browser Route Smoke

36 key admin routes were opened in the in-app browser. No 404, no runtime error, no internal server error found.

Checked routes:

- `/admin`
- `/admin/orders/new`
- `/admin/orders`
- `/admin/clients`
- `/admin/crm`
- `/admin/crm/automation`
- `/admin/workflows`
- `/admin/tasks`
- `/admin/delivery`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/audit`
- `/admin/categories`
- `/admin/inventory`
- `/admin/media`
- `/admin/import`
- `/admin/promotion`
- `/admin/promotions`
- `/admin/reviews`
- `/admin/email`
- `/admin/notifications`
- `/admin/analytics`
- `/admin/finance`
- `/admin/aray`
- `/admin/aray/connectors`
- `/admin/aray/costs`
- `/admin/aray/modules`
- `/admin/business/settings`
- `/admin/terminals`
- `/admin/settings`
- `/admin/site`
- `/admin/appearance`
- `/admin/staff`
- `/admin/health`
- `/admin/help`
- `/admin/terminals/training`

False alarm:

- `/admin/promotion` contained the text "Войти в Direct" as an instruction step. This is not an auth screen.

Dev-only slow first loads:

- `/admin`
- `/admin/inventory`
- `/admin/promotion`
- `/admin/aray`
- `/admin/aray/costs`
- `/admin/appearance`
- `/admin/help`
- `/admin/terminals/training`

These were cold dev compile timings, not production build failures. Keep an eye on heavy pages after deploy.

## Ready

- Admin route model and navigation registry.
- ARAY assistant smoke behavior: tools, quick chips, navigation strip, confirmations, voice and TTS wiring.
- Direct draft/export/readiness endpoints and quality gate.
- Analytics dashboard integration checks.
- Finance dashboard integration checks.
- Terminal module, payment/receipt/fiscal safety copy and training route.
- Responsive/admin UI guard layer.
- Google/Yandex connector pages and unified OAuth route foundation.
- ARC strategy document for wallet/subscriptions.

## P0 Before Deploy

- Add required Yandex keys in production env:
  - `YANDEX_API_KEY`
  - `YANDEX_FOLDER_ID`
  - `YANDEX_SEARCH_API_TOKEN`
  - `YANDEX_WORDSTAT_TOKEN`
- Create/verify OAuth apps and callback URLs for Yandex/Google where needed.
- Re-run `npm run aray:keys` until required keys are green.
- Verify real domain, HTTPS and callback URLs after deployment.
- Run `npm run build:ci` on the deployment environment.
- Confirm database migration/deploy command for production.
- Confirm backup/export plan for database and uploads.

## P1 Before Paid Launch

- Payment provider/acquiring for subscriptions and one-click payment.
- Fiscal receipt provider or online cash register scenario.
- Public offer, subscription terms, refund rules and privacy documents.
- ARC wallet ledger implementation before automatic debits.
- Metrika OAuth/counter/goals final live check.
- Direct export with real connected cabinet and owner confirmation.
- Wordstat/Search live demand test after keys are added.
- Telegram/email/inbox integrations if notifications are part of launch promise.

## P2 Product Improvements

- Optimize cold/heavy admin pages after deploy metrics are visible.
- Add full ARC wallet UI: balance, paid ARC, bonus ARC, history, limits, auto-debit, invoices.
- Keep user-to-user ARC transfers behind a feature flag until legal/accounting review.
- Add an admin reconciliation page for provider payments, webhooks and ledger entries.
- Add a final real-device mobile pass on phone: dashboard, ARAY, terminal, finance, connectors, checkout.

## Known Non-Blockers

- First `quality:full` attempt failed on Windows because the dev server held Prisma `query_engine-windows.dll.node`. After stopping the dev server, `npm run build:ci` passed cleanly.
- `aray:keys` fails by design until required external keys are added. Secret values are not printed by the checker.

## Final Go/No-Go Rule

Go for deploy when:

- production env has required Yandex/Wordstat keys;
- OAuth callbacks match the deployed domain;
- `npm run aray:keys` has no required misses;
- `npm run build:ci` passes on production-like env;
- payment/fiscal features are either connected or hidden behind honest "planned/manual" states.
