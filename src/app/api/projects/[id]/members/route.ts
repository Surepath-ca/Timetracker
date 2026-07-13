import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, isAllowedEmail, normalizeEmail } from "@/lib/auth";
import { isProjectOwner } from "@/lib/projects";
import { jsonError, handleApiError } from "@/lib/api";

type Params = { params: { id: string } };

/** Add a member (owner only). Body: { email, role? } */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.id, user.id))) {
      return jsonError("Only the project owner can add members.", 403);
    }
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!email || !isAllowedEmail(email)) {
      return jsonError("Members must have a SurePath email address.");
    }
    const role = body?.role === "OWNER" ? "OWNER" : "MEMBER";

    const member = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: email.split("@")[0].replace(/[._-]+/g, " ") },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: params.id, userId: member.id } },
      update: { role },
      create: { projectId: params.id, userId: member.id, role },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Remove a member (owner only). Body: { userId } */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.id, user.id))) {
      return jsonError("Only the project owner can remove members.", 403);
    }
    const body = await req.json().catch(() => null);
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return jsonError("userId is required.");

    // Never leave a project without an owner.
    const target = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: params.id, userId } },
    });
    if (!target) return jsonError("Member not found.", 404);
    if (target.role === "OWNER") {
      const ownerCount = await prisma.projectMember.count({
        where: { projectId: params.id, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return jsonError("You cannot remove the only owner. Assign another owner first.");
      }
    }
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: params.id, userId } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
