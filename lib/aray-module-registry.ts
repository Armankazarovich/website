export type ArayModuleCategory =
  | "core"
  | "business"
  | "marketplace"
  | "constructor"
  | "analytics"
  | "marketing"
  | "finance"
  | "connector";

export type ArayModuleStatus = "draft" | "beta" | "ready" | "disabled";

export type ArayModuleBillingPlan = "free" | "paid" | "usage" | "enterprise";

export type ArayModuleBilling = {
  plan: ArayModuleBillingPlan;
  metering?: string[];
};

export type ArayModuleArayContract = {
  skills: string[];
  quickActions: string[];
  confirmations: string[];
};

export type ArayModuleHealth = "healthy" | "attention" | "draft" | "disabled";

export type ArayModuleSubscriptionState = {
  plan: ArayModuleBillingPlan;
  tenantPlan: string;
  status: "available" | "needs-plan" | "enterprise-only";
  label: string;
};

export type ArayModuleConnectorState = {
  status: "ready" | "missing" | "not-required";
  requiredTypes: string[];
  activeTypes: string[];
  missingTypes: string[];
};

export type ArayModuleRoleState = {
  currentRole: string;
  allowedRoles: string[];
  canView: boolean;
  canManage: boolean;
};

export type ArayModuleRuntimeState = {
  requestedEnabled: boolean;
  effectiveEnabled: boolean;
  locked: boolean;
  canToggle: boolean;
  toggleBlockedReasons: string[];
  reason: string | null;
  updatedAt: string | null;
  updatedById: string | null;
  role: ArayModuleRoleState;
  subscription: ArayModuleSubscriptionState;
  connectors: ArayModuleConnectorState;
};

export type ArayModulePassport = {
  id: string;
  name: string;
  category: ArayModuleCategory;
  status: ArayModuleStatus;
  routes: string[];
  navItems: string[];
  permissions: string[];
  dependencies: string[];
  settings: string[];
  billing: ArayModuleBilling;
  aray: ArayModuleArayContract;
  events: string[];
  dataSources: string[];
  quality: string[];
};

export type ArayModuleControlItem = ArayModulePassport & {
  health: ArayModuleHealth;
  missingDependencies: string[];
  enabledByDefault: boolean;
  canToggle: boolean;
  requestedEnabled: boolean;
  effectiveEnabled: boolean;
  locked: boolean;
  toggleBlockedReasons: string[];
  role: ArayModuleRoleState;
  subscription: ArayModuleSubscriptionState;
  connectors: ArayModuleConnectorState;
  stateUpdatedAt: string | null;
  stateUpdatedById: string | null;
};

export const ARAY_CORE_MODULE_IDS = [
  "core.design-system",
  "core.popup-system",
  "core.motion-system",
  "core.app-identity",
  "core.module-control-center",
  "core.connector-vault",
  "core.notifications",
  "core.aray-voice",
] as const;

