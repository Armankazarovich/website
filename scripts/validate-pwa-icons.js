/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const checks = [];
const faviconSizes = [16, 32, 48];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

async function pngInfo(relativePath) {
  const fullPath = path.join(root, relativePath);
  const metadata = await sharp(fullPath).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    bytes: fs.statSync(fullPath).size,
  };
}

function icoInfo(relativePath) {
  const buffer = fs.readFileSync(path.join(root, relativePath));
  if (buffer.length < 6) {
    return { valid: false, sizes: [], bytes: buffer.length, detail: "Header is too small." };
  }

  const reserved = buffer.readUInt16LE(0);
  const type = buffer.readUInt16LE(2);
  const count = buffer.readUInt16LE(4);
  const sizes = [];
  let valid = reserved === 0 && type === 1 && count > 0 && buffer.length >= 6 + count * 16;
  let detail = `reserved=${reserved}, type=${type}, count=${count}, bytes=${buffer.length}`;

  for (let index = 0; index < count; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = buffer.readUInt8(entryOffset) || 256;
    const height = buffer.readUInt8(entryOffset + 1) || 256;
    const bytesInResource = buffer.readUInt32LE(entryOffset + 8);
    const imageOffset = buffer.readUInt32LE(entryOffset + 12);
    const signature = buffer.subarray(imageOffset, imageOffset + 8);
    const isPng =
      signature.length === 8 &&
      signature[0] === 0x89 &&
      signature[1] === 0x50 &&
      signature[2] === 0x4e &&
      signature[3] === 0x47 &&
      signature[4] === 0x0d &&
      signature[5] === 0x0a &&
      signature[6] === 0x1a &&
      signature[7] === 0x0a;

    sizes.push(width);
    valid = valid && width === height && bytesInResource > 0 && imageOffset + bytesInResource <= buffer.length && isPng;
  }

  detail += `, sizes=${sizes.join(",")}`;
  return { valid, sizes, bytes: buffer.length, detail };
}

async function main() {
  const packageJson = JSON.parse(read("package.json"));
  const requiredPngs = [
    ["public/icons/icon-32x32.png", 32],
    ["public/icons/icon-72x72.png", 72],
    ["public/icons/icon-96x96.png", 96],
    ["public/icons/icon-128x128.png", 128],
    ["public/icons/icon-144x144.png", 144],
    ["public/icons/icon-152x152.png", 152],
    ["public/icons/icon-192x192.png", 192],
    ["public/icons/icon-384x384.png", 384],
    ["public/icons/icon-512x512.png", 512],
    ["public/apple-touch-icon.png", 180],
    ["public/favicon-32.png", 32],
  ];

  check(
    "PWA icon scripts are wired",
    packageJson.scripts?.["pwa:icons"] === "node scripts/generate-pilorus-pwa-icons.js" &&
      packageJson.scripts?.["pwa:check"] === "node scripts/validate-pwa-icons.js" &&
      exists("scripts/generate-pilorus-pwa-icons.js"),
    "Generation and validation must stay available from package scripts.",
  );

  for (const [relativePath, size] of requiredPngs) {
    if (!exists(relativePath)) {
      check(`${relativePath} exists`, false, "Missing PNG asset.");
      continue;
    }

    const info = await pngInfo(relativePath);
    check(
      `${relativePath} is ${size}x${size} solid PNG`,
      info.width === size && info.height === size && !info.hasAlpha && info.bytes > 0,
      `size=${info.width}x${info.height}, alpha=${info.hasAlpha}, bytes=${info.bytes}`,
    );
  }

  if (!exists("public/favicon.ico")) {
    check("public/favicon.ico exists", false, "Missing browser fallback ICO asset.");
  } else {
    const info = icoInfo("public/favicon.ico");
    check(
      "public/favicon.ico is a valid PiloRus multi-size ICO",
      info.valid && faviconSizes.every((size) => info.sizes.includes(size)),
      info.detail,
    );
  }

  const manifest = read("public/manifest.json");
  check(
    "Static manifest uses install-safe PNG icons",
    !manifest.includes("/logo.svg") &&
      manifest.includes("/icons/icon-192x192.png") &&
      manifest.includes("/icons/icon-512x512.png") &&
      manifest.includes('"purpose": "maskable any"'),
    "Static fallback manifest should not point maskable installs at a transparent SVG.",
  );

  const pwaContext = read("lib/pwa-install-context.ts");
  check(
    "PWA site icon cache version is current",
    /PWA_SITE_ICON_VERSION\s*=\s*"site-brand-pilorus-logo-20260610"/.test(pwaContext) &&
      /PWA_ARAY_ICON_VERSION\s*=\s*"pilorus-brand-header-20260526"/.test(pwaContext),
    "Bump the site icon version whenever generated icons change.",
  );

  const siteIcon = read("lib/site-pwa-icon.ts");
  check(
    "Dynamic PWA icon route uses prepared PNG source",
    siteIcon.includes('const DEFAULT_SITE_LOGO = "/icons/icon-512x512.png"') &&
      siteIcon.includes('if (logoUrl === "/logo.png") return DEFAULT_SITE_LOGO'),
    "The dynamic site icon endpoint must use the prepared square PNG source.",
  );

  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`[PWA] Icon guard failed (${failed.length}/${checks.length})`);
    for (const item of failed) console.error(`- ${item.name}: ${item.detail}`);
    process.exit(1);
  }

  console.log(`[PWA] Icon guard passed (${checks.length} gates)`);
}

main().catch((error) => {
  console.error(`[PWA] Icon guard crashed: ${error?.message || error}`);
  process.exit(1);
});
