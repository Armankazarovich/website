import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderNotification } from "@/lib/mail";
import { z } from "zod";

const orderSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(5),
  paymentMethod: z.enum(["cash", "invoice"]),
  comment: z.string().optional(),
  items: z.array(
    z.object({
      variantId: z.string(),
      productName: z.string(),
      variantSize: z.string(),
      unitType: z.enum(["CUBE", "PIECE"]),
      quantity: z.number().positive(),
      price: z.number().positive(),
    })
  ).min(1),
  totalAmount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные заявки" }, { status: 400 });
    }

    const { name, phone, email, address, paymentMethod, comment, items, totalAmount } = parsed.data;

    const order = await prisma.order.create({
      data: {
        guestName: name,
        guestPhone: phone,
        guestEmail: email || null,
        deliveryAddress: address,
        paymentMethod: paymentMethod === "cash" ? "Наличные" : "Безнал по счёту",
        comment: comment || null,
        totalAmount,
        items: {
          create: items.map((item) => ({
            variantId: item.variantId,
            productName: item.productName,
            variantSize: item.variantSize,
            unitType: item.unitType,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    // Send email notification (non-blocking)
    sendOrderNotification({
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      guestEmail: order.guestEmail,
      guestPhone: order.guestPhone,
      totalAmount: Number(order.totalAmount),
      deliveryAddress: order.deliveryAddress,
      comment: order.comment,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        productName: item.productName,
        variantSize: item.variantSize,
        unitType: item.unitType,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
    }).catch(console.error);

    return NextResponse.json({ orderNumber: order.orderNumber, id: order.id }, { status: 201 });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