export const arayModuleRegistry = [
  {
    id: "core.design-system",
    name: "Design System",
    category: "core",
    status: "ready",
    routes: [],
    navItems: [],
    permissions: ["ui.design-system.use"],
    dependencies: [],
    settings: ["theme", "density", "motion", "responsive"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-design-system"],
      quickActions: ["open-design-notes"],
      confirmations: [],
    },
    events: ["design_token_used", "design_guard_failed"],
    dataSources: ["DESIGN_SYSTEM.md", "app/globals.css"],
    quality: ["validate-design-system", "validate-admin-ui-integrity"],
  },
  {
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
  },
  {
    id: "core.motion-system",
    name: "Motion System / Page Flow",
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
  },
  {
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
    quality: ["single-identity-registry", "module-title-sync", "aray-logo-icon-source", "quiet-smart-install"],
  },
  {
    id: "core.module-control-center",
    name: "Module Control Center",
    category: "core",
    status: "ready",
    routes: ["/admin/aray/modules", "/api/admin/aray/modules"],
    navItems: ["aray.modules"],
    permissions: ["modules.view", "modules.manage", "modules.policy.manage"],
    dependencies: ["core.design-system", "core.popup-system"],
    settings: ["rolePolicy", "subscriptionPlan", "connectorPolicy", "lockedModules"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-module-policy", "audit-module-access"],
      quickActions: ["open-module-control-center"],
      confirmations: ["module-toggle", "module-policy-change"],
    },
    events: ["module_state_changed", "module_policy_changed"],
    dataSources: ["ArayModuleState", "aray-module-registry"],
    quality: ["validate-aray-modules", "module-state-guarded"],
  },
  {
    id: "core.connector-vault",
    name: "Connector Vault",
    category: "connector",
    status: "ready",
    routes: ["/admin/aray/connectors", "/api/admin/aray/connectors"],
    navItems: ["aray.connectors"],
    permissions: ["connectors.view", "connectors.manage", "secrets.status.view"],
    dependencies: ["core.module-control-center"],
    settings: ["providerMatrix", "envStatus", "terminalConnectors"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-connector-status", "suggest-provider-setup"],
      quickActions: ["open-connector-vault"],
      confirmations: ["external-provider-connect"],
    },
    events: ["connector_status_checked", "provider_setup_suggested"],
    dataSources: ["TerminalConnector", "aray-provider-matrix", "process.env"],
    quality: ["no-secret-leak", "module-connector-truthful-status"],
  },
  {
    id: "core.notifications",
    name: "Notification Center",
    category: "core",
    status: "beta",
    routes: [
      "/admin/notifications",
      "/api/admin/notifications/count",
      "/api/admin/notifications/telegram-setup",
      "/api/admin/notifications/center",
      "/api/admin/notifications/feed",
      "/api/admin/notifications/settings",
    ],
    navItems: ["notifications"],
    permissions: ["notifications.view", "notifications.manage"],
    dependencies: ["core.popup-system", "core.app-identity"],
    settings: ["channels", "quietHours", "roleAudiences", "deliveryStatus"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-notification", "prepare-notification-handoff"],
      quickActions: ["open-notification-center", "mark-notification-read"],
      confirmations: ["external-message-send"],
    },
    events: [
      "notification_created",
      "notification_read",
      "notification_archived",
      "notification_delivery_failed",
    ],
    dataSources: ["notification-center", "notification-settings", "push-subscriptions"],
    quality: ["role-aware", "quiet-hours-safe", "no-fake-delivery-status"],
  },
  {
    id: "core.aray-voice",
    name: "ARAY Voice",
    category: "core",
    status: "beta",
    routes: [
      "/admin/aray",
      "/admin/aray/agents",
      "/admin/aray/brand-kit",
      "/admin/aray/briefs",
      "/admin/aray/costs",
      "/admin/aray/orders",
      "/admin/aray/partners",
      "/admin/aray-lab",
      "/api/admin/aray",
      "/api/admin/aray/costs",
      "/api/admin/aray/subscriptions",
      "/api/ai/tts",
    ],
    navItems: ["aray"],
    permissions: ["aray.voice.use", "aray.voice.manage", "aray.voice.consent"],
    dependencies: ["core.notifications", "core.popup-system"],
    settings: ["deviceConsent", "voiceSchedule", "quietHours", "weekends", "stopAction"],
    billing: { plan: "free" },
    aray: {
      skills: ["speak-answer", "explain-voice-consent", "stop-speaking"],
      quickActions: ["open-voice-settings", "mute-voice-today"],
      confirmations: ["microphone-enable", "always-on-listen"],
    },
    events: ["voice_answer_spoken", "voice_muted_by_schedule", "microphone_consent_requested"],
    dataSources: ["device-local-preferences", "tts-provider", "notification-settings"],
    quality: ["consent-first", "schedule-respected", "stop-action-visible"],
  },
  {
    id: "business.orders",
    name: "Orders Core",
    category: "business",
    status: "ready",
    routes: [
      "/admin/orders",
      "/admin/orders/[id]",
      "/admin/orders/trash",
      "/api/admin/orders",
    ],
    navItems: ["orders"],
    permissions: ["orders.view", "orders.manage", "orders.update", "orders.delete"],
    dependencies: ["core.notifications"],
    settings: ["statuses", "trash", "pdf", "staffNotifications"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-order", "summarize-order-risk"],
      quickActions: ["open-orders", "open-order-card"],
      confirmations: ["order-delete", "order-status-change"],
    },
    events: ["order_created", "order_updated", "order_deleted", "order_restored"],
    dataSources: ["orders", "order-items", "customers"],
    quality: ["role-aware", "destructive-actions-confirmed", "module-guarded-api"],
  },
  {
    id: "business.director-cabinet",
    name: "ARAY Roles & Sections Orchestrator",
    category: "business",
    status: "beta",
    routes: ["/admin/director"],
    navItems: ["director"],
    permissions: ["director.view", "director.manage", "cabinet.role.view"],
    dependencies: ["core.notifications", "business.orders", "business.role-os", "finance.wallet-ledger"],
    settings: ["roleCabinets", "salaryView", "scheduleView", "businessSignals", "confirmations"],
    billing: { plan: "free" },
    aray: {
      skills: ["summarize-business-day", "explain-role-cabinet", "suggest-director-action", "explain-admin-section-map"],
      quickActions: ["open-role-section-map", "show-role-priorities"],
      confirmations: ["external-message-send", "document-send", "salary-data-change", "role-change"],
    },
    events: ["role_section_map_opened", "role_cabinet_viewed", "business_signal_prioritized"],
    dataSources: ["orders", "leads", "tasks", "reviews", "expenses", "staff", "terminal-connectors"],
    quality: ["role-aware", "no-fake-finance", "confirmation-first", "mobile-readable"],
  },
  {
    id: "business.role-os",
    name: "Dynamic Role OS",
    category: "business",
    status: "ready",
    routes: ["/admin/business/settings", "/api/admin/business-roles"],
    navItems: ["business.settings"],
    permissions: ["roles.view", "roles.manage", "business.settings.view"],
    dependencies: ["core.notifications", "core.module-control-center"],
    settings: ["businessRoles", "notificationAudiences", "staffMembers"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-business-role", "suggest-role-template"],
      quickActions: ["open-business-settings"],
      confirmations: ["role-change", "member-access-change"],
    },
    events: ["business_role_created", "business_role_updated", "role_member_changed"],
    dataSources: ["BusinessRole", "BusinessRoleMember", "NotificationAudiencePreference"],
    quality: ["role-aware", "audience-sync-safe", "no-privilege-escalation"],
  },
  {
    id: "business.aray-messenger",
    name: "ARAY Business Messenger",
    category: "business",
    status: "beta",
    routes: [
      "/admin/messenger",
      "/api/admin/messenger/threads",
      "/api/admin/messenger/threads/[id]/messages",
    ],
    navItems: ["messenger"],
    permissions: ["messenger.view", "messenger.reply", "messenger.assist", "messenger.task.create"],
    dependencies: ["core.notifications", "core.aray-voice", "business.role-os"],
    settings: ["crmThreads", "arayAssist", "humanConfirmation", "messageTone"],
    billing: { plan: "free" },
    aray: {
      skills: ["rewrite-business-message", "explain-dialog-context", "prepare-follow-up-task"],
      quickActions: ["open-messenger", "polish-reply", "create-task-from-dialog"],
      confirmations: ["external-message-send", "task-create", "document-send"],
    },
    events: ["messenger_opened", "message_saved", "aray_reply_polished", "task_created_from_dialog"],
    dataSources: ["Lead", "LeadActivity", "TaskRelation:LEAD", "aray-business-messenger"],
    quality: ["role-aware", "confirmation-first", "no-fake-external-delivery", "mobile-readable"],
  },
  {
    id: "business.terminal",
    name: "Terminal",
    category: "business",
    status: "beta",
    routes: ["/admin/terminals", "/admin/terminals/training", "/admin/orders/new", "/admin/exchange", "/api/admin/terminal/*"],
    navItems: ["terminal", "orders.new"],
    permissions: ["terminal.view", "terminal.sell", "terminal.manage"],
    dependencies: ["core.popup-system", "core.notifications", "core.app-identity", "business.orders"],
    settings: ["cashShift", "receiptProvider", "marketMode", "operatorProfile"],
    billing: { plan: "paid", metering: ["orders", "receipt-actions"] },
    aray: {
      skills: ["explain-terminal", "prepare-sale", "open-market-mode"],
      quickActions: ["open-terminal", "open-new-order"],
      confirmations: ["payment-action", "receipt-action", "cash-shift-close"],
    },
    events: ["terminal_opened", "sale_draft_created", "cash_shift_opened", "cash_shift_closed"],
    dataSources: ["orders", "products", "customers", "terminal-profiles"],
    quality: ["cash-actions-confirmed", "offline-state-honest", "mobile-touch-safe"],
  },
  {
    id: "finance.wallet-ledger",
    name: "Finance Wallet / Ledger",
    category: "finance",
    status: "beta",
    routes: [
      "/admin/aray/arc",
      "/admin/aray/requisites",
      "/admin/finance",
      "/api/admin/finance",
      "/api/admin/finance/expenses",
    ],
    navItems: ["finance"],
    permissions: [
      "finance.view",
      "finance.manage",
      "finance.wallet.view",
      "finance.expenses.manage",
    ],
    dependencies: ["core.design-system", "business.orders", "business.role-os"],
    settings: ["walletFoundation", "expenses", "piloPoints", "financeTasks", "reports"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-finance-foundation", "summarize-wallet-risk", "prepare-finance-task"],
      quickActions: ["open-finance", "open-finance-tasks"],
      confirmations: ["expense-delete", "wallet-transfer-future"],
    },
    events: ["finance_viewed", "expense_created", "expense_deleted", "finance_task_opened"],
    dataSources: ["orders", "expenses", "TaskRelation:BUSINESS:finance"],
    quality: ["tenant-scoped", "read-only-wallet-honest", "no-fake-transfers"],
  },
  {
    id: "constructor.store-builder",
    name: "One-click Store Constructor",
    category: "constructor",
    status: "beta",
    routes: [
      "/admin/aray/builder",
      "/admin/site/constructor",
      "/admin/site/benchmarks",
      "/admin/site/releases",
      "/admin/business/settings",
      "/api/admin/aray/release",
      "/api/admin/site-constructor/blueprints",
      "/api/admin/site-constructor/sites",
    ],
    navItems: ["aray.builder", "site.constructor", "site.benchmarks", "business.settings"],
    permissions: [
      "store.constructor.view",
      "store.constructor.prepare",
      "store.constructor.launch",
    ],
    dependencies: [
      "core.design-system",
      "core.app-identity",
      "core.module-control-center",
      "core.connector-vault",
      "core.notifications",
      "business.role-os",
      "business.orders",
      "business.aray-messenger",
      "business.terminal",
      "finance.wallet-ledger",
    ],
    settings: [
      "businessType",
      "terminalProfile",
      "tenantIdentity",
      "brandAssets",
      "publicRoutes",
      "launchChecklist",
    ],
    billing: { plan: "free" },
    aray: {
      skills: [
        "prepare-store-blueprint",
        "audit-launch-readiness",
        "explain-missing-store-inputs",
      ],
      quickActions: ["open-store-constructor", "show-launch-contract", "run-preflight"],
      confirmations: ["tenant-create", "domain-change", "launch-deploy"],
    },
    events: [
      "store_constructor_opened",
      "store_blueprint_selected",
      "store_launch_preflight_requested",
    ],
    dataSources: [
      "store-constructor-blueprints",
      "terminal-profiles",
      "store-capability-registry",
      "Tenant",
      "SiteSettings",
      "ArayModuleState",
    ],
    quality: [
      "validate-store-constructor-blueprints",
      "validate-store-capabilities",
      "validate-system-architecture-levels",
      "deploy-preflight",
    ],
  },
  {
    id: "marketing.store-stories",
    name: "PiloRus Stories / Live Commerce",
    category: "marketing",
    status: "beta",
    routes: [
      "/stories",
      "/admin/stories",
      "/api/stories",
      "/api/stories/[id]/view",
      "/api/stories/[id]/message",
      "/api/admin/stories",
      "/api/admin/stories/[id]",
      "/api/admin/stories/entity-options",
    ],
    navItems: ["stories"],
    permissions: ["stories.view", "stories.manage"],
    dependencies: [
      "core.design-system",
      "core.popup-system",
      "core.notifications",
      "business.aray-messenger",
    ],
    settings: ["previewVideoLimit", "mediaErrorRecovery", "relations", "sortOrder"],
    billing: { plan: "free" },
    aray: {
      skills: ["explain-story-context", "prepare-story-follow-up"],
      quickActions: ["open-public-stories", "open-story-manager"],
      confirmations: ["story-write", "story-delete", "external-message-send"],
    },
    events: ["story_viewed", "story_message_created", "story_media_failed"],
    dataSources: [
      "StoreStory",
      "StoreStoryRelation",
      "stories-media",
      "docs/evidence/stories/MODULE-PASSPORT-0.9.1.md",
    ],
    quality: [
      "validate-store-stories",
      "validate-browser-stories-responsive",
      "validate-stories-preview-recovery",
      "code-only-deploy-database-lock",
    ],
  },
  {
    id: "marketplace.marketplace",
    name: "Marketplace",
    category: "marketplace",
    status: "draft",
    routes: ["/api/admin/market-demand"],
    navItems: ["marketplace", "terminal.market"],
    permissions: ["marketplace.view", "marketplace.manage", "marketplace.analytics.view"],
    dependencies: ["core.popup-system", "business.terminal", "core.notifications"],
    settings: ["region", "demandSources", "listingStatus", "ratingMode"],
    billing: { plan: "usage", metering: ["listings", "demand-syncs"] },
    aray: {
      skills: ["explain-marketplace-data", "suggest-listing-improvements"],
      quickActions: ["open-market-mode", "show-no-data-reasons"],
      confirmations: ["external-publication", "paid-demand-sync"],
    },
    events: ["marketplace_viewed", "listing_draft_created", "market_demand_synced"],
    dataSources: ["catalog", "orders", "wordstat", "keyword-planner", "internal-events"],
    quality: ["no-fake-demand", "source-date-visible", "region-aware"],
  },
] as const satisfies readonly ArayModulePassport[];

