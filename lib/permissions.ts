/**
 * Role-based permissions system for ПилоРус
 *
 * Each section has a list of roles that can access it.
 * SUPER_ADMIN and ADMIN always have access to everything.
 */

export type Section =
  | "dashboard"
  | "director"
  | "orders"
  | "delivery"
  | "products"
  | "categories"
  | "inventory"
  | "import"
  | "clients"
  | "staff"
  | "crm"
  | "tasks"
  | "finance"
  | "analytics"
  | "settings"
  | "notifications"
  | "email"
  | "reviews"
  | "promotions"
  | "promotion"
  | "services"
  | "stories"
  | "posts"
  | "site"
  | "business_settings"
  | "appearance"
  | "watermark"
  | "terminals"
  | "terminals_training"
  | "aray"
  | "aray_agents"
  | "aray_costs"
  | "help"
  | "health"
  | "media"
  // Cabinet sections (all authenticated users)
  | "cabinet"
  | "cabinet:profile"
  | "cabinet:media"
  | "cabinet:subscriptions"
  | "cabinet:history"
  | "cabinet:reviews"
  | "cabinet:notifications"
  | "cabinet:appearance";

type Role = string;

/** Map of section → allowed roles. SUPER_ADMIN and ADMIN always have implicit access. */
const SECTION_ROLES: Record<Section, Role[]> = {
  dashboard: ["MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  director: ["MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  orders: ["MANAGER", "SELLER", "COURIER", "WAREHOUSE"],
  delivery: ["MANAGER", "COURIER", "WAREHOUSE"],
  products: ["MANAGER", "WAREHOUSE", "SELLER"],
  categories: [], // ADMIN only
  inventory: ["MANAGER", "WAREHOUSE"],
  import: ["MANAGER", "WAREHOUSE"],
  clients: ["MANAGER"],
  staff: [], // ADMIN only
  crm: ["MANAGER", "SELLER"],
  tasks: ["MANAGER", "SELLER", "COURIER", "WAREHOUSE", "ACCOUNTANT"],
  finance: ["ACCOUNTANT"],
  analytics: ["MANAGER", "ACCOUNTANT"],
  settings: [], // ADMIN only
  notifications: ["MANAGER"],
  email: ["MANAGER"],
  reviews: ["MANAGER", "SELLER"],
  promotions: ["MANAGER"],
  promotion: ["MANAGER"],
  services: ["MANAGER"],
  stories: ["MANAGER", "SELLER"],
  posts: ["MANAGER"],
  site: [], // ADMIN only
  business_settings: ["MANAGER"],
  appearance: [], // ADMIN only
  watermark: [], // ADMIN only
  terminals: [], // ADMIN only
  terminals_training: ["MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  aray: ["MANAGER"],
  aray_agents: [], // ADMIN only
  aray_costs: [], // ADMIN only
  help: ["MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  health: [], // ADMIN only
  media: ["MANAGER", "WAREHOUSE", "SELLER"],
  // Cabinet — all authenticated
  cabinet: ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:profile": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:media": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:subscriptions": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:history": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:reviews": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:notifications": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
  "cabinet:appearance": ["USER", "MANAGER", "ACCOUNTANT", "WAREHOUSE", "SELLER", "COURIER"],
};

/** Check if a role can access a section */
export function canAccess(role: string | undefined | null, section: Section): boolean {
  if (!role) return false;
  // Super admins and admins always have access
  if (role === "SUPER_ADMIN" || role === "ADMIN") return true;
  const allowed = SECTION_ROLES[section];
  if (!allowed) return false;
  return allowed.includes(role);
}

/** Get all accessible sections for a role */
export function getAccessibleSections(role: string): Section[] {
  if (role === "SUPER_ADMIN" || role === "ADMIN") {
    return Object.keys(SECTION_ROLES) as Section[];
  }
  return (Object.entries(SECTION_ROLES) as [Section, Role[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([section]) => section);
}

/** Map URL path to section */
export function pathToSection(path: string): Section | null {
  const map: Record<string, Section> = {
    "/admin": "dashboard",
    "/admin/director": "director",
    "/admin/orders": "orders",
    "/admin/delivery": "delivery",
    "/admin/products": "products",
    "/admin/categories": "categories",
    "/admin/inventory": "inventory",
    "/admin/import": "import",
    "/admin/clients": "clients",
    "/admin/staff": "staff",
    "/admin/crm": "crm",
    "/admin/tasks": "tasks",
    "/admin/finance": "finance",
    "/admin/analytics": "analytics",
    "/admin/settings": "settings",
    "/admin/notifications": "notifications",
    "/admin/email": "email",
    "/admin/reviews": "reviews",
    "/admin/promotions": "promotions",
    "/admin/promotion": "promotion",
    "/admin/services": "services",
    "/admin/stories": "stories",
    "/admin/posts": "posts",
    "/admin/site": "site",
    "/admin/business/settings": "business_settings",
    "/admin/appearance": "appearance",
    "/admin/watermark": "watermark",
    "/admin/terminals": "terminals",
    "/admin/terminals/training": "terminals_training",
    "/admin/aray": "aray",
    "/admin/aray/agents": "aray_agents",
    "/admin/aray/costs": "aray_costs",
    "/admin/help": "help",
    "/admin/health": "health",
    "/admin/media": "media",
    "/cabinet": "cabinet",
    "/cabinet/profile": "cabinet:profile",
    "/cabinet/media": "cabinet:media",
    "/cabinet/subscriptions": "cabinet:subscriptions",
    "/cabinet/history": "cabinet:history",
    "/cabinet/reviews": "cabinet:reviews",
    "/cabinet/notifications": "cabinet:notifications",
    "/cabinet/appearance": "cabinet:appearance",
  };

  // Exact match first
  if (map[path]) return map[path];

  // Try removing trailing segments (e.g. /admin/orders/123 → orders)
  const parts = path.split("/");
  while (parts.length > 2) {
    parts.pop();
    const shortened = parts.join("/");
    if (map[shortened]) return map[shortened];
  }

  return null;
}
