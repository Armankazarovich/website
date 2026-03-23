#!/usr/bin/env node
/**
 * Сжатие hero-изображений для улучшения Lighthouse score
 * Запуск: node scripts/compress-images.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public', 'images');

const heroImages = [
  {
    input: path.join(publicDir, 'production', 'hero-main.jpg'),
    output: path.join(publicDir, 'production', 'hero-main.jpg'),
    width: 1920,
    quality: 75,
  },
  {
    input: path.join(publicDir, 'production', 'hero-about.jpg'),
    output: path.join(publicDir, 'production', 'hero-about.jpg'),
    width: 1920,
    quality: 75,
  },
  {
    input: path.join(publicDir, 'production', 'hero-cta.jpg'),
    output: path.join(publicDir, 'production', 'hero-cta.jpg'),
    width: 1920,
    quality: 80,
  },
  {
    input: path.join(publicDir, 'production', 'ChatGPT Image 19 мар. 2026 г., 23_30_17.png'),
    output: path.join(publicDir, 'production', 'ChatGPT Image 19 мар. 2026 г., 23_30_17.png'),
    width: 1200,
    quality: 80,
    png: true,
  },
];

async function compress() {
  for (const img of heroImages) {
    if (!fs.existsSync(img.input)) {
      console.log(`⚠️  Не найден: ${path.basename(img.input)}`);
      continue;
    }

    const statBefore = fs.statSync(img.input);
    const sizeBefore = (statBefore.size / 1024).toFixed(0);

    try {
      // Читаем исходный файл в буфер сначала
      const inputBuffer = fs.readFileSync(img.input);
      const buffer = await sharp(inputBuffer)
        .resize(img.width, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        [img.png ? 'png' : 'jpeg'](
          img.png
            ? { quality: img.quality, compressionLevel: 9 }
            : { quality: img.quality, mozjpeg: true }
        )
        .toBuffer();

      // Сохраняем обратно
      fs.writeFileSync(img.output, buffer);

      const statAfter = fs.statSync(img.output);
      const sizeAfter = (statAfter.size / 1024).toFixed(0);
      const saved = (((statBefore.size - statAfter.size) / statBefore.size) * 100).toFixed(0);

      console.log(`✅ ${path.basename(img.input)}: ${sizeBefore} КБ → ${sizeAfter} КБ (−${saved}%)`);
    } catch (err) {
      console.error(`❌ Ошибка ${path.basename(img.input)}:`, err.message);
    }
  }

  // Также сжимаем production фото (prod-*.jpg)
  console.log('\n📁 Сжатие production фотографий...');
  const prodDir = path.join(publicDir, 'production');
  const prodFiles = fs.readdirSync(prodDir).filter(f => f.startsWith('prod-') && f.endsWith('.jpg'));

  for (const file of prodFiles) {
    const filePath = path.join(prodDir, file);
    const stat = fs.statSync(filePath);
    if (stat.size < 300 * 1024) continue; // пропускаем < 300KB

    const sizeBefore = (stat.size / 1024).toFixed(0);
    try {
      const inputBuffer = fs.readFileSync(filePath);
      const buffer = await sharp(inputBuffer)
        .resize(1400, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(filePath, buffer);
      const sizeAfter = (fs.statSync(filePath).size / 1024).toFixed(0);
      console.log(`  ✅ ${file}: ${sizeBefore} КБ → ${sizeAfter} КБ`);
    } catch (err) {
      console.error(`  ❌ ${file}:`, err.message);
    }
  }

  console.log('\n🎉 Готово! Теперь запусти git add + commit + push');
}

compress().catch(console.error);
