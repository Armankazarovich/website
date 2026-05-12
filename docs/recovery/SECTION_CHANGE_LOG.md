# Section Change Log

This log records section snapshots and Arman's approval state.

Rules:

- Every existing section gets a snapshot before a meaningful edit.
- Every changed section is `DRAFT` until Arman explicitly accepts it.
- Restores must say which snapshot or git object was used.

## 2026-05-09 - Promotion Restore

- Section: `/admin/promotion`
- Files:
  - `app/admin/promotion/page.tsx`
  - `docs/recovery/promotion-page-before-direct-restore-2026-05-09.tsx`
  - `docs/recovery/promotion-page-direct-2026-05-08.tsx`
- Status: `RESTORED / DRAFT`
- Reason: Arman rejected the toy/broken Yandex Direct rewrite and requested the 2026-05-07 version.
- Restored base: the pre-Direct 531-line page that matches `HEAD:app/admin/promotion/page.tsx` and `docs/recovery/promotion-page-before-direct-restore-2026-05-09.tsx`.
- Compatibility edits kept: visible checkmark symbols were replaced with text badges, and the old root `max-w-5xl` wrapper was replaced with `admin-page-frame admin-page-frame-readable` so current quality gates pass.
- Checks:
  - `npm run quality` passed.
  - `node scripts/audit-admin-routes.js` passed.
- Approval: waiting for Arman review.

## 2026-05-09T03:20:14.170Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-062014-admin-promotion-restored-2026-05-07-baseline.tsx`
- Reason: restored-2026-05-07-baseline
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:21:46.840Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-062146-admin-promotion-before-return-direct-ads-page.tsx`
- Reason: before-return-direct-ads-page
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:26:49.084Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-062649-admin-promotion-before-add-advertising-module.tsx`
- Reason: before-add-advertising-module
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Advertising Module Added

- Section: `/admin/promotion`
- File changed: `app/admin/promotion/page.tsx`
- Snapshot before edit: `docs/recovery/sections/20260509-062649-admin-promotion-before-add-advertising-module.tsx`
- Status: `DRAFT`
- Change: added an in-page advertising module to the existing skeleton design. It uses `/api/admin/direct/draft` to show campaign settings, ad groups, keywords, first ad text, negative words copy, launch checklist and an ARAY review prompt.
- Data sources: product catalog, categories, variants/prices, site settings, Yandex Direct status.
- Safety: no fake performance numbers and no paid launch without owner confirmation.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run quality` passed.
  - `node scripts/audit-admin-routes.js` passed.
- Approval: waiting for Arman review.

## 2026-05-09T03:31:17.073Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-063117-admin-promotion-before-fluid-layout-pass.tsx`
- Reason: before-fluid-layout-pass
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Fluid Layout Pass

- Section: `/admin/promotion`
- File changed: `app/admin/promotion/page.tsx`
- Snapshot before edit: `docs/recovery/sections/20260509-063117-admin-promotion-before-fluid-layout-pass.tsx`
- Status: `DRAFT`
- Change: switched the restored promotion page from a narrow readable frame to the project fluid admin frame, widened marketplace/stat grids, and made the advertising module use more desktop width while still stacking on smaller screens.
- Checks:
  - `npm run quality` passed.
  - `node scripts/audit-admin-routes.js` passed.
- Approval: waiting for Arman review.

## 2026-05-09T03:37:08.041Z - yandex-direct-api

