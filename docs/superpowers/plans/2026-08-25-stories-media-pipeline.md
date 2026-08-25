# PiloRus Stories Media Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически создавать лёгкую и проверенную web-копию видео сторис, сохраняя исходник и безопасный откат.

**Architecture:** Чистая policy-библиотека и отдельный worker управляют FFmpeg/FFprobe, а файловая очередь вне публичного каталога отделяет тяжёлую работу от HTTP-запроса и Prisma. Существующие upload API и `/admin/stories` становятся адаптерами; публичный контракт `mediaUrl` остаётся совместимым.

**Tech Stack:** Next.js 14, TypeScript/React, Node.js child process, Prisma 5, `ffmpeg-static`, filesystem receipts, Playwright project checks.

**Spec:** `docs/superpowers/specs/2026-08-25-stories-media-pipeline-design.md`

## Global Constraints

- Prisma-схема не меняется.
- Исходники не удаляются и не перезаписываются.
- Одновременно работает не более одного кодирования.
- Публичный `mediaUrl` меняется только после проверки результата.
- Другие модули и проекты не меняются.
- Первая production-операция затрагивает только одну подтверждённую тяжёлую сторис.

---

### Task 1: Media policy and real encoder contract

**Files:**
- Create: `lib/story-media-policy.cjs`
- Create: `scripts/test-story-media-pipeline.cjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `shouldOptimizeStoryVideo(input)`, `buildStoryFfmpegArgs(input, output)`, `validateStoryMediaProbe(probe, sourceSize, outputSize)`, `isSafeStoryMediaJobId(value)`.

- [x] Write Node assertions for small MP4 pass-through, MOV/large MP4 optimization, required H.264/AAC/faststart profile, invalid job IDs and rejected oversized/incompatible output.
- [x] Run `node scripts/test-story-media-pipeline.cjs` and verify it fails because the policy module is missing.
- [x] Add pinned `ffmpeg-static` dependency and implement the minimal pure policy.
- [x] Run the test and verify all policy assertions pass.
- [x] Commit the tested policy slice.

### Task 2: Durable queue and worker

**Files:**
- Create: `lib/story-media-worker.cjs`
- Create: `lib/story-media-jobs.cjs`
- Modify: `scripts/test-story-media-pipeline.cjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Task 1 policy and bundled FFmpeg binary.
- Produces: `createStoryMediaJob(input)`, `getStoryMediaJob(id)`, `retryStoryMediaJob(id)` and sanitized `StoryMediaJobPublic`.

- [x] Extend the failing test to generate a real short vertical fixture and assert source preservation, queue states, H.264/AAC output, poster, atomic final names and no remaining processing file.
- [x] Run the test and verify the queue/worker assertions fail before implementation.
- [x] Implement atomic job receipts, one-worker lock, FFmpeg execution, validation by control decode/metadata output, poster generation, safe public status and idempotent retry.
- [x] Run the real integration test and verify success and failure/retry branches.
- [x] Commit the queue/worker slice.

### Task 3: Upload and status API adapters

**Files:**
- Create: `lib/story-media-upload.cjs`
- Create: `app/api/admin/story-media/jobs/[id]/route.ts`
- Modify: `app/api/admin/upload/route.ts`
- Modify: `app/api/admin/upload/chunk/route.ts`
- Modify: `lib/admin-upload-client.ts`
- Modify: `scripts/test-story-media-pipeline.cjs`

**Interfaces:**
- Consumes: `createStoryMediaJob`, `getStoryMediaJob`, `retryStoryMediaJob`.
- Produces: upload payload `{ url?; jobId?; status?; originalUrl?; posterUrl? }`, `uploadStoryMediaFile(file, options)` and retry polling.

- [x] Add a failing contract test for protected job payloads, polling terminal states and the rule that a heavy upload never returns its original URL as ready playback.
- [x] Run the test and verify failure on the old upload response.
- [x] Route story videos through the queue while leaving images and non-story uploads unchanged; add protected GET/POST status handling.
- [x] Update the client to poll jobs, expose progress states and return poster metadata while preserving the existing string API for other media screens.
- [x] Run focused media and TypeScript checks, then commit.

### Task 4: Existing-story canary and rollback

**Files:**
- Create: `app/api/admin/stories/[id]/media/route.ts`
- Modify: `lib/story-media-worker.cjs`
- Modify: `lib/story-media-jobs.cjs`
- Modify: `scripts/test-story-media-pipeline.cjs`

