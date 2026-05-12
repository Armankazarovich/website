# Section Change Protocol

Date: 2026-05-09

This law protects finished PiloRus / ARAY sections from accidental redesigns, broken rewrites and lost working pages.

## Main Rule

Any existing user-facing section must be treated as a working product, not as a disposable draft.

Before changing a section:

1. Name the exact section and files that will be touched.
2. Explain the goal in normal language.
3. Create a snapshot with `npm run section:snapshot -- --file <path> --section <name> --reason <short-reason>`.
4. Keep the snapshot in `docs/recovery/sections/`.

After changing a section:

1. Run relevant checks.
2. Report what changed and what was intentionally left unchanged.
3. Show where the previous snapshot is.
4. Ask Arman to accept or reject the section.
5. Do not treat the section as finished, deploy-ready or a base for the next redesign until Arman says it is accepted.

## Approval States

- `DRAFT`: code exists locally, not approved by Arman yet.
- `NEEDS_FIX`: Arman rejected or found a problem.
- `APPROVED`: Arman explicitly accepted the section after seeing the result.
- `RESTORED`: section was rolled back or restored from a snapshot.

## Hard Boundaries

- Do not replace a finished section with a new concept without a snapshot.
- Do not call a provider/demo module "ready" if it is only a draft or needs external setup.
- Do not invent analytics, demand, advertising performance or provider data.
- Do not remove a working section just because a new module idea sounds better.
- Do not continue polishing another section if the current changed section is waiting for Arman's review.

## Constructor / Tenant Context First

Every admin section that can belong to a business must adapt to the current tenant/site context. The admin shell is shared, but business data is not.

Before changing or adding a section, check:

1. Does the section read the current `tenantId` or site context?
2. Are products, categories, orders, settings, integrations and API tokens filtered by that tenant?
3. Are labels, brand names, regions, catalogs, currencies, links and empty states derived from the current business settings?
4. Is any PiloRus-specific text only a fallback/demo value, not the main logic?
5. Does an external action such as ads, payments, publication or messages use the current business account and require confirmation where money/public data is involved?

If a section is still hard-coded to PiloRus, mark it as a migration target instead of treating it as constructor-ready.

## Recovery Log

All section-level snapshots and approval decisions belong in:

- `docs/recovery/SECTION_CHANGE_LOG.md`
- `docs/recovery/sections/`

If a future chat is unsure which version is correct, it must first inspect the log and snapshots before editing.
