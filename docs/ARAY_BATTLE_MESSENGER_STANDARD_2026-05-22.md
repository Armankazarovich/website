# ARAY Battle Messenger Standard

Date: 2026-05-22

Purpose: make ARAY launch as a working business messenger, not as a raw AI chat.

## Product Rule

ARAY is the heart of the platform. A person should be able to write or speak in one window, and ARAY should understand whether the next step is:

- answer briefly;
- open a platform section;
- open an external source in a new tab;
- prepare a change;
- ask for confirmation;
- create a lead/task/message/document draft;
- show quick action buttons;
- continue the work with context.

## Platform Hands

Inside ARAY/PiloRus platform ARAY may:

- open internal pages and admin sections;
- open product, service, order, CRM, task, story and Direct screens;
- prepare changes for products, orders, tasks, stories, settings and messages;
- highlight or explain where to click;
- create drafts and confirmation cards;
- refresh a section after a confirmed change.

Important: critical changes, money, ads, external sends, legal documents and personal-data actions require confirmation.

## Persistent Companion Rule

ARAY must stay beside the person while they move through the platform.

- internal navigation must not hide ARAY;
- page changes must not collapse the messenger automatically;
- ARAY may collapse only when the person explicitly closes/collapses it;
- after opening a section, ARAY explains briefly: what opened, what to check, what the next step is.

This keeps ARAY as a guide with hands, not a modal that disappears after every click.

## Unified Everywhere Rule

There must be one ARAY surface across the public site, cabinet and admin.

- public store, cabinet and admin mount the same `ArayGlobalAssistant`;
- admin may lazy-load it, but it must still resolve to the same ARAY widget and dock;
- stories, product cards, CRM, orders, media, Direct, analytics and future modules open their work inside this same ARAY window;
- the messenger is not a separate competing UI: it is an embedded workspace inside ARAY;
- user-to-user chats, client chats, ARAY chat and CRM thread history must share the same visual language and keep context while the user navigates;
- new modules must dispatch `aray:open`, `aray:voice` or `aray:prompt` instead of creating another assistant panel;
- if a feature needs a special workflow, it becomes a child mode inside ARAY, like `ArayEmbeddedMessenger`.

Forbidden pattern: build a second chat, second assistant dock or page-only messenger that looks similar but loses ARAY history, voice, context or actions.

## Embedded Conversation Rule

The embedded messenger behaves like one clean phone-style chat surface:

- ARAY appears as a first-class conversation next to people, not as a separate alien panel;
- the first conversation is always ARAY; user/client/group chats are separate threads, but they open in the same ARAY window and keep the same visual language;
- a selected thread is addressed by the real thread/person name, not by a hard-coded "client" label;
- inside any human dialog, writing `ARAY` / `Арай` in the composer invites ARAY into the same thread as an assistant message;
- intent phrases such as "what should I say", "how to answer", "find", "open", "show", "prepare", "translate" and "help" also route to ARAY;
- the composer has a compact route switch: `Auto`, selected person/thread, `ARAY`; `Auto` may detect intent, but the person can always choose manually;
- ARAY replies, document drafts and next-step advice never send to the other person automatically;
- idle screens must not show static chip packs such as "voice", "quick actions" or "agents"; actions appear only when they are truly contextual or when the person opens the actions tray;
- the actions tray is a small layer, not a second panel: quick replies, task, incoming note, CRM, media, document drafts and estimate/cart preparation live there;
- ARAY action markers from model responses become clean buttons under the ARAY bubble; raw URLs and metadata must not leak into chat text;
- ARAY private helper history may be kept locally per thread, while CRM/user messages remain the durable business history;
- settings/history controls are compact: refresh, summarize, clear draft/private helper, expand CRM history; destructive delete/archive requires explicit confirmation and permissions;
- the human chooses the target through natural text: normal text goes to the selected person, ARAY-directed text asks ARAY in-thread;
- system history stays compact and expandable so CRM noise does not bury the real conversation.

## Estimate To Cart Rule

ARAY must be able to turn rough demand into a controlled cart draft:

- accept a typed list, voice note, photo of paper, PDF, Excel or pasted estimate as the source;
- extract product names, dimensions, grade, quantity, delivery notes and unclear positions;
- match extracted positions to catalog products and variants;
- compare prices, stock, alternatives and missing items;
- prepare a cart/compare draft and explain what is uncertain;
- never add, remove, reserve or order products without confirmation;
- work both for public clients and admin staff, with the same confirmation and audit discipline.

## Two Live Messenger Modes

The visible messenger has two launch modes:

- `Как написать`: translate rough, emotional or chaotic human text into clear business language without heavy terms, profanity or aggression.
- `Проведи меня`: open sections, show next steps, explain what ARAY did and stay next to the person.

Both modes still follow the same safety rule: ARAY prepares and explains; sending, changing, publishing, paying or launching ads requires confirmation.

## External Sources

External services must not be embedded into a fragile iframe unless the service is known to allow it.

Default rule:

- internal platform link: open inside the platform/router;
- external service link: open a new browser tab;
- source results: show clean action cards, not raw long URLs;
- if the user says "open/show/play/build route", open the first best source and keep other source buttons visible.

## Message Quality

ARAY answer should look like a messenger product:

- short human summary;
- no ugly encoded URLs in the main text;
- links rendered by readable title;
- useful buttons under the answer;
- no random fallback buttons when the answer already has relevant actions;
- no claim that something was opened if the action was not executed.

## Current First Implementation

Code layers:

- `lib/aray-open-sources.ts`
- `lib/aray-business-messenger.ts`
- `lib/aray-module-registry.ts`
- `lib/aray-module-state.ts`
- `app/admin/messenger/page.tsx`
- `app/admin/messenger/messenger-hub-client.tsx`
- `app/api/admin/messenger/threads/route.ts`
- `app/api/admin/messenger/threads/[id]/messages/route.ts`
- `app/api/ai/chat/route.ts`
- `components/store/aray-widget.tsx`
- `components/store/aray-chat-host.tsx`
- `components/admin/admin-aray.tsx`

What is fixed:

- open-source answers now return short text plus action cards;
- platform action cards are shown instead of raw URLs;
- external services open in a new tab;
- clear "open/show/play/route" commands open only the first best source;
- other sources stay as buttons for the person;
- `ARAY_ACTIONS` no longer leaks into the visible message and no longer breaks when followed by meta/action markers.
- `/admin/messenger` is live as the first business inbox over CRM leads and lead activities;
- staff can create a dialog, save client/manager messages, polish a draft with ARAY and create a task from the dialog;
- ARAY can be called from a selected dialog and stays open beside the page;
- bottom ARAY input no longer repeats quick chips over the composer;
- `business.aray-messenger` is registered as an ARAY module passport with role policy and quality checks.

Important current boundary:

- saved messages are internal CRM thread records until external channels are connected;
- ARAY may prepare a message and create confirmed tasks, but external sending still needs channel keys, consent and confirmation.

## Next Messenger Layer

After this standard, the next launch slice is:

1. real conversations table for user-to-user/staff-to-client dialogs;
2. public/cabinet client chat connected to the same thread;
3. people search: "find Arayik and open chat";
4. file/photo/document attachments in conversation;
5. push/email/Telegram delivery after channel keys;
6. delivery/read status and audit log;
7. ARAY document drafts from a dialog with confirmation.
