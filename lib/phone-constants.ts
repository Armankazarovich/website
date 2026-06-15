/**
 * Centralized phone constants for client components.
 * Server components should use getSetting(settings, "phone") from lib/site-settings.ts instead.
 *
 * These are default fallback values — the actual phone can be changed
 * in admin settings, which only server components can read.
 */
export const PHONE_LINK = "+74951352026";
export const PHONE_DISPLAY = "+7 (495) 135-20-26";
// PHONE2 removed per client request (19.04.2026 → 20.04.2026)
// Slot in DB/admin preserved — client can add new number later without code changes
export const PHONE3_LINK = "";
export const PHONE3_DISPLAY = "";
