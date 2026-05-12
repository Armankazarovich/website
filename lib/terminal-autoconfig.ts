import { prisma } from "@/lib/prisma";
import {
  ALWAYS_ON_TERMINAL_CAPABILITIES,
  getDefaultTerminalCapabilities,
  type TerminalCapabilityKey,
} from "@/lib/terminal-capabilities";
import { resolveTerminalProfile, type TerminalProfileKey } from "@/lib/terminal-profiles";
import {
  ensureTerminalDefaultConnectors,
  enqueueTerminalSyncJob,
  rebuildTerminalSearchIndex,
} from "@/lib/terminal-sync";

function settingEnabled(settings: Record<string, string>, key: string, defaultValue = true) {
  const value = settings[key];
  if (value === undefined || value === "") return defaultValue;
  return value !== "false";
}

function unique(keys: TerminalCapabilityKey[]) {
  return Array.from(new Set(keys));
}

export async function buildTerminalAutoconfig() {
  const [settingsRows, productCount, variantWithStockCount, deliveryRateCount] = await Promise.all([
    prisma.siteSettings.findMany(),
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { stockQty: { not: null } } }),
    prisma.deliveryRate.count(),
  ]);

  const settings = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const profile = resolveTerminalProfile(settings.terminal_profile || settings.business_type);
  const enabled = getDefaultTerminalCapabilities(profile.key as TerminalProfileKey);

  if (!settingEnabled(settings, "checkout_allow_delivery", true)) {
    const index = enabled.indexOf("delivery");
    if (index >= 0) enabled.splice(index, 1);
  } else if (deliveryRateCount > 0 || settings.delivery_text || settings.delivery_region) {
    enabled.push("delivery");
  }

  if (!settingEnabled(settings, "checkout_allow_pickup", true)) {
    const index = enabled.indexOf("pickup");
    if (index >= 0) enabled.splice(index, 1);
  } else if (settings.address || settings.pickup_coords) {
    enabled.push("pickup");
  }

  if (settings.company_name || settings.inn || settings.ogrn) {
    enabled.push("invoice_payment", "documents");
  }

  if (productCount > 0) {
    enabled.push("search_index", "repeat_order", "customer_lookup");
  }

  if (variantWithStockCount > 0) {
    enabled.push("inventory");
  }

  if (profile.key === "restaurant") enabled.push("tables", "kitchen_jobs");
  if (profile.key === "services" || profile.key === "beauty") enabled.push("appointments");
  if (profile.key === "lumber" || profile.key === "construction") enabled.push("production_jobs");

  return {
    profile,
    enabledModules: unique([...ALWAYS_ON_TERMINAL_CAPABILITIES, ...enabled]),
    detected: {
      productCount,
      variantWithStockCount,
      deliveryRateCount,
      allowDelivery: settingEnabled(settings, "checkout_allow_delivery", true),
      allowPickup: settingEnabled(settings, "checkout_allow_pickup", true),
      hasCompanyDetails: Boolean(settings.company_name || settings.inn || settings.ogrn),
    },
  };
}

export async function applyTerminalAutoconfig() {
  const config = await buildTerminalAutoconfig();

  await Promise.all([
    prisma.siteSettings.upsert({
      where: { key: "terminal_profile" },
      create: { id: "terminal_profile", key: "terminal_profile", value: config.profile.key },
      update: { value: config.profile.key },
    }),
    prisma.siteSettings.upsert({
      where: { key: "business_type" },
      create: { id: "business_type", key: "business_type", value: config.profile.key },
      update: { value: config.profile.key },
    }),
    prisma.siteSettings.upsert({
      where: { key: "terminal_enabled_modules" },
      create: {
        id: "terminal_enabled_modules",
        key: "terminal_enabled_modules",
        value: JSON.stringify(config.enabledModules),
      },
      update: { value: JSON.stringify(config.enabledModules) },
    }),
  ]);

  await ensureTerminalDefaultConnectors();

  const mobileWorkstation = await prisma.terminalWorkstation.findFirst({
    where: { name: "Мобильный терминал", profile: config.profile.key },
    select: { id: true },
  });

  if (!mobileWorkstation) {
    await prisma.terminalWorkstation.create({
      data: {
        name: "Мобильный терминал",
        type: "MOBILE",
        profile: config.profile.key,
        paymentMode: config.enabledModules.includes("qr_payment") ? "manual_qr" : "cash_invoice",
        printerMode: config.enabledModules.includes("receipt_print") ? "connector" : "electronic",
        scannerMode: config.enabledModules.includes("barcode_scan") ? "usb_hid" : "none",
        settings: {
          autoconfigured: true,
          modules: config.enabledModules,
        },
      },
    });
  }

  const indexResult = await rebuildTerminalSearchIndex(300);
  await enqueueTerminalSyncJob({
    channel: "terminal",
    event: "terminal.autoconfig.applied",
    entityType: "terminal",
    priority: 1,
    payload: {
      profile: config.profile.key,
      enabledModules: config.enabledModules,
      detected: config.detected,
      indexResult,
    },
    idempotencyKey: `terminal:autoconfig:${new Date().toISOString().slice(0, 10)}`,
  });

  return { ...config, indexResult };
}
