import "server-only";

import { NextResponse } from "next/server";
import { getArayModuleAccess } from "@/lib/aray-module-state";

export async function requireArayModuleAccess({
  moduleId,
  role,
}: {
  moduleId: string;
  role: string;
}) {
  const access = await getArayModuleAccess({ moduleId, role });
  if (access.allowed) {
    return { authorized: true as const, access };
  }

  return {
    authorized: false as const,
    access,
    response: NextResponse.json(
      {
        error: "Module disabled",
        moduleId,
        reasons: access.reasons,
      },
      { status: 403 },
    ),
  };
}
