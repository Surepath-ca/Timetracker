import { prisma } from "./db";

export type ReportEntry = {
  id: string;
  date: string;
  minutes: number;
  comment: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
};

export type MemberSummary = {
  userId: string;
  email: string;
  name: string | null;
  minutes: number;
};

export type ReportData = {
  project: { id: string; name: string; client: string | null; billable: boolean };
  from: string;
  to: string;
  entries: ReportEntry[];
  memberSummaries: MemberSummary[];
  totalMinutes: number;
};

export async function buildReport(projectId: string, from: string, to: string): Promise<ReportData | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const rows = await prisma.timeEntry.findMany({
    where: { projectId, date: { gte: from, lte: to } },
    include: { user: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const entries: ReportEntry[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    minutes: r.minutes,
    comment: r.comment,
    userId: r.userId,
    userEmail: r.user.email,
    userName: r.user.name,
  }));

  const byMember = new Map<string, MemberSummary>();
  let totalMinutes = 0;
  for (const e of entries) {
    totalMinutes += e.minutes;
    const cur = byMember.get(e.userId);
    if (cur) cur.minutes += e.minutes;
    else byMember.set(e.userId, { userId: e.userId, email: e.userEmail, name: e.userName, minutes: e.minutes });
  }

  return {
    project: { id: project.id, name: project.name, client: project.client, billable: project.billable },
    from,
    to,
    entries,
    memberSummaries: [...byMember.values()].sort((a, b) => b.minutes - a.minutes),
    totalMinutes,
  };
}

export function minutesToHoursNumber(min: number): number {
  return Math.round((min / 60) * 100) / 100;
}
