/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportDir = path.join(root, "tmp");
const reportPath = path.join(reportDir, "cart-checkout-flow-report.md");
const baseUrl = (process.env.RELEASE_BASE_URL || "http://localhost:3101").replace(/\/$/, "");
const liveRequired = process.argv.includes("--live-required");

const checks = [];

function filePath(relPath) {
  return path.join(root, relPath);
}

function exists(relPath) {
  return fs.existsSync(filePath(relPath));
}

function read(relPath) {
  return fs.readFileSync(filePath(relPath), "utf8");
}

function includesAll(text, tokens) {
  return tokens.every((token) => text.includes(token));
}

function check(name, ok, detail, level = "static") {
  checks.push({ name, ok: Boolean(ok), detail, level });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
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

async function runLiveChecks() {
  try {
    const productResponse = await fetchWithTimeout(`${baseUrl}/api/calculator/products`);
    if (!productResponse.ok) {
      check(
        "Live calculator products endpoint",
        false,
        `Expected 200 from /api/calculator/products, got ${productResponse.status}`,
        "live",
      );
      return;
    }

    const products = await productResponse.json();
    const product = Array.isArray(products)
      ? products.find((item) => Array.isArray(item.variants) && item.variants.length > 0)
      : null;
    const variant = product?.variants?.[0];
    const unit = product && variant ? chooseCartUnit(product, variant) : null;

    check(
      "Live calculator exposes a purchasable variant",
      Boolean(product && variant && unit),
      "Calculator must expose at least one product that can travel into cart load.",
      "live",
    );

    if (!product || !variant || !unit) return;

    const cartResponse = await fetchWithTimeout(`${baseUrl}/api/cart/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ v: variant.id, q: 1, u: unit }] }),
    });
    const body = await cartResponse.json().catch(() => ({}));
    const item = Array.isArray(body.items) ? body.items[0] : null;

    check(
      "Live cart load accepts calculator variant",
      cartResponse.ok &&
        item?.variantId === variant.id &&
        item?.productSlug === product.slug &&
        Number(item?.quantity) > 0 &&
        Number(item?.price) > 0,
      "A product selected by calculator must become a real checkout cart item.",
      "live",
    );
  } catch (error) {
    const message = error?.name === "AbortError" ? "timeout" : error?.message || String(error);
    check(
      "Live cart checkout smoke",
      !liveRequired,
      liveRequired
        ? `Live server is required and failed: ${message}`
        : `Live server not available, static cart checks still ran: ${message}`,
      "live",
    );
  }
}

async function main() {
  const packageJson = JSON.parse(read("package.json"));
  const cartStore = read("store/cart.ts");
  const calculatorPage = read("app/(store)/calculator/page.tsx");
  const calculatorRoute = read("app/api/calculator/products/route.ts");
  const cartLoadRoute = read("app/api/cart/load/route.ts");
  const ordersRoute = read("app/api/orders/route.ts");
  const checkoutPage = read("app/(store)/checkout/page.tsx");

  check(
    "Cart check script is wired",
    Boolean(packageJson.scripts?.["cart:check"]) &&
      read("scripts/aray-quality-gate.js").includes("validate-cart-checkout-flow.js"),
    "Main quality gate must run this cart contract before release.",
  );

  check(
    "Cart hydration keeps a live cart",
    includesAll(cartStore, [
      "if (value == null) return null",
      "getInitialCartItems",
      "currentItems.length > 0",
      "writeCartItemsToStorage(currentItems)",
      "hasHydrated: true",
      "readCartItemsFromStorage()",
    ]),
    "Checkout must not erase a freshly added in-memory cart with empty localStorage.",
  );

  check(
    "Calculator adds to shared cart store",
    includesAll(calculatorPage, [
      "useCartStore",
      "addItem({",
      "setCartOpen(true)",
      "productImage: selectedProduct.images?.[0]",
    ]),
    "Calculator must use the same cart store and open the same cart drawer.",
  );

  check(
    "Browser cart flow guard has stable selectors",
    includesAll(calculatorPage, ["addItem"]) &&
      includesAll(read("components/store/product-card.tsx"), ["data-add-to-cart", "addItem"]) &&
      includesAll(read("app/(store)/cart/page.tsx"), ["data-cart-item", "data-cart-empty-state", "data-cart-checkout-link"]) &&
      exists("scripts/validate-browser-cart-flow.js"),
    "The real browser test needs stable selectors for add-to-cart and cart page states.",
  );

  check(
    "Calculator product source matches checkout availability",
    includesAll(calculatorRoute, [
      "getPublicVariantsFilter",
      "images: { isEmpty: false }",
      "pricePerCube",
      "pricePerPiece",
    ]),
    "Calculator must not show products that checkout/order validation rejects.",
  );

  check(
    "Cart loader revalidates DB products",
    includesAll(cartLoadRoute, [
      "getPublicVariantsFilter",
      "images: { isEmpty: false }",
      "getPurchasableQuantityLimit",
      "product.saleUnit",
    ]),
    "Stored cart data must be reloaded from DB before checkout.",
  );

  check(
    "Order API is server-authoritative",
    includesAll(ordersRoute, [
      "getPublicVariantsFilter",
      "saleUnitAllows",
      "serverTotal",
      "status: 409",
    ]),
    "Order creation must recheck products, units, quantities, and total price on the server.",
  );

  check(
    "Checkout waits for cart hydration before redirect",
    includesAll(checkoutPage, [
      "hydrateCart",
      "hasHydrated",
      "useCartStore((state) => state.items)",
      "shouldRedirectToCart",
      "visibleItems.map((item)",
    ]),
    "Checkout may redirect to cart only after hydration has finished.",
  );

  check(
    "Cart page subscribes to cart state fields directly",
    includesAll(read("app/(store)/cart/page.tsx"), [
      "useCartStore((state) => state.items)",
      "useCartStore((state) => state.hasHydrated)",
      "data-cart-item",
    ]),
    "Cart page should re-render when items hydrate from browser storage.",
  );

  check(
    "Core cart pages and APIs exist",
    [
      "app/(store)/cart/page.tsx",
      "app/(store)/checkout/page.tsx",
      "app/(store)/calculator/page.tsx",
      "app/api/cart/load/route.ts",
      "app/api/orders/route.ts",
    ].every(exists),
    "Buyer cart, checkout, calculator, cart loader, and order API are required.",
  );

  check(
    "Main add-to-cart UI surfaces share animation and store",
    ["components/store/product-card.tsx", "components/store/variant-selector.tsx", "components/store/variant-cards.tsx"]
      .every((relPath) => {
        const source = read(relPath);
        return includesAll(source, ["flyToCart", "addItem"]);
      }),
    "Catalog cards and product variant controls must keep add-to-cart behavior aligned.",
  );

  await runLiveChecks();

  const failed = checks.filter((item) => !item.ok);
  fs.mkdirSync(reportDir, { recursive: true });
  const report = [
    "# Cart Checkout Flow Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${baseUrl}`,
    `Live required: ${liveRequired ? "yes" : "no"}`,
    "",
    ...checks.map((item) => `- ${item.ok ? "[OK]" : "[FAIL]"} [${item.level}] ${item.name}: ${item.detail}`),
    "",
    failed.length ? `Result: FAILED (${failed.length})` : "Result: PASSED",
    "",
  ].join("\n");
  fs.writeFileSync(reportPath, report, "utf8");

  if (failed.length) {
    console.error("[ARAY] Cart checkout flow failed:");
    for (const item of failed) console.error(` - ${item.name}: ${item.detail}`);
    console.error(`[ARAY] Report: ${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  console.log(`[ARAY] Cart checkout flow passed (${checks.length} gates)`);
  console.log(`[ARAY] Report: ${path.relative(root, reportPath)}`);
}

main();
