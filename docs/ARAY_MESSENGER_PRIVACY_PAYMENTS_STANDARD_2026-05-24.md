# ARAY Messenger: privacy, providers, payments

Date: 2026-05-24

## Launch rule

ARAY Messenger is our business control layer. Calls and video can be powered by a provider such as Zangi, but CRM notes, leads, tasks, orders, payments and bonuses remain our responsibility inside the platform.

Do not advertise "we do not know where the data is" or "all questions are only to Zangi". The correct wording is:

- "Calls/video: powered by Zangi or another connected communication provider."
- "Business data: stored in the ARAY/CRM workspace of the company."
- "Contact sync: only by explicit permission or manual import."
- "Payments: only through official bank/provider connection; no raw card data is stored in ARAY."

## Zangi boundary

Zangi can be used as a communication provider for calls/video or as a white-label/self-hosted communication option after commercial approval.

In our UI this must be visible as a provider status, for example: "Zangi-ready" or "Связь на технологии Zangi". The product must not imply that ARAY owns Zangi infrastructure unless there is a signed white-label/on-premise agreement.

## AR Phone Bridge

For launch speed ARAY can use a bridge meeting URL before a full SDK is connected. The UI stays the same:

- internal `ARAY-...` number identifies the room/contact;
- "Видео" opens the current meeting provider URL;
- "Ссылка" copies the same URL for the client;
- "ARAY" internal call remains provider-ready and must not pretend to be a native call until SDK/API is connected.

Default public bridge setting:

- `NEXT_PUBLIC_ARAY_VIDEO_MEETING_BASE_URL`

Later provider settings can replace only the base URL or backend token flow:

- Zangi white-label/API;
- LiveKit Cloud;
- Daily;
- another approved WebRTC provider.

## Contact sync

Version 1 uses safe sources:

- Manual contact creation in ARAY Messenger.
- Existing CRM leads and orders.
- Optional CSV/vCard/CRM import later.

Device contacts later:

- Ask permission at the moment the user imports contacts.
- Let the user choose contacts; do not silently upload the whole phonebook.
- Store minimum fields: name, phone, email, company, source, consent time.
- Allow edit/delete and show where the contact came from.
- Never expose private contacts to site visitors or other tenants.

## Payments and bank data

Version 1 shows payment readiness and safe finance facts:

- paid amount from orders/payments;
- pending amount from unpaid orders;
- bonus points from paid turnover;
- payment setup status.

Real bank or acquiring connection must use official OAuth/API/provider flow. ARAY stores provider tokens only in the connector vault/env layer, never in chat messages, documents, browser logs or prompts. Raw card numbers, CVV and client bank secrets are not stored.

Payment links, QR, invoices, refunds and status changes require provider confirmation and/or human confirmation. ARAY can draft a message, but must not mark money as paid without a trusted provider event or admin confirmation.

## Bonus program

Bonus points are not external money. They are an internal loyalty ledger with rules:

- earn rule;
- spend rule;
- expiry rule;
- audit history;
- manual correction reason;
- no negative balance unless explicitly allowed.

Until the full ledger exists, show bonuses as a calculated preview, not a legal obligation.
