// Generate Aray orange ball icons for PWA manifest
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function drawArayBall(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const r = W * 0.42;

  // Background fill (dark, matches app)
  ctx.fillStyle = "#1A0F0A";
  ctx.fillRect(0, 0, W, H);

  // Glow ring
  const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.1);
  glowGrad.addColorStop(0, "rgba(232,112,10,0.35)");
  glowGrad.addColorStop(1, "rgba(232,112,10,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // Main ball gradient
  const ballGrad = ctx.createRadialGradient(cx * 0.75, cy * 0.65, 0, cx, cy, r);
  ballGrad.addColorStop(0,    "#FFBB6B");
  ballGrad.addColorStop(0.22, "#FF8C2A");
  ballGrad.addColorStop(0.48, "#E8700A");
  ballGrad.addColorStop(0.72, "#C45500");
  ballGrad.addColorStop(1.0,  "#8B3200");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();

  // Shine overlay
  const shineGrad = ctx.createRadialGradient(cx * 0.82, cy * 0.72, 0, cx * 0.82, cy * 0.72, r * 0.65);
  shineGrad.addColorStop(0,   "rgba(255,255,255,0.55)");
  shineGrad.addColorStop(0.4, "rgba(255,255,255,0.18)");
  shineGrad.addColorStop(1,   "rgba(255,255,255,0)");

  ctx.save();
  ctx.translate(cx * 0.82, cy * 0.72);
  ctx.rotate(-20 * Math.PI / 180);
  ctx.scale(1.4, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = shineGrad;
  ctx.fill();
  ctx.restore();

  // Small bright specular
  const specGrad = ctx.createRadialGradient(cx * 0.82, cy * 0.62, 0, cx * 0.82, cy * 0.62, r * 0.12);
  specGrad.addColorStop(0, "rgba(255,255,255,0.75)");
  specGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx * 0.82, cy * 0.62, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();
}

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const outputDir = path.join(__dirname, "..", "public", "icons");

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  drawArayBall(canvas);
  const buffer = canvas.toBuffer("image/png");
  const filename = size === 180 ? "aray-180.png" : `aray-${size}.png`;
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`✓ ${filename} (${size}x${size})`);
}

// Also save as apple-touch-icon replacement
const canvas180 = createCanvas(180, 180);
drawArayBall(canvas180);
fs.writeFileSync(path.join(__dirname, "..", "public", "icons", "aray-apple-touch.png"), canvas180.toBuffer("image/png"));
console.log("✓ aray-apple-touch.png (180x180)");

console.log("\nDone! Add to manifest.json and update apple-touch-icon.");
