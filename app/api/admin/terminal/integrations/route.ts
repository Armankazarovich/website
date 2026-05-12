export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTerminalAdmin, requireTerminalStaff } from "@/lib/terminal-auth";
import {
  TERMINAL_INTEGRATION_BLUEPRINTS,
  ensureTerminalDefaultConnectors,
  enqueueTerminalSyncJob,
  rebuildTerminalSearchIndex,
} from "@/lib/terminal-sync";
import { getCurrentTenantId } from "@/lib/tenant-context";

function countsBy<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? "UNKNOWN");
    const rawCount = row._count;
    const count = typeof rawCount === "number" ? rawCount : Number(rawCount?._all || 0);
    acc[value] = (acc[value] || 0) + count;
    return acc;
  }, {});
}

export async function GET() {
  const auth = await requireTerminalStaff();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const [
    connectors,
    recentJobs,
    connectorStats,
    jobStats,
    indexStats,
    queuedJobs,
    failedJobs,
  ] = await Promise.all([
    prisma.terminalConnector.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { type: "asc" }, { name: "asc" }],
      take: 80,
    }),
    prisma.terminalSyncJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { connector: { select: { name: true, type: true, provider: true } } },
      take: 20,
    }),
    prisma.terminalConnector.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.terminalSyncJob.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.terminalSearchIndex.groupBy({ by: ["entityType"], where: { tenantId }, _count: { _all: true } }),
    prisma.terminalSyncJob.count({ where: { tenantId, status: "QUEUED" } }),
    prisma.terminalSyncJob.count({ where: { tenantId, status: "FAILED" } }),
  ]);

  return NextResponse.json({
    connectors,
    recentJobs,
    blueprint: TERMINAL_INTEGRATION_BLUEPRINTS,
    stats: {
      connectors: countsBy(connectorStats, "status"),
      jobs: countsBy(jobStats, "status"),
      index: countsBy(indexStats, "entityType"),
      queuedJobs,
      failedJobs,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTerminalAdmin();
  if (!auth.authorized) return auth.response;
  const tenantId = getCurrentTenantId();

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "seed");

  if (action === "seed") {
    const connectors = await ensureTerminalDefaultConnectors(tenantId);
    return NextResponse.json({ ok: true, connectors: connectors.length });
  }

  if (action === "reindex") {
    await ensureTerminalDefaultConnectors(tenantId);
    const result = await rebuildTerminalSearchIndex(Number(body.limit || 200), tenantId);
    await enqueueTerminalSyncJob({
      tenantId,
      channel: "search",
      event: "terminal.index.rebuilt",
      entityType: "terminal",
      priority: 2,
      payload: result,
      idempotencyKey: `terminal:index:rebuilt:${new Date().toISOString().slice(0, 10)}`,
    });
    return NextResponse.json({ ok: true, result });
  }

  if (action === "healthcheck") {
    await ensureTerminalDefaultConnectors(tenantId);
    const job = await enqueueTerminalSyncJob({
      tenantId,
      channel: "diagnostics",
      event: "terminal.integrations.healthcheck",
      entityType: "terminal",
      priority: 1,
      payload: {
        requestedBy: auth.session.user.id,
        checks: ["connectors", "queued_jobs", "qr_notifications", "webhooks", "print_queue"],
      },
      idempotencyKey: `terminal:healthcheck:${Date.now()}`,
    });
    return NextResponse.json({ ok: true, job });
  }

  if (action === "qr-notification-check") {
    const job = await enqueueTerminalSyncJob({
      tenantId,
      channel: "notifications",
      event: "notifications.qr.system_check",
      entityType: "terminal",
      priority: 1,
      payload: {
        requestedBy: auth.session.user.id,
        checks: ["order.created", "order.status_changed", "payment.qr.requested", "payment.webhook"],
      },
      idempotencyKey: `terminal:qr-notification-check:${Date.now()}`,
    });
    return NextResponse.json({ ok: true, job });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
