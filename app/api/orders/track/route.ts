import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderNumStr = searchParams.get("order");
  const phone = searchParams.get("phone");

  if (!orderNumStr || !phone) {
    return NextResponse.json({ error: "Укажите номер заказа и телефон" }, { status: 400 });
  }

  const orderNumber = parseInt(orderNumStr);
  if (isNaN(orderNumber)) {
    return NextResponse.json({ error: "Неверный номер заказа" }, { status: 400 });
  }

  // Normalize phone — remove all non-digits
  const normalizePhone = (p: string) => p.replace(/\D/g, "");
  const phoneDigits = normalizePhone(phone);
  // Try last 10 digits to match various formats
  const phoneLast10 = phoneDigits.slice(-10);

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден. Проверьте номер заказа." }, { status: 404 });
  }

  // Verify phone matches (check if stored phone ends with same 10 digits)
  const storedPhoneDigits = normalizePhone(order.guestPhone || "");
  const storedPhoneLast10 = storedPhoneDigits.slice(-10);

  if (storedPhoneLast10 !== phoneLast10) {
    return NextResponse.json({ error: "Телефон не совпадает с указанным при оформлении заказа." }, { status: 404 });
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    guestName: order.guestName,
    deliveryAddress: order.deliveryAddress,
    totalAmount: order.totalAmount,
    items: order.items.map(item => ({
      productName: item.productName,
      variantSize: item.variantSize,
      quantity: Number(item.quantity),
      unitType: item.unitType,
      price: Number(item.price),
    })),
  });
}
