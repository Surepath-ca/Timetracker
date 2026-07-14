import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isProjectMember } from "@/lib/projects";
import { isValidDateString } from "@/lib/time";
import { jsonError, handleApiError } from "@/lib/api";

/** List the current user's entries between ?from and ?to (inclusive, YYYY-MM-DD). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const from = req.nextUrl.searchParams.get("from") || "";
    const to = req.nextUrl.searchParams.get("to") || "";
    if (!isValidDateString(from) || !isValidDateString(to) || from > to) {
      return jsonError("Valid from/to dates are required.");
    }
    const entries = await prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: from, lte: to } },
      include: { project: { select: { id: true, name: true, color: true, client: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Create a time entry. Body: { projectId, date, minutes, comment } */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const projectId = typeof body?.projectId === "string" ? body.projectId : "";
    const date = typeof body?.date === "string" ? body.date : "";
    const minutes = Number(body?.minutes);
    const comment = typeof body?.comment === "string" ? body.comment.trim() || null : null;

    if (!projectId) return jsonError("projectId is required.");
    if (!isValidDateString(date)) return jsonError("A valid date (YYYY-MM-DD) is required.");
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) {
      return jsonError("Duration must be between 1 minute and 24 hours.");
    }
    if (!(await isProjectMember(projectId, user.id))) {
      return jsonError("Only project members can log time to this project.", 403);
    }

    const entry = await prisma.timeEntry.create({
      data: { projectId, userId: user.id, date, minutes, comment },
      include: { project: { select: { id: true, name: true, color: true, client: true } } },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
