export type StoreCapabilityStatus = "ready" | "foundation" | "planned" | "blocked";

export type StoreCapabilityRisk = "low" | "medium" | "high";

export type StoreCapability = {
  id: string;
  title: string;
  status: StoreCapabilityStatus;
  publicValue: string;
  adminRoutes: string[];
  dependencies: string[];
  dataObjects: string[];
  arayRole: string;
  risk: StoreCapabilityRisk;
};

export const STORE_CAPABILITY_REGISTRY: StoreCapability[] = [
  {
    id: "product-comparison",
    title: "Product comparison",
    status: "planned",
    publicValue: "Buyer compares sizes, units, price, availability, delivery and use cases before ordering.",
    adminRoutes: ["/admin/products", "/admin/product-types"],
    dependencies: ["catalog", "product-variants", "public-edit-targets"],
    dataObjects: ["Product", "ProductVariant", "ProductType"],
    arayRole: "Explain differences and suggest the best option for the buyer task.",
    risk: "low",
  },
  {
    id: "arc-loyalty",
    title: "ARC loyalty balance",
    status: "foundation",
    publicValue: "Business can give bonuses, cashback and service credits without presenting ARC as external money.",
    adminRoutes: ["/admin/aray/costs", "/admin/finance"],
    dependencies: ["aray-service-packages", "payments", "ledger"],
    dataObjects: ["ArcWallet", "ArcLedgerEntry", "Payment"],
    arayRole: "Show balance, explain what is paid, what is bonus and what renews automatically.",
    risk: "high",
  },
  {
    id: "wholesale-b2b",
    title: "Wholesale and B2B sales",
    status: "planned",
    publicValue: "Legal entities can request invoices, bulk conditions, repeat orders and special prices.",
    adminRoutes: ["/admin/orders", "/admin/clients", "/admin/finance"],
    dependencies: ["crm", "documents", "price-rules"],
    dataObjects: ["Client", "Order", "Payment", "Document"],
    arayRole: "Help manager prepare invoice, contract, repeat order and bulk offer.",
    risk: "medium",
  },
  {
    id: "collections-bundles",
    title: "Collections and bundles",
    status: "planned",
    publicValue: "Buyer sees seasonal collections, project kits and products often bought together.",
    adminRoutes: ["/admin/products", "/admin/promotions"],
    dependencies: ["catalog", "recommendations"],
    dataObjects: ["Product", "Promotion", "Collection"],
    arayRole: "Build useful kits and explain what each bundle solves.",
    risk: "low",
  },
  {
    id: "online-payments",
    title: "Online payments",
    status: "planned",
    publicValue: "Customer pays by provider, invoice, SBP or bank flow when the business enables it.",
    adminRoutes: ["/admin/finance", "/admin/terminals"],
    dependencies: ["payment-provider", "fiscalization", "order-status"],
    dataObjects: ["Payment", "Order", "PaymentProviderEvent"],
    arayRole: "Guide owner through safe payment setup and show payment status honestly.",
    risk: "high",
  },
  {
    id: "invoices-documents",
    title: "Invoices and documents",
    status: "planned",
    publicValue: "Business issues invoices, acts and contracts from orders and client cards.",
    adminRoutes: ["/admin/orders", "/admin/clients", "/admin/finance"],
    dependencies: ["crm", "company-details", "document-templates"],
    dataObjects: ["Order", "Client", "Document"],
    arayRole: "Prepare document drafts and warn when legal details are missing.",
    risk: "high",
  },
  {
    id: "delivery-pickup",
    title: "Delivery and pickup",
    status: "foundation",
    publicValue: "Buyer sees delivery zones, pickup points, unloading terms and realistic timing.",
    adminRoutes: ["/admin/delivery", "/admin/delivery/rates"],
    dependencies: ["site-settings", "orders"],
    dataObjects: ["DeliveryRate", "Order"],
    arayRole: "Help calculate route, price, timing and missing delivery conditions.",
    risk: "medium",
  },
  {
    id: "service-integrations",
    title: "Service integrations",
    status: "foundation",
    publicValue: "Business connects delivery, telephony, messengers, accounting, marketplaces and CRM.",
    adminRoutes: ["/admin/aray/connectors", "/admin/settings"],
    dependencies: ["connector-vault", "permissions", "audit-log"],
    dataObjects: ["TerminalConnector", "ApiSubscription"],
    arayRole: "Explain connector status, open official OAuth and never ask for passwords.",
    risk: "high",
  },
  {
    id: "smart-business-map",
    title: "Smart business map",
    status: "planned",
    publicValue: "User sees relevant businesses, warehouses, pickup points or partners by radius.",
    adminRoutes: ["/admin/site", "/admin/delivery"],
    dependencies: ["addresses", "privacy-consent", "map-provider"],
    dataObjects: ["Tenant", "SiteSettings", "DeliveryRate"],
    arayRole: "Load only visible radius, open side card and explain contacts/routes.",
    risk: "medium",
  },
  {
    id: "reviews-reputation",
    title: "Reviews and reputation",
    status: "foundation",
    publicValue: "Buyer sees trust signals; owner can request reviews and respond in one place.",
    adminRoutes: ["/admin/reviews", "/admin/promotion"],
    dependencies: ["orders", "yandex-business", "notifications"],
    dataObjects: ["Review", "Order"],
    arayRole: "Ask for reviews after completed orders and help answer politely.",
    risk: "medium",
  },
];

export function getStoreCapability(id: string) {
  return STORE_CAPABILITY_REGISTRY.find((item) => item.id === id);
}

export function getStoreCapabilitiesByStatus(status: StoreCapabilityStatus) {
  return STORE_CAPABILITY_REGISTRY.filter((item) => item.status === status);
}

