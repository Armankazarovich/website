# PiloRus Stories — PATCH 0.9.1-beta.1 — Evidence

Evidence ID: `ARAY-EV-2026-05-21-001` (follow-up to audit `pilorus-stories-audit/AUDIT.md`)
Scope: local safe PATCH only. Status: **LOCAL CANDIDATE**, not READY.

## Environment

- Isolated git worktree: `D:\проект\pilorus\worktree-stories-media-patch`
- Branch: `pilorus-stories-media-patch` (based on `main` @ `dd57e56`)
- Local server: `http://localhost:3111` (ports 3101 / 3102 untouched — confirmed still LISTEN on their own PIDs throughout)
- `node_modules` reused from main checkout via Windows junction (no separate install)
- `.env` copied from main checkout to worktree without printing its contents

## Root cause (confirmed, matches AUDIT.md P0)

`StoryMedia`'s `previewVideoEnabled` was a bare `boolean` reset only inside a `useEffect` (post-render). On story switch, React reused the same component instance, so the first paint after switching from a light story to a heavy one could render with the *previous* story's `true` value, mounting a `<video>` against the new (heavy) `mediaUrl` before the HEAD size-check for that file had run.

## Fix (single file: `components/store/stories-widget.tsx`)

1. Preview permission is now a `story.id + mediaUrl` key (`approvedPreviewKey`), compared against the current key on every render — a stale key can never match the new story, so approval is invalidated synchronously, not after an effect fires.
2. The HEAD size-check effect uses `AbortController` and cancels on story/media change; a resolved-but-stale check can only ever approve the *old* key, which never matches a newer `currentKey`.
3. `showVideo` (preview mode) is only true when `approvedPreviewKey === currentKey` — the video element is never mounted before HEAD success for the exact current file.
4. The `<video>` element for the current media key now uses `key={currentKey}` so switching stories always remounts a clean video element (no stale buffered ranges).
5. Explicit open (`expanded`) still bypasses the HEAD gate, as before — opening a story is the explicit user action per the audit's requirement 6.
6. Added `videoError` state + `onError` handler. When the *open* story's video fails, a message + "Повторить" button is shown; the button calls `.load()` (and `.play()` if applicable) once — no automatic retry loop. In preview mode an error silently falls back to the poster (no dead video box).
7. No Prisma schema change, no other file touched.

## Automated checks (this worktree)

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit --pretty false` | **0 errors** |
| Project stories gate | `npm run stories:check` | **16/16 gates passed** |
| Project responsive browser gate | `BROWSER_BASE_URL=http://localhost:3111 node scripts/validate-browser-stories-responsive.js` | **5/5 gates passed** — report: `tmp/browser-stories-responsive-report.md` (desktop 1366×900 full card, tablet 900×900 side tab, mobile 390×844 compact trigger, all correctly gated) |
| Project release-readiness gate | `node scripts/validate-release-readiness.js` | **40/40 gates passed** |
| DB-free production build | `rm -rf .next && npx next build` (no `prisma db push`, no `data-migrate.ts`) | **Exit 0**, `✓ Compiled successfully`, all 152 routes generated, 0 errors/warnings |

## Manual browser evidence (this session, `http://localhost:3111`)

Data used: real local dataset — one `LIVE` story with a genuinely heavy local video (`hero-video.mp4`, **69,284,704 bytes**, i.e. above the 12 MB preview threshold, same class of defect as the two heavy production stories) and one `IMAGE` story (no video).

1. **Closed widget, heavy video never fetched.** On `/`, `/catalog`, tablet (900×900) and mobile (390×844) loads, `read_network_requests` for `hero-video.mp4` showed only `HEAD` requests (some cancelled by the new `AbortController`, matching StrictMode's double-effect in dev) — **zero `GET`/`Range` requests** while the widget was closed. `/catalog` correctly never even issues the HEAD check (`allowPreviewVideo={!isCatalogPath}`, pre-existing and untouched).
2. **Explicit open loads the video.** Clicking the story card opened the LIVE story; only then did `GET .../hero-video.mp4 → 206 Partial Content` requests appear, and the video played (verified via two screenshots showing different decoded frames + the pause/play toggle state).
3. **Error + retry.** Dispatched a genuine `error` event on the *open* story's `<video>` (without touching `src`, so this is not a `key`-remount artifact) → error message *"Не удалось загрузить видео. Проверьте соединение и попробуйте ещё раз."* + **"Повторить"** button rendered. Clicking it cleared the error and the video resumed playing (confirmed via `innerHTML` inspection before/after and a follow-up screenshot). No automatic retry loop exists in the code.
4. **IMAGE story regression check.** The second story (`Вагонка (Липа)`, type `IMAGE`) opened correctly, no video controls rendered, CTA `Открыть товар` present and linked to `/product/vagonka-lipa`.
5. **Breakpoints.** Confirmed visually and via the project's own `validate-browser-stories-responsive.js`: desktop 1366×900 → full 152px card; tablet 900×900 → 44×104 side tab; mobile 390×844 → 76×112 compact trigger. Full-screen open verified on mobile (390×844): live video, pause/sound/prev/next/like/chat/share/CTA all present and functional.
6. **Console.** Only console error observed across the whole session was the one *deliberately injected* 404 for a nonexistent test file (`does-not-exist.mp4`) from an earlier adversarial test round — no errors caused by the patch itself.

## Known pre-existing gap (NOT part of this patch, NOT introduced by it)

- `Escape` does not close the open story overlay (confirmed unchanged before/after this patch). This matches `AUDIT.md` P2 finding ("overlay не объявлен как диалог… не виден явный focus trap"). Left untouched — out of scope for the P0 safe patch; candidate for the accessibility work in a later stage.

## Explicitly not touched

- No Prisma schema change.
- No other component, page, or admin route.
- No production data, no live `pilo-rus.ru` traffic, no deploy, no push.
- `D:\Zeder` was not opened or inspected.
- Ports 3101 / 3102 were never stopped or reconfigured (verified via `Get-NetTCPConnection` before and unaffected throughout).
