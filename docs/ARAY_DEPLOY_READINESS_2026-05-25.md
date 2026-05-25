# ARAY Deploy Readiness — 2026-05-25

## Status

Ready for controlled demo / pilot deploy.

Not ready to advertise as fully connected external telephony / messenger system until provider keys are connected.

## Passed

- TypeScript check: passed.
- ARAY quality gate: passed.
- Production build: passed with `npm run build:ci`.
- Local demo server: `http://localhost:3101` responds.
- Admin catalog page opens.
- AR Phone opens in admin by default unless the user closes it.
- AR Phone owner number is stable in the checked session: `AR 6229 16 33`.
- AR Phone core actions are visible: chats, dial, video, invite, share, account.
- Video action is a clean call card, not a heavy experimental panel.
- Unknown AR number flow opens contact creation instead of failing silently.

## Good to Show

- Admin workspace with ARAY panel.
- AR Phone personal number.
- Chat / CRM messenger flow.
- Dial by AR number flow.
- Invite / share number flow.
- Video meeting preparation UI.
- Product catalog and admin navigation.

## Do Not Promise Yet

- Zangi-grade native calls until a real Web SDK/API provider is connected.
- Telegram inbox until `TELEGRAM_BOT_TOKEN` and webhook are connected.
- Google AI / global demand tools until Google credentials are connected.
- WhatsApp / SMS / telephony delivery until provider keys are connected.
- Bank/payment auto-onboarding until bank/acquiring provider is connected.

## Current External Connector State

- ARAY core Yandex keys: present.
- Yandex Search / Wordstat: present.
- Email: configured.
- Push keys: configured.
- ElevenLabs key: present.
- Telegram: missing.
- Google AI: missing.
- Zangi / LiveKit / Daily / Vonage / Bitrix24 video provider keys: missing.

## Deploy Path

Production deploy is wired through GitHub Actions:

- workflow: `.github/workflows/deploy.yml`
- server app dir: `/home/armankmb/pilo-rus/app`
- process manager: PM2 app `pilo-rus`
- runtime port: `3000`
- public domain in current deploy scripts: `https://pilo-rus.ru`

Before production push, confirm the GitHub Action secrets are present:

- `SSH_PRIVATE_KEY`
- `SSH_HOST`
- `SSH_USERNAME`

Production `.env` on the server must keep the real secrets. Do not paste secrets into this document or git.

