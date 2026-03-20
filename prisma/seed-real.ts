import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Импорт реального каталога ПилоРус...");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.review.deleteMany();

  // Ensure admin exists
  const adminHash = await bcrypt.hash("PiloAdmin2026!", 12);
  await prisma.user.upsert({
    where: { email: "info@pilo-rus.ru" },
    update: {},
    create: { name: "Администратор", email: "info@pilo-rus.ru", passwordHash: adminHash, role: "ADMIN" },
  });

  // === КАТЕГОРИИ ===
  const catSosna = await prisma.category.create({ data: { name: "Сосна и Ель", slug: "sosna-el", sortOrder: 1, image: "/images/categories/sosna.jpg" } });
  const catListv = await prisma.category.create({ data: { name: "Лиственница", slug: "listvennitsa", sortOrder: 2, image: "/images/categories/listv.jpg" } });
  const catKedr  = await prisma.category.create({ data: { name: "Кедр", slug: "kedr", sortOrder: 3, image: "/images/categories/kedr.jpg" } });
  const catFan   = await prisma.category.create({ data: { name: "Фанера", slug: "fanera", sortOrder: 4, image: "/images/categories/fanera.jpg" } });
  const catDsp   = await prisma.category.create({ data: { name: "ДСП, МДФ, ОСБ, ЦСП", slug: "dsp-mdf-osb", sortOrder: 5, image: "/images/categories/dsp.jpg" } });
  const catLipa  = await prisma.category.create({ data: { name: "Липа и Осина", slug: "lipa-osina", sortOrder: 6, image: "/images/categories/lipa.jpg" } });

  console.log("✅ Категории созданы");

  // =====================================================================
  // СОСНА / ЕЛЬ
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-1sort-sosna", name: "Доска обрезная 1 сорт ГОСТ (Сосна/Ель)",
    description: "Обрезная доска из сосны и ели 1 сорт по ГОСТ. Длина 2–6 м. Применяется в строительстве, опалубке, кровле, заборах.",
    categoryId: catSosna.id, images: ["/images/products/doska-1.jpg", "/images/products/doska-2.jpg"], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "25×100", pricePerCube: 17000, pricePerPiece: 258,  piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 17000, pricePerPiece: 387,  piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 17000, pricePerPiece: 515,  piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 17000, pricePerPiece: 415,  piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 17000, pricePerPiece: 630,  piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 17000, pricePerPiece: 850,  piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 17000, pricePerPiece: 515,  piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 17000, pricePerPiece: 773,  piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 17000, pricePerPiece: 1065, piecesPerCube: 16, inStock: true },
      { size: "50×250", pricePerCube: 19500, pricePerPiece: 1500, piecesPerCube: 13, inStock: true },
      { size: "50×300", pricePerCube: 19500, pricePerPiece: 1780, piecesPerCube: 11, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-2sort-sosna", name: "Доска обрезная 2 сорт (Сосна/Ель)",
    description: "Обрезная доска из сосны/ели 2 сорт. Длина 2–6 м. Экономичный вариант для черновых работ, временных конструкций.",
    categoryId: catSosna.id, images: ["/images/products/doska-3.jpg"], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 8500,  pricePerPiece: 130, piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 8500,  pricePerPiece: 190, piecesPerCube: 44, inStock: true },
      { size: "40×100", pricePerCube: 13000, pricePerPiece: 317, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 13000, pricePerPiece: 480, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 13000, pricePerPiece: 650, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 13000, pricePerPiece: 395, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 13000, pricePerPiece: 590, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 13000, pricePerPiece: 815, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-tu-osina", name: "Доска обрезная ТУ (Осина)",
    description: "Доска обрезная из осины по ТУ. Длина 2–6 м. Лёгкая и чистая древесина, отлично подходит для бань и саун.",
    categoryId: catSosna.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 9000, pricePerPiece: 120, piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 9000, pricePerPiece: 185, piecesPerCube: 44, inStock: true },
      { size: "40×100", pricePerCube: 9000, pricePerPiece: 220, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 9000, pricePerPiece: 333, piecesPerCube: 27, inStock: true },
      { size: "50×100", pricePerCube: 9000, pricePerPiece: 275, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 9000, pricePerPiece: 410, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 9000, pricePerPiece: 560, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-suhaya-sosna", name: "Доска обрезная сухая 1 сорт (Сосна/Ель)",
    description: "Камерная сушка, влажность до 18%. Длина 2–6 м. Идеальна для чистовой отделки, полов, лестниц.",
    categoryId: catSosna.id, images: ["/images/products/doska-4.jpg"], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "25×100", pricePerCube: 19500, pricePerPiece: 295,  piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 19500, pricePerPiece: 443,  piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 19500, pricePerPiece: 590,  piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 19500, pricePerPiece: 475,  piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 19500, pricePerPiece: 725,  piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 19500, pricePerPiece: 975,  piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 19500, pricePerPiece: 590,  piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 19500, pricePerPiece: 888,  piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 19500, pricePerPiece: 1220, piecesPerCube: 16, inStock: true },
      { size: "50×250", pricePerCube: 22500, pricePerPiece: 1730, piecesPerCube: 13, inStock: true },
      { size: "50×300", pricePerCube: 22500, pricePerPiece: 2050, piecesPerCube: 11, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-1sort-sosna", name: "Брус обрезной 1 сорт ГОСТ (Сосна/Ель)",
    description: "Строительный брус из сосны/ели 1 сорт по ГОСТ. Длина 2–6 м. Используется в каркасном строительстве, перекрытиях, кровле.",
    categoryId: catSosna.id, images: ["/images/products/brus-1.jpg", "/images/products/brus-2.jpg"], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "100×100", pricePerCube: 17000, pricePerPiece: 1065, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 17000, pricePerPiece: 1545, piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 17000, pricePerPiece: 2125, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 17000, pricePerPiece: 2430, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 17000, pricePerPiece: 3400, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 17000, pricePerPiece: 4500, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-suhoy-sosna", name: "Брус обрезной сухой 1 сорт (Сосна/Ель)",
    description: "Сухой строительный брус камерной сушки. Длина 2–6 м. Минимальные деформации после монтажа.",
    categoryId: catSosna.id, images: ["/images/products/brus-3.jpg"], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 19500, pricePerPiece: 1220, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 19500, pricePerPiece: 1775, piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 19500, pricePerPiece: 2440, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 19500, pricePerPiece: 2785, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 19500, pricePerPiece: 3900, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 20500, pricePerPiece: 5125, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brusok-obreznoy-sosna", name: "Обрезной брусок (Сосна/Ель)",
    description: "Брусок строительный из сосны/ели. Длина 3 м. Используется для обрешётки, стропильной системы, каркасов.",
    categoryId: catSosna.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "25×50×3000", pricePerCube: 14000, pricePerPiece: 53,  piecesPerCube: 266, inStock: true },
      { size: "40×40×3000", pricePerCube: 14000, pricePerPiece: 67,  piecesPerCube: 208, inStock: true },
      { size: "50×50×3000", pricePerCube: 14000, pricePerPiece: 105, piecesPerCube: 133, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brusok-suhoy-strogannyy-sosna", name: "Брусок сухой строганный (Сосна/Ель)",
    description: "Строганный сухой брусок, длина 3 м. Для финишных работ, мебельного производства, столярных изделий.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×40×3000", pricePerPiece: 70,  inStock: true },
      { size: "20×50×3000", pricePerPiece: 85,  inStock: true },
      { size: "30×40×3000", pricePerPiece: 95,  inStock: true },
      { size: "30×50×3000", pricePerPiece: 125, inStock: true },
      { size: "40×50×3000", pricePerPiece: 170, inStock: true },
      { size: "40×60×3000", pricePerPiece: 200, inStock: true },
      { size: "45×45×3000", pricePerPiece: 170, inStock: true },
      { size: "50×50×3000", pricePerPiece: 210, inStock: true },
      { size: "50×70×3000", pricePerPiece: 295, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-strogannyy-suhoy-sosna", name: "Брус строганный сухой (Сосна/Ель)",
    description: "Строганный сухой брус, длина 2–6 м. Точная геометрия, гладкая поверхность. Для видимых конструкций и отделки.",
    categoryId: catSosna.id, images: ["/images/products/brus-4.jpg"], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "25×100",  pricePerCube: 24000, pricePerPiece: 360,  piecesPerCube: 66, inStock: true },
      { size: "25×120",  pricePerCube: 24000, pricePerPiece: 450,  piecesPerCube: 55, inStock: true },
      { size: "25×150",  pricePerCube: 24000, pricePerPiece: 550,  piecesPerCube: 44, inStock: true },
      { size: "25×200",  pricePerCube: 24000, pricePerPiece: 730,  piecesPerCube: 33, inStock: true },
      { size: "40×100",  pricePerCube: 21000, pricePerPiece: 515,  piecesPerCube: 41, inStock: true },
      { size: "40×150",  pricePerCube: 21000, pricePerPiece: 780,  piecesPerCube: 27, inStock: true },
      { size: "40×200",  pricePerCube: 21000, pricePerPiece: 1050, piecesPerCube: 20, inStock: true },
      { size: "40×250",  pricePerCube: 21000, pricePerPiece: 1500, piecesPerCube: 16, inStock: true },
      { size: "50×100",  pricePerCube: 21000, pricePerPiece: 640,  piecesPerCube: 33, inStock: true },
      { size: "50×150",  pricePerCube: 21000, pricePerPiece: 950,  piecesPerCube: 22, inStock: true },
      { size: "50×200",  pricePerCube: 21000, pricePerPiece: 1320, piecesPerCube: 16, inStock: true },
      { size: "50×250",  pricePerCube: 24000, pricePerPiece: 1850, piecesPerCube: 13, inStock: true },
      { size: "50×300",  pricePerCube: 24000, pricePerPiece: 2200, piecesPerCube: 11, inStock: true },
      { size: "100×100", pricePerCube: 21000, pricePerPiece: 1320, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 21000, pricePerPiece: 1900, piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 21000, pricePerPiece: 2630, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 21000, pricePerPiece: 3000, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 21000, pricePerPiece: 4200, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 22000, pricePerPiece: 5500, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-antisept-sosna", name: "Доска обрезная антисептированная (Сосна/Ель)",
    description: "Обрезная доска, обработанная антисептиком для защиты от гниения, плесени и насекомых. Длина 2–6 м.",
    categoryId: catSosna.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 19500, inStock: true },
      { size: "25×120", pricePerCube: 19500, inStock: true },
      { size: "25×150", pricePerCube: 19500, inStock: true },
      { size: "25×200", pricePerCube: 19500, inStock: true },
      { size: "40×100", pricePerCube: 19500, inStock: true },
      { size: "40×150", pricePerCube: 19500, inStock: true },
      { size: "40×200", pricePerCube: 19500, inStock: true },
      { size: "50×100", pricePerCube: 19500, inStock: true },
      { size: "50×150", pricePerCube: 19500, inStock: true },
      { size: "50×200", pricePerCube: 19500, inStock: true },
      { size: "50×250", pricePerCube: 19500, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-stroganaya-antisept-sosna", name: "Доска строганная антисептированная (Сосна/Ель)",
    description: "Строганная доска с антисептической пропиткой. Длина 2–6 м. Для наружных работ, террас, заборов.",
    categoryId: catSosna.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 28000, inStock: true },
      { size: "25×120", pricePerCube: 28000, inStock: true },
      { size: "25×150", pricePerCube: 28000, inStock: true },
      { size: "25×200", pricePerCube: 28000, inStock: true },
      { size: "40×100", pricePerCube: 25000, inStock: true },
      { size: "40×150", pricePerCube: 25000, inStock: true },
      { size: "40×200", pricePerCube: 25000, inStock: true },
      { size: "50×100", pricePerCube: 25000, inStock: true },
      { size: "50×150", pricePerCube: 25000, inStock: true },
      { size: "50×200", pricePerCube: 25000, inStock: true },
      { size: "50×250", pricePerCube: 25000, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-antisept-sosna", name: "Брус обрезной антисептированный (Сосна/Ель)",
    description: "Строительный брус с антисептической пропиткой. Длина 2–6 м. Защита от биологических поражений.",
    categoryId: catSosna.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 19500, inStock: true },
      { size: "100×150", pricePerCube: 19500, inStock: true },
      { size: "100×200", pricePerCube: 19500, inStock: true },
      { size: "150×150", pricePerCube: 19500, inStock: true },
      { size: "150×200", pricePerCube: 19500, inStock: true },
      { size: "200×200", pricePerCube: 19500, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-strogannyy-antisept-sosna", name: "Брус строганный антисептированный (Сосна/Ель)",
    description: "Строганный брус с антисептической пропиткой. Длина 2–6 м.",
    categoryId: catSosna.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 25000, inStock: true },
      { size: "100×150", pricePerCube: 25000, inStock: true },
      { size: "100×200", pricePerCube: 25000, inStock: true },
      { size: "150×150", pricePerCube: 25000, inStock: true },
      { size: "150×200", pricePerCube: 25000, inStock: true },
      { size: "200×200", pricePerCube: 25000, inStock: true },
    ]},
  }});

  // Имитация бруса — цена за м², saleUnit=PIECE, pricePerPiece = цена/м²
  await prisma.product.create({ data: {
    slug: "imitaciya-brusa-sosna", name: "Имитация бруса (Сосна/Ель)",
    description: "Имитация бруса из архангельской сосны/ели, сорт А. Длина 2–6 м. Для внутренней и наружной отделки стен.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "14×120", pricePerPiece: 590,  inStock: true },
      { size: "16×140", pricePerPiece: 660,  inStock: true },
      { size: "18×145", pricePerPiece: 740,  inStock: true },
      { size: "20×140", pricePerPiece: 790,  inStock: true },
      { size: "20×145", pricePerPiece: 790,  inStock: true },
      { size: "20×190", pricePerPiece: 800,  inStock: true },
      { size: "21×140", pricePerPiece: 790,  inStock: true },
      { size: "21×145", pricePerPiece: 840,  inStock: true },
      { size: "21×195", pricePerPiece: 840,  inStock: true },
      { size: "28×145", pricePerPiece: 940,  inStock: true },
      { size: "28×195", pricePerPiece: 1040, inStock: true },
      { size: "35×140", pricePerPiece: 840,  inStock: true },
      { size: "35×145", pricePerPiece: 840,  inStock: true },
      { size: "35×190", pricePerPiece: 1290, inStock: true },
      { size: "35×195", pricePerPiece: 1290, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "vagonka-shtil-sosna", name: "Вагонка штиль (Сосна/Ель)",
    description: "Вагонка профиль «штиль» из архангельской сосны/ели, сорт А. Длина 2–6 м. Для внутренней отделки.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "12,5×96",  pricePerPiece: 535, inStock: true },
      { size: "12,5×120", pricePerPiece: 540, inStock: true },
      { size: "12,5×140", pricePerPiece: 550, inStock: true },
      { size: "16×140",   pricePerPiece: 690, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "evrovagonka-sosna", name: "Евровагонка (Сосна/Ель)",
    description: "Евровагонка профиль «классик» из архангельской сосны/ели, сорт А. Длина 2–6 м.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "12,5×96", pricePerPiece: 500, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-pola-sosna", name: "Доска пола (европол) Сосна/Ель",
    description: "Шпунтованная доска пола из сосны/ели, сорт АВ. Длина 2–6 м. Для чистовых полов в домах и банях.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×90",  pricePerPiece: 840,  inStock: true },
      { size: "20×120", pricePerPiece: 840,  inStock: true },
      { size: "28×100", pricePerPiece: 940,  inStock: true },
      { size: "28×120", pricePerPiece: 940,  inStock: true },
      { size: "28×140", pricePerPiece: 940,  inStock: true },
      { size: "35×100", pricePerPiece: 1190, inStock: true },
      { size: "35×120", pricePerPiece: 1190, inStock: true },
      { size: "35×140", pricePerPiece: 1190, inStock: true },
      { size: "45×120", pricePerPiece: 1540, inStock: true },
      { size: "45×140", pricePerPiece: 1540, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "blok-haus-sosna", name: "Блок-хаус (Сосна/Ель)",
    description: "Блок-хаус из архангельской сосны/ели, сорт АВ. Длина 2–6 м. Имитирует вид оцилиндрованного бревна.",
    categoryId: catSosna.id, images: ["/images/products/blok-haus-1.jpg"], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "20×96",  pricePerPiece: 840,  inStock: true },
      { size: "28×140", pricePerPiece: 940,  inStock: true },
      { size: "35×140", pricePerPiece: 1190, inStock: true },
      { size: "35×190", pricePerPiece: 1190, inStock: true },
      { size: "45×140", pricePerPiece: 1540, inStock: true },
      { size: "45×190", pricePerPiece: 1540, inStock: true },
      { size: "45×240", pricePerPiece: 1540, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "planken-sosna", name: "Планкен (Сосна/Ель)",
    description: "Планкен прямой из сосны/ели, сорт А. Длина 6 м. Для фасадной обшивки и заборов.",
    categoryId: catSosna.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×95",  pricePerPiece: 410, inStock: true },
      { size: "20×120", pricePerPiece: 520, inStock: true },
      { size: "20×145", pricePerPiece: 630, inStock: true },
    ]},
  }});

  console.log("✅ Сосна/Ель — продукты созданы");

  // =====================================================================
  // ЛИСТВЕННИЦА
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-1sort-listv", name: "Доска обрезная 1 сорт (Лиственница)",
    description: "Обрезная доска из лиственницы 1 сорт. Длина 2–6 м. Высокая стойкость к влаге, гниению, насекомым.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "25×100", pricePerCube: 26000, pricePerPiece: 400,  piecesPerCube: 66, inStock: true },
      { size: "25×120", pricePerCube: 28000, pricePerPiece: 500,  piecesPerCube: 55, inStock: true },
      { size: "25×150", pricePerCube: 26000, pricePerPiece: 590,  piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 28000, pricePerPiece: 850,  piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 28000, pricePerPiece: 680,  piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 28000, pricePerPiece: 1040, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 28000, pricePerPiece: 1400, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 28000, pricePerPiece: 890,  piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 28000, pricePerPiece: 1270, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 28000, pricePerPiece: 1750, piecesPerCube: 16, inStock: true },
      { size: "50×250", pricePerCube: 32000, pricePerPiece: 2460, piecesPerCube: 13, inStock: true },
      { size: "50×300", pricePerCube: 32000, pricePerPiece: 2950, piecesPerCube: 11, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-suhaya-listv", name: "Доска обрезная сухая (Лиственница)",
    description: "Сухая обрезная доска из лиственницы, влажность до 18%. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 32000, pricePerPiece: 485,  piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 32000, pricePerPiece: 728,  piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 32000, pricePerPiece: 970,  piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 32000, pricePerPiece: 781,  piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 32000, pricePerPiece: 1185, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 32000, pricePerPiece: 1600, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 32000, pricePerPiece: 970,  piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 32000, pricePerPiece: 1455, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 32000, pricePerPiece: 2000, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-1sort-listv", name: "Брус обрезной 1 сорт ГОСТ (Лиственница)",
    description: "Строительный брус из лиственницы 1 сорт по ГОСТ. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "100×100", pricePerCube: 28000, pricePerPiece: 1750, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 28000, pricePerPiece: 2550, piecesPerCube: 11, inStock: true },
      { size: "150×150", pricePerCube: 28000, pricePerPiece: 4000, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 28000, pricePerPiece: 5600, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 30000, pricePerPiece: 7500, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-suhoy-listv", name: "Брус обрезной сухой (Лиственница)",
    description: "Сухой строительный брус из лиственницы. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 32000, pricePerPiece: 2000, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 32000, pricePerPiece: 2910, piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 32000, pricePerPiece: 4000, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 32000, pricePerPiece: 4572, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 32000, pricePerPiece: 6400, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 32000, pricePerPiece: 8000, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brusok-obreznoy-listv", name: "Обрезной брусок (Лиственница)",
    description: "Брусок строительный из лиственницы. Длина 3 м.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "25×50×3000", pricePerPiece: 105, piecesPerCube: 266, inStock: true },
      { size: "40×40×3000", pricePerPiece: 135, piecesPerCube: 208, inStock: true },
      { size: "50×50×3000", pricePerPiece: 210, piecesPerCube: 133, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-stroganaya-suhaya-listv", name: "Строганная доска сухая (Лиственница)",
    description: "Строганная сухая доска из лиственницы. Длина 2–6 м. Чистовая отделка, полы, террасы.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: true,
    variants: { create: [
      { size: "25×100", pricePerCube: 38000, pricePerPiece: 580,  piecesPerCube: 66, inStock: true },
      { size: "25×120", pricePerCube: 40000, pricePerPiece: 730,  piecesPerCube: 55, inStock: true },
      { size: "25×150", pricePerCube: 38000, pricePerPiece: 870,  piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 40000, pricePerPiece: 1220, piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 39000, pricePerPiece: 950,  piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 39000, pricePerPiece: 1440, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 39000, pricePerPiece: 1950, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 39000, pricePerPiece: 1180, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 39000, pricePerPiece: 1780, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 39000, pricePerPiece: 2450, piecesPerCube: 16, inStock: true },
      { size: "50×250", pricePerCube: 42000, pricePerPiece: 3250, piecesPerCube: 13, inStock: true },
      { size: "50×300", pricePerCube: 42000, pricePerPiece: 3820, piecesPerCube: 11, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-strogannyy-suhoy-listv", name: "Брус строганный сухой (Лиственница)",
    description: "Строганный сухой брус из лиственницы. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 39000, pricePerPiece: 2440,  piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 39000, pricePerPiece: 3550,  piecesPerCube: 11, inStock: true },
      { size: "150×150", pricePerCube: 39000, pricePerPiece: 5570,  piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 39000, pricePerPiece: 7800,  piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 42000, pricePerPiece: 10500, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brusok-strogannyy-suhoy-listv", name: "Брусок строганный сухой (Лиственница)",
    description: "Строганный сухой брусок из лиственницы. Длина 3 м.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×40×3000", pricePerPiece: 140, inStock: true },
      { size: "20×50×3000", pricePerPiece: 180, inStock: true },
      { size: "30×40×3000", pricePerPiece: 210, inStock: true },
      { size: "30×50×3000", pricePerPiece: 230, inStock: true },
      { size: "40×50×3000", pricePerPiece: 270, inStock: true },
      { size: "40×60×3000", pricePerPiece: 440, inStock: true },
      { size: "45×45×3000", pricePerPiece: 270, inStock: true },
      { size: "50×50×3000", pricePerPiece: 410, inStock: true },
      { size: "50×70×3000", pricePerPiece: 470, inStock: true },
    ]},
  }});

  // Брус клееный — нет цен → черновик
  await prisma.product.create({ data: {
    slug: "brus-kleenyy-listv", name: "Брус клееный (Лиственница)",
    description: "Клееный брус из лиственницы. Длина 6 м. Высочайшая геометрия, минимальные деформации.",
    categoryId: catListv.id, images: [], saleUnit: "BOTH", active: false, featured: false,
    variants: { create: [
      { size: "80×80",   piecesPerCube: 52, inStock: false },
      { size: "75×100",  piecesPerCube: 44, inStock: false },
      { size: "100×100", piecesPerCube: 16, inStock: false },
      { size: "100×150", piecesPerCube: 11, inStock: false },
      { size: "100×200", piecesPerCube: 8,  inStock: false },
      { size: "140×140", piecesPerCube: 8,  inStock: false },
      { size: "140×200", piecesPerCube: 6,  inStock: false },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-antisept-listv", name: "Доска обрезная антисептированная (Лиственница)",
    description: "Доска из лиственницы с антисептической пропиткой. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 32000, inStock: true },
      { size: "25×120", pricePerCube: 32000, inStock: true },
      { size: "25×150", pricePerCube: 32000, inStock: true },
      { size: "25×200", pricePerCube: 32000, inStock: true },
      { size: "40×100", pricePerCube: 32000, inStock: true },
      { size: "40×150", pricePerCube: 32000, inStock: true },
      { size: "40×200", pricePerCube: 32000, inStock: true },
      { size: "50×100", pricePerCube: 32000, inStock: true },
      { size: "50×150", pricePerCube: 32000, inStock: true },
      { size: "50×200", pricePerCube: 32000, inStock: true },
      { size: "50×250", pricePerCube: 32000, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-stroganaya-antisept-listv", name: "Доска строганная антисептированная (Лиственница)",
    description: "Строганная доска из лиственницы с антисептической пропиткой. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 44000, inStock: true },
      { size: "25×120", pricePerCube: 44000, inStock: true },
      { size: "25×150", pricePerCube: 44000, inStock: true },
      { size: "25×200", pricePerCube: 44000, inStock: true },
      { size: "40×100", pricePerCube: 44000, inStock: true },
      { size: "40×150", pricePerCube: 44000, inStock: true },
      { size: "40×200", pricePerCube: 44000, inStock: true },
      { size: "50×100", pricePerCube: 44000, inStock: true },
      { size: "50×150", pricePerCube: 44000, inStock: true },
      { size: "50×200", pricePerCube: 44000, inStock: true },
      { size: "50×250", pricePerCube: 44000, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-antisept-listv", name: "Брус антисептированный (Лиственница)",
    description: "Брус из лиственницы с антисептической пропиткой. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 32000, inStock: true },
      { size: "100×150", pricePerCube: 32000, inStock: true },
      { size: "100×200", pricePerCube: 32000, inStock: true },
      { size: "150×150", pricePerCube: 32000, inStock: true },
      { size: "150×200", pricePerCube: 32000, inStock: true },
      { size: "200×200", pricePerCube: 32000, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "planken-listv", name: "Планкен прямой/скошенный (Лиственница)",
    description: "Планкен из лиственницы для фасадной обшивки. Длина 2–6 м. Несколько классов сортировки.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "20×95 Экстра",  pricePerPiece: 2440, inStock: true },
      { size: "20×95 Прима",   pricePerPiece: 2040, inStock: true },
      { size: "20×95 А",       pricePerPiece: 1690, inStock: true },
      { size: "20×95 АВ",      pricePerPiece: 1540, inStock: true },
      { size: "20×95 ВС",      pricePerPiece: 940,  inStock: true },
      { size: "20×120 Экстра", pricePerPiece: 2640, inStock: true },
      { size: "20×120 Прима",  pricePerPiece: 2140, inStock: true },
      { size: "20×120 А",      pricePerPiece: 1790, inStock: true },
      { size: "20×120 АВ",     pricePerPiece: 1640, inStock: true },
      { size: "20×120 ВС",     pricePerPiece: 990,  inStock: true },
      { size: "20×140 Экстра", pricePerPiece: 2740, inStock: true },
      { size: "20×140 Прима",  pricePerPiece: 2240, inStock: true },
      { size: "20×140 А",      pricePerPiece: 1890, inStock: true },
      { size: "20×140 АВ",     pricePerPiece: 1740, inStock: true },
      { size: "20×140 ВС",     pricePerPiece: 1040, inStock: true },
      { size: "20×190 Экстра", pricePerPiece: 2790, inStock: true },
      { size: "20×190 Прима",  pricePerPiece: 2390, inStock: true },
      { size: "20×190 А",      pricePerPiece: 1990, inStock: true },
      { size: "20×190 АВ",     pricePerPiece: 1850, inStock: true },
      { size: "20×190 ВС",     pricePerPiece: 1750, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "terrasnaya-doska-listv", name: "Террасная доска (Лиственница)",
    description: "Террасная доска из лиственницы для открытых площадок. Длина 2–6 м.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "20×140 Экстра", pricePerPiece: 2640, inStock: true },
      { size: "20×140 Прима А",pricePerPiece: 2240, inStock: true },
      { size: "20×140 А",      pricePerPiece: 1890, inStock: true },
      { size: "20×140 АВ",     pricePerPiece: 1740, inStock: true },
      { size: "20×140 ВС",     pricePerPiece: 1040, inStock: true },
      { size: "28×140 Экстра", pricePerPiece: 3640, inStock: true },
      { size: "28×140 Прима А",pricePerPiece: 3240, inStock: true },
      { size: "28×140 А",      pricePerPiece: 2590, inStock: true },
      { size: "28×140 АВ",     pricePerPiece: 2340, inStock: true },
      { size: "28×140 ВС",     pricePerPiece: 1290, inStock: true },
      { size: "35×140 Экстра", pricePerPiece: 4640, inStock: true },
      { size: "35×140 Прима А",pricePerPiece: 4040, inStock: true },
      { size: "35×140 А",      pricePerPiece: 3090, inStock: true },
      { size: "35×140 АВ",     pricePerPiece: 2840, inStock: true },
      { size: "35×140 ВС",     pricePerPiece: 1640, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "vagonka-shtil-listv", name: "Вагонка штиль (Лиственница)",
    description: "Вагонка профиль «штиль» из лиственницы. Длина 2–6 м. Для внутренней и наружной отделки.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "14×96 Экстра",  pricePerPiece: 2040, inStock: true },
      { size: "14×96 Прима",   pricePerPiece: 1740, inStock: true },
      { size: "14×96 А",       pricePerPiece: 1350, inStock: true },
      { size: "14×96 АВ",      pricePerPiece: 1240, inStock: true },
      { size: "14×96 ВС",      pricePerPiece: 940,  inStock: true },
      { size: "14×120 Экстра", pricePerPiece: 1940, inStock: true },
      { size: "14×120 Прима",  pricePerPiece: 1640, inStock: true },
      { size: "14×120 А",      pricePerPiece: 1390, inStock: true },
      { size: "14×120 АВ",     pricePerPiece: 1240, inStock: true },
      { size: "14×120 ВС",     pricePerPiece: 840,  inStock: true },
      { size: "14×140 Экстра", pricePerPiece: 2240, inStock: true },
      { size: "14×140 Прима",  pricePerPiece: 1640, inStock: true },
      { size: "14×140 А",      pricePerPiece: 1440, inStock: true },
      { size: "14×140 АВ",     pricePerPiece: 1290, inStock: true },
      { size: "14×140 ВС",     pricePerPiece: 840,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "imitaciya-brusa-listv", name: "Имитация бруса (Лиственница)",
    description: "Имитация бруса из лиственницы. Длина 2–6 м. Несколько классов сортировки.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×140 Экстра", pricePerPiece: 2840, inStock: true },
      { size: "20×140 Прима",  pricePerPiece: 2240, inStock: true },
      { size: "20×140 А",      pricePerPiece: 2040, inStock: true },
      { size: "20×140 АВ",     pricePerPiece: 1640, inStock: true },
      { size: "20×140 ВС",     pricePerPiece: 900,  inStock: true },
      { size: "20×190 Экстра", pricePerPiece: 2940, inStock: true },
      { size: "20×190 Прима",  pricePerPiece: 2540, inStock: true },
      { size: "20×190 А",      pricePerPiece: 2140, inStock: true },
      { size: "20×190 АВ",     pricePerPiece: 1740, inStock: true },
      { size: "20×190 ВС",     pricePerPiece: 1650, inStock: true },
    ]},
  }});

  // Блок-хаус лиственница — нет цен → черновик
  await prisma.product.create({ data: {
    slug: "blok-haus-listv", name: "Блок-хаус (Лиственница)",
    description: "Блок-хаус из лиственницы. Длина 2–6 м. Имитация оцилиндрованного бревна.",
    categoryId: catListv.id, images: [], saleUnit: "PIECE", active: false, featured: false,
    variants: { create: [
      { size: "20×90/120 Экстра", inStock: false }, { size: "20×90/120 Прима", inStock: false },
      { size: "20×90/120 А",      inStock: false }, { size: "20×90/120 АВ",    inStock: false },
      { size: "28×140 Экстра",    inStock: false }, { size: "28×140 Прима",    inStock: false },
      { size: "28×140 А",         inStock: false }, { size: "28×140 АВ",       inStock: false },
      { size: "35×140 Экстра",    inStock: false }, { size: "35×140 Прима",    inStock: false },
    ]},
  }});

  console.log("✅ Лиственница — продукты созданы");

  // =====================================================================
  // КЕДР
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-kedr", name: "Брус обрезной (Кедр)",
    description: "Строительный брус из сибирского кедра. Длина 2–6 м. Природный антисептик, приятный аромат.",
    categoryId: catKedr.id, images: [], saleUnit: "CUBE", active: true, featured: true,
    variants: { create: [
      { size: "100×100", pricePerCube: 37000, piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 37000, piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 37000, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 37000, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 37000, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 37000, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-kedr", name: "Доска обрезная (Кедр)",
    description: "Обрезная доска из сибирского кедра. Длина 2–6 м.",
    categoryId: catKedr.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 37000, piecesPerCube: 66, inStock: true },
      { size: "25×130", pricePerCube: 37000, piecesPerCube: 51, inStock: true },
      { size: "25×150", pricePerCube: 37000, piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 37000, piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 37000, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 37000, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 37000, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 37000, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 37000, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 37000, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-suhaya-kedr", name: "Доска обрезная сухая (Кедр)",
    description: "Сухая обрезная доска из сибирского кедра. Длина 2–6 м.",
    categoryId: catKedr.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 40000, piecesPerCube: 66, inStock: true },
      { size: "25×130", pricePerCube: 40000, piecesPerCube: 51, inStock: true },
      { size: "25×150", pricePerCube: 40000, piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 40000, piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 40000, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 40000, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 40000, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 40000, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 40000, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 40000, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-stroganaya-kedr", name: "Доска строганная (Кедр)",
    description: "Строганная доска из сибирского кедра. Длина 2–6 м.",
    categoryId: catKedr.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 45000, piecesPerCube: 66, inStock: true },
      { size: "25×130", pricePerCube: 45000, piecesPerCube: 51, inStock: true },
      { size: "25×150", pricePerCube: 45000, piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 45000, piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 45000, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 45000, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 45000, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 45000, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 45000, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 45000, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "imitaciya-brusa-kedr", name: "Имитация бруса (Кедр)",
    description: "Имитация бруса из сибирского кедра. Длина 2–6 м. Природный аромат и антисептические свойства.",
    categoryId: catKedr.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "20×140", pricePerPiece: 1750, inStock: true },
      { size: "20×190", pricePerPiece: 1950, inStock: true },
      { size: "28×140", pricePerPiece: 2300, inStock: true },
      { size: "35×140", pricePerPiece: 3300, inStock: true },
      { size: "35×190", pricePerPiece: 3300, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "vagonka-shtil-kedr", name: "Вагонка штиль (Сибирский кедр)",
    description: "Вагонка «штиль» из сибирского кедра. Длина 2–6 м. Несколько классов сортировки.",
    categoryId: catKedr.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "14×96 Экстра",  pricePerPiece: 4700, inStock: true },
      { size: "14×96 Прима",   pricePerPiece: 3700, inStock: true },
      { size: "14×96 А",       pricePerPiece: 3200, inStock: true },
      { size: "14×96 АВ",      pricePerPiece: 1900, inStock: true },
      { size: "14×96 ВС",      pricePerPiece: 1200, inStock: true },
      { size: "14×115 Экстра", pricePerPiece: 5300, inStock: true },
      { size: "14×115 Прима",  pricePerPiece: 4300, inStock: true },
      { size: "14×115 А",      pricePerPiece: 4100, inStock: true },
      { size: "14×115 АВ",     pricePerPiece: 1900, inStock: true },
      { size: "14×115 ВС",     pricePerPiece: 1300, inStock: true },
      { size: "14×144 Экстра", pricePerPiece: 5300, inStock: true },
      { size: "14×144 Прима",  pricePerPiece: 4300, inStock: true },
      { size: "14×144 А",      pricePerPiece: 4100, inStock: true },
      { size: "14×144 АВ",     pricePerPiece: 1900, inStock: true },
      { size: "14×144 ВС",     pricePerPiece: 1700, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "planken-kedr", name: "Планкен прямой/косой (Кедр)",
    description: "Планкен из сибирского кедра. Длина 6–9 м.",
    categoryId: catKedr.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "20×100", pricePerPiece: 2000, inStock: true },
      { size: "20×120", pricePerPiece: 2000, inStock: true },
      { size: "20×140", pricePerPiece: 2000, inStock: true },
      { size: "20×190", pricePerPiece: 2000, inStock: true },
    ]},
  }});

  console.log("✅ Кедр — продукты созданы");

  // =====================================================================
  // ФАНЕРА
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "fanera-fk-1525", name: "Фанера ФК 1525×1525 мм (берёза)",
    description: "Фанера ФК березовая, формат 1525×1525 мм. Для внутренних работ, мебели, упаковки. Цена за лист.",
    categoryId: catFan.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "3 мм (4/4 стр.)",   pricePerPiece: 320,  inStock: true },
      { size: "3 мм (4/4 ГОСТ)",   pricePerPiece: 340,  inStock: true },
      { size: "4 мм (4/4 стр.)",   pricePerPiece: 380,  inStock: true },
      { size: "4 мм (4/4 ГОСТ)",   pricePerPiece: 400,  inStock: true },
      { size: "6 мм (4/4 стр.)",   pricePerPiece: 560,  inStock: true },
      { size: "6 мм (4/4 ГОСТ)",   pricePerPiece: 588,  inStock: true },
      { size: "9 мм (4/4 стр.)",   pricePerPiece: 780,  inStock: true },
      { size: "9 мм (4/4 ГОСТ)",   pricePerPiece: 800,  inStock: true },
      { size: "12 мм (4/4 стр.)",  pricePerPiece: 1020, inStock: true },
      { size: "12 мм (4/4 ГОСТ)",  pricePerPiece: 1040, inStock: true },
      { size: "15 мм (4/4 стр.)",  pricePerPiece: 1220, inStock: true },
      { size: "18 мм (4/4 стр.)",  pricePerPiece: 1450, inStock: true },
      { size: "21 мм (4/4 стр.)",  pricePerPiece: 1620, inStock: true },
      { size: "24 мм (4/4 стр.)",  pricePerPiece: 1980, inStock: true },
      { size: "30 мм (4/4 стр.)",  pricePerPiece: 2480, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "fanera-fsf-bereza-1220", name: "Фанера ФСФ берёза 1220×2440 мм",
    description: "Фанера ФСФ березовая, формат 1220×2440 мм. Для наружных и строительных работ. Цена за лист.",
    categoryId: catFan.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "4 мм (4/4 стр.)",  pricePerPiece: 630,  inStock: true },
      { size: "4 мм (4/4 ГОСТ)", pricePerPiece: 650,  inStock: true },
      { size: "6 мм (4/4 стр.)",  pricePerPiece: 820,  inStock: true },
      { size: "6 мм (4/4 ГОСТ)", pricePerPiece: 856,  inStock: true },
      { size: "9 мм (4/4 стр.)",  pricePerPiece: 1100, inStock: true },
      { size: "9 мм (4/4 ГОСТ)", pricePerPiece: 1140, inStock: true },
      { size: "12 мм (4/4 стр.)", pricePerPiece: 1350, inStock: true },
      { size: "12 мм (4/4 ГОСТ)",pricePerPiece: 1420, inStock: true },
      { size: "15 мм (4/4 стр.)", pricePerPiece: 1700, inStock: true },
      { size: "18 мм (4/4 стр.)", pricePerPiece: 2050, inStock: true },
      { size: "21 мм (4/4 стр.)", pricePerPiece: 2370, inStock: true },
      { size: "24 мм (4/4 стр.)", pricePerPiece: 2680, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "fanera-fsf-hvoya-1220", name: "Фанера ФСФ хвоя 1220×2440 мм",
    description: "Фанера ФСФ хвойная, формат 1220×2440 мм. Для строительных работ. Цена за лист.",
    categoryId: catFan.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "4 мм (4/4 стр.)",  pricePerPiece: 630,  inStock: true },
      { size: "6 мм (4/4 стр.)",  pricePerPiece: 830,  inStock: true },
      { size: "9 мм (4/4 стр.)",  pricePerPiece: 1100, inStock: true },
      { size: "12 мм (4/4 стр.)", pricePerPiece: 1380, inStock: true },
      { size: "15 мм (4/4 стр.)", pricePerPiece: 1720, inStock: true },
      { size: "18 мм (4/4 стр.)", pricePerPiece: 2100, inStock: true },
      { size: "21 мм (4/4 стр.)", pricePerPiece: 2350, inStock: true },
      { size: "24 мм (4/4 стр.)", pricePerPiece: 2750, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "fanera-fsf-1500", name: "Фанера ФСФ 1500×3000 мм",
    description: "Фанера ФСФ крупноформатная, 1500×3000 мм. Для опалубки и строительства. Цена за лист.",
    categoryId: catFan.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "6 мм (4/4 стр.)",  pricePerPiece: 1500, inStock: true },
      { size: "9 мм (4/4 стр.)",  pricePerPiece: 1900, inStock: true },
      { size: "12 мм (4/4 стр.)", pricePerPiece: 2400, inStock: true },
      { size: "15 мм (4/4 стр.)", pricePerPiece: 2900, inStock: true },
      { size: "18 мм (4/4 стр.)", pricePerPiece: 3400, inStock: true },
      { size: "21 мм (4/4 стр.)", pricePerPiece: 4100, inStock: true },
      { size: "24 мм (4/4 стр.)", pricePerPiece: 4550, inStock: true },
      { size: "27 мм (4/4 стр.)", pricePerPiece: 5000, inStock: true },
      { size: "30 мм (4/4 стр.)", pricePerPiece: 5550, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "fanera-laminir-1220", name: "Фанера ФСФ ламинированная 1220×2440 мм",
    description: "Ламинированная фанера ФСФ, формат 1220×2440 мм. Для многоразовой опалубки. Цена за лист.",
    categoryId: catFan.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "18 мм (1/1)",  pricePerPiece: 3240, inStock: true },
      { size: "18 мм F/W г/с",pricePerPiece: 3250, inStock: true },
      { size: "21 мм (1/1)",  pricePerPiece: 3780, inStock: true },
      { size: "21 мм F/W г/с",pricePerPiece: 4650, inStock: true },
      { size: "24 мм (1/1)",  pricePerPiece: 4760, inStock: true },
      { size: "27 мм (1/1)",  pricePerPiece: 5830, inStock: true },
    ]},
  }});

  console.log("✅ Фанера — продукты созданы");

  // =====================================================================
  // ДСП, МДФ, ОСБ, ЦСП
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "dsp-list", name: "ДСП",
    description: "Древесностружечная плита. Цена за лист. Применяется в мебельном производстве, отделке.",
    categoryId: catDsp.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "16 мм 1830×2440",    pricePerPiece: 1840, inStock: true },
      { size: "16 мм 1830×3500",    pricePerPiece: 2530, inStock: true },
      { size: "16 мм 1830×2700 1с", pricePerPiece: 2300, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "osb-3-1220", name: "ОСБ-3 1220×2440 мм",
    description: "Ориентированно-стружечная плита ОСБ-3 для влажных условий. Формат 1220×2440 мм. Цена за лист.",
    categoryId: catDsp.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "9 мм",  pricePerPiece: 770,  inStock: true },
      { size: "12 мм", pricePerPiece: 950,  inStock: true },
      { size: "15 мм", pricePerPiece: 1280, inStock: true },
      { size: "18 мм", pricePerPiece: 1420, inStock: true },
      { size: "22 мм", pricePerPiece: 1850, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "dvp-orgalit", name: "ДВП (оргалит)",
    description: "Древесноволокнистая плита (оргалит). Цена за лист.",
    categoryId: catDsp.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "3,2 мм 1220×2140", pricePerPiece: 180, inStock: true },
      { size: "3,2 мм 1220×2440", pricePerPiece: 260, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "mdf-list", name: "МДФ 2800×2070 мм",
    description: "МДФ-плита, формат 2800×2070 мм. Для мебели, отделки. Цена за лист.",
    categoryId: catDsp.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "8 мм",  pricePerPiece: 1450, inStock: true },
      { size: "10 мм", pricePerPiece: 1650, inStock: true },
      { size: "12 мм", pricePerPiece: 1590, inStock: true },
      { size: "16 мм", pricePerPiece: 2250, inStock: true },
      { size: "18 мм", pricePerPiece: 2600, inStock: true },
      { size: "22 мм", pricePerPiece: 2800, inStock: true },
      { size: "25 мм", pricePerPiece: 3380, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "csp-list", name: "ЦСП 1250×3200 мм",
    description: "Цементно-стружечная плита, формат 1250×3200 мм. Для наружных работ, влажных помещений. Цена за лист.",
    categoryId: catDsp.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "8 мм (40 кг)",   pricePerPiece: 1850, inStock: true },
      { size: "10 мм (50 кг)",  pricePerPiece: 1950, inStock: true },
      { size: "12 мм (65 кг)",  pricePerPiece: 2350, inStock: true },
      { size: "16 мм (84 кг)",  pricePerPiece: 2850, inStock: true },
      { size: "20 мм (104 кг)", pricePerPiece: 3450, inStock: true },
    ]},
  }});

  console.log("✅ ДСП/МДФ/ОСБ/ЦСП — продукты созданы");

  // =====================================================================
  // ЛИПА / ОСИНА
  // =====================================================================

  await prisma.product.create({ data: {
    slug: "vagonka-osina", name: "Вагонка (Осина)",
    description: "Вагонка из осины. Длина 1–3 м. Идеальна для отделки бань и саун — не нагревается, без смол.",
    categoryId: catLipa.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "15×96 до 1,7 м Экстра", pricePerPiece: 1150, inStock: true },
      { size: "15×96 до 3 м Экстра",   pricePerPiece: 1150, inStock: true },
      { size: "15×96 до 1,7 м А",      pricePerPiece: 1000, inStock: true },
      { size: "15×96 до 3 м А",        pricePerPiece: 1000, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "vagonka-lipa", name: "Вагонка (Липа)",
    description: "Вагонка из липы. Длина 1–3 м. Мягкая, хорошо держит тепло. Классический выбор для бань.",
    categoryId: catLipa.id, images: [], saleUnit: "PIECE", active: true, featured: true,
    variants: { create: [
      { size: "15×96 до 1,7 м Экстра", pricePerPiece: 1200, inStock: true },
      { size: "15×96 до 3 м Экстра",   pricePerPiece: 1200, inStock: true },
      { size: "15×96 до 1,7 м А",      pricePerPiece: 1050, inStock: true },
      { size: "15×96 до 3 м А",        pricePerPiece: 1050, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "doska-obreznaya-osina", name: "Доска обрезная 1 сорт (Осина)",
    description: "Обрезная доска из осины 1 сорт. Длина 2–6 м. Лёгкая, чистая древесина.",
    categoryId: catLipa.id, images: [], saleUnit: "CUBE", active: true, featured: false,
    variants: { create: [
      { size: "25×100", pricePerCube: 10000, piecesPerCube: 66, inStock: true },
      { size: "25×150", pricePerCube: 10000, piecesPerCube: 44, inStock: true },
      { size: "25×200", pricePerCube: 10000, piecesPerCube: 33, inStock: true },
      { size: "40×100", pricePerCube: 10000, piecesPerCube: 41, inStock: true },
      { size: "40×150", pricePerCube: 10000, piecesPerCube: 27, inStock: true },
      { size: "40×200", pricePerCube: 10000, piecesPerCube: 20, inStock: true },
      { size: "50×100", pricePerCube: 10000, piecesPerCube: 33, inStock: true },
      { size: "50×150", pricePerCube: 10000, piecesPerCube: 22, inStock: true },
      { size: "50×200", pricePerCube: 10000, piecesPerCube: 16, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "plintus-lipa-sosna", name: "Плинтус (Липа/Сосна)",
    description: "Деревянный плинтус из липы/сосны. Длина 1–6 м. Цена за погонный метр.",
    categoryId: catLipa.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "25×25", pricePerPiece: 55, inStock: true },
      { size: "35×35", pricePerPiece: 65, inStock: true },
      { size: "45×45", pricePerPiece: 75, inStock: true },
      { size: "55×55", pricePerPiece: 85, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "plintus-lipa", name: "Плинтус (Липа)",
    description: "Деревянный плинтус из чистой липы. Длина 1–6 м. Цена за погонный метр.",
    categoryId: catLipa.id, images: [], saleUnit: "PIECE", active: true, featured: false,
    variants: { create: [
      { size: "25×25", pricePerPiece: 45, inStock: true },
      { size: "35×35", pricePerPiece: 55, inStock: true },
      { size: "45×45", pricePerPiece: 65, inStock: true },
      { size: "55×55", pricePerPiece: 75, inStock: true },
    ]},
  }});

  await prisma.product.create({ data: {
    slug: "brus-obreznoy-osina", name: "Брус обрезной 1 сорт (Осина)",
    description: "Обрезной брус из осины 1 сорт. Длина 2–6 м.",
    categoryId: catLipa.id, images: [], saleUnit: "BOTH", active: true, featured: false,
    variants: { create: [
      { size: "100×100", pricePerCube: 10000, pricePerPiece: 625,  piecesPerCube: 16, inStock: true },
      { size: "100×150", pricePerCube: 10000, pricePerPiece: 910,  piecesPerCube: 11, inStock: true },
      { size: "100×200", pricePerCube: 10000, pricePerPiece: 1250, piecesPerCube: 8,  inStock: true },
      { size: "150×150", pricePerCube: 10000, pricePerPiece: 1430, piecesPerCube: 7,  inStock: true },
      { size: "150×200", pricePerCube: 10000, pricePerPiece: 2000, piecesPerCube: 5,  inStock: true },
      { size: "200×200", pricePerCube: 10000, pricePerPiece: 2500, piecesPerCube: 4,  inStock: true },
    ]},
  }});

  console.log("✅ Липа/Осина — продукты созданы");

  // =====================================================================
  // ОТЗЫВЫ
  // =====================================================================
  await prisma.review.createMany({ data: [
    { name: "Алексей М.", rating: 5, text: "Отличное качество доски! Брал для строительства забора. Всё точно по размеру, сухое, без гнили. Доставили быстро.", approved: true },
    { name: "Сергей К.", rating: 5, text: "Заказывал брус 100×150 несколько кубов. Цена хорошая, как у производителя и должна быть. Привезли на следующий день.", approved: true },
    { name: "Ирина В.", rating: 4, text: "Купила вагонку для бани. Хорошее качество, ровная, без сучков. Немного задержали с доставкой, но предупредили заранее.", approved: true },
    { name: "Дмитрий П.", rating: 5, text: "Работаем с ПилоРус уже третий год. Стабильное качество, честные цены, никаких проблем с документами.", approved: true },
    { name: "Михаил Т.", rating: 5, text: "Брал лиственницу для террасы — отличный материал, ровный, запах приятный. Рекомендую всем.", approved: true },
  ]});

  console.log("✅ Отзывы созданы");
  console.log("🎉 Каталог ПилоРус успешно загружен!");
  console.log("Admin: info@pilo-rus.ru / PiloAdmin2026!");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
