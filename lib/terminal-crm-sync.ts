import { prisma } from "@/lib/prisma";
import { resolveTerminalProfile } from "@/lib/terminal-profiles";

type SyncOrderInput = {
  id: string;
  orderNumber: number;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  totalAmount: unknown;
  status: string;
  terminalProfile?: string | null;
  contactMethod?: string | null;
  contactUsername?: string | null;
};

export async function syncTerminalOrderToCrm(order: SyncOrderInput) {
  const profile = resolveTerminalProfile(order.terminalProfile);
  const stage = profile.pipeline.crmStageMap[order.status] || "NEW";
  const phone = order.guestPhone?.trim();
  const email = order.guestEmail?.trim();

  const existingLead = await prisma.lead.findFirst({
    where: {
      convertedOrderId: order.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    name: order.guestName || phone || email || `Заказ #${order.orderNumber}`,
    phone,
    email,
    source: "PHONE" as const,
    stage: stage as any,
    value: Number(order.totalAmount || 0),
    comment: [
      `Терминал: ${profile.label}`,
      order.contactMethod ? `Канал: ${order.contactMethod}` : null,
      order.contactUsername ? `Контекст: ${order.contactUsername}` : null,
    ].filter(Boolean).join("\n"),
    convertedOrderId: order.id,
    convertedAt: new Date(),
    tags: ["terminal", profile.key],
  };

  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data,
    });
    return;
  }

  await prisma.lead.create({ data });
}