- Section: `yandex-direct-api`
- Source: `lib/yandex-direct.ts`
- Snapshot: `docs/recovery/sections/20260509-063708-yandex-direct-api-before-direct-one-click-export.ts`
- Reason: before-direct-one-click-export
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:37:08.041Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-063708-admin-promotion-before-direct-one-click-export-ui.tsx`
- Reason: before-direct-one-click-export-ui
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:37:08.044Z - direct-draft-builder

- Section: `direct-draft-builder`
- Source: `lib/direct-campaign-draft.ts`
- Snapshot: `docs/recovery/sections/20260509-063708-direct-draft-builder-before-direct-one-click-export.ts`
- Reason: before-direct-one-click-export
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Ads Hub / Tenant-Aware Direct Export

- Section: `/admin/promotion`
- Files changed:
  - `app/admin/promotion/page.tsx`
  - `app/api/admin/direct/draft/route.ts`
  - `app/api/admin/direct/status/route.ts`
  - `app/api/admin/direct/export/route.ts`
  - `lib/direct-campaign-draft.ts`
  - `lib/yandex-direct.ts`
  - `lib/yandex-direct-export.ts`
  - `docs/SECTION_CHANGE_PROTOCOL.md`
  - `docs/ARAY_PRODUCT_BRAIN_INDEX_2026-05-07.md`
  - `docs/ARAY_CONTINUE_PROMPT.md`
- Snapshots before edit:
  - `docs/recovery/sections/20260509-063708-admin-promotion-before-direct-one-click-export-ui.tsx`
  - `docs/recovery/sections/20260509-063708-yandex-direct-api-before-direct-one-click-export.ts`
  - `docs/recovery/sections/20260509-063708-direct-draft-builder-before-direct-one-click-export.ts`
- Status: `DRAFT`
- Change: promotion became an Ads Hub direction instead of a Direct-only helper. The page now shows channels for Yandex Direct, VK Ads/target and Google Ads. Yandex Direct is the first real API channel: it can create a campaign, ad groups, text ads and keywords from the current tenant catalog.
- Tenant rule: added Constructor / Tenant Context First to project docs. Promotion data now uses current `tenantId`, tenant site settings, catalog, categories and tenant-specific Direct token/settings where available.
- Direct export defaults:
  - Draft generation: up to 14 groups, 2 ads per group, 18 keywords per group.
  - One-click export: up to 8 groups, 2 ads per group, 12 keywords per group.
  - Default maximum per export: 8 groups, 16 ads, 96 keywords.
  - Settings override: `yandex_direct_export_max_groups`, `yandex_direct_export_max_ads`, `yandex_direct_export_max_keywords`.
- Safety: export creates Direct objects in `SERVING_OFF` mode. It does not submit ads to moderation and does not launch paid impressions.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run section-approval:check` passed.
  - `npm run quality` passed.
  - `node scripts/audit-admin-routes.js` passed.
- Approval: waiting for Arman review.

## 2026-05-09T03:54:52.591Z - direct-draft-builder

- Section: `direct-draft-builder`
- Source: `lib/direct-campaign-draft.ts`
- Snapshot: `docs/recovery/sections/20260509-065452-direct-draft-builder-before-ads-generator-options.ts`
- Reason: before-ads-generator-options
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:54:52.592Z - direct-export-api

- Section: `direct-export-api`
- Source: `app/api/admin/direct/export/route.ts`
- Snapshot: `docs/recovery/sections/20260509-065452-direct-export-api-before-ads-generator-options.ts`
- Reason: before-ads-generator-options
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T03:54:52.591Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-065452-admin-promotion-before-ads-generator-wizard.tsx`
- Reason: before-ads-generator-wizard
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Ads Generator Wizard

- Section: `/admin/promotion`
- Files changed:
  - `app/admin/promotion/page.tsx`
  - `app/api/admin/direct/draft/route.ts`
  - `app/api/admin/direct/export/route.ts`
  - `lib/direct-campaign-draft.ts`
  - `lib/yandex-direct-export.ts`
  - `docs/recovery/SECTION_CHANGE_LOG.md`
  - `docs/ARAY_CONTINUE_PROMPT.md`
  - `docs/aray-admin-live-checklist-2026-05-02.md`
- Snapshots before edit:
  - `docs/recovery/sections/20260509-065452-admin-promotion-before-ads-generator-wizard.tsx`
  - `docs/recovery/sections/20260509-065452-direct-draft-builder-before-ads-generator-options.ts`
  - `docs/recovery/sections/20260509-065452-direct-export-api-before-ads-generator-options.ts`
- Status: `DRAFT`
- Change: added the first real advertising generator layer. The owner can choose campaign grouping by categories or by products, set max groups, ads per group, keywords per group, first-test daily budget hint, schedule and whether product photos should be included in the draft.
- API: `/api/admin/direct/draft` now accepts generation options through query/body; `/api/admin/direct/export` passes the same options into one-click Direct export.
- Direct draft behavior:
  - Category mode: groups are created from catalog categories.
  - Product mode: groups are created per product, with product links, product/category keywords and product images where available.
  - Region keywords are derived from the current tenant/business region instead of hard-coded Moscow.
  - Export limits follow UI options first, then tenant settings fallbacks.
- Safety: still draft-first. Direct export creates objects without launching paid impressions; budget/schedule are hints for owner review until a separate confirmed launch flow exists.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run quality` passed.
  - `node scripts/audit-admin-routes.js` passed.
