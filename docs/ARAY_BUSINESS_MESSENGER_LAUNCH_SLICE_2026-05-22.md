# ARAY Business Messenger Launch Slice

Date: 2026-05-22

This document turns the big ARAY messenger idea into a launchable first product for PiloRus and future businesses.

## Product Promise

ARAY Business Messenger is one business chat where the human does not need to search through modules. A client, manager or owner writes or speaks in one window. ARAY understands the context and can connect products, stories, orders, CRM, tasks, documents, notifications and next steps.

The core rule stays the same: benefit without harm. ARAY prepares and explains. Critical actions are confirmed by a human.

## First Launch Slice For PiloRus

This is the slice we can show first:

1. Client opens story, product or site ARAY chat.
2. Client asks a question, leaves a comment, sends an offer or writes a review.
3. ARAY polishes the message into a clear business form when needed.
4. Story message keeps context: story id, type, title, related product/service, page URL, attachments metadata.
5. Question/offer/comment creates CRM lead + task for staff.
6. Review creates a review on moderation + task for staff.
7. Staff push notification is attempted when push is configured and the staff device is subscribed.
8. ARAY opens the main chat with the story context so the manager can continue without searching.
9. ARAY can search legal/open sources from the same chat: reviews, documents, routes, lessons, videos, music, playlists, films, audiobooks and calm support links.

Implemented evidence:

- `components/store/story-action-drawer.tsx`
- `app/api/stories/[id]/message/route.ts`
- `lib/aray-business-messenger.ts`
- `lib/aray-business-events.ts`
- `components/store/aray-chat-host.tsx`
- `app/api/ai/chat/route.ts`
- `app/api/ai/chat/history/route.ts`
- `lib/aray-open-sources.ts`

## What ARAY Should Do In The Messenger

Safe immediate actions:

- explain what it found;
- rewrite a rough message into clean business language;
- translate intent between buyer and seller;
- prepare a reply;
- prepare a task;
- prepare a lead;
- open a related product, service, order, story, review or CRM card;
- show a document draft;
- summarize conversation history;
- find a legal/open source for media, reviews, lessons, routes and documents;
- open a source when the user asks "show/open/play/build route";
- suggest the next useful step.

Confirmed actions only:

- send a message to another user;
- send push, email, Telegram or external notification;
- change order/product/client data;
- create legal document as final;
- launch ads or spend money;
- send personal data outside the system;
- publish review/content.

## Future Full Messenger

The full version should add:

- people search: "find Arayik Ardanian";
- open direct dialog with a found person;
- unified inbox for client, manager, courier, supplier, owner;
- ARAY side assistant inside every dialog;
- email/push/Telegram delivery: "Arman wrote, read it?";
- file and photo attachments;
- order number recognition;
- document generation: quote, invoice, contract draft, act, delivery note;
- grammar, tone and profanity cleanup before sending;
- translation between languages and business tones;
- message templates by niche;
- realtime unread counters and role permissions;
- notification quiet hours and audit log.

## What Is Not Finished Yet

These are not launch-ready claims yet:

- full user-to-user chat backend;
- guaranteed email/push/Telegram dispatch to each user;
- realtime typing/read receipts;
- external WhatsApp/Telegram/VK inbox;
- final legal document sending;
- automatic fiscal check or EDO sending;
- full courier/logistics marketplace.
- internal streaming or pirated download service.

They are roadmap layers, not promises for the first public launch.

## Sales Positioning

For PiloRus launch:

"ARAY turns stories, products and client questions into CRM leads, tasks and clear manager actions. The client asks in the story or chat; the business receives structured work instead of lost messages."

For ARAY Production:

"One business messenger with ARAY beside every conversation: writes clearly, connects context, prepares documents, creates tasks and keeps people moving without chaos."

The media/search promise must stay honest:

"ARAY does not pirate content. It finds official or open sources, shows what may require payment/subscription, and keeps useful links, playlists and learning plans in the chat."

## Next Implementation Steps

1. Keep story messenger as the first public proof.
2. Add a real conversations table/model for user-to-user and staff-to-client dialogs.
3. Connect message notifications to existing push/email settings.
4. Add "open person/dialog" command to ARAY tools.
5. Add document draft actions inside a conversation.
6. Add admin page for inbox and dialog history.
7. Add explicit confirmation UI for sending messages and external notifications.
8. Turn open-source results into rich cards that can be saved to a conversation.
