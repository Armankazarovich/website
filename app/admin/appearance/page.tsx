import { getSiteSettings, DEFAULT_SETTINGS } from "@/lib/site-settings";
import { AppearanceClient } from "./appearance-client";

export const metadata = { title: "Оформление" };

export default async function AppearancePage() {
  const settings = await getSiteSettings();
  const enabledRaw = settings.palettes_enabled ?? DEFAULT_SETTINGS.palettes_enabled;
  const enabledIds = enabledRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const photoAspect = settings.photo_aspect_ratio ?? DEFAULT_SETTINGS.photo_aspect_ratio;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Оформление</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Цветовые темы и формат фотографий товаров
        </p>
      </div>
      <AppearanceClient initialEnabledIds={enabledIds} initialPhotoAspect={photoAspect} />
    </div>
  );
}