export type ArayModuleId = (typeof arayModuleRegistry)[number]["id"];

export const arayModuleRegistryById = Object.fromEntries(
  arayModuleRegistry.map((module) => [module.id, module]),
) as Record<ArayModuleId, (typeof arayModuleRegistry)[number]>;

export function getArayModulePassport(id: string): ArayModulePassport | null {
  return arayModuleRegistry.find((module) => module.id === id) || null;
}

export function getArayModulesByCategory(category: ArayModuleCategory) {
  return arayModuleRegistry.filter((module) => module.category === category);
}

export function getArayModulesByStatus(status: ArayModuleStatus) {
  return arayModuleRegistry.filter((module) => module.status === status);
}

export function getArayModuleDependencies(id: string) {
  const modulePassport = getArayModulePassport(id);
  if (!modulePassport) return [];
  return modulePassport.dependencies
    .map((dependencyId) => getArayModulePassport(dependencyId))
    .filter((dependency): dependency is ArayModulePassport => Boolean(dependency));
}

export function getArayModuleMissingDependencies(module: ArayModulePassport) {
  return module.dependencies.filter((dependencyId) => !getArayModulePassport(dependencyId));
}

export function getArayModuleHealth(module: ArayModulePassport): ArayModuleHealth {
  if (module.status === "disabled") return "disabled";
  if (module.status === "draft") return "draft";
  if (getArayModuleMissingDependencies(module).length > 0) return "attention";
  return "healthy";
}

