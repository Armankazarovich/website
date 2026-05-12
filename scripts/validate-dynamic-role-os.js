/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function assertIncludes(source, values, label) {
  const missing = values.filter((value) => !source.includes(value));
  if (missing.length) {
    throw new Error(`${label} missing: ${missing.join(", ")}`);
  }
}

const schemaPath = "prisma/schema.prisma";
const helperPath = "lib/dynamic-role-os.ts";
const settingsPath = "lib/notification-settings.ts";
const panelPath = "components/admin/notification-settings-panel.tsx";
const apiPath = "app/api/admin/business-roles/route.ts";
const businessRolePanelPath = "components/admin/business-role-os-panel.tsx";
const businessSettingsPath = "app/admin/business/settings/page.tsx";
const tenantContextPath = "lib/tenant-context.ts";
const staffApiPath = "app/api/admin/staff/route.ts";
const staffPagePath = "app/admin/staff/page.tsx";
const accessPath = "lib/business-role-access.ts";

try {
  if (!exists(schemaPath)) throw new Error(`${schemaPath} is missing`);
  if (!exists(helperPath)) throw new Error(`${helperPath} is missing`);

  assertIncludes(
    read(schemaPath),
    [
      "model BusinessRole",
      "model BusinessRoleMember",
      "model NotificationAudiencePreference",
      "roleKey",
      "isPrimary",
      "audienceKey",
      "@@unique([tenantId, roleKey])",
      "@@index([tenantId, userId, isPrimary])",
      "@@unique([tenantId, audienceKey, eventKey])",
    ],
    schemaPath,
  );

  assertIncludes(
    read(helperPath),
    [
      "DYNAMIC_ROLE_BLUEPRINTS",
      "normalizeBusinessRoleKey",
      "createRoleSeedFromBlueprint",
      "getDynamicNotificationRoleBlueprints",
      "business-template",
      "client-segment",
      "vip-client",
    ],
    helperPath,
  );

  assertIncludes(
    read(settingsPath),
    ["getDynamicNotificationRoleBlueprints", "roleBlueprints", "businessRoleAudiences"],
    settingsPath,
  );

  assertIncludes(
    read("app/api/admin/notifications/settings/route.ts"),
    ["canAccessWithBusinessRoles", "notifications.manage", "roles.manage"],
    "app/api/admin/notifications/settings/route.ts",
  );

  assertIncludes(
    read(panelPath),
    ["type RoleBlueprint", "businessRoleAudiences", "roleBlueprints", "Умные роли под бизнес"],
    panelPath,
  );

  assertIncludes(
    read(apiPath),
    [
      "seedAudiencePreferences",
      "canBusinessRoleAccessSection",
      "canBusinessRoleAccessAction",
      "prisma.businessRole",
      "prisma.businessRoleMember",
      "prisma.notificationAudiencePreference",
      "sync_notifications",
      "add_member",
      "mutedBySeedAt",
    ],
    apiPath,
  );

  assertIncludes(
    read(businessRolePanelPath),
    ["BusinessRoleOsPanel", "/api/admin/business-roles", "Dynamic Role OS", "Шаблоны ARAY", "startEdit", "saveEdit", "ToggleButton", "События", "Каналы"],
    businessRolePanelPath,
  );

  assertIncludes(
    read(businessSettingsPath),
    ["BusinessRoleOsPanel"],
    businessSettingsPath,
  );

  assertIncludes(
    read(tenantContextPath),
    ["businessRole", "businessRoleMember", "notificationAudiencePreference"],
    tenantContextPath,
  );

  assertIncludes(
    read(staffApiPath),
    ["resolveStaffBusinessRole", "setPrimaryBusinessRole", "canUserBusinessRoleAccessAction", "protectedStaffResponse", "primaryBusinessRoleId", "businessRoles"],
    staffApiPath,
  );

  assertIncludes(
    read(staffPagePath),
    ["AssignableBusinessRole", "Умная роль ARAY", "applyBusinessRoleToCreate", "applyBusinessRoleToPanel"],
    staffPagePath,
  );

  assertIncludes(
    read(accessPath),
    ["getUserBusinessRoleAccess", "canBusinessRoleAccessAction", "canBusinessRoleAccessSection", "canAccessWithBusinessRoles", "SECTION_ACTIONS", "primaryRoleKey", "roleKeys"],
    accessPath,
  );

  console.log("[ARAY Dynamic Role OS] passed");
} catch (error) {
  console.error("[ARAY Dynamic Role OS] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