- Approval: waiting for Arman review.

## 2026-05-09T04:06:28.127Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-070628-admin-promotion-before-ads-advanced-controls.tsx`
- Reason: before-ads-advanced-controls
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:06:28.711Z - direct-draft-builder

- Section: `direct-draft-builder`
- Source: `lib/direct-campaign-draft.ts`
- Snapshot: `docs/recovery/sections/20260509-070628-direct-draft-builder-before-ads-advanced-options.ts`
- Reason: before-ads-advanced-options
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:06:29.365Z - direct-draft-api

- Section: `direct-draft-api`
- Source: `app/api/admin/direct/draft/route.ts`
- Snapshot: `docs/recovery/sections/20260509-070629-direct-draft-api-before-ads-advanced-options.ts`
- Reason: before-ads-advanced-options
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:06:29.905Z - direct-export-api

- Section: `direct-export-api`
- Source: `app/api/admin/direct/export/route.ts`
- Snapshot: `docs/recovery/sections/20260509-070629-direct-export-api-before-ads-advanced-options.ts`
- Reason: before-ads-advanced-options
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:08:23.377Z - direct-status-api

- Section: `direct-status-api`
- Source: `app/api/admin/direct/status/route.ts`
- Snapshot: `docs/recovery/sections/20260509-070823-direct-status-api-before-direct-oauth-connector-settings.ts`
- Reason: before-direct-oauth-connector-settings
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:15:17.741Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-071517-admin-promotion-before-ads-wizard-simplification.tsx`
- Reason: before-ads-wizard-simplification
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:15:18.281Z - direct-draft-builder

- Section: `direct-draft-builder`
- Source: `lib/direct-campaign-draft.ts`
- Snapshot: `docs/recovery/sections/20260509-071518-direct-draft-builder-before-professional-sitelinks.ts`
- Reason: before-professional-sitelinks
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:17:50.855Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-071750-admin-promotion-before-feed-filters.tsx`
- Reason: before-feed-filters
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:17:51.396Z - direct-draft-builder

- Section: `direct-draft-builder`
- Source: `lib/direct-campaign-draft.ts`
- Snapshot: `docs/recovery/sections/20260509-071751-direct-draft-builder-before-feed-filters.ts`
- Reason: before-feed-filters
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:21:46.585Z - yandex-direct-api

- Section: `yandex-direct-api`
- Source: `lib/yandex-direct.ts`
- Snapshot: `docs/recovery/sections/20260509-072146-yandex-direct-api-before-encrypted-direct-oauth-token.ts`
- Reason: before-encrypted-direct-oauth-token
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Ads Professional Workflow Draft

- Section: `/admin/promotion`
- Files changed:
  - `app/admin/promotion/page.tsx`
  - `app/api/admin/direct/oauth/start/route.ts`
  - `app/api/admin/direct/oauth/callback/route.ts`
  - `lib/direct-campaign-draft.ts`
  - `lib/yandex-direct.ts`
  - `lib/yandex-direct-export.ts`
  - `lib/secure-settings.ts`
  - `docs/ARAY_CONTINUE_PROMPT.md`
  - `docs/recovery/SECTION_CHANGE_LOG.md`
- Status: `DRAFT`
- Change: the flat ads control panel was reshaped into a step-based campaign master: campaign type/placement, category + feed filters, ad/offers/sitelinks, audience/budget/schedule. Advanced settings are hidden in collapsible blocks.
- Feed/filter layer: draft generation can filter products by selected categories, feed source, in-stock, has-price and price range.
- Sitelinks: draft supports professional sitelinks with title, URL and description; Direct export creates sitelink sets and attaches them to text ads.
- Direct OAuth: added start/callback routes for owner-account connection. ARAY must not ask for Yandex password; owner/directologist connects via Yandex OAuth. Tokens are stored encrypted with `lib/secure-settings.ts`.
- Ads Pro roadmap: directologists need a separate pro layer with generation history, change log, Direct/Metrika metrics and role-based client access. Current analytics UI is honest placeholder state, not invented performance data.
- UX adjustment after Arman review: Ads Hub must start from one clear action, "Собрать РК с ARAY". The detailed wizard opens only after that; the value is ARAY guidance on top of Direct data, not copying the Yandex Direct UI.
- Approval: waiting for Arman review.

