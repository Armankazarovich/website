import { NextRequest } from "next/server";
import { getPwaIconSrc, resolvePwaInstallContextById, type PwaInstallContext } from "@/lib/pwa-install-context";

export const dynamic = "force-dynamic";

const ARAY_ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const SITE_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function buildIcons(context: PwaInstallContext) {
  if (context.iconKind === "aray") {
    return ARAY_ICON_SIZES.map((size) => ({
      src: getPwaIconSrc(context, size),
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: size >= 192 ? "maskable any" : "any",
    }));
  }

  return SITE_ICON_SIZES.map((size) => ({
    src: getPwaIconSrc(context, size),
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: size >= 192 ? "maskable any" : "any",
  }));
}

function getShortcutIcon(icons: ReturnType<typeof buildIcons>) {
  return (
    icons.find((icon) => icon.type === "image/png" && icon.sizes === "96x96") ??
    icons.find((icon) => icon.type === "image/png") ??
    icons[0]
  );
}

export async function GET(req: NextRequest) {
  const context = resolvePwaInstallContextById(req.nextUrl.searchParams.get("app"));
  const icons = buildIcons(context);
  const shortcutIcon = getShortcutIcon(icons);

  const manifest = {
    name: context.name,
    short_name: context.shortName,
    description: context.description,
    id: `/pwa/${context.id}`,
    start_url: context.startUrl,
    scope: context.scope,
    display: "standalone",
    background_color: context.backgroundColor,
    theme_color: context.themeColor,
    orientation: "portrait-primary",
    prefer_related_applications: false,
    categories: context.iconKind === "aray" ? ["business", "productivity"] : ["shopping", "business"],
    lang: "ru",
    dir: "ltr",
    icons,
    shortcuts: context.shortcuts?.map((shortcut) => ({
      name: shortcut.name,
      short_name: shortcut.shortName,
      description: shortcut.description,
      url: shortcut.url,
      icons: shortcutIcon
        ? [{ src: shortcutIcon.src, sizes: shortcutIcon.sizes, type: shortcutIcon.type }]
        : undefined,
    })),
  };

  return Response.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
