# ARAY / PiloRus Full Launch Verification Matrix

Date: 2026-05-22

Goal: one honest launch map for PiloRus, Direct, ARAY, PWA, smart search, cart/terminal, CRM, notifications and documents. We mark only verified things as green. Anything that needs external keys, login session, legal review or production provider stays separate.

## Status Levels

- GREEN_AUTOMATED: checked by project scripts, TypeScript, build or local API smoke.
- GREEN_LOCAL: local browser or HTTP check passed, but not a full authenticated manual click pass.
- NEEDS_LOGIN_CLICK: requires an authenticated admin session and a human click-through.
- NEEDS_KEY: code is ready, external key/token/provider is missing.
- BETA: useful foundation exists, but it must not be sold as fully automated production flow yet.
- LEGAL_REVIEW: document/legal/fiscal behavior must be checked by a specialist before public claims.

## Core Checks Passed

| Area | Status | Evidence |
| --- | --- | --- |
| Production build | GREEN_AUTOMATED | `npm run build` passed after stopping local dev server that locked Prisma files. |
| Quality gate | GREEN_AUTOMATED | `npm run quality` passed: design, navigation, module registry, role OS, admin responsive/performance guards, stories, content, TypeScript, secret scan. |
| Direct foundation | GREEN_AUTOMATED | `npm run direct:check` passed, 8 gates. |
| ARAY assistant | GREEN_AUTOMATED | `npm run aray:assistant` passed: 31 tools, 10 confirm-protected admin tools plus import/settings rules, voice/TTS wiring, Direct endpoints and open-source search. |
| Stories | GREEN_AUTOMATED | `npm run stories:check` passed: 13 gates, 12 files. |
| Content tools | GREEN_AUTOMATED | `npm run content:check` passed: 8 gates. |
| Finance | GREEN_AUTOMATED | `npm run finance:check` passed: 7 gates. |
| Analytics | GREEN_AUTOMATED | `npm run analytics:check` passed: 6 gates. |
| Local server | GREEN_LOCAL | `http://127.0.0.1:3101` is running. |

## Local API / Browser Smoke

| Flow | Status | Result |
| --- | --- | --- |
| Health | GREEN_LOCAL with degraded integrations | `/api/health` returns 200. Database, orders, ARAY API, email, push are OK. Telegram token and Google AI are missing. |
| PWA manifest | GREEN_LOCAL | `/api/pwa/manifest` returns 200, `display=standalone`, 9 icons. |
| Public search | GREEN_LOCAL | `/api/search?q=доска` returns 15 product results. |
| Public stories | GREEN_LOCAL | `/api/stories` returns 3 stories, first story is LIVE. |
| Admin search protection | GREEN_LOCAL | `/api/admin/search?q=заказ` returns 403 without login, which is correct. |
| Catalog browser smoke | GREEN_LOCAL | Catalog opens in browser; product cards, availability labels and add-to-cart buttons are present. |

## Public Storefront

| Module | Status | What Is Safe To Claim |
| --- | --- | --- |
| Catalog desktop/mobile base | GREEN_AUTOMATED / GREEN_LOCAL | Routes build, catalog opens, search works, products and variants render. Full device visual pass still needs authenticated/manual final review. |
| Product cards | GREEN_AUTOMATED | Availability logic exists through `lib/product-availability.ts`; wishlist/compare/cart stores are wired. |
| Cart | GREEN_LOCAL | Store mobile bottom nav has a cart button and opens the cart drawer; catalog add-to-cart buttons are visible. Full checkout click pass is next manual QA. |
| Checkout | GREEN_AUTOMATED | Route builds and order API exists. Payment provider/fiscal automation is not claimed as complete. |
| Stories / online seller | GREEN_AUTOMATED | Store stories widget, relations, popup, message drawer and CRM handoff are implemented and guarded. |
| Story messages | GREEN_AUTOMATED / BETA | Questions/offers/comments create lead + task; reviews create moderation review + task. Push to staff is attempted if push keys and subscriptions exist. |
| Story share/like/comment UI | GREEN_AUTOMATED | UI has like, comment, share, attachments and ARAY prompt context. Browser visual pass already showed the popup layer working; share depends on browser share/clipboard behavior. |
| PWA customer app | GREEN_LOCAL | Manifest and icons respond. Install prompt behavior depends on browser/PWA rules and should be manually checked on phone. |
| Smart search | GREEN_LOCAL | Public search API returns live results; admin smart search is role-protected. |

## Admin And Operations

| Module | Status | What Is Safe To Claim |
| --- | --- | --- |
| Admin navigation | GREEN_AUTOMATED | Navigation registry/model checks passed; 48 hrefs, 49 meta routes, role routing guarded. |
| Roles and business settings | GREEN_AUTOMATED | Dynamic Role OS guard passed; role cabinet/sections are structured. |
| Dashboard | GREEN_AUTOMATED | Builds and participates in admin shell. Full visual click-through requires login. |
| Orders | GREEN_AUTOMATED | Routes and APIs build; invoice PDF endpoint exists for staff. Full admin button pass requires login. |
| Terminal / cart in admin | GREEN_AUTOMATED / BETA | `/admin/orders/new` has sticky drawer/mobile cart, terminal cart events, marketplace mode and staff-protected terminal APIs. Cash/payment provider flows remain provider-dependent. |
| Products / prices / variants | GREEN_AUTOMATED | Product routes, import, quick edit and Direct/content guards pass. Full price import with real files should be done as a controlled test. |
| Media library | GREEN_AUTOMATED / NEEDS_LOGIN_CLICK | Media API/routes build and content guard covers stories/services/media. Buttons must be clicked under admin login before final client demo. |
| Services and posts | GREEN_AUTOMATED | Routes build and content tools guard checks core editor requirements. Full UX/editor click-through remains manual. |
| CRM / leads | GREEN_AUTOMATED | CRM routes build; story message endpoint creates leads/tasks; CRM document endpoint exists. Full funnel click pass requires login. |
| Notifications center | GREEN_AUTOMATED / NEEDS_KEY | Push keys are configured and health says push OK. Telegram is missing. Email health is OK. Real delivery needs subscribed devices and channel tests. |
| Finance | GREEN_AUTOMATED / BETA | Finance readiness/cashflow checks pass. Bank/1C/EDO/fiscal integrations remain optional keys/providers. |
| Analytics | GREEN_AUTOMATED / NEEDS_KEY | Analytics UI/API checks pass. Live Direct/Metrika data requires OAuth/token setup. |
| Direct / promotion | GREEN_AUTOMATED / NEEDS_KEY | Draft/export/readiness code is ready. Real campaign launch requires Yandex OAuth, Metrika goals, budget and manual confirmation. |