## 2026-05-09T04:25:54.925Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-072554-admin-promotion-before-one-button-aray-ads-ux.tsx`
- Reason: before-one-button-aray-ads-ux
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T04:32:54.446Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-073254-admin-promotion-before-remove-raw-direct-builder-ui.tsx`
- Reason: before-remove-raw-direct-builder-ui
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Raw Builder Hidden / ARAY Package UX

- Section: `/admin/promotion`
- File changed: `app/admin/promotion/page.tsx`
- Status: `DRAFT`
- Change: removed the visible raw Direct-builder feeling from the main UI. Channel cards, manual copy buttons, raw wizard controls and raw group cards are hidden from the primary screen.
- Current UX: one primary action "Собрать РК с ARAY"; after click the user sees a ready campaign package with counts, feed, campaign type, safety state and the only meaningful actions: rebuild, connect Direct, or export to Direct.
- Reason: Arman rejected the previous UI as useless clutter. The section must be a working ARAY-guided tool, not a place where the owner guesses what to copy or where to paste.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run quality` passed.
- Approval: waiting for Arman review.

## 2026-05-09T04:44:17.333Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-074417-admin-promotion-before-direct-one-quiz-export-flow.tsx`
- Reason: before-direct-one-quiz-export-flow
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Direct One-Quiz Export Flow

- Section: `/admin/promotion`
- Files changed:
  - `app/admin/promotion/page.tsx`
  - `app/api/admin/direct/export/route.ts`
  - `lib/yandex-direct-export.ts`
