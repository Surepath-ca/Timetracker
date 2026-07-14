import { prisma } from "./db";

export async function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const m = await getMembership(projectId, userId);
  return m?.role === "OWNER";
}

export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  return Boolean(await getMembership(projectId, userId));
}
