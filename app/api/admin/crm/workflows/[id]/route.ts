/**
 * CRM Workflow [id] — PATCH (update/toggle) / DELETE
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/auth-helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireManager();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id } = params;

    const data: any = {};
    if ("active" in body) data.active = body.active;
    if ("name" in body) data.name = body.name;
    if ("description" in body) data.description = body.description;
    if ("trigger" in body) data.trigger = body.trigger;
    if ("conditions" in body) data.conditions = body.conditions;
    if ("actions" in body) data.actions = body.actions;
    if ("category" in body) data.category = body.category;
    if ("delayMinutes" in body) data.delayMinutes = body.delayMinutes;
    if ("sortOrder" in body) data.sortOrder = body.sortOrder;

    const wf = await prisma.workflow.update({ where: { id }, data });
    return NextResponse.json({ ok: true, workflow: wf });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authError = await requireManager();
  if (authError) return authError;

  try {
    await prisma.workflow.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