- Status: `DRAFT`
- Change: replaced the visible ad-builder clutter with one ARAY quiz: collect catalog/feed settings, choose campaign type and placement, select what to export, confirm owner consent, then connect/export to Yandex Direct.
- Export parts are now real API options, not decorative UI: campaign/groups are always created as the safe shell, while ads, keywords and sitelinks can be included or skipped.
- User-facing Direct instruction is short and explicit: ARAY never asks for a Yandex password, OAuth happens in Yandex, and budget is not started automatically.
- The visible history/analytics block is honest: it shows connected Direct campaign count and latest export result, but expenses/clicks/impressions wait for real Direct Reports API integration.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run quality` passed.
  - Browser smoke check passed on `/admin/promotion`: quiz opens, owner-confirm checkbox enables export, no console errors.
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Restored After Over-Simplification

- Section: `/admin/promotion`
- Restored file: `app/admin/promotion/page.tsx`
- Restored from snapshot: `docs/recovery/sections/20260509-080139-admin-promotion-before-simplify-to-yandex-feed-and-direct-only.tsx`
- Safety snapshot before restore: `docs/recovery/sections/20260509-080418-admin-promotion-before-restore-from-over-simplified-feed-only-page.tsx`
- Status: `DRAFT`
- Reason: the feed-only/Direct-only page removed too much value and upset Arman. The section was restored to the richer promotion page state. Future edits must not delete or heavily simplify this section unless Arman explicitly confirms deletion after seeing the visual result.
- Checks:
  - `npx tsc --noEmit --pretty false` passed after restore.
  - Browser reload on `/admin/promotion` shows the restored page with marketplace cards, stats, ARAY promotion block, weekly plan and SEO state.
- Approval: waiting for Arman review.

## 2026-05-09T05:00:35.995Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-080035-admin-promotion-before-remove-required-category-product-choice.tsx`
- Reason: before-remove-required-category-product-choice
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:01:39.092Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-080139-admin-promotion-before-simplify-to-yandex-feed-and-direct-only.tsx`
- Reason: before-simplify-to-yandex-feed-and-direct-only
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:04:18.534Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-080418-admin-promotion-before-restore-from-over-simplified-feed-only-page.tsx`
- Reason: before-restore-from-over-simplified-feed-only-page
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:14:40.802Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-081440-admin-promotion-before-layered-aray-ads-owner-pro-flow.tsx`
- Reason: before-layered-aray-ads-owner-pro-flow
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09 - Promotion Layered ARAY Ads Owner / Pro Flow

- Section: `/admin/promotion`
- File changed: `app/admin/promotion/page.tsx`
- Status: `DRAFT`
- Change: clarified the professional product model without deleting the existing section. The visible owner layer now explains the safe flow: check feed/prices/links, build a draft, connect Direct without password, then track real results.
- ARAY value is now explicit in the UI: budget guards, no automatic spend, no mixed campaign logic without review, no products without price/stock by default, and no invented analytics.
- Directologist controls are labeled as `Direct Pro` and stay behind a collapsible advanced section.
- Added an in-page explanation of what each layer is for: feed, Direct draft, Direct Pro, and analytics.
- Checks:
  - `npx tsc --noEmit --pretty false` passed.
  - `npm run quality` passed.
  - Browser smoke check passed on `/admin/promotion`: `Начать с ARAY` opens the layered flow, Direct export stays disabled until confirmation.
- Approval: waiting for Arman review.

## 2026-05-09T05:26:22.816Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-082622-admin-promotion-before-owner-readable-aray-ads-flow.tsx`
- Reason: before-owner-readable-aray-ads-flow
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:28:38.693Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-082838-admin-promotion-before-owner-readable-design-polish.tsx`
- Reason: before-owner-readable-design-polish
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:34:42.646Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-083442-admin-promotion-owner-readability-layout-second-pass.tsx`
- Reason: owner-readability-layout-second-pass
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:36:56.559Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-083656-admin-promotion-owner-readability-layout-after-main-order.tsx`
- Reason: owner-readability-layout-after-main-order
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T05:58:34.915Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-085834-admin-promotion-direct-pro-category-product-preview-selector.tsx`
- Reason: direct-pro-category-product-preview-selector
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:04:05.800Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-090405-admin-promotion-direct-public-domain-ui-before-deploy.tsx`
- Reason: direct-public-domain-ui-before-deploy
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:09:38.578Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-090938-admin-promotion-direct-relevant-links-before.tsx`
- Reason: direct-relevant-links-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:26:55.199Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-092655-admin-promotion-direct-selection-controls-before.tsx`
- Reason: direct-selection-controls-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:29:35.558Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-092935-admin-promotion-direct-selection-popup-before.tsx`
- Reason: direct-selection-popup-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:45:28.892Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-094528-admin-promotion-direct-product-mode-selection-before.tsx`
- Reason: direct-product-mode-selection-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T06:59:32.104Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-095932-admin-promotion-direct-launch-faq-before.tsx`
- Reason: direct-launch-faq-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T07:00:47.360Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-100047-admin-promotion-direct-left-space-faq-flow-before.tsx`
- Reason: direct-left-space-faq-flow-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T07:01:53.013Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-100153-admin-promotion-direct-pro-modal-before.tsx`
- Reason: direct-pro-modal-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T07:05:32.490Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-100532-admin-promotion-direct-product-counts-faq-right-before.tsx`
- Reason: direct-product-counts-faq-right-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T07:27:53.989Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-102753-admin-promotion-direct-right-popups-faq-offers-before.tsx`
- Reason: direct-right-popups-faq-offers-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-09T07:59:19.072Z - admin-promotion

- Section: `admin-promotion`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260509-105919-admin-promotion-simplify-direct-popups-use-live-aray-chat-before.tsx`
- Reason: simplify-direct-popups-use-live-aray-chat-before
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:07:53.541Z - Ads Hub / Direct

- Section: `Ads Hub / Direct`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-090753-ads-hub-direct-direct-smoke-polish.tsx`
- Reason: direct-smoke-polish
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:14:05.461Z - Finance

- Section: `Finance`
- Source: `app/admin/finance/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-091405-finance-light-honest-finance-pass.tsx`
- Reason: light-honest-finance-pass
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:15:10.064Z - Ads Hub / Direct export result

- Section: `Ads Hub / Direct export result`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-091510-ads-hub-direct-export-result-direct-popup-blocked-result-link.tsx`
- Reason: direct-popup-blocked-result-link
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:27:12.109Z - ads-hub-direct

- Section: `ads-hub-direct`
- Source: `lib/yandex-direct-export.ts`
- Snapshot: `docs/recovery/sections/20260511-092712-ads-hub-direct-direct-autotargeting-exact-only-default.ts`
- Reason: direct-autotargeting-exact-only-default
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:38:03.349Z - ads-hub-direct

- Section: `ads-hub-direct`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-093803-ads-hub-direct-direct-metrika-readiness-assistant.tsx`
- Reason: direct-metrika-readiness-assistant
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:38:03.391Z - ads-hub-direct

