# ARAY Module System Law

Date: 2026-05-07

This is a product and engineering law for ARAY / PiloRus.

We are not building a random collection of pages. We are building a modular platform where every serious capability can be enabled, configured, billed, searched, audited, and understood by ARAY.

## North Star

The user should be able to say: "We need this module."

Then we build it under one contract:

- same visual system;
- same navigation law;
- same roles and permissions;
- same popup/overlay law;
- same ARAY context and quick actions;
- same analytics events;
- same billing/subscription switch;
- same enable/disable lifecycle;
- same quality gates.

## Light / Clear / Working Module Law

Every ARAY module must be light, clear and working before we present it as a real user section.

Russian law for the team: модуль должен быть легкий, понятный и рабочий.

This means:

- the first screen explains the value in normal human language, not internal API or provider language;
- the main useful action is visible without searching through technical blocks;
- buttons only open things that work today;
- planned, vendor-ready, API-needed, bank-needed or connector-needed features are clearly marked as not active yet;
- no fake data, no fake bank balance, no fake transfers, no fake analytics;
- the UI stays compact and calm on mobile and desktop;
- if a module feels heavy or confusing, simplify it before adding more functions.

Rule: a draft or planned capability may live in the passport, roadmap or checklist, but it must not look like a finished working feature in navigation or on the first screen.

## Dream Law: Product Request to Finished Module

Arman should be able to describe the desired final product in normal human language.

Examples:

- "We need marketplace analytics."
- "We need ratings."
- "We need partner program."
- "We need a constructor module for building materials."
- "We need smart voice with Alice."

Codex / ARAY then turns that request into a finished module under the platform law:

- module passport;
- routes and UI;
- settings;
- toggles;
- roles and permissions;
- subscription/billing state;
- ARAY skills and quick actions;
- smart search and filters;
- analytics events;
- popup system usage;
- responsive/touch support;
- empty states and no fake data;
- quality gates and checklist update.

Arman gives the product meaning. The platform turns it into a standard module.

This is the dream: fewer manual scattered features, more finished product modules that can be enabled, disabled, sold, explained and improved.

## Core Is Always On

These are not optional plugins. They are the platform base:

- ARAY ID / account;
- roles and permissions;
- notification center;
- task relations;
- connector vault and provider matrix;
- search and navigation registry;
- App Identity / PWA System;
- analytics event ledger;
- billing/subscription engine;
- shared UI primitives: AdminModal, SidePanel, popup guard, responsive shell;
- Motion System / Page Flow;
- ARAY assistant shell, history, context, consent and confirmations.

## Core Module: Popup System

Popup System is a mandatory core module.

It owns:

- `AdminModal`;
- `SidePanel`;
- Radix Dialog / Sheet wrapper rules;
- `useAdminOverlayGuard(open)`;
- mobile dock hiding while overlays are open;
- popup header/body/footer structure;
- tabs and segmented controls inside popups;
- safe close behavior: Escape, close button, backdrop when allowed;
- responsive behavior for desktop, tablet, mobile and touch screens.

New modules must not create their own manual popup system.

If a module needs a window, drawer, sheet, confirm dialog, picker, cart, settings panel or assistant panel, it must request a popup from Popup System.

Popup module passport:

```ts
const popupSystemModule = {
  id: "core.popup-system",
  name: "Popup System",
  category: "core",
  status: "ready",
  routes: [],
  navItems: [],
  permissions: ["ui.popup.open", "ui.popup.close"],
  dependencies: ["core.design-system"],
  settings: ["motion", "safeArea", "overlayPolicy"],
  billing: { plan: "free" },
  aray: {
    skills: ["open-panel", "close-panel", "explain-current-popup"],
    quickActions: [],
    confirmations: ["destructive-action", "external-send", "payment-action"],
  },
  events: ["popup_opened", "popup_closed", "popup_action_confirmed"],
  dataSources: ["ui-state"],
  quality: ["no-manual-fixed-overlay", "mobile-dock-hidden", "keyboard-safe", "touch-safe"],
};
```

Law: if Popup System cannot support a needed surface, improve Popup System first, then use it. Do not create a parallel popup style.

## Core Module: Motion System / Page Flow

Motion System is a mandatory core UI module.

It owns:

