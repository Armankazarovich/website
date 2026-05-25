# ARAY Next Keys Priority

Date: 2026-05-22

Purpose: give Arman one calm order for keys, money and launch dependencies. No secrets are stored here.

## Already Ready

Base Yandex layer is configured and checked:

- `YANDEX_API_KEY`
- `YANDEX_FOLDER_ID`
- `YANDEX_SEARCH_API_TOKEN`
- `YANDEX_WORDSTAT_TOKEN`

Checked by:

- `npm run aray:keys`

What this gives now:

- Yandex AI/Search/Wordstat foundation;
- legal open-source search layer for ARAY;
- demand/research foundation for Direct and content;
- enough to continue without buying OpenAI in panic.

## P0: PiloRus Launch And Direct

These are the next keys/accesses that matter most because they unlock advertising, analytics and client confidence.

1. Yandex Direct OAuth app:
   - `YANDEX_DIRECT_CLIENT_ID`
   - `YANDEX_DIRECT_CLIENT_SECRET`
   - `YANDEX_DIRECT_REDIRECT_URI`
   - `YANDEX_DIRECT_API_URL`
   - first token through OAuth flow after app/access is approved.

2. Yandex Metrika OAuth:
   - `YANDEX_METRIKA_CLIENT_ID`
   - `YANDEX_METRIKA_CLIENT_SECRET`
   - `YANDEX_METRIKA_REDIRECT_URI`
   - Metrika counter access for the PiloRus site.

3. Notification channel for real leads:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET`

Do not spend on extra AI before this layer unless the current main model stops working.

Official reference links:

- Yandex Direct API access: https://yandex.ru/dev/direct/doc/en/concepts/access
- Yandex Direct OAuth token: https://yandex.com/dev/direct/doc/en/token
- Yandex Metrika API authorization: https://yandex.ru/dev/metrika/en/intro/authorization

## P1: ARAY Voice, Inbox And Documents

After P0:

- SpeechKit for voice recognition/synthesis if browser/device voice is not enough:
  - `YANDEX_SPEECHKIT_API_KEY`
  - `YANDEX_SPEECHKIT_FOLDER_ID`
- IMAP/email inbox for unified business messenger:
  - `IMAP_HOST`
  - `IMAP_USER`
  - `IMAP_PASSWORD`
- real outgoing mail provider settings if not already stable.

## P2: Premium Brain

OpenAI is useful for deep dialogs, document drafting, strategy, negotiation and future complex messenger flows, but it is not the first survival payment.

Important: ChatGPT Pro/Plus subscription and OpenAI API billing are separate. A ChatGPT subscription does not automatically pay for API requests.

Only add when budget allows:

```env
OPENAI_API_KEY="..."
ARAY_PRIMARY_AI_PROVIDER="openai"
ARAY_PRIMARY_AI_MODEL="..."
```

Official reference links:

- OpenAI API keys: https://platform.openai.com/api-keys
- OpenAI help about ChatGPT subscription vs API billing: https://help.openai.com/en/articles/8156019-is-api-usage-included-in-chatgpt-subscriptions-even-if-i-have-a-paid-chatgpt-account

## P3: Growth And Reputation

Add after Direct/Metrika are alive:

- Yandex Webmaster;
- Yandex Business / Maps;
- review and reputation monitoring;
- Google Search Console / Business only when the Google side becomes launch-critical.

## P4: Accounting, Fiscal, Logistics

These must be chosen carefully with provider/legal review:

- bank API;
- fiscal receipts;
- EDO;
- 1C / accounting;
- delivery and courier marketplaces;
- logistics exchange integrations.

ARAY may prepare drafts and route work, but final legal/fiscal sending needs human confirmation and provider setup.

## Money Rule

1. First pay only what helps PiloRus launch and get orders: Direct/Metrika/notification delivery.
2. Keep OpenAI/API premium as an upgrade, not a panic payment.
3. Every paid action in ARAY/Direct stays behind confirmation.
4. If a provider is not connected, ARAY says honestly: "I can prepare the draft; real sending needs a connected provider."