- Section: `ads-hub-direct`
- Source: `app/api/admin/direct/draft/route.ts`
- Snapshot: `docs/recovery/sections/20260511-093803-ads-hub-direct-direct-metrika-readiness-payload.ts`
- Reason: direct-metrika-readiness-payload
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:51:27.899Z - ads-hub-direct

- Section: `ads-hub-direct`
- Source: `docs/ARAY_DIRECT_QUALITY_TODO_2026-05-11.md`
- Snapshot: `docs/recovery/sections/20260511-095127-ads-hub-direct-simplify-direct-metrika-and-seo-indexing-plan.md`
- Reason: simplify-direct-metrika-and-seo-indexing-plan
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:51:27.902Z - ads-hub-direct

- Section: `ads-hub-direct`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-095127-ads-hub-direct-simplify-direct-metrika-and-seo-indexing-layer.tsx`
- Reason: simplify-direct-metrika-and-seo-indexing-layer
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T06:59:01.972Z - ads-hub-metrika-friendly-navigator

- Section: `ads-hub-metrika-friendly-navigator`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-095901-ads-hub-metrika-friendly-navigator-simplify-aray-metrika-navigator-copy-for-owner-friendly-steps.tsx`
- Reason: simplify ARAY Metrika navigator copy for owner-friendly steps
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:01:32.442Z - promotion-seo-indexing-navigator

- Section: `promotion-seo-indexing-navigator`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-100132-promotion-seo-indexing-navigator-add-owner-friendly-seo-indexing-navigator-under-promotion.tsx`
- Reason: add owner-friendly SEO indexing navigator under promotion
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:08:18.119Z - cart-metrika-goals

- Section: `cart-metrika-goals`
- Source: `store/cart.ts`
- Snapshot: `docs/recovery/sections/20260511-100818-cart-metrika-goals-emit-aray-metrika-add-to-cart-goal.ts`
- Reason: emit ARAY Metrika add to cart goal
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:08:18.119Z - metrika-goal-events

- Section: `metrika-goal-events`
- Source: `components/analytics.tsx`
- Snapshot: `docs/recovery/sections/20260511-100818-metrika-goal-events-add-aray-metrika-reachgoal-event-bridge.tsx`
- Reason: add ARAY Metrika reachGoal event bridge
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:08:41.470Z - checkout-metrika-goals

- Section: `checkout-metrika-goals`
- Source: `app/(store)/checkout/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-100841-checkout-metrika-goals-emit-aray-metrika-checkout-and-order-goals.tsx`
- Reason: emit ARAY Metrika checkout and order goals
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:26:43.318Z - finance-analytics-control

- Section: `finance-analytics-control`
- Source: `app/admin/finance/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-102643-finance-analytics-control-finance-direct-spend-bridge.tsx`
- Reason: finance-direct-spend-bridge
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:26:43.357Z - finance-api-marketing-spend

- Section: `finance-api-marketing-spend`
- Source: `app/api/admin/finance/route.ts`
- Snapshot: `docs/recovery/sections/20260511-102643-finance-api-marketing-spend-finance-direct-spend-bridge.ts`
- Reason: finance-direct-spend-bridge
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:26:43.367Z - analytics-top-products-revenue

- Section: `analytics-top-products-revenue`
- Source: `app/api/admin/analytics/route.ts`
- Snapshot: `docs/recovery/sections/20260511-102643-analytics-top-products-revenue-fix-product-revenue-quantity.ts`
- Reason: fix-product-revenue-quantity
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:26:43.407Z - yandex-direct-reports-spend

- Section: `yandex-direct-reports-spend`
- Source: `lib/yandex-direct.ts`
- Snapshot: `docs/recovery/sections/20260511-102643-yandex-direct-reports-spend-finance-direct-spend-bridge.ts`
- Reason: finance-direct-spend-bridge
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T07:47:25.956Z - promotion-metrika-owner-quick-setup

- Section: `promotion-metrika-owner-quick-setup`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-104725-promotion-metrika-owner-quick-setup-owner-counter-goals-quick-flow.tsx`
- Reason: owner-counter-goals-quick-flow
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:00:51.786Z - aray-prompt-event-api

