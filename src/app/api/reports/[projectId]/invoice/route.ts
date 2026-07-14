import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { isProjectOwner } from "@/lib/projects";
import { buildReport, minutesToHoursNumber } from "@/lib/reports";
import { isValidDateString } from "@/lib/time";
import { jsonError, handleApiError } from "@/lib/api";

export const runtime = "nodejs";

type Params = { params: { projectId: string } };

const NAVY = "FF243A54";
const GOLD = "FF355E8C";
const LIGHT = "FFF2F6FA";

type InvoiceBody = {
  from: string;
  to: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  billTo: string;
  companyDetails?: string;
  currency?: string;
  taxLabel?: string;
  taxRate?: number; // percent
  notes?: string;
  defaultRate: number; // hourly rate fallback
  memberRates?: Record<string, number>; // userId -> hourly rate override
  includeComments?: boolean;
};

/**
 * Generate an Excel invoice from a time report (owner only).
 * The owner supplies rates (default and/or per member), tax, and billing details.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (!(await isProjectOwner(params.projectId, user.id))) {
      return jsonError("Only the project owner can generate invoices for this project.", 403);
    }
    const body = (await req.json().catch(() => null)) as InvoiceBody | null;
    if (!body) return jsonError("Invalid request body.");

    const { from, to } = body;
    if (!isValidDateString(from) || !isValidDateString(to) || from > to) {
      return jsonError("Valid from/to dates are required.");
    }
    const invoiceNumber = String(body.invoiceNumber || "").trim();
    if (!invoiceNumber) return jsonError("Invoice number is required.");
    const invoiceDate = isValidDateString(body.invoiceDate || "")
      ? body.invoiceDate
      : new Date().toISOString().slice(0, 10);
    const billTo = String(body.billTo || "").trim();
    if (!billTo) return jsonError("Bill-to details are required.");

    const defaultRate = Number(body.defaultRate);
    if (!Number.isFinite(defaultRate) || defaultRate < 0) {
      return jsonError("A valid default hourly rate is required.");
    }
    const memberRates: Record<string, number> = {};
    if (body.memberRates && typeof body.memberRates === "object") {
      for (const [uid, r] of Object.entries(body.memberRates)) {
        const rate = Number(r);
        if (Number.isFinite(rate) && rate >= 0) memberRates[uid] = rate;
      }
    }
    const taxRate = Number.isFinite(Number(body.taxRate)) ? Math.max(0, Number(body.taxRate)) : 0;
    const taxLabel = String(body.taxLabel || "GST (5%)").trim() || "Tax";
    const currency = String(body.currency || "CAD").trim().toUpperCase().slice(0, 3) || "CAD";

    const report = await buildReport(params.projectId, from, to);
    if (!report) return jsonError("Project not found.", 404);
    if (report.totalMinutes === 0) {
      return jsonError("There is no time charged in this period, so there is nothing to invoice.");
    }

    // Line items: one per team member (hours × rate).
    const lines = report.memberSummaries.map((m) => {
      const rate = memberRates[m.userId] ?? defaultRate;
      const hours = minutesToHoursNumber(m.minutes);
      return {
        description: `Professional services — ${m.name || m.email.split("@")[0]} (${report.project.name})`,
        hours,
        rate,
        amount: Math.round(hours * rate * 100) / 100,
      };
    });
    const subtotal = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const wb = new ExcelJS.Workbook();
    wb.creator = "SurePath Time Tracker";
    const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true } });
    ws.columns = [{ width: 52 }, { width: 12 }, { width: 14 }, { width: 16 }];
    const money = `"${currency}" #,##0.00`;

    // Header band
    ws.mergeCells("A1:D1");
    const t = ws.getCell("A1");
    t.value = "INVOICE";
    t.font = { bold: true, size: 20, color: { argb: "FFFFFFFF" } };
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    t.alignment = { vertical: "middle", indent: 1 };
    ws.getRow(1).height = 36;

    ws.mergeCells("A2:D2");
    const band = ws.getCell("A2");
    band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
    ws.getRow(2).height = 4;

    // From / details
    ws.getCell("A4").value =
      body.companyDetails?.trim() ||
      "SurePath Valuation & Advisory Professional Corporation\nSherwood Park, Alberta";
    ws.getCell("A4").alignment = { wrapText: true, vertical: "top" };
    ws.getCell("A4").font = { bold: true, color: { argb: NAVY } };
    ws.mergeCells("A4:B7");

    const details: Array<[string, string]> = [
      ["Invoice #", invoiceNumber],
      ["Invoice date", invoiceDate],
      ["Due date", isValidDateString(body.dueDate || "") ? body.dueDate! : "On receipt"],
      ["Period", `${from} to ${to}`],
    ];
    details.forEach(([k, v], i) => {
      const row = ws.getRow(4 + i);
      row.getCell(3).value = k;
      row.getCell(3).font = { bold: true, color: { argb: NAVY } };
      row.getCell(4).value = v;
      row.getCell(4).alignment = { horizontal: "right" };
    });

    ws.getCell("A9").value = "Bill to:";
    ws.getCell("A9").font = { bold: true, color: { argb: NAVY } };
    ws.mergeCells("A10:B13");
    ws.getCell("A10").value = billTo;
    ws.getCell("A10").alignment = { wrapText: true, vertical: "top" };

    // Line items
    const headIdx = 15;
    const head = ws.getRow(headIdx);
    ["Description", "Hours", "Rate", "Amount"].forEach((h, i) => {
      const c = head.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      if (i > 0) c.alignment = { horizontal: "right" };
    });

    lines.forEach((l, i) => {
      const row = ws.getRow(headIdx + 1 + i);
      row.getCell(1).value = l.description;
      row.getCell(2).value = l.hours;
      row.getCell(2).numFmt = "0.00";
      row.getCell(2).alignment = { horizontal: "right" };
      row.getCell(3).value = l.rate;
      row.getCell(3).numFmt = money;
      row.getCell(3).alignment = { horizontal: "right" };
      row.getCell(4).value = l.amount;
      row.getCell(4).numFmt = money;
      row.getCell(4).alignment = { horizontal: "right" };
      if (i % 2 === 1) {
        for (let c = 1; c <= 4; c++) {
          row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
        }
      }
    });

    let rowIdx = headIdx + 1 + lines.length;
    const totals: Array<[string, number, boolean]> = [
      ["Subtotal", subtotal, false],
      ...(taxRate > 0 ? ([[taxLabel, tax, false]] as Array<[string, number, boolean]>) : []),
      [`Total due (${currency})`, total, true],
    ];
    totals.forEach(([label, value, strong]) => {
      const row = ws.getRow(++rowIdx);
      row.getCell(3).value = label;
      row.getCell(3).font = { bold: true, color: { argb: strong ? "FFFFFFFF" : NAVY } };
      row.getCell(4).value = value;
      row.getCell(4).numFmt = money;
      row.getCell(4).alignment = { horizontal: "right" };
      row.getCell(4).font = strong ? { bold: true, color: { argb: "FFFFFFFF" } } : { bold: true };
      if (strong) {
        row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
        row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      }
    });

    if (body.notes?.trim()) {
      rowIdx += 2;
      ws.getCell(`A${rowIdx}`).value = "Notes";
      ws.getCell(`A${rowIdx}`).font = { bold: true, color: { argb: NAVY } };
      ws.mergeCells(`A${rowIdx + 1}:D${rowIdx + 3}`);
      ws.getCell(`A${rowIdx + 1}`).value = body.notes.trim();
      ws.getCell(`A${rowIdx + 1}`).alignment = { wrapText: true, vertical: "top" };
    }

    // Optional appendix with the detailed time entries + comments backing the invoice.
    if (body.includeComments !== false) {
      const det = wb.addWorksheet("Time Detail");
      det.columns = [{ width: 14 }, { width: 28 }, { width: 10 }, { width: 70 }];
      const dh = det.getRow(1);
      ["Date", "Team Member", "Hours", "Work Comments"].forEach((h, i) => {
        const c = dh.getCell(i + 1);
        c.value = h;
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      });
      report.entries.forEach((e, i) => {
        const row = det.getRow(2 + i);
        row.getCell(1).value = e.date;
        row.getCell(2).value = e.userName || e.userEmail.split("@")[0];
        row.getCell(3).value = minutesToHoursNumber(e.minutes);
        row.getCell(3).numFmt = "0.00";
        row.getCell(4).value = e.comment || "";
        row.getCell(4).alignment = { wrapText: true, vertical: "top" };
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const safeNum = invoiceNumber.replace(/[^\w\-]+/g, "_");
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Invoice_${safeNum}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
