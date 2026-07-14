import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, isAllowedEmail, normalizeEmail } from "@/lib/auth";
import { jsonError, handleApiError } from "@/lib/api";

/** List projects the current user belongs to. */
export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id, project: { archived: false } },
      include: {
        project: {
          include: {
            members: { include: { user: true } },
            _count: { select: { timeEntries: true } },
          },
        },
      },
      orderBy: { project: { createdAt: "desc" } },
    });
    return NextResponse.json({
      projects: memberships.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        client: m.project.client,
        description: m.project.description,
        color: m.project.color,
        billable: m.project.billable,
        myRole: m.role,
        entryCount: m.project._count.timeEntries,
        members: m.project.members.map((pm) => ({
          id: pm.user.id,
          email: pm.user.email,
          name: pm.user.name,
          role: pm.role,
        })),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Create a project. The creator picks the owner (defaults to themselves). */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return jsonError("Project name is required.");
    if (name.length > 120) return jsonError("Project name is too long.");

    const client = typeof body?.client === "string" ? body.client.trim() || null : null;
    const description =
      typeof body?.description === "string" ? body.description.trim() || null : null;
    const color = /^#[0-9a-fA-F]{6}$/.test(body?.color) ? body.color : "#16324f";
    const billable = body?.billable !== false;

    // Optional: designate a different owner by email (must be an allowed domain).
    let ownerId = user.id;
    if (typeof body?.ownerEmail === "string" && body.ownerEmail.trim()) {
      const ownerEmail = normalizeEmail(body.ownerEmail);
      if (!isAllowedEmail(ownerEmail)) {
        return jsonError("Owner email must be a SurePath email address.");
      }
      const owner = await prisma.user.upsert({
        where: { email: ownerEmail },
        update: {},
        create: { email: ownerEmail, name: ownerEmail.split("@")[0].replace(/[._-]+/g, " ") },
      });
      ownerId = owner.id;
    }

    const project = await prisma.project.create({
      data: {
        name,
        client,
        description,
        color,
        billable,
        members: {
          create:
            ownerId === user.id
              ? [{ userId: user.id, role: "OWNER" }]
              : [
                  { userId: ownerId, role: "OWNER" },
                  { userId: user.id, role: "MEMBER" },
                ],
        },
      },
    });
    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