- Section: `aray-prompt-event-api`
- Source: `components/store/aray-events.ts`
- Snapshot: `docs/recovery/sections/20260511-110051-aray-prompt-event-api-hidden-context-action-buttons.ts`
- Reason: hidden-context-action-buttons
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:00:51.789Z - aray-short-command-actions

- Section: `aray-short-command-actions`
- Source: `components/store/aray-widget.tsx`
- Snapshot: `docs/recovery/sections/20260511-110051-aray-short-command-actions-hidden-context-action-buttons.tsx`
- Reason: hidden-context-action-buttons
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:00:51.858Z - aray-pending-prompt-payload

- Section: `aray-pending-prompt-payload`
- Source: `components/store/aray-global-assistant.tsx`
- Snapshot: `docs/recovery/sections/20260511-110051-aray-pending-prompt-payload-hidden-context-action-buttons.tsx`
- Reason: hidden-context-action-buttons
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:05:31.354Z - promotion-aray-simple-metrika-flow

- Section: `promotion-aray-simple-metrika-flow`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-110531-promotion-aray-simple-metrika-flow-hidden-context-buttons-built-in-browser.tsx`
- Reason: hidden-context-buttons-built-in-browser
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:14:43.372Z - aray-browser-external-fallback

- Section: `aray-browser-external-fallback`
- Source: `components/store/aray-browser.tsx`
- Snapshot: `docs/recovery/sections/20260511-111443-aray-browser-external-fallback-yandex-frame-blocked-open-tab-fallback.tsx`
- Reason: yandex-frame-blocked-open-tab-fallback
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:16:52.541Z - aray-quick-actions-only

- Section: `aray-quick-actions-only`
- Source: `components/store/aray-widget.tsx`
- Snapshot: `docs/recovery/sections/20260511-111652-aray-quick-actions-only-remove-lower-quick-jump-use-message-actions.tsx`
- Reason: remove-lower-quick-jump-use-message-actions
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T08:22:08.777Z - aray-contextual-quick-actions

- Section: `aray-contextual-quick-actions`
- Source: `components/admin/admin-aray-navigation.ts`
- Snapshot: `docs/recovery/sections/20260511-112208-aray-contextual-quick-actions-only-show-relevant-dynamic-actions.ts`
- Reason: only-show-relevant-dynamic-actions
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:12:28.542Z - unified-login-entry

- Section: `unified-login-entry`
- Source: `app/(auth)/login/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-121228-unified-login-entry-yandex-google-role-intent-entry.tsx`
- Reason: yandex-google-role-intent-entry
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:12:28.802Z - unified-registration-entry

- Section: `unified-registration-entry`
- Source: `app/(auth)/register/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-121228-unified-registration-entry-yandex-google-role-intent-entry.tsx`
- Reason: yandex-google-role-intent-entry
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:24:07.899Z - aray-widget-navigation-replies

- Section: `aray-widget-navigation-replies`
- Source: `components/store/aray-widget.tsx`
- Snapshot: `docs/recovery/sections/20260511-122407-aray-widget-navigation-replies-aray-human-short-replies-safe-metrika-actions.tsx`
- Reason: aray-human-short-replies-safe-metrika-actions
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:24:08.009Z - aray-agent-navigation-tone

- Section: `aray-agent-navigation-tone`
- Source: `lib/aray-agent.ts`
- Snapshot: `docs/recovery/sections/20260511-122408-aray-agent-navigation-tone-remove-rude-one-word-navigation-law.ts`
- Reason: remove-rude-one-word-navigation-law
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:24:08.823Z - aray-ai-chat-navigation-tool-messages

- Section: `aray-ai-chat-navigation-tool-messages`
- Source: `app/api/ai/chat/route.ts`
- Snapshot: `docs/recovery/sections/20260511-122408-aray-ai-chat-navigation-tool-messages-replace-one-word-tool-results.ts`
- Reason: replace-one-word-tool-results
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:24:08.896Z - admin-aray-quick-actions

- Section: `admin-aray-quick-actions`
- Source: `components/admin/admin-aray-navigation.ts`
- Snapshot: `docs/recovery/sections/20260511-122408-admin-aray-quick-actions-remove-confusing-admin-bottom-chips.ts`
- Reason: remove-confusing-admin-bottom-chips
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:56:29.737Z - admin-aray-navigation-map

- Section: `admin-aray-navigation-map`
- Source: `components/admin/admin-aray-navigation.ts`
- Snapshot: `docs/recovery/sections/20260511-125629-admin-aray-navigation-map-include-all-aray-admin-routes-and-aliases.ts`
- Reason: include-all-aray-admin-routes-and-aliases
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:56:31.469Z - aray-widget-instant-admin-router

- Section: `aray-widget-instant-admin-router`
- Source: `components/store/aray-widget.tsx`
- Snapshot: `docs/recovery/sections/20260511-125631-aray-widget-instant-admin-router-robust-admin-section-matching.tsx`
- Reason: robust-admin-section-matching
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T09:56:31.590Z - aray-live-checklist-navigation-chain

- Section: `aray-live-checklist-navigation-chain`
- Source: `docs/aray-admin-live-checklist-2026-05-02.md`
- Snapshot: `docs/recovery/sections/20260511-125631-aray-live-checklist-navigation-chain-sync-unified-aray-navigation-law.md`
- Reason: sync-unified-aray-navigation-law
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:12:48.779Z - analytics-dashboard

- Section: `analytics-dashboard`
- Source: `app/admin/analytics/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-131248-analytics-dashboard-sync-direct-metrika-finance-analytics.tsx`
- Reason: sync-direct-metrika-finance-analytics
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:12:48.951Z - analytics-api

- Section: `analytics-api`
- Source: `app/api/admin/analytics/route.ts`
- Snapshot: `docs/recovery/sections/20260511-131248-analytics-api-sync-direct-metrika-finance-analytics.ts`
- Reason: sync-direct-metrika-finance-analytics
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:12:48.951Z - analytics-finance-checklist

- Section: `analytics-finance-checklist`
- Source: `docs/aray-admin-live-checklist-2026-05-02.md`
- Snapshot: `docs/recovery/sections/20260511-131248-analytics-finance-checklist-sync-direct-metrika-finance-analytics.md`
- Reason: sync-direct-metrika-finance-analytics
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:35:41.906Z - aray-connectors-one-click-bundles

- Section: `aray-connectors-one-click-bundles`
- Source: `app/admin/aray/connectors/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-133541-aray-connectors-one-click-bundles-simplify-connector-center-one-click-bundles.tsx`
- Reason: simplify-connector-center-one-click-bundles
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:36:22.321Z - aray-connectors-api-bundles

- Section: `aray-connectors-api-bundles`
- Source: `app/api/admin/aray/connectors/route.ts`
- Snapshot: `docs/recovery/sections/20260511-133622-aray-connectors-api-bundles-expose-one-click-bundles.ts`
- Reason: expose-one-click-bundles
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:36:57.341Z - provider-matrix-bundles

- Section: `provider-matrix-bundles`
- Source: `lib/aray-provider-matrix.ts`
- Snapshot: `docs/recovery/sections/20260511-133657-provider-matrix-bundles-add-one-click-bundle-model.ts`
- Reason: add-one-click-bundle-model
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T10:55:03.182Z - aray-connectors-yandex-one-click-panel

- Section: `aray-connectors-yandex-one-click-panel`
- Source: `app/admin/aray/connectors/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-135503-aray-connectors-yandex-one-click-panel-wire-yandex-growth-automation.tsx`
- Reason: wire-yandex-growth-automation
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T12:43:29.179Z - analytics-metrika-value-panel

- Section: `analytics-metrika-value-panel`
- Source: `app/admin/analytics/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-154329-analytics-metrika-value-panel-make-metrika-value-clear.tsx`
- Reason: make-metrika-value-clear
- Status: `DRAFT`
- Approval: waiting for Arman review.

## 2026-05-11T13:03:03.869Z - direct-safe-launch-passport

- Section: `direct-safe-launch-passport`
- Source: `app/admin/promotion/page.tsx`
- Snapshot: `docs/recovery/sections/20260511-160303-direct-safe-launch-passport-direct-safe-defaults-and-passport.tsx`
- Reason: direct-safe-defaults-and-passport
- Status: `DRAFT`
- Approval: waiting for Arman review.
