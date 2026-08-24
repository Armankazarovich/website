# PiloRus Stories — Correction 1 on candidate `408cdc5`

Evidence ID: `ARAY-EV-2026-05-21-001` (correction round)
Scope: one correction to the PATCH 0.9.1-beta.1 local candidate. Status: **LOCAL CANDIDATE**, not READY.
Base commit: `408cdc5` on branch `pilorus-stories-media-patch`, worktree `D:\проект\pilorus\worktree-stories-media-patch`.

## What was wrong in `408cdc5`

The reset effect for `videoError` depended on `showVideo`:

```tsx
useEffect(() => {
  setVideoLoading(showVideo && expanded);
  setVideoError(false);
}, [expanded, showVideo, currentKey]);
```

`showVideo` itself is derived from `videoError` (`!(videoError && !expanded)`). So for a **closed-preview** video: an error set `videoError = true` → `showVideo` flips `true → false` → that flip is a dependency change → the effect re-fires → `setVideoError(false)` → `showVideo` flips back to `true` → the `<video>` remounts against the same broken URL → errors again → loop. This is the "цикл ошибки закрытого превью" bug.

## Fix (same file, `components/store/stories-widget.tsx`)

1. `videoError` is now reset **only** when `currentKey` (`story.id + mediaUrl`) changes — never as a side effect of `showVideo`:
   ```tsx
   useEffect(() => { setVideoLoading(showVideo && expanded); }, [expanded, showVideo]);
   useEffect(() => { setVideoError(false); }, [currentKey]);
   ```
2. On a **preview** (`!expanded`) video error, the handler now explicitly revokes exactly the current key's approval:
   ```tsx
   onError={() => {
     setVideoLoading(false);
     setVideoError(true);
     if (!expanded) {
       setApprovedPreviewKey((prev) => (prev === currentKey ? null : prev));
     }
   }}
   ```
   This is defense-in-depth on top of (1): even if some future change makes `videoError` clear itself again, a revoked `approvedPreviewKey` still cannot re-approve without a fresh HEAD check for that exact key.
3. HEAD check now requires `response.ok`, not just a size in range:
   ```tsx
   if (response.ok && bytes > 0 && bytes <= STORY_PREVIEW_VIDEO_MAX_BYTES) {
     setApprovedPreviewKey(keyAtScheduleTime);
   }
   ```
   A 4xx/5xx HEAD response (e.g. a broken/expired media URL) can no longer approve a preview merely because it happened to carry a small `content-length`.

No Prisma change, no other file touched, Escape/sort-order/media-pipeline untouched.

## Reproducible check (new)

`scripts/validate-stories-preview-recovery.js` — not wired into `package.json` or any deploy/release script (out of scope for this correction); run manually with `BROWSER_BASE_URL=http://localhost:3111 node scripts/validate-stories-preview-recovery.js`.

**No database writes.** It drives a real, isolated headless Chromium (its own `--user-data-dir`, its own `--remote-debugging-port=9331`) against the already-running local dev server and injects three synthetic stories purely at the network layer, by patching `window.fetch` (via `Page.addScriptToEvaluateOnNewDocument`, before any app script runs) to intercept only the widget's own `/api/stories` call on a product page:

- **Story A (light)** → `/aray/orb-v2.mp4` — a real, already-existing local file, 386 KB (under the 12 MB threshold).
- **Story B (heavy)** → `/images/production/hero-video.mp4` — the same real 69,284,704-byte local file used in the original patch evidence (over the threshold).
- **Story C (HEAD-fail)** → a URL that does not exist; the shim additionally intercepts only `HEAD` requests to that specific URL and returns a genuine `404`, to test the `response.ok` gate independent of file size.

All other requests (the real page, the real `orb-v2.mp4` / `hero-video.mp4` bytes) go over the real local network — untouched.

### Result: 13/13 gates passed

```
OK Local server is available
OK Chrome or Edge executable exists
OK Stories widget present on test page
OK Test fetch shim is active (no DB writes used)
OK Story A (light video) preview approved and mounted
OK Story A received a real GET for its own file                              — GET count for /aray/orb-v2.mp4: 1
OK Preview error leaves the poster mounted (no auto re-mount)
OK Preview error does not trigger a repeated GET                             — 0 new GET after the dispatched error
OK Switching to heavy story B does not reuse A's approval                    — no <video> mounted on the very next paint after switching
OK Closed widget never issues GET/Range for the heavy story                  — []
OK Heavy story stays on its poster in the closed widget
OK A non-ok HEAD response never approves the preview                        — 404 HEAD never mounted a <video>
OK Only HEAD (no GET) was attempted against the failing URL                  — []
```

Full report: [`preview-recovery-report.md`](preview-recovery-report.md)
Screenshots (captured by the script itself, no personal data — synthetic test titles only):
- [`preview-recovery-storyA.png`](preview-recovery-storyA.png) — story A approved and mounted (loading-spinner overlay visible, confirming a real `<video>` element, not the poster).
- [`preview-recovery-afterError.png`](preview-recovery-afterError.png) — after the dispatched `error` event: poster only, no `<video>`, no loop.
- [`preview-recovery-storyB.png`](preview-recovery-storyB.png) — heavy story B, closed widget, poster only (no video ever mounted, no GET/Range issued).

Note: the underlying test page (`/product/vagonka-lipa`) itself renders a 404 body in this local dataset (pre-existing seed/product-slug mismatch, unrelated to this patch — the story record's own `ctaUrl` references a slug that no longer resolves to a live product locally). This does not affect the check: the widget's entity detection is purely a URL-pattern match (`/^\/product\/([^/?#]+)/`) done client-side via `usePathname()`, so the `/api/stories` fetch (and therefore the whole test) fires regardless of the page body. Visible in the screenshots as the storefront "404 This page could not be found" text behind the widget card.

## Repeated required checks (this correction)

| Check | Result |
|---|---|
| `npx tsc --noEmit --pretty false` | **0 errors** |
| `npm run stories:check` | **16/16 gates passed** |
| `node scripts/validate-release-readiness.js` | **40/40 gates passed** |
| `rm -rf .next && npx prisma generate && npx next build` (no `prisma db push`, no `data-migrate`) | **exit 0**, `✓ Compiled successfully`, 0 errors/warnings, all routes generated |

The 3111 dev server was stopped only for the duration of the clean build (to release the Prisma client file lock on the shared `node_modules` junction) and restarted immediately after. Ports 3101/3102 kept the same owning PIDs throughout (verified via `Get-NetTCPConnection`).

## Explicitly not touched (unchanged from the original patch)

- No Prisma schema change.
- No Escape/focus-trap change.
- No story sort-order / admin UI change.
- No media pipeline (Этап 2) work.
- No other component, page, or admin route.
- `D:\Zeder` not opened. Production `pilo-rus.ru` not touched. No push, no deploy.
- Ports 3101 / 3102 untouched throughout (verified via `Get-NetTCPConnection` before and after).
