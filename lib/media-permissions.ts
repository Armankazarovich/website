export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "COURIER",
  "ACCOUNTANT",
  "WAREHOUSE",
  "SELLER",
] as const;

export const GLOBAL_MEDIA_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "WAREHOUSE",
  "SELLER",
] as const;

export const GLOBAL_MEDIA_MANAGER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
] as const;

export function isStaffRole(role?: string | null): boolean {
  return !!role && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export function canViewGlobalMedia(role?: string | null): boolean {
  return !!role && GLOBAL_MEDIA_ROLES.includes(role as (typeof GLOBAL_MEDIA_ROLES)[number]);
}

export function canUploadGlobalMedia(role?: string | null): boolean {
  return canViewGlobalMedia(role);
}

export function canManageGlobalMedia(role?: string | null): boolean {
  return !!role && GLOBAL_MEDIA_MANAGER_ROLES.includes(role as (typeof GLOBAL_MEDIA_MANAGER_ROLES)[number]);
}
