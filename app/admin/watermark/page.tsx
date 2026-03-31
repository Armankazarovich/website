import { getSiteSettings } from "@/lib/site-settings";
import { WatermarkClient } from "./watermark-client";

export const metadata = { title: "Водяной знак" };

export default async function WatermarkPage() {
  const settings = await getSiteSettings();
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Водяной знак</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Логотип или текст — накладывается на все фото товаров
        </p>
      </div>
      <WatermarkClient
        initialLogoUrl={settings.watermark_logo_url ?? ""}
        initialPosition={settings.watermark_position ?? "bottom-right"}
        initialOpacity={parseFloat(settings.watermark_opacity ?? "0.75")}
        initialSizePct={parseInt(settings.watermark_size_pct ?? "20")}
        initialType={settings.watermark_type ?? "logo"}
        initialText={settings.watermark_text ?? ""}
        initialTextColor={settings.watermark_text_color ?? "#ffffff"}
        initialBackupDate={settings.watermark_backup_date ?? ""}
      />
    </div>
  );
}
