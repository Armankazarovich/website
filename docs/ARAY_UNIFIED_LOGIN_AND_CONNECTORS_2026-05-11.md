# ARAY Unified Login And Connectors

Date: 2026-05-11

This document fixes the platform rule for login, registration, roles and service connectors. ARAY should become the single business entry point, but account login and business-service permissions must stay separate and understandable.

## Product Rule

One ARAY ID can be:

- customer;
- business owner;
- employee;
- freelancer;
- specialist;
- blogger;
- partner;
- marketplace seller;
- site/client manager.

The first screen must not feel like a long questionnaire. It should ask one practical question:

> What do you want to do now?

Then ARAY maps that answer into a role, workspace and onboarding route.

## Entry Methods

P0 login/registration:

- email and password;
- phone and password;
- Yandex ID;
- Google;
- VK ID where useful for Russian social/marketplace flows.

P1 login/registration:

- Telegram Login;
- Apple ID for iOS/PWA;
- passkeys/WebAuthn after core auth is stable.

Important: social login only proves identity. It does not automatically grant access to Direct, Metrika, Google Ads, Gmail, Yandex Business, Search Console or mailboxes.

## Role Choice

The registration screen should show 4-6 role cards, not a technical role list:

- Buy something: customer profile, orders, favorites, reviews.
- Open a business/site: constructor, catalog, CRM, promotion, analytics.
- Sell services or products: marketplace profile, listings, leads, reviews.
- Work in a team: employee invite, role, tasks, inbox.
- Earn as partner: referrals, site sales, payouts, clients.
- Help as freelancer: portfolio, services, tasks, reputation.

After login, ARAY can refine the role with one short step:

- business name or niche;
- region;
- website/domain if any;
- what to connect first.

## Connector Types

Connectors are grouped by job, not by vendor:

- Identity: Yandex ID, Google, VK, Telegram, Apple, email, phone.
- Advertising: Yandex Direct, VK Ads, Google Ads.
- Analytics: Yandex Metrika, Google Analytics, site events, CRM/orders.
- SEO/indexing: Yandex Webmaster, Google Search Console, sitemap, robots.
- Business profiles/maps: Yandex Business, Google Business Profile, 2GIS where API is available.
- Demand: Wordstat, Google Keyword Planner, search trends, regional demand.
- Inbox: email SMTP/IMAP/Gmail/Yandex 360, Telegram, VK, WhatsApp Business, site chat.
- Reputation: reviews from site, Yandex/Google/2GIS/marketplaces where allowed.
- Payments/accounting: terminals, invoices, banks, 1C, Kontur, SBIS/Diadoc, tax/EDI.
- Marketplaces: Yandex Market, Ozon, Wildberries, Avito and niche directories.
- Media/content: YouTube, VK Video, Dzen, social posts where useful and permitted.

## One-Click Principle

ARAY should do safe work automatically:

- find the right counter/profile/account;
- show confidence and source;
- import existing data;
- create missing safe entities such as Metrika goals;
- save IDs into tenant settings;
- prepare drafts and tasks;
- notify the responsible role.

ARAY must ask confirmation for risky work:

- ad spend and campaign launch;
- publishing replies from the business;
- deleting or overwriting data;
- sending legal/financial documents;
- connecting a service with broad permissions;
- changing public business profile data.

## OAuth Principle

There must be two levels:

1. Login OAuth: "I am this person."
2. Service OAuth: "This business allows ARAY to access this service."

Example:

- Yandex ID login creates/opens ARAY account.
- Yandex Direct OAuth gives Direct API access.
- Yandex Metrika OAuth gives counters, goals and statistics.
- Yandex Business access gives organizations, contacts, rating/reviews if official API allows it.

These tokens must be stored per tenant/business and encrypted. They must not be shown in UI, logs, regular site settings or prompts.

## Constructor And Marketplace Flow

For a new business owner:

1. Login with email/Yandex/Google.
2. Choose "Open a business/site".
3. ARAY asks niche, city, business name and source materials.
4. ARAY creates draft workspace: site, catalog/service list, CRM, analytics, SEO, promotion.
5. ARAY proposes connectors: Metrika, Direct, Business profile, mail, inbox, payments.
6. Owner confirms only sensitive permissions and launches.

For a freelancer/partner:

1. Login.
2. Choose "Earn as freelancer/partner".
3. ARAY creates profile, portfolio/services, payout readiness and tasks.
4. ARAY can offer leads, site-building packages and client onboarding scripts.

For a regular customer:

1. Login.
2. ARAY opens cabinet, orders, favorites, saved contacts and reviews.
3. If customer later wants to sell/build, the same ARAY ID grows into a business/partner role.

## Implementation Order

P0:

- Add NextAuth OAuth-ready schema: Account, Session, VerificationToken.
- Make User.passwordHash optional for social login.
- Add Google and Yandex providers behind env flags.
- Add role-choice onboarding after first login.
- Add connector center with status cards and safe OAuth buttons.

P1:

- Add service-token ledger per tenant/user/provider/scope.
- Add unified connector health endpoint.
- Add ARAY actions: "connect", "sync", "find", "create missing", "notify owner".
- Connect Yandex Business/organization discovery once official access path is confirmed.

P2:

- Partner/freelancer marketplace onboarding.
- Public reputation profile and payouts.
- Multi-business switching under one ARAY ID.

## Safety

ARAY must never imply that one login gives all external permissions. The UI wording should be:

- "Sign in with Yandex" for account identity.
- "Connect Yandex Direct" for advertising access.
- "Connect Metrika" for analytics access.
- "Connect mail" for inbox access.
- "Connect organization" for maps/reputation access.

This keeps ordinary people safe while still making the platform feel like one clean system.
