# ARAY Project Routing

Date: 2026-06-09

## This Chat Target

- Production domain: `https://pilo-rus.ru`
- Local working folder: `D:\проект\pilorus\website`
- Git remote: `https://github.com/Armankazarovich/website.git`
- Local dev URL: `http://localhost:3101`
- Production reverse proxy target from docs: `localhost:3000`

When we say "ARAY production", "PiloRus", or "our server" in this chat, use this folder and this domain.

## Do Not Mix

- `D:\Zeder` and `zaidr.ru` are a separate Zaidr project/chat.
- `D:\проект\ПилоРус\website` is an older PiloRus copy and should not be treated as the main source unless we intentionally compare or recover from it.
- `D:\pilorus` is not the app folder; it currently contains docs only.

## Current Snapshot

- `https://pilo-rus.ru/api/health` returned `healthy`.
- `https://pilo-rus.ru/catalog` returned `HTTP 200`.
- `https://pilo-rus.ru/admin` returned a login redirect (`307`), which is expected.
- Local TypeScript check in `D:\проект\pilorus\website` passed.
- Local `npm run quality` is blocked by design-system guard findings in newer ARAY/site-constructor UI files.

## Next Safe Step

1. Fix design-system guard findings in `D:\проект\pilorus\website`.
2. Re-run `npm run quality`.
3. Run local build.
4. Run live smoke against `pilo-rus.ru` before any deploy.
