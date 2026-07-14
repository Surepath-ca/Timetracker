import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidDateString } from "@/lib/time";
import { jsonError, handleApiError } from "@/lib/api";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!entry || entry.userId !== user.id) return jsonError("Entry not found.", 404);

    const body = await req.json().catch(() => null);
    const data: Record<string, unknown> = {};
    if (body?.minutes !== undefined) {
      const minutes = Number(body.minutes);
      if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) {
        return jsonError("Duration must be between 1 minute and 24 hours.");
      }
      data.minutes = minutes;
    }
    if (body?.comment !== undefined) {
      data.comment = typeof body.comment === "string" ? body.comment.trim() || null : null;
    }
    if (body?.date !== undefined) {
      if (typeof body.date !== "string" || !isValidDateString(body.date)) {
        return jsonError("A valid date (YYYY-MM-DD) is required.");
      }
      data.date = body.date;
    }
    const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data,
      include: { project: { select: { id: true, name: true, color: true, client: true } } },
    });
    return NextResponse.json({ entry: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!entry || entry.userId !== user.id) return jsonError("Entry not found.", 404);
    await prisma.timeEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