- page enter animation;
- section reveal rules;
- popup/sheet motion contracts together with Popup System;
- reduced-motion behavior;
- touch/TV-safe movement;
- performance limits for animation.

Default page flow:

- content appears softly from bottom to top;
- duration stays short, around 170-220ms;
- no heavy blur, no large parallax, no long decorative animation for core pages;
- animation must never block loading or data fetching;
- `prefers-reduced-motion` must disable non-essential motion;
- pages should use one shared class/rule instead of local custom transitions.

Law: if a page needs a transition, it asks Motion System. Do not create local one-off page animations.

Motion module passport:

```ts
const motionSystemModule = {
  id: "core.motion-system",
  name: "Motion System",
  category: "core",
  status: "ready",
  routes: [],
  navItems: [],
  permissions: ["ui.motion.use"],
  dependencies: ["core.design-system"],
  settings: ["reducedMotion", "pageFlow", "popupMotion"],
  billing: { plan: "free" },
  aray: {
    skills: ["explain-motion", "toggle-reduced-motion"],
    quickActions: [],
    confirmations: [],
  },
  events: ["page_transition_started", "page_transition_finished"],
  dataSources: ["ui-state"],
  quality: ["prefers-reduced-motion", "no-heavy-page-animation", "single-motion-contract"],
};
```

## Core Module: App Identity / PWA System

App Identity / PWA System is a mandatory core module.

It owns:

- favicon and apple-touch icon;
- PWA manifest;
- installed app name and short name;
- module start URL;
- module shortcuts;
- theme/background color for installed app chrome;
- ARAY Production logo identity for admin/module apps;
- public site logo identity for storefront apps;
- browser tab title based on the active module.

Law: every installable module must get its app identity from one registry, not from scattered page code.

Current source of truth:

- app context registry: `lib/pwa-install-context.ts`;
- dynamic ARAY icon: `lib/aray-pwa-icon.ts`;
- ARAY Production logo source: `public/aray/aray-production-logo.png`;
- client head sync: `components/pwa-manifest-sync.tsx`;
- manifest endpoint: `app/api/pwa/manifest/route.ts`;
- icon endpoint: `app/api/pwa/icon/route.ts`.

Default behavior:

- `/admin/*` uses ARAY Production identity and icon;
- public storefront pages use PiloRus/site identity;
- module routes such as Orders, Terminal, Marketplace, CRM, Catalog, Analytics, Finance, Appearance, Marketing, Media, Delivery, Team, Business, Notifications, Settings, Help and ARAY get module-specific names and start URLs;
- switching pages updates manifest, tab title and icons without a full reload;

Smart install law:

- install is a quiet App Identity module, not an advertising banner;
- admin rail/capsule must not carry an install button;
- install UI must not auto-open while the workspace is still being shaped;
- explicit install intents such as `?install=1` or a future clear user action may open one compact dismissible banner;
- every install suggestion must explain the current app/section, device/platform and whether the browser can install natively;
- module passport details, App Identity internals and install diagnostics are service information for SUPER_ADMIN only; customer admins see the working app, not the platform kitchen;
- ARAY admin and module installs always use the ARAY Production icon source; PiloRus storefront installs use the PiloRus/site icon source;
- if the native browser prompt is unavailable, show short manual steps instead of pretending installation is one click;
- once installed or dismissed, the UI must stay calm and let the user work.
- installing from a module starts the installed app from that module.

App Identity module passport:

```ts
const appIdentityModule = {
  id: "core.app-identity",
  name: "App Identity / PWA System",
  category: "core",
  status: "ready",
  routes: ["/api/pwa/manifest", "/api/pwa/icon"],
  navItems: [],
  permissions: ["ui.app-identity.use"],
  dependencies: ["core.design-system"],
  settings: ["appName", "shortName", "startUrl", "iconKind", "themeColor"],
  billing: { plan: "free" },
  aray: {
    skills: ["explain-installed-app", "suggest-module-app"],
    quickActions: ["install-current-module"],
    confirmations: [],
  },
  events: ["pwa_manifest_synced", "pwa_install_started", "pwa_installed"],
  dataSources: ["route-context", "module-registry"],
  quality: ["single-identity-registry", "module-title-sync", "aray-logo-icon-source"],
};
```

## Product Module: Ratings and Reputation

Ratings are a real platform module, not a decorative widget.

It owns:

