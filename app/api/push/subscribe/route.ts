export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: session?.user?.id || null },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session?.user?.id || null,
      },
    });

    // Приветственный пуш только для новых подписок
    if (!existing && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      try {
        const webpush = require("web-push");
        webpush.setVapidDetails(
          "mailto:info@pilo-rus.ru",
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        webpush.sendNotification(
          { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
          JSON.stringify({
            title: "🌲 ПилоРус — уведомления включены!",
            body: "Вы будете первыми узнавать об акциях и статусах заказов.",
            icon: "/icons/icon-192x192.png",
            url: "/",
          })
        ).catch(() => {});
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Error saving subscription" }, { status: 500 });
  }
}
