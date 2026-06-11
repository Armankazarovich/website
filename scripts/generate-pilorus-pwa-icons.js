/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const sourceLogo = path.join(publicDir, "logo.png");
const iconSizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32, 48];

function iconBackground(size) {
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#20100a"/>
      <stop offset="0.52" stop-color="#100b08"/>
      <stop offset="1" stop-color="#07120c"/>
    </linearGradient>
    <radialGradient id="warm" cx="32%" cy="24%" r="75%">
      <stop offset="0" stop-color="#f97316" stop-opacity="0.30"/>
      <stop offset="0.45" stop-color="#f59e0b" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#100b08" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f97316" stop-opacity="0.34"/>
      <stop offset="0.55" stop-color="#22c55e" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#base)"/>
  <rect width="${size}" height="${size}" fill="url(#warm)"/>
  <path d="M ${size * 0.08} ${size * 0.78} C ${size * 0.32} ${size * 0.64}, ${size * 0.58} ${size * 0.83}, ${size * 0.92} ${size * 0.57}" fill="none" stroke="#f97316" stroke-opacity="0.24" stroke-width="${Math.max(1, size * 0.018)}"/>
  <rect x="${size * 0.055}" y="${size * 0.055}" width="${size * 0.89}" height="${size * 0.89}" rx="${size * 0.14}" fill="none" stroke="url(#edge)" stroke-width="${Math.max(1, size * 0.018)}"/>
</svg>`);
}

async function renderIconBuffer(size) {
  const logoSize = Math.round(size * 0.74);
  const logo = await sharp(sourceLogo)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp(iconBackground(size))
    .composite([{ input: logo, gravity: "center" }])
    .flatten({ background: { r: 16, g: 11, b: 8 } })
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function renderIcon(size, outputPath) {
  fs.writeFileSync(outputPath, await renderIconBuffer(size));
}

async function writeFavicon(outputPath) {
  const images = await Promise.all(
    faviconSizes.map(async (size) => ({
      size,
      buffer: await renderIconBuffer(size),
    })),
  );
  const header = Buffer.alloc(6);
  const entries = Buffer.alloc(images.length * 16);
  let imageOffset = header.length + entries.length;

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = index * 16;
    entries.writeUInt8(size >= 256 ? 0 : size, entryOffset);
    entries.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2);
    entries.writeUInt8(0, entryOffset + 3);
    entries.writeUInt16LE(1, entryOffset + 4);
    entries.writeUInt16LE(32, entryOffset + 6);
    entries.writeUInt32LE(buffer.length, entryOffset + 8);
    entries.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += buffer.length;
  });

  fs.writeFileSync(outputPath, Buffer.concat([header, entries, ...images.map((image) => image.buffer)]));
}

async function main() {
  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Missing source logo: ${path.relative(root, sourceLogo)}`);
  }

  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of iconSizes) {
    const output = path.join(iconsDir, `icon-${size}x${size}.png`);
    await renderIcon(size, output);
    console.log(`[PWA] ${path.relative(root, output)}`);
  }

  await renderIcon(180, path.join(publicDir, "apple-touch-icon.png"));
  await renderIcon(32, path.join(publicDir, "favicon-32.png"));
  await writeFavicon(path.join(publicDir, "favicon.ico"));
  console.log("[PWA] public/apple-touch-icon.png");
  console.log("[PWA] public/favicon-32.png");
  console.log("[PWA] public/favicon.ico");
}

main().catch((error) => {
  console.error(`[PWA] Icon generation failed: ${error?.message || error}`);
  process.exit(1);
});
