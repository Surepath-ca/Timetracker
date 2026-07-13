import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isProjectMember, isProjectOwner } from "@/lib/projects";
import { jsonError, handleApiError } from "@/lib/api";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectMember(params.id, user.id))) {
      return jsonError("Project not found.", 404);
    }
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { members: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!project) return jsonError("Project not found.", 404);
    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        client: project.client,
        description: project.description,
        color: project.color,
        billable: project.billable,
        archived: project.archived,
        myRole: project.members.find((m) => m.userId === user.id)?.role,
        members: project.members.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
        })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.id, user.id))) {
      return jsonError("Only the project owner can edit the project.", 403);
    }
    const body = await req.json().catch(() => null);
    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.client === "string") data.client = body.client.trim() || null;
    if (typeof body?.description === "string") data.description = body.description.trim() || null;
    if (typeof body?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) data.color = body.color;
    if (typeof body?.billable === "boolean") data.billable = body.billable;
    if (typeof body?.archived === "boolean") data.archived = body.archived;
    await prisma.project.update({ where: { id: params.id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.id, user.id))) {
      return jsonError("Only the project owner can delete the project.", 403);
    }
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