- product ratings;
- store/business ratings;
- specialist/freelancer/blogger ratings;
- review quality and moderation status;
- comparison score inputs;
- public reputation signals;
- anti-fake rules;
- source/date labels for imported or calculated reputation data.

Ratings must connect to orders, reviews, support events, delivery quality, repeat purchases and complaints where this is legally and ethically safe.

No fake stars. If there is no reliable event/review data, show "no data" or an honest empty state.

### Rating Level Colors

Ratings need platform colors because they communicate trust level across the whole ecosystem.

These colors are not website brand colors. They are platform semantic colors for reputation, quality and risk.

Recommended rating levels:

- `new / no-data`: neutral gray - not enough verified data;
- `low / risk`: red - complaints, poor quality or unresolved risk;
- `weak`: orange - below expected level, needs attention;
- `normal`: amber/yellow - acceptable, but not highlighted;
- `good`: green - reliable and healthy;
- `excellent`: teal/cyan - strong verified quality;
- `premium / top`: gold - top platform reputation, must be earned and protected.

Rules:

- never paint a business as excellent without enough verified signals;
- ratings must show source, date or reason when possible;
- colors must be accessible and readable in dark/light themes;
- site brand colors may surround the rating card, but the rating level color stays semantic and platform-wide;
- ARAY must explain what changed a rating before suggesting actions.

### Rating Controls and Legacy Colors

Rating colors and levels must be manageable through a clear admin interface, not only through code.

Required controls:

- enable/disable rating module;
- choose rating mode: automatic, manual, or mixed;
- edit level names;
- edit level colors;
- reset level colors to platform defaults;
- keep old colors after migrations;
- preview rating colors in dark/light themes;
- show ARAY explanation for every rating change;
- require confirmation for public rating changes.

Manual control is allowed, especially at the early platform stage, but it must be labeled honestly:

- `manual`: set by admin/operator;
- `verified`: calculated from real orders/reviews/events;
- `partner`: partner/investor/platform status;
- `premium`: platform premium level or earned top reputation.

Investor / ARCOIN premium status can have premium visual treatment, but it must not silently pretend to be a verified quality score. If a business is premium because of investor or partner status, the UI should show that as a status badge. If it is premium because of verified reputation, the UI should show it as rating.

Color migration law:

- if rating levels change in the future, old colors must not be overwritten silently;
- users who already have an old color keep it as a legacy custom color;
- the settings panel must offer "use new platform color" and "return to old color";
- ARAY can suggest a migration, but the owner/admin confirms it;
- every color must remain accessible and readable.

## Site Brand Theme Law

Admin interface colors are not website template colors.

Each generated site, storefront or constructor recipe must have its own brand theme:

- brand color;
- secondary/accent color;
- typography mood;
- logo/icon set;
- button radius and density;
- photo/card style;
- marketplace/category visual rules.

The admin appearance palette is for the working admin interface only. It must not force all future sites to use the same colors.

Constructor recipes may suggest a palette, but the final site brand theme belongs to that site/business and can be changed independently.

## Module Passport

Every new module must have a passport before it becomes a real feature.

Minimum contract:

```ts
type ArayModulePassport = {
  id: string;
  name: string;
  category: "core" | "business" | "marketplace" | "constructor" | "analytics" | "marketing" | "finance" | "connector";
  status: "draft" | "beta" | "ready" | "disabled";
  routes: string[];
  navItems: string[];
  permissions: string[];
  dependencies: string[];
  settings: string[];
  billing: {
    plan: "free" | "paid" | "usage" | "enterprise";
    metering?: string[];
  };
  aray: {
    skills: string[];
    quickActions: string[];
    confirmations: string[];
  };
  events: string[];
  dataSources: string[];
  quality: string[];
  originality: {
    owner: string;
    productIntent: string;
    originality: string[];
    evidenceLogId: string;
    usageRules: string[];
    copyPolicy: string[];
    versionHistory: Array<{
      version: string;
      date: string;
      summary: string;
      status: "draft" | "beta" | "ready" | "deprecated";
    }>;
  };
};
```

No passport means no module.

Originality rule:

- serious ARAY modules must be recorded in `docs/ARAY_ORIGINAL_MODULES_EVIDENCE_LOG.md`;
- the copy policy must stay honest and calm;
- public legal or marketing claims must be reviewed before publication;
- evidence must include files, screenshots when UI matters, checks, and owner confirmation.