export function getArayModuleControlItems(): ArayModuleControlItem[] {
  return arayModuleRegistry.map((module) => {
    const passport = module as ArayModulePassport;
    return {
      ...passport,
      health: getArayModuleHealth(passport),
      missingDependencies: getArayModuleMissingDependencies(passport),
      enabledByDefault: passport.status === "ready" || passport.status === "beta",
      canToggle: false,
      requestedEnabled: passport.status === "ready" || passport.status === "beta",
      effectiveEnabled: passport.status === "ready" || passport.status === "beta",
      locked: ARAY_CORE_MODULE_IDS.includes(passport.id as any),
      toggleBlockedReasons: ["persistent-state-not-loaded"],
      role: {
        currentRole: "SYSTEM",
        allowedRoles: ["SUPER_ADMIN", "ADMIN"],
        canView: true,
        canManage: false,
      },
      subscription: {
        plan: passport.billing.plan,
        tenantPlan: "unknown",
        status: "available",
        label: "not-loaded",
      },
      connectors: {
        status: "not-required",
        requiredTypes: [],
        activeTypes: [],
        missingTypes: [],
      },
      stateUpdatedAt: null,
      stateUpdatedById: null,
    };
  });
}

export function getArayModuleRegistrySummary() {
  return arayModuleRegistry.reduce(
    (summary, module) => {
      summary.total += 1;
      summary.byCategory[module.category] += 1;
      summary.byStatus[module.status] += 1;
      return summary;
    },
    {
      total: 0,
      byCategory: {
        core: 0,
        business: 0,
        marketplace: 0,
        constructor: 0,
        analytics: 0,
        marketing: 0,
        finance: 0,
        connector: 0,
      },
      byStatus: {
        draft: 0,
        beta: 0,
        ready: 0,
        disabled: 0,
      },
    },
  );
}
