"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, formatDateLong, formatMinutes, startOfWeek, todayString } from "@/lib/time";

type Project = { id: string; name: string; client: string | null; myRole: string };
type MemberSummary = { userId: string; email: string; name: string | null; minutes: number };
type ReportEntry = {
  id: string;
  date: string;
  minutes: number;
  comment: string | null;
  userEmail: string;
  userName: string | null;
};
type Report = {
  project: { id: string; name: string; client: string | null; billable: boolean };
  from: string;
  to: string;
  entries: ReportEntry[];
  memberSummaries: MemberSummary[];
  totalMinutes: number;
};

function hours(min: number) {
  return Math.round((min / 60) * 100) / 100;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="card p-10 text-center text-slate-400">Loading…</div>}>
      <ReportsInner />
    </Suspense>
  );
}

function ReportsInner() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState(() => startOfWeek(todayString()));
  const [to, setTo] = useState(() => addDays(startOfWeek(todayString()), 6));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);

  // Only projects I own can produce reports.
  const ownedProjects = useMemo(() => projects.filter((p) => p.myRole === "OWNER"), [projects]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const list: Project[] = (await res.json()).projects;
        setProjects(list);
        const preselect = searchParams.get("project");
        const owned = list.filter((p) => p.myRole === "OWNER");
        if (preselect && owned.some((p) => p.id === preselect)) setProjectId(preselect);
        else if (owned.length) setProjectId(owned[0].id);
      }
    })();
  }, [searchParams]);

  const runReport = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/reports/${projectId}?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not build the report.");
        return;
      }
      setReport(data.report);
    } finally {
      setLoading(false);
    }
  }, [projectId, from, to]);

  function downloadExcel() {
    window.location.href = `/api/reports/${projectId}/excel?from=${from}&to=${to}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surepath-900">Reports &amp; Invoices</h1>
        <p className="text-sm text-slate-500">
          Extract time charged with comments for projects you own, then export to Excel or generate an
          invoice.
        </p>
      </div>

      {ownedProjects.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          You don&apos;t own any projects. Only project owners can extract reports and invoices.
        </div>
      ) : (
        <>
          <div className="card mb-6 p-5">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="label">Project</label>
                <select
                  className="input"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {ownedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.client ? ` — ${p.client}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">From</label>
                <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={runReport} disabled={loading || !projectId}>
                {loading ? "Building…" : "Run report"}
              </button>
              {report && report.totalMinutes > 0 && (
                <>
                  <button className="btn-secondary" onClick={downloadExcel}>
                    ⬇ Export to Excel
                  </button>
                  <button className="btn-primary" onClick={() => setShowInvoice(true)}>
                    Generate invoice
                  </button>
                </>
              )}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {report && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total time" value={formatMinutes(report.totalMinutes)} sub={`${hours(report.totalMinutes)} hours`} />
                <StatCard label="Team members" value={String(report.memberSummaries.length)} sub="with logged time" />
                <StatCard label="Entries" value={String(report.entries.length)} sub={`${formatDateLong(report.from)} – ${formatDateLong(report.to)}`} />
              </div>

              {report.memberSummaries.length > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 text-lg font-semibold text-surepath-900">Summary by member</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="py-2">Member</th>
                        <th className="py-2">Email</th>
                        <th className="py-2 text-right">Hours</th>
                        <th className="py-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.memberSummaries.map((m) => (
                        <tr key={m.userId} className="border-b border-slate-100">
                          <td className="py-2 font-medium text-surepath-900">{m.name || m.email.split("@")[0]}</td>
                          <td className="py-2 text-slate-500">{m.email}</td>
                          <td className="py-2 text-right">{hours(m.minutes)}</td>
                          <td className="py-2 text-right">{formatMinutes(m.minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="card p-5">
                <h2 className="mb-3 text-lg font-semibold text-surepath-900">Detailed entries with comments</h2>
                {report.entries.length === 0 ? (
                  <p className="text-sm text-slate-400">No time charged in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-slate-500">
                          <th className="py-2">Date</th>
                          <th className="py-2">Member</th>
                          <th className="py-2 text-right">Duration</th>
                          <th className="py-2">Work comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.entries.map((e) => (
                          <tr key={e.id} className="border-b border-slate-100 align-top">
                            <td className="py-2 whitespace-nowrap text-slate-600">{e.date}</td>
                            <td className="py-2 whitespace-nowrap font-medium text-surepath-900">
                              {e.userName || e.userEmail.split("@")[0]}
                            </td>
                            <td className="py-2 text-right">{formatMinutes(e.minutes)}</td>
                            <td className="py-2 text-slate-600">{e.comment || <span className="text-slate-300">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {showInvoice && report && (
            <InvoiceModal
              projectId={projectId}
              report={report}
              onClose={() => setShowInvoice(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-surepath-900">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function InvoiceModal({
  projectId,
  report,
  onClose,
}: {
  projectId: string;
  report: Report;
  onClose: () => void;
}) {
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  );
  const [invoiceDate, setInvoiceDate] = useState(todayString());
  const [dueDate, setDueDate] = useState(addDays(todayString(), 30));
  const [billTo, setBillTo] = useState(report.project.client || "");
  const [companyDetails, setCompanyDetails] = useState(
    "SurePath Valuation & Advisory Professional Corporation\nSherwood Park, Alberta"
  );
  const [currency, setCurrency] = useState("CAD");
  const [defaultRate, setDefaultRate] = useState("250");
  const [taxLabel, setTaxLabel] = useState("GST (5%)");
  const [taxRate, setTaxRate] = useState("5");
  const [notes, setNotes] = useState("");
  const [includeComments, setIncludeComments] = useState(true);
  const [memberRates, setMemberRates] = useState<Record<string, string>>(
    Object.fromEntries(report.memberSummaries.map((m) => [m.userId, "250"]))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    const rate = Number(defaultRate) || 0;
    let subtotal = 0;
    for (const m of report.memberSummaries) {
      const r = Number(memberRates[m.userId] ?? defaultRate) || 0;
      subtotal += hours(m.minutes) * r;
    }
    void rate;
    const tax = subtotal * ((Number(taxRate) || 0) / 100);
    return { subtotal, tax, total: subtotal + tax };
  }, [defaultRate, memberRates, taxRate, report.memberSummaries]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${projectId}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: report.from,
          to: report.to,
          invoiceNumber,
          invoiceDate,
          dueDate,
          billTo,
          companyDetails,
          currency,
          defaultRate: Number(defaultRate),
          memberRates: Object.fromEntries(
            Object.entries(memberRates).map(([k, v]) => [k, Number(v)])
          ),
          taxLabel,
          taxRate: Number(taxRate),
          notes,
          includeComments,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not generate the invoice.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoiceNumber.replace(/[^\w\-]+/g, "_")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surepath-950/50 p-4" onClick={onClose}>
      <div
        className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-surepath-900">Generate invoice — {report.project.name}</h3>
        <p className="text-sm text-slate-500">
          Period {report.from} to {report.to} · {hours(report.totalMinutes)} hours
        </p>
        <form onSubmit={generate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Invoice #</label>
              <input className="input" required value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <label className="label">Invoice date</label>
              <input type="date" className="input" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Bill to *</label>
              <textarea className="input min-h-[70px]" required value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Client name & address" />
            </div>
            <div>
              <label className="label">From (your details)</label>
              <textarea className="input min-h-[70px]" value={companyDetails} onChange={(e) => setCompanyDetails(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Rates per member ({currency}/hour)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Default</span>
                <input
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultRate}
                  onChange={(e) => {
                    setDefaultRate(e.target.value);
                    setMemberRates((prev) =>
                      Object.fromEntries(Object.keys(prev).map((k) => [k, e.target.value]))
                    );
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {report.memberSummaries.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 text-slate-700">
                    {m.name || m.email.split("@")[0]}{" "}
                    <span className="text-slate-400">({hours(m.minutes)}h)</span>
                  </span>
                  <input
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    value={memberRates[m.userId] ?? defaultRate}
                    onChange={(e) =>
                      setMemberRates((prev) => ({ ...prev, [m.userId]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Currency</label>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
            </div>
            <div>
              <label className="label">Tax label</label>
              <input className="input" value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} />
            </div>
            <div>
              <label className="label">Tax rate (%)</label>
              <input className="input" type="number" min="0" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, thank-you note, etc." />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={includeComments} onChange={(e) => setIncludeComments(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Include time detail with work comments as an appendix sheet
          </label>

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{currency} {preview.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{taxLabel}</span>
              <span>{currency} {preview.tax.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold text-surepath-900">
              <span>Total</span>
              <span>{currency} {preview.total.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Generating…" : "⬇ Generate invoice (Excel)"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