**Interfaces:**
- Consumes: current StoreStory id, tenant and local `mediaUrl`.
- Produces: conditional publish receipt and `rollbackStoryMediaJob(id, tenantId)`.

- [x] Add a failing test using a temporary Prisma adapter contract: publish only when the current URL still matches, preserve every unrelated field, and rollback only from the generated URL to the recorded original.
- [x] Run and verify the conditional publish assertions fail.
- [x] Implement manager-confirmed optimize/rollback API and worker publication using `updateMany` guards and rollback receipt before mutation.
- [x] Run the contract and failure-conflict tests, then commit.

### Task 5: Manager experience and honest copy

**Files:**
- Modify: `app/admin/stories/page.tsx`
- Modify: `lib/admin-upload-client.ts`
- Modify: `scripts/validate-store-stories.js`

**Interfaces:**
- Consumes: upload/reprocess state and job status.
- Produces: visible upload, processing, ready, failed, retry, optimize and rollback controls.

- [x] Add failing module gates for the approved human texts and recovery controls.
- [x] Run `npm run stories:check` and verify the new gates fail.
- [x] Implement the smallest UI changes, disable save during unfinished processing, apply auto-poster only when empty, and distinguish recorded LIVE from future direct streaming.
- [x] Run `npm run stories:check`, TypeScript and text checks; commit.

### Task 6: Passport, registry and release protection

**Files:**
- Create: `docs/evidence/stories/MODULE-PASSPORT-0.10.0.md`
- Modify: `lib/aray-module-registry.ts`
- Modify: `scripts/validate-store-stories.js`
- Modify: `scripts/deploy-preflight.js`
- Modify: `.github/workflows/deploy.yml` only if the artifact check proves bundled binaries are otherwise omitted.

**Interfaces:**
- Produces: versioned Module DNA, owners, dependencies, checks, migration/rollback and Drift Lock.

- [x] Add failing registry/release gates for version 0.10.0, media check, worker files, bundled encoder presence and rollback contract.
- [x] Run the gates and verify failure before passport/registry changes.
- [x] Write the passport, update the existing registry entry and ensure release artifact contains both binaries and worker files.
- [x] Run stories, modules, protection and release checks; commit.

### Task 7: Local browser and production candidate verification

**Files:**
- Modify: `scripts/validate-browser-stories-responsive.js` only for observable new behavior.
- Create: `docs/evidence/stories/RELEASE-0.10.0-LOCAL-EVIDENCE.md`

**Interfaces:**
- Produces: hash-pinned desktop/tablet/mobile, console/network, upload/recovery and playback evidence.

- [ ] Run the real encoder test, TypeScript, stories, text, design, modules, protection and release gates.
- [ ] Run a clean production build without `db push` or `data-migrate`.
- [ ] Start the isolated PiloRus candidate and upload a generated MOV through the authenticated admin flow.
- [ ] Verify queued/processing/ready, poster, playback, no heavy closed-widget GET, error/retry, desktop/tablet/mobile and unchanged story relations/CTA.
- [ ] Record exact hashes and evidence, then commit the local candidate.

### Task 8: Protected deploy, one canary and promotion

**Files:**
- Create: `docs/evidence/stories/LIVE-RELEASE-0.10.0-CANARY.md`
- Update: `docs/evidence/stories/MODULE-PASSPORT-0.10.0.md`

**Interfaces:**
- Consumes: clean candidate commit, explicit approval already recorded, live rollback receipt.
- Produces: one live optimized story and an honest `RC`, `NOT READY` or `BLOCKED` verdict.

- [ ] Push the clean tested commit through the declared GitHub production workflow; do not bypass checks.
- [ ] Verify health, homepage, catalog, `/stories` and authenticated `/admin/stories` before data mutation.
- [ ] Start optimization for exactly one heavy story and wait for `READY`; record old/new URL, sizes, codecs and rollback receipt.
- [ ] Verify live desktop/tablet/mobile playback under constrained network, HTTP 206, console/network, views, CTA, relations and second-story non-mutation.
- [ ] Exercise rollback, verify the original plays, then reapply the same ready web-copy only if rollback proof is green.
- [ ] Promote to `0.10.0-rc.1`; promote to `1.0.0` only after the second heavy story and a future manager upload pass the same matrix.
