import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Укажи свой email или телефон
  const emailOrPhone = process.argv[2];

  if (!emailOrPhone) {
    console.log("❌ Укажи email: npx ts-node prisma/make-admin.ts your@email.com");
    process.exit(1);
  }

  const user = await prisma.user.updateMany({
    where: {
      OR: [
        { email: emailOrPhone },
        { phone: emailOrPhone },
      ],
    },
    data: { role: "ADMIN" },
  });

  if (user.count === 0) {
    console.log("❌ Пользователь не найден:", emailOrPhone);
  } else {
    console.log("✅ Роль ADMIN успешно установлена для:", emailOrPhone);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
