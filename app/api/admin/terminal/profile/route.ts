export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalStaff } from "@/lib/terminal-auth";
import { resolveTerminalCapabilities } from "@/lib/terminal-capabilities";
import { resolveTerminalProfile } from "@/lib/terminal-profiles";
import { getCurrentTenantId } from "@/lib/tenant-context";

export async function GET() {
  const access = await requireTerminalStaff();
  if (!access.authorized) return access.response;
  const tenantId = getCurrentTenantId();

  const rows = await prisma.siteSettings.findMany({
    where: { tenantId, key: { in: ["terminal_profile", "business_type", "terminal_enabled_modules"] } },
    select: { key: true, value: true },
  });
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const profile = resolveTerminalProfile(settings.terminal_profile || settings.business_type);
  const capabilities = resolveTerminalCapabilities(profile.key, settings.terminal_enabled_modules);

  return NextResponse.json({ profile, capabilities });
}
