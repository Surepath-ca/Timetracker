import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isProjectOwner } from "@/lib/projects";
import { buildReport } from "@/lib/reports";
import { isValidDateString } from "@/lib/time";
import { jsonError, handleApiError } from "@/lib/api";

type Params = { params: { projectId: string } };

/** Report data (owner only): ?from=YYYY-MM-DD&to=YYYY-MM-DD */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.projectId, user.id))) {
      return jsonError("Only the project owner can view reports for this project.", 403);
    }
    const from = req.nextUrl.searchParams.get("from") || "";
    const to = req.nextUrl.searchParams.get("to") || "";
    if (!isValidDateString(from) || !isValidDateString(to) || from > to) {
      return jsonError("Valid from/to dates are required.");
    }
    const report = await buildReport(params.projectId, from, to);
    if (!report) return jsonError("Project not found.", 404);
    return NextResponse.json({ report });
  } catch (err) {
    return handleApiError(err);
  }
}
