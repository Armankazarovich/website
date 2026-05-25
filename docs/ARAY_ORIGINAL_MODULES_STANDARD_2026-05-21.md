# ARAY Original Modules Standard

Date: 2026-05-21

This is the internal product standard for original ARAY / PiloRus modules.

It is not legal advice and it does not replace trademark, copyright, patent, contract, or attorney review. Its job is practical: keep authorship, product intent, implementation history, allowed use, and copy policy clear from the first version of every serious function.

## Purpose

ARAY must be built honestly and traceably.

Every original module should answer:

- what problem it solves;
- what makes it an ARAY product idea, not a random page;
- who owns the product meaning;
- what files, screenshots, checks, and decisions prove the history;
- how clients may use it;
- what may not be copied without permission;
- which version is live, beta, or draft.

## Original Module Definition

An ARAY original module is a reusable product capability that has:

- a clear business purpose;
- a named module or feature identity;
- a stable UI/UX contract;
- shared ARAY platform behavior: navigation, popup law, media law, roles, evidence, and quality gates;
- a module passport;
- an evidence log entry.

Examples:

- Online Seller / Stories Live Commerce;
- Terminal and smart mobile cart;
- ARAY assistant tasks;
- Direct / Metrics launch flow;
- Media Library;
- Services editor;
- CRM leads and customer relations;
- App Identity / PWA System.

## Ownership Language

Use calm and accurate language.

Allowed:

- "ARAY original module";
- "internal product standard";
- "authorship and implementation history";
- "allowed use and copy policy";
- "do not copy or reuse outside the agreed product without written permission";
- "subject to formal legal review before public legal claims."

Avoid:

- promising guaranteed legal protection without registration or attorney review;
- saying that an idea alone is protected everywhere;
- threatening language;
- hiding unfinished features behind finished wording.

## Required Passport Fields

Every serious module passport must include:

```ts
type ArayOriginalityPassport = {
  owner: string;
  productIntent: string;
  originality: string[];
  evidence: {
    logId: string;
    files: string[];
    screenshots: string[];
    checks: string[];
    firstRecordedAt: string;
    lastVerifiedAt: string;
  };
  usageRules: string[];
  copyPolicy: string[];
  versionHistory: Array<{
    version: string;
    date: string;
    summary: string;
    status: "draft" | "beta" | "ready" | "deprecated";
  }>;
};
```

## Evidence Rule

No serious module should move to `ready` without evidence:

- changed files;
- screenshots or video proof when UI matters;
- command checks;
- mobile and desktop notes when the module is user-facing;
- known limitations;
- owner confirmation.

## Copy Policy Baseline

Clients may use ARAY modules only inside the agreed ARAY / PiloRus product scope.

Without written permission, third parties may not:

- copy source code, UI composition, module documents, prompt flows, visual assets, or product scripts;
- clone the module into another product;
- present ARAY module wording or screenshots as their own work;
- remove ownership or attribution records from documentation, changelogs, or contracts.

Public wording must be reviewed before publication in contracts, offers, or marketing pages.

## Working Flow

For every new original module:

1. Create or update the module passport.
2. Add an evidence log row.
3. Save proof: files, screenshots, checks, and decision notes.
4. Mark what is ready, beta, or planned.
5. Keep UI claims honest.
6. Ask for owner confirmation before calling it a finished ARAY module.

## Owner Confirmation

Owner confirmation means the product owner agrees that the feature matches the intended business meaning.

Recommended confirmation text:

```text
Confirmed by owner: the module behavior, visual standard, and business meaning match the intended ARAY product direction for this version.
```

