import { getSiteSettings, DEFAULT_SETTINGS } from "@/lib/site-settings";
import { normalizePaletteId, normalizePaletteIds } from "@/lib/palettes";
import { AppearanceClient } from "./appearance-client";

export const metadata = { title: "Оформление" };

export default async function AppearancePage() {
  const settings = await getSiteSettings();
  const enabledRaw = settings.palettes_enabled ?? DEFAULT_SETTINGS.palettes_enabled;
  const enabledIds = normalizePaletteIds(enabledRaw);
  const photoAspect = settings.photo_aspect_ratio ?? DEFAULT_SETTINGS.photo_aspect_ratio;
  const cardStyle = settings.card_style ?? DEFAULT_SETTINGS.card_style;
  const rawDefaultPalette = settings.default_palette ?? DEFAULT_SETTINGS.default_palette;
  const preferredDefaultPalette = rawDefaultPalette === "timber" ? "sber" : rawDefaultPalette;
  const normalizedDefaultPalette = normalizePaletteId(preferredDefaultPalette, "sber");
  const defaultPalette = enabledIds.includes(normalizedDefaultPalette)
    ? normalizedDefaultPalette
    : "sber";
  const arayEnabled = (settings.aray_enabled ?? DEFAULT_SETTINGS.aray_enabled) !== "false";
  const initialProductPage = {
    showReviews: (settings.product_page_show_reviews ?? "true") !== "false",
    showRelated: (settings.product_page_show_related ?? "true") !== "false",
    showCalculator: (settings.product_page_show_calculator ?? "true") !== "false",
    showBreadcrumbs: (settings.product_page_show_breadcrumbs ?? "true") !== "false",
  };
  const initialCheckout = {
    allowPickup: (settings.checkout_allow_pickup ?? "true") !== "false",
    allowDelivery: (settings.checkout_allow_delivery ?? "true") !== "false",
    showPromo: (settings.checkout_show_promo ?? "true") !== "false",
    allowGuest: (settings.checkout_allow_guest ?? "true") !== "false",
    requireComment: (settings.checkout_require_comment ?? "false") === "true",
  };

  return (
    <div className="admin-dashboard-standard space-y-5 min-w-0">
      <AppearanceClient
        initialEnabledIds={enabledIds}
        initialPhotoAspect={photoAspect}
        initialCardStyle={cardStyle}
        initialDefaultPalette={defaultPalette}
        initialArayEnabled={arayEnabled}
        initialProductPage={initialProductPage}
        initialCheckout={initialCheckout}
      />
    </div>
  );
}
