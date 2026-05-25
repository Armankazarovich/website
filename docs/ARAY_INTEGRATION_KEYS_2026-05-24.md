# ARAY integration keys checklist, 2026-05-24

This file is a launch checklist. It does not contain secret values.

## Already present in `.env`

- Core AI/runtime: `ANTHROPIC_API_KEY`
- Yandex AI/Search demand base: `YANDEX_API_KEY`, `YANDEX_FOLDER_ID`, `YANDEX_SEARCH_API_TOKEN`, `YANDEX_WORDSTAT_TOKEN`
- Voice: `ELEVENLABS_API_KEY`
- Search and operations: `BRAVE_SEARCH_KEY`, SMTP, Google Sheets, VAPID

## P0 for launch demo

1. Telegram inbox and admin alerts
   - Open `https://t.me/BotFather`
   - Create or select a bot, copy the bot token.
   - Add to `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`.
   - Then test from admin notifications.

2. Yandex AI Studio, OCR, speech
   - Open `https://aistudio.yandex.ru/docs/ru/ai-studio/operations/get-api-key`
   - Create an API key in AI Studio and save the value immediately.
   - Current project already has base Yandex keys. For stronger document/voice flow add:
     - `YANDEX_SPEECHKIT_API_KEY`
     - `YANDEX_SPEECHKIT_FOLDER_ID`
     - `YANDEX_VISION_OCR_ENABLED="true"`
   - Keep `YANDEX_API_KEY` and `YANDEX_FOLDER_ID` filled.

3. Yandex Smart Home / Alice device control
   - Open `https://oauth.yandex.ru`
   - Create an OAuth app for ARAY.
   - Required scopes: `iot:view iot:control`
   - Add to `.env`:
     - `YANDEX_OAUTH_CLIENT_ID`
     - `YANDEX_OAUTH_CLIENT_SECRET`
     - `YANDEX_OAUTH_REDIRECT_URI`
     - `YANDEX_IOT_REDIRECT_URI`
     - `YANDEX_IOT_SCOPES="iot:view iot:control"`
     - `ARAY_DEVICE_SYNC_ENABLED="true"`
   - API key alone is not enough for full smart home control; Yandex requires OAuth permission from the user.

4. Yandex Direct, Metrika, Webmaster, Business
   - Start with one Yandex OAuth app if possible.
   - Direct API requires OAuth access and accepting API terms in the Direct API cabinet.
   - Add relevant tokens/client IDs only after the business account is ready.

5. Messenger channels after Telegram
   - VK: `VK_BOT_TOKEN`, `VK_CONFIRMATION_TOKEN`, `VK_SECRET_KEY`.
   - WhatsApp Business: `WHATSAPP_BUSINESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.
   - Telephony/SMS: provider keys such as Zadarma/SMS.ru when chosen.

6. Voice and video calls
   - Bitrix24 is a strong product reference: chat, voice/video, screen sharing, files, meeting chat, recordings, and client invitations.
   - Zangi is the preferred first direction for ARAY calls because it matches the desired simple story: phone/email registration, private Zangi Number, voice/video calls by number, white-label messenger options, and Voice API.
   - Official Zangi pages checked on 2026-05-24:
     - Voice API: `https://zangi.com/voice-api`
     - Voice/video product page: `https://zangi.com/features/free-voice-and-video-chat`
     - White-label/custom messenger: `https://zangi.com/custom-communication-solutions`
   - Current conclusion: Zangi has a real voice/conference API story and a business messenger/white-label story with voice/video. For direct web embedding inside ARAY admin we still need their exact SDK/API access terms; until that is confirmed, ARAY uses a provider adapter so fallback video does not change the UI.
   - For ARAY web admin we need one embedded video provider or SDK:
     - `ARAY_VIDEO_PROVIDER="zangi"`
     - `ARAY_VIDEO_MEETING_BASE_URL`
     - `ZANGI_API_KEY`
     - `ZANGI_APP_ID`
     - `ZANGI_APP_SECRET`
     - `ZANGI_WEBHOOK_SECRET`
   - Fallback providers if Zangi does not expose the needed web SDK/API fast enough: LiveKit, Jitsi, Daily, Vonage, or Bitrix24 adapter.
   - Until Zangi is connected, ARAY can prepare invitation text, create CRM/task context, and keep the meeting card visible, but it must not pretend that a live room exists.

## Safety rules for ARAY tools

- ARAY can draft, read, search, prepare documents, and create tasks.
- ARAY must ask confirmation before paid actions, sending to a client, changing stock/prices, launching ads, deleting data, or controlling devices.
- Personal passwords are not stored in chat. Use OAuth flows or `.env` secrets.
- Show only connection status in UI, never raw secret values.