## Enable Flow

When a module is enabled:

1. It appears in navigation only for allowed roles.
2. Its routes and widgets become available.
3. Its settings page or settings panel becomes available.
4. ARAY receives its skills and quick actions.
5. Search learns the module, entities and actions.
6. Events start writing to the analytics ledger.
7. Billing/subscription state is updated.
8. Missing connector keys are requested through the safe connector flow.
9. Empty states are honest: no fake data.

Current runtime contract, 2026-05-08:

- registry/passport truth lives in `lib/aray-module-registry.ts`;
- tenant runtime state lives in `ArayModuleState`;
- server evaluation lives in `lib/aray-module-state.ts`;
- API writes go through `app/api/admin/aray/modules/route.ts`;
- core modules are locked from UI disable;
- enablement is effective only when requested state, role visibility, tenant subscription, dependencies and required connectors agree;
- reads must not seed or mutate state; reconciliation is explicit/seeding only;
- pages/API for a controlled module must use a server guard before business logic;
- navigation, search and ARAY context must hide disabled module routes.

## Module Control Center

All modules must be manageable from one clear control center.

Required admin controls:

- enable/disable module;
- search modules by name, category, status, role, subscription and dependency;
- filter modules by active, inactive, paid, free, beta, missing connector, needs attention;
- show module health;
- show module subscription status;
- show module usage and analytics;
- show required connectors and missing setup;
- show owner/admin permissions;
- open module settings;
- open module documentation/help;
- ask ARAY to explain what the module does and what is missing.

The control center must work for:

- super admin;
- business owner;
- role admin;
- support/operator where allowed.

Super admin needs a full observability view:

- who has which modules enabled;
- active subscriptions;
- revenue by module;
- usage by module;
- errors and failed syncs;
- connector health;
- module adoption;
- churn/cancellation signals;
- ARAY recommendations for upsell or support.

## Module Storefront

Modules may appear on the ARAY Production site as a storefront/catalog.

Storefront cards should show:

- module name;
- short value;
- category;
- price or plan;
- status: ready, beta, coming soon;
- required connectors;
- screenshots or preview;
- what ARAY can do with this module;
- who the module is for;
- trial/demo/install action.

Storefront install must not bypass permissions, billing or connector setup. It starts the same enable flow with confirmation.

## Disable Flow

When a module is disabled:

1. Navigation hides it.
2. Background jobs stop.
3. ARAY stops offering its actions.
4. Billing stops or changes according to plan.
5. Data is archived/frozen, not silently deleted.
6. Existing links show a clear disabled state.

## Recipes

A recipe is a bundle of modules and settings for one business outcome.

Example: "Building materials site"

- Website shell;
- catalog;
- terminal;
- marketplace listing;
- CRM;
- delivery;
- notification center;
- Wordstat/demand analytics;
- advertising draft;
- SEO/indexing;
- ARAY role playbook for seller and owner.

Constructor "one click" is not magic. It is a recipe that enables modules, prepares drafts, asks for missing data, and asks confirmation before risky actions.

## Billing Law

Users should pay only for modules they need.

Each paid module must define:

- plan type;
- usage meter if needed;
- required connectors;
- owner/admin visibility;
- downgrade behavior;
- data retention after cancellation.

## Safety Law

Modules must not:

- invent analytics, demand, prices, ratings or revenue;
- hide API keys in UI or logs;
- perform money, ads, publication, deletion or external messages without confirmation;
- create a new popup, navigation or permission style outside platform primitives.

## Build Order

First build the rails:

1. Module passport shape.
2. Module registry.
3. Enable/disable state.
4. Role/permission mapping.
5. Navigation/search integration.
6. Billing/subscription mapping.
7. ARAY skills/quick actions mapping.
8. Quality guard.

Then build modules faster under this law.

## Current Priority

Next platform work should move toward this order:

1. Convert existing big areas into module passports: Terminal, Marketplace, Catalog, CRM, Notifications, ARAY Voice.
2. Add the first registry file for module metadata.
3. Use the registry to power navigation/search/ARAY hints where safe.
4. Build marketplace analytics as a module, not as a one-off page.
5. Build constructor as recipes on top of modules, not as a separate isolated toy.
