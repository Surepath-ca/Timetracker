import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { isProjectOwner } from "@/lib/projects";
import { buildReport, minutesToHoursNumber } from "@/lib/reports";
import { formatMinutes, isValidDateString } from "@/lib/time";
import { jsonError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: { projectId: string } };

const NAVY = "FF243A54";
const GOLD = "FF355E8C";
const LIGHT = "FFF2F6FA";

/** Excel time report (owner only): ?from&to */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.projectId, user.id))) {
      return jsonError("Only the project owner can export reports for this project.", 403);
    }
    const from = req.nextUrl.searchParams.get("from") || "";
    const to = req.nextUrl.searchParams.get("to") || "";
    if (!isValidDateString(from) || !isValidDateString(to) || from > to) {
      return jsonError("Valid from/to dates are required.");
    }
    const report = await buildReport(params.projectId, from, to);
    if (!report) return jsonError("Project not found.", 404);

    const wb = new ExcelJS.Workbook();
    wb.creator = "SurePath Time Tracker";
    wb.created = new Date();

    // ---- Detail sheet ----
    const ws = wb.addWorksheet("Time Report", {
      pageSetup: { orientation: "landscape", fitToPage: true },
    });
    ws.columns = [
      { width: 14 },
      { width: 28 },
      { width: 32 },
      { width: 10 },
      { width: 12 },
      { width: 60 },
    ];

    ws.mergeCells("A1:F1");
    const title = ws.getCell("A1");
    title.value = "SurePath Valuation & Advisory — Time Report";
    title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 30;

    const meta: Array<[string, string]> = [
      ["Project", report.project.name],
      ["Client", report.project.client || "—"],
      ["Period", `${report.from} to ${report.to}`],
      ["Generated", new Date().toISOString().slice(0, 10)],
      ["Total time", `${formatMinutes(report.totalMinutes)} (${minutesToHoursNumber(report.totalMinutes)} hours)`],
    ];
    meta.forEach(([k, v], i) => {
      const row = ws.getRow(3 + i);
      row.getCell(1).value = k;
      row.getCell(1).font = { bold: true, color: { argb: NAVY } };
      row.getCell(2).value = v;
    });

    const headerRowIdx = 3 + meta.length + 1;
    const header = ws.getRow(headerRowIdx);
    ["Date", "Team Member", "Email", "Hours", "Duration", "Work Comments"].forEach((h, i) => {
      const c = header.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c.border = { bottom: { style: "thin", color: { argb: GOLD } } };
    });

    report.entries.forEach((e, i) => {
      const row = ws.getRow(headerRowIdx + 1 + i);
      row.getCell(1).value = e.date;
      row.getCell(2).value = e.userName || e.userEmail.split("@")[0];
      row.getCell(3).value = e.userEmail;
      row.getCell(4).value = minutesToHoursNumber(e.minutes);
      row.getCell(4).numFmt = "0.00";
      row.getCell(5).value = formatMinutes(e.minutes);
      row.getCell(6).value = e.comment || "";
      row.getCell(6).alignment = { wrapText: true, vertical: "top" };
      if (i % 2 === 1) {
        for (let c = 1; c <= 6; c++) {
          row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        }
      }
    });

    const totalRow = ws.getRow(headerRowIdx + 1 + report.entries.length);
    totalRow.getCell(3).value = "Total";
    totalRow.getCell(3).font = { bold: true };
    totalRow.getCell(4).value = minutesToHoursNumber(report.totalMinutes);
    totalRow.getCell(4).numFmt = "0.00";
    totalRow.getCell(4).font = { bold: true };
    totalRow.getCell(5).value = formatMinutes(report.totalMinutes);
    totalRow.getCell(5).font = { bold: true };
    for (let c = 1; c <= 6; c++) {
      totalRow.getCell(c).border = { top: { style: "double", color: { argb: NAVY } } };
    }

    // ---- Summary sheet ----
    const sum = wb.addWorksheet("Summary by Member");
    sum.columns = [{ width: 28 }, { width: 32 }, { width: 12 }, { width: 12 }];
    const sh = sum.getRow(1);
    ["Team Member", "Email", "Hours", "Duration"].forEach((h, i) => {
      const c = sh.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    });
    report.memberSummaries.forEach((m, i) => {
      const row = sum.getRow(2 + i);
      row.getCell(1).value = m.name || m.email.split("@")[0];
      row.getCell(2).value = m.email;
      row.getCell(3).value = minutesToHoursNumber(m.minutes);
      row.getCell(3).numFmt = "0.00";
      row.getCell(4).value = formatMinutes(m.minutes);
    });
    const sumTotal = sum.getRow(2 + report.memberSummaries.length);
    sumTotal.getCell(2).value = "Total";
    sumTotal.getCell(2).font = { bold: true };
    sumTotal.getCell(3).value = minutesToHoursNumber(report.totalMinutes);
    sumTotal.getCell(3).numFmt = "0.00";
    sumTotal.getCell(3).font = { bold: true };
    sumTotal.getCell(4).value = formatMinutes(report.totalMinutes);
    sumTotal.getCell(4).font = { bold: true };

    const buffer = await wb.xlsx.writeBuffer();
    const safeName = report.project.name.replace(/[^\w\- ]+/g, "").replace(/\s+/g, "_");
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="TimeReport_${safeName}_${from}_to_${to}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
