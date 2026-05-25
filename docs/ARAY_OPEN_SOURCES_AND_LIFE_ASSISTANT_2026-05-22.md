# ARAY Open Sources And Life Assistant

Date: 2026-05-22

Goal: make ARAY useful for business and life without legal or product chaos. ARAY may search, show, open, explain and save context from open or official sources. ARAY must not promote piracy, bypass subscriptions or pretend paid content is free.

## Product Promise

ARAY is one chat where a person can ask for business help, learning, media, routes, documents, reviews, images, music, films, tutorials, audiobooks or calm support. ARAY finds a legal route, explains what is free or paid, and opens the right source.

## Legal Rule

- Open and official sources first.
- If content is paid or subscription-based, say so clearly.
- If commercial image/document rights are unclear, mark them as "check rights".
- Do not help download pirated films/music/books or bypass access.
- Save links and playlist ideas in chat/context, not copyrighted files.

## Implemented First Layer

Code:

- `lib/aray-open-sources.ts`
- `lib/aray-agent.ts`
- `app/api/ai/chat/route.ts`

ARAY now has `open_source_search` and a direct shortcut for clear requests like:

- "найди фильм"
- "включи музыку"
- "собери плейлист"
- "покажи картинки"
- "найди документ"
- "покажи отзывы"
- "построй маршрут"
- "найди урок"
- "найди аудиокнигу"
- "помоги успокоиться / медитация"

This shortcut runs before the premium long-dialog model. That means simple open-source requests can still return a useful result even if the expensive provider key is missing or paused.

## Source Cards

ARAY returns cards with:

- title;
- URL;
- source;
- kind;
- access label: free search, possible free content, subscription/paid, official, rights check;
- note.

The first source can be opened automatically when the user says "открой", "покажи", "включи", "построй".

## Business Use

ARAY can help with:

- competitor/review research;
- route to client/supplier;
- official document search;
- learning material for a role or task;
- video lessons for staff/freelancers;
- music/references for marketing content;
- image references with rights warning;
- calm support for a stressed person.

## Human Support Mode

If a person is nervous, stuck or tired, ARAY should:

- answer softly and briefly;
- offer one practical next step;
- suggest breathing, calm music, meditation or a short learning resource;
- never pretend to be medical help;
- if there is serious danger, advise contacting live help.

## Verification

Passed on 2026-05-22:

- `npx tsc --noEmit`
- `npm run aray:assistant`
- `npm run aray:tts`

Implementation note:

- explicit tool kinds now include `learning`, `audiobook` and `wellbeing`;
- shortcut detection also reacts to learning, courses, audiobooks, meditation, stress, freelancer and development requests.

## Next Layers

1. Add rich cards in the chat UI for open-source results instead of plain text links.
2. Add a saved "playlist / learning plan / source board" inside ARAY history.
3. Add source trust scoring: official, marketplace, social, forum, unknown.
4. Add role-based learning plans for owner, freelancer, seller, courier, accountant, warehouse, marketer.
5. Add opt-in personalization: mood, role, goal, skill level, preferred language.
