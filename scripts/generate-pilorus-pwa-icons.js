/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const sourceLogo = fs.existsSync(path.join(publicDir, "logo-icon.png"))
  ? path.join(publicDir, "logo-icon.png")
  : path.join(publicDir, "logo.png");
const iconSizes = [32, 72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32, 48];

async function renderIconBuffer(size) {
  const logoSize = Math.round(size * 0.92);
  const logo = await sharp(sourceLogo)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
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
