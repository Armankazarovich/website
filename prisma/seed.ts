import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("PiloAdmin2026!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "info@pilo-rus.ru" },
    update: {},
    create: {
      name: "Администратор",
      email: "info@pilo-rus.ru",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin created:", admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "doska-obreznaya" },
      update: {},
      create: { name: "Доска обрезная", slug: "doska-obreznaya", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: "brus" },
      update: {},
      create: { name: "Брус строительный", slug: "brus", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: "vagonka" },
      update: {},
      create: { name: "Вагонка", slug: "vagonka", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: "blok-haus" },
      update: {},
      create: { name: "Блок-хаус", slug: "blok-haus", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: "pogonazh" },
      update: {},
      create: { name: "Погонаж", slug: "pogonazh", sortOrder: 5 },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Create sample products with variants
  const [doskaCategory, brusCategory, vagonkaCategory, blokHausCategory] = categories;

  const doska = await prisma.product.upsert({
    where: { slug: "doska-obreznaya-hvoynaya" },
    update: {},
    create: {
      slug: "doska-obreznaya-hvoynaya",
      name: "Доска обрезная хвойная",
      description: "Обрезная доска из хвойных пород дерева (ель, сосна). Применяется в строительстве, при отделочных работах, изготовлении опалубки и заборов.",
      categoryId: doskaCategory.id,
      images: [],
      saleUnit: "BOTH",
      active: true,
      featured: true,
      variants: {
        create: [
          { size: "20×100×6000", pricePerCube: 12000, pricePerPiece: 36, piecesPerCube: 333, inStock: true },
          { size: "20×150×6000", pricePerCube: 11500, pricePerPiece: 52, piecesPerCube: 222, inStock: true },
          { size: "25×100×6000", pricePerCube: 11800, pricePerPiece: 45, piecesPerCube: 267, inStock: true },
          { size: "25×150×6000", pricePerCube: 11200, pricePerPiece: 63, piecesPerCube: 178, inStock: true },
          { size: "40×100×6000", pricePerCube: 10800, pricePerPiece: 65, piecesPerCube: 167, inStock: true },
          { size: "40×150×6000", pricePerCube: 10500, pricePerPiece: 95, piecesPerCube: 111, inStock: true },
          { size: "40×200×6000", pricePerCube: 10200, pricePerPiece: 122, piecesPerCube: 83, inStock: true },
          { size: "50×150×6000", pricePerCube: 10000, pricePerPiece: 113, piecesPerCube: 89, inStock: true },
          { size: "50×200×6000", pricePerCube: 9800, pricePerPiece: 147, piecesPerCube: 67, inStock: true },
        ],
      },
    },
  });

  const brus = await prisma.product.upsert({
    where: { slug: "brus-stroitelnyy" },
    update: {},
    create: {
      slug: "brus-stroitelnyy",
      name: "Брус строительный",
      description: "Строительный брус из хвойной древесины. Используется в каркасном строительстве, при возведении перекрытий и кровельных конструкций.",
      categoryId: brusCategory.id,
      images: [],
      saleUnit: "BOTH",
      active: true,
      featured: true,
      variants: {
        create: [
          { size: "50×50×6000", pricePerCube: 13500, pricePerPiece: 81, piecesPerCube: 167, inStock: true },
          { size: "50×100×6000", pricePerCube: 13000, pricePerPiece: 156, piecesPerCube: 83, inStock: true },
          { size: "50×150×6000", pricePerCube: 12800, pricePerPiece: 230, piecesPerCube: 56, inStock: true },
          { size: "100×100×6000", pricePerCube: 12500, pricePerPiece: 750, piecesPerCube: 17, inStock: true },
          { size: "100×150×6000", pricePerCube: 12200, pricePerPiece: 1098, piecesPerCube: 11, inStock: true },
          { size: "150×150×6000", pricePerCube: 12000, pricePerPiece: 1620, piecesPerCube: 7, inStock: true },
          { size: "200×200×6000", pricePerCube: 11800, pricePerPiece: 2832, piecesPerCube: 4, inStock: false },
        ],
      },
    },
  });

  const vagonka = await prisma.product.upsert({
    where: { slug: "vagonka-hvoynaya" },
    update: {},
    create: {
      slug: "vagonka-hvoynaya",
      name: "Вагонка хвойная",
      description: "Вагонка из хвойных пород дерева для внутренней и наружной отделки. Тип «евровагонка», профиль «классик».",
      categoryId: vagonkaCategory.id,
      images: [],
      saleUnit: "BOTH",
      active: true,
      featured: true,
      variants: {
        create: [
          { size: "12×96×3000", pricePerCube: 18000, pricePerPiece: 52, piecesPerCube: 347, inStock: true },
          { size: "12×96×6000", pricePerCube: 17500, pricePerPiece: 101, piecesPerCube: 174, inStock: true },
          { size: "16×96×3000", pricePerCube: 17000, pricePerPiece: 78, piecesPerCube: 218, inStock: true },
          { size: "16×96×6000", pricePerCube: 16500, pricePerPiece: 152, piecesPerCube: 109, inStock: true },
        ],
      },
    },
  });

  const blokHaus = await prisma.product.upsert({
    where: { slug: "blok-haus-hvoyny" },
    update: {},
    create: {
      slug: "blok-haus-hvoyny",
      name: "Блок-хаус хвойный",
      description: "Блок-хаус — имитация бревна для фасадной и внутренней отделки. Придаёт зданию вид деревянного сруба.",
      categoryId: blokHausCategory.id,
      images: [],
      saleUnit: "BOTH",
      active: true,
      featured: false,
      variants: {
        create: [
          { size: "36×190×3000", pricePerCube: 22000, pricePerPiece: 449, piecesPerCube: 49, inStock: true },
          { size: "36×190×6000", pricePerCube: 21000, pricePerPiece: 858, piecesPerCube: 24, inStock: true },
          { size: "40×140×6000", pricePerCube: 20000, pricePerPiece: 672, piecesPerCube: 30, inStock: true },
        ],
      },
    },
  });

  console.log("✅ Products created");

  // Create sample reviews
  await prisma.review.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Алексей М.",
        rating: 5,
        text: "Отличное качество доски! Брал для строительства забора. Всё точно по размеру, сухое, без гнили. Доставили быстро.",
        approved: true,
      },
      {
        name: "Сергей К.",
        rating: 5,
        text: "Заказывал брус 100×150 несколько кубов. Цена хорошая, как у производителя и должна быть. Привезли на следующий день.",
        approved: true,
      },
      {
        name: "Ирина В.",
        rating: 4,
        text: "Купила вагонку для бани. Хорошее качество, ровная, без сучков. Немного задержали с доставкой, но предупредили заранее.",
        approved: true,
      },
      {
        name: "Дмитрий П.",
        rating: 5,
        text: "Работаем с ПилоРус уже третий год. Стабильное качество, честные цены, никаких проблем с документами.",
        approved: true,
      },
    ],
  });
  console.log("✅ Reviews created");

  // Create sample promotion
  await prisma.promotion.upsert({
    where: { id: "promo-1" },
    update: {},
    create: {
      id: "promo-1",
      title: "Скидка на доску обрезную",
      description: "При заказе от 5 м³ — скидка 10% на всю обрезную доску",
      discount: 10,
      active: true,
    },
  });
  console.log("✅ Promotions created");

  console.log("🎉 Database seeded successfully!");
  console.log("Admin login: info@pilo-rus.ru / PiloAdmin2026!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
