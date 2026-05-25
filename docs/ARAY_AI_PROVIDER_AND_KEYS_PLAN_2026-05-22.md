# ARAY AI Provider And Keys Plan

Date: 2026-05-22

Purpose: keep launch spending under control while preserving the path to a world-class ARAY.

## Current Safe Status

Base Yandex layer is ready:

- `YANDEX_API_KEY`
- `YANDEX_FOLDER_ID`
- `YANDEX_SEARCH_API_TOKEN`
- `YANDEX_WORDSTAT_TOKEN`

Verified by:

- `npm run aray:keys`

Detailed launch order for keys and payments is locked in:

- `docs/ARAY_NEXT_KEYS_PRIORITY_2026-05-22.md`

## Cost Rule

Do not rush into paid AI providers before launch-critical revenue flows are working.

ARAY should use three layers:

1. Project brain: local rules, tools, database, navigation, CRM, tasks, catalog, Direct drafts.
2. Yandex layer: AI Studio/Search/Wordstat, Russian market data, legal open-source search and future SpeechKit/OCR.
3. Premium model layer: GPT/Claude for deep dialog, documents, negotiation, complex messenger and strategy.

## OpenAI Note

ChatGPT Pro and OpenAI API are separate products/billing. `OPENAI_API_KEY` is useful, but it is not required for the current PiloRus launch path. Add it later when budget allows, then set:

```env
OPENAI_API_KEY="..."
ARAY_PRIMARY_AI_PROVIDER="openai"
ARAY_PRIMARY_AI_MODEL="..."
```

## Launch Priority Keys

P0 for PiloRus launch and Direct control:

```env
YANDEX_DIRECT_CLIENT_ID="..."
YANDEX_DIRECT_CLIENT_SECRET="..."
YANDEX_DIRECT_REDIRECT_URI="https://pilo-rus.ru/api/admin/direct/oauth/callback"
YANDEX_DIRECT_API_URL="https://api.direct.yandex.com/json/v5/"
YANDEX_METRIKA_CLIENT_ID="..."
YANDEX_METRIKA_CLIENT_SECRET="..."
YANDEX_METRIKA_REDIRECT_URI="https://pilo-rus.ru/api/admin/metrika/oauth/callback"
```

P0/P1 notifications:

```env
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
TELEGRAM_WEBHOOK_SECRET="..."
```

P1 unified inbox:

```env
IMAP_HOST="..."
IMAP_USER="..."
IMAP_PASSWORD="..."
```

P1 voice/OCR upgrade:

```env
YANDEX_SPEECHKIT_API_KEY="..."
YANDEX_SPEECHKIT_FOLDER_ID="..."
```

P2 SEO/business profiles:

```env
YANDEX_WEBMASTER_TOKEN="..."
YANDEX_BUSINESS_TOKEN="..."
YANDEX_MAPS_API_KEY="..."
```

P3 later:

- WhatsApp Business;
- VK bot;
- Google Ads/Search Console/Business;
- accounting/EDO/fiscal/bank providers.

## Honest Product Line

What we can say now:

"ARAY already has safe tools, voice, tasks, CRM/context, catalog actions, Direct draft foundation, Yandex demand/search keys and an open-source legal search layer."

ARAY can also answer simple open-source commands before calling a premium model: films, music, playlists, routes, documents, lessons, audiobooks, reviews and calm support sources.

What we should not claim until keys/providers are connected:

- fully autonomous paid ad launch;
- guaranteed external messenger delivery;
- full legal/fiscal document sending;
- unlimited world-class model intelligence without paid model budget.