## ARAY

| Capability | Status | Notes |
| --- | --- | --- |
| Main chat / assistant shell | GREEN_AUTOMATED | 31 tools checked; UI prompt actions, admin quick chips, navigation strip, confirmations, voice and TTS are wired. |
| Safe admin actions | GREEN_AUTOMATED | Mutating tools return confirmation drafts; they do not silently change important data. |
| Voice/TTS | GREEN_AUTOMATED / NEEDS_AUDIO_LISTEN | TTS pronunciation check passed, including human-readable task dates instead of raw ISO strings. Real final judgement needs listening on target device. |
| Local fallback behavior | GREEN_AUTOMATED | ARAY can still work with internal rules/templates/navigation and direct fast commands where external premium AI keys are absent. |
| Yandex AI/Search/Wordstat | GREEN_AUTOMATED | `npm run aray:keys` passed: `YANDEX_API_KEY`, `YANDEX_FOLDER_ID`, `YANDEX_SEARCH_API_TOKEN`, `YANDEX_WORDSTAT_TOKEN` are present. Secrets were not printed. |
| OpenAI primary brain | OPTIONAL_KEY | Optional in current checker: `OPENAI_API_KEY`, `ARAY_PRIMARY_AI_PROVIDER`, `ARAY_PRIMARY_AI_MODEL`. |
| Business messenger | BETA / FIRST_LAUNCH_SLICE | Story-to-CRM messenger works as first layer. Full user-to-user inbox, email/push dispatch and channel routing need next implementation/pass. |
| Open-source media/search layer | GREEN_AUTOMATED / FIRST_LAYER | `open_source_search` added for legal/open sources: movies, music, playlists, videos, images, documents, reviews, routes, learning, audiobooks and wellbeing support. Direct shortcut handles clear requests before premium model calls. |

## Documents, Bills, Contracts

| Document Flow | Status | Notes |
| --- | --- | --- |
| Order invoice PDF | GREEN_AUTOMATED | Staff endpoint `/api/admin/orders/[id]/pdf` and client endpoint `/api/cabinet/orders/[id]/pdf` use `lib/invoice-pdf.tsx`. |
| CRM document templates | BETA | `/api/admin/crm/documents` can create templates and generated document records, and returns filled HTML. Actual PDF writing/sending pipeline must be finished before claiming full automation. |
| Contracts, acts, UPD, delivery documents | BETA / LEGAL_REVIEW | Roadmap exists. Templates must be reviewed legally before public launch or advertising. |
| Fiscal checks / EDO / accounting | NEEDS_KEY / LEGAL_REVIEW | Placeholder/provider keys exist in connector checklist. Not a finished production integration yet. |

## External Keys Status

ARAY internet/Yandex demand layer is now configured:

```env
YANDEX_API_KEY="configured"
YANDEX_FOLDER_ID="configured"
YANDEX_SEARCH_API_TOKEN="configured"
YANDEX_WORDSTAT_TOKEN="configured"
```

Current `npm run aray:keys` result: base required keys are present.

Other important optional launch channels:

- `ANTHROPIC_API_KEY` or future configured premium provider: needed for free-form long dialog; fast ARAY tools still cover simple routed commands.
- `TELEGRAM_BOT_TOKEN`: missing, health shows Telegram degraded.
- `OPENAI_API_KEY`: optional premium brain, not required for the current launch path.
- Google AI / Google demand keys: missing, health shows Google AI missing.
- Yandex Direct / Metrika OAuth: required for real ad cabinet connection and live campaign data.
- Accounting/EDO/fiscal/bank keys: required before automatic legal/fiscal document sending.

## Launch Truth

PiloRus can be prepared for a controlled launch with:

- public catalog, search, product cards, cart/checkout routes;
- stories/online seller as a wow feature;
- ARAY assistant as business helper with safe confirmations;
- Direct draft/export/readiness foundation;
- CRM lead/task capture from stories;
- invoice PDF for orders;
- PWA manifest and install foundation;
- finance/analytics dashboards as internal monitoring.

Do not claim as fully complete until keys and manual passes are done:

- live Yandex campaign launch without review;
- Telegram and external messenger delivery;
- full business messenger between all users;
- automatic legal contracts/acts/EDO/fiscal checks;
- every admin button after login;
- physical mobile PWA install and audio listen pass.

## Next Critical Path

1. Add Direct/Metrika OAuth keys and connect real ad/analytics accounts.
2. Do one authenticated admin click pass: dashboard, products, media, stories, orders, terminal, CRM, Direct, notifications.
3. Do one real mobile pass: catalog, product, add to cart, cart drawer, checkout, stories, ARAY open, PWA install prompt.
4. For launch messaging, sell the first product clearly: "ARAY online seller + stories + CRM + Direct draft + smart admin + legal open-source helper", not unfinished external channels.
