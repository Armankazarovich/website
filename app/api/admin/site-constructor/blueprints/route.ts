export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { requireArayModuleAccess } from "@/lib/aray-module-auth";
import {
  ONE_CLICK_STORE_DOMAIN_STEPS,
  ONE_CLICK_STORE_IMPORT_COLUMNS,
  ONE_CLICK_STORE_ONBOARDING_STEPS,
  ONE_CLICK_STORE_QUESTIONNAIRE,
  STORE_CONSTRUCTOR_BLUEPRINTS,
  getOneClickStoreLaunchContract,
  getStoreConstructorReadinessMatrix,
} from "@/lib/store-constructor-blueprints";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const moduleAccess = await requireArayModuleAccess({
    moduleId: "constructor.store-builder",
    role: auth.role,
  });
  if (!moduleAccess.authorized) return moduleAccess.response;

  return NextResponse.json({
    ok: true,
    contract: getOneClickStoreLaunchContract("lumber"),
    onboarding: ONE_CLICK_STORE_ONBOARDING_STEPS,
    domain: ONE_CLICK_STORE_DOMAIN_STEPS,
    questionnaire: ONE_CLICK_STORE_QUESTIONNAIRE,
    importColumns: ONE_CLICK_STORE_IMPORT_COLUMNS,
    blueprints: Object.values(STORE_CONSTRUCTOR_BLUEPRINTS),
    readiness: getStoreConstructorReadinessMatrix(),
  });
}
