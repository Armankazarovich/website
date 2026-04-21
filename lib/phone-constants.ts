/**
 * Centralized phone constants for client components.
 * Server components should use getSetting(settings, "phone") from lib/site-settings.ts instead.
 *
 * These are default fallback values — the actual phone can be changed
 * in admin settings, which only server components can read.
 */
export const PHONE_LINK = "+79850670888";
export const PHONE_DISPLAY = "8-985-067-08-88";
// PHONE2 removed per client request (19.04.2026 → 20.04.2026)
// Slot in DB/admin preserved — client can add new number later without code changes
export const PHONE3_LINK = "+79776068020";
export const PHONE3_DISPLAY = "8-977-606-80-20";
