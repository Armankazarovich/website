/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "release-smoke-report.md");
const baseUrl = (process.env.RELEASE_BASE_URL || "http://localhost:3101").replace(/\/$/, "");

const routes = [
  { label: "Home", path: "/", statuses: [200] },
  { label: "Catalog", path: "/catalog", statuses: [200] },
  { label: "Cart", path: "/cart", statuses: [200] },
  { label: "Checkout", path: "/checkout", statuses: [200] },
  { label: "Stories", path: "/stories", statuses: [200] },
  { label: "Services", path: "/services", statuses: [200] },
  { label: "PWA manifest", path: "/api/pwa/manifest?app=pilorus-catalog", statuses: [200], contentType: "json" },
  { label: "PWA site icon", path: "/api/pwa/site-icon?s=192&v=site-brand-20260526", statuses: [200], contentType: "image/png" },
  { label: "ARAY PWA icon", path: "/api/pwa/icon?s=192", statuses: [200], contentType: "image/png" },
  { label: "Public stories API", path: "/api/stories", statuses: [200] },
  { label: "Admin CRM auth gate", path: "/admin/crm", statuses: [200, 302, 307, 308] },
  { label: "Admin health auth gate", path: "/admin/health", statuses: [200, 302, 307, 308] },
];

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { redirect: "manual", ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function chooseCartUnit(product, variant) {
  const saleUnit = product.saleUnit || "BOTH";
  if (saleUnit !== "PIECE" && Number(variant.pricePerCube) > 0) return "CUBE";
  if (saleUnit !== "CUBE" && Number(variant.pricePerPiece) > 0) return "PIECE";
  return null;
}

async function main() {
  const results = [];
  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    try {
      const response = await fetchWithTimeout(url);
      const contentType = response.headers.get("content-type") || "";
      const statusOk = route.statuses.includes(response.status);
      const typeOk = route.contentType ? contentType.includes(route.contentType) : true;
      results.push({ ...route, ok: statusOk && typeOk, status: response.status, contentType, url });
    } catch (error) {
      results.push({
        ...route,
        ok: false,
        status: "ERR",
        contentType: "",
        url,
        error: error?.name === "AbortError" ? "timeout" : error?.message || String(error),
      });
    }
  }

  try {
    const productResponse = await fetchWithTimeout(`${baseUrl}/api/calculator/products`);
    const products = await productResponse.json().catch(() => []);
    const product = Array.isArray(products)
      ? products.find((item) => Array.isArray(item.variants) && item.variants.length > 0)
      : null;
    const variant = product?.variants?.[0];
    const unit = product && variant ? chooseCartUnit(product, variant) : null;

    if (!productResponse.ok || !product || !variant || !unit) {
      results.push({
        label: "Calculator to cart API",
        path: "/api/calculator/products -> /api/cart/load",
        ok: false,
        status: productResponse.status,
        contentType: productResponse.headers.get("content-type") || "",
        error: "No purchasable calculator product found",
      });
    } else {
      const cartResponse = await fetchWithTimeout(`${baseUrl}/api/cart/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ v: variant.id, q: 1, u: unit }] }),
      });
      const body = await cartResponse.json().catch(() => ({}));
      const item = Array.isArray(body.items) ? body.items[0] : null;
      results.push({
        label: "Calculator to cart API",
        path: "/api/calculator/products -> /api/cart/load",
        ok:
          cartResponse.ok &&
          item?.variantId === variant.id &&
          item?.productSlug === product.slug &&
          Number(item?.quantity) > 0 &&
          Number(item?.price) > 0,
        status: cartResponse.status,
        contentType: cartResponse.headers.get("content-type") || "",
        error: cartResponse.ok ? undefined : "Cart load rejected calculator variant",
      });
    }
  } catch (error) {
    results.push({
      label: "Calculator to cart API",
      path: "/api/calculator/products -> /api/cart/load",
      ok: false,
      status: "ERR",
      contentType: "",
      error: error?.name === "AbortError" ? "timeout" : error?.message || String(error),
    });
  }

  fs.mkdirSync(reportDir, { recursive: true });
  const report = [
    "# Release Smoke Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    "",
    ...results.map((item) => {
      const detail = item.error ? item.error : `${item.status} ${item.contentType}`.trim();
      return `- ${item.ok ? "[OK]" : "[FAIL]"} ${item.label} ${item.path}: ${detail}`;
    }),
    "",
    results.some((item) => !item.ok) ? "Result: FAILED" : "Result: PASSED",
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, report, "utf8");

  const failed = results.filter((item) => !item.ok);
  if (failed.length) {
    console.error("[ARAY] Release smoke failed:");
    for (const item of failed) {
      const detail = item.error ? item.error : `${item.status} ${item.contentType}`.trim();
      console.error(` - ${item.label} ${item.path}: ${detail}`);
    }
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  console.log(`[ARAY] Release smoke passed (${results.length} live routes)`);
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main();
