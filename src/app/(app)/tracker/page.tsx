"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  formatDateShort,
  formatMinutes,
  parseDuration,
  startOfWeek,
  todayString,
  weekDates,
} from "@/lib/time";

type Project = {
  id: string;
  name: string;
  client: string | null;
  color: string;
  myRole: string;
};

type Entry = {
  id: string;
  projectId: string;
  date: string;
  minutes: number;
  comment: string | null;
  project: { id: string; name: string; color: string; client: string | null };
};

type ModalState =
  | { mode: "add"; projectId: string; date: string }
  | { mode: "edit"; entry: Entry }
  | null;

export default function TrackerPage() {
  const [monday, setMonday] = useState(() => startOfWeek(todayString()));
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const days = useMemo(() => weekDates(monday), [monday]);
  const today = todayString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes] = await Promise.all([
        fetch("/api/projects"),
        fetch(`/api/entries?from=${monday}&to=${addDays(monday, 6)}`),
      ]);
      if (pRes.ok) setProjects((await pRes.json()).projects);
      if (eRes.ok) setEntries((await eRes.json()).entries);
    } finally {
      setLoading(false);
    }
  }, [monday]);

  useEffect(() => {
    load();
  }, [load]);

  // Rows: every project I belong to, plus any project I have entries for this week.
  const rowProjects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; client: string | null; color: string }>();
    for (const p of projects) map.set(p.id, p);
    for (const e of entries) if (!map.has(e.projectId)) map.set(e.projectId, e.project);
    return [...map.values()];
  }, [projects, entries]);

  const cellEntries = useCallback(
    (projectId: string, date: string) => entries.filter((e) => e.projectId === projectId && e.date === date),
    [entries]
  );

  const dayTotal = (date: string) =>
    entries.filter((e) => e.date === date).reduce((s, e) => s + e.minutes, 0);
  const projectTotal = (projectId: string) =>
    entries.filter((e) => e.projectId === projectId).reduce((s, e) => s + e.minutes, 0);
  const weekTotal = entries.reduce((s, e) => s + e.minutes, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Time Tracker</h1>
          <p className="text-sm text-slate-500">
            Week of {formatDateShort(monday)} – {formatDateShort(addDays(monday, 6))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setMonday(addDays(monday, -7))}>
            ← Prev
          </button>
          <button className="btn-secondary" onClick={() => setMonday(startOfWeek(todayString()))}>
            This week
          </button>
          <button className="btn-secondary" onClick={() => setMonday(addDays(monday, 7))}>
            Next →
          </button>
          <div className="ml-3 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
            Week total: {formatMinutes(weekTotal)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-400">Loading…</div>
      ) : rowProjects.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500">
            You are not a member of any project yet. Create a project (or ask a project owner to add
            you) to start tracking time.
          </p>
          <a href="/projects" className="btn-gold mt-4">
            Go to Projects
          </a>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-navy-950 text-left text-white">
                <th className="w-56 px-4 py-3 font-semibold">Project</th>
                {days.map((d) => (
                  <th
                    key={d}
                    className={`px-2 py-3 text-center font-semibold ${d === today ? "text-gold-300" : ""}`}
                  >
                    {formatDateShort(d)}
                  </th>
                ))}
                <th className="w-20 px-3 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {rowProjects.map((p) => (
                <tr key={p.id} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <div>
                        <div className="font-medium text-navy-900">{p.name}</div>
                        {p.client && <div className="text-xs text-slate-400">{p.client}</div>}
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const cell = cellEntries(p.id, d);
                    return (
                      <td key={d} className={`px-1.5 py-2 ${d === today ? "bg-gold-50" : ""}`}>
                        <div className="flex min-h-[52px] flex-col items-stretch gap-1">
                          {cell.map((e) => (
                            <button
                              key={e.id}
                              title={e.comment || "No comment"}
                              onClick={() => setModal({ mode: "edit", entry: e })}
                              className="group rounded border border-navy-200 bg-navy-50 px-2 py-1 text-left transition hover:border-navy-400"
                            >
                              <span className="font-semibold text-navy-800">
                                {formatMinutes(e.minutes)}
                              </span>
                              {e.comment && (
                                <span className="ml-1 block truncate text-[11px] text-slate-500">
                                  {e.comment}
                                </span>
                              )}
                            </button>
                          ))}
                          <button
                            onClick={() => setModal({ mode: "add", projectId: p.id, date: d })}
                            className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 transition hover:border-navy-400 hover:text-navy-600"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-right font-semibold text-navy-900">
                    {projectTotal(p.id) > 0 ? formatMinutes(projectTotal(p.id)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-navy-900 bg-slate-50 font-semibold text-navy-900">
                <td className="px-4 py-3">Daily total</td>
                {days.map((d) => (
                  <td key={d} className="px-2 py-3 text-center">
                    {dayTotal(d) > 0 ? formatMinutes(dayTotal(d)) : "—"}
                  </td>
                ))}
                <td className="px-3 py-3 text-right">{formatMinutes(weekTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Tip: click <span className="font-semibold">+</span> in any cell to log time. Durations accept
        formats like <code>1:30</code>, <code>1.5</code>, or <code>90m</code>. Click an entry to edit
        or delete it.
      </p>

      {modal && (
        <EntryModal
          modal={modal}
          projects={rowProjects}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EntryModal({
  modal,
  projects,
  onClose,
  onSaved,
}: {
  modal: NonNullable<ModalState>;
  projects: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = modal.mode === "edit" ? modal.entry : null;
  const [duration, setDuration] = useState(editing ? formatMinutes(editing.minutes) : "");
  const [comment, setComment] = useState(editing?.comment || "");
  const [date, setDate] = useState(editing ? editing.date : modal.mode === "add" ? modal.date : "");
  const [projectId] = useState(editing ? editing.projectId : modal.mode === "add" ? modal.projectId : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const projectName = projects.find((p) => p.id === projectId)?.name || "Project";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const minutes = parseDuration(duration);
    if (minutes === null) {
      setError("Enter a duration like 1:30, 1.5 or 90m (up to 24h).");
      return;
    }
    setBusy(true);
    try {
      const res = editing
        ? await fetch(`/api/entries/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes, comment, date }),
          })
        : await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, date, minutes, comment }),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save the entry.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("Delete this time entry?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/entries/${editing.id}`, { method: "DELETE" });
      if (res.ok) onSaved();
      else setError("Could not delete the entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-navy-900">
          {editing ? "Edit time entry" : "Log time"} · {projectName}
        </h3>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={date}
                required
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Duration</label>
              <input
                className="input"
                placeholder="e.g. 1:30"
                value={duration}
                required
                autoFocus
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Comment — what did you work on?</label>
            <textarea
              className="input min-h-[90px]"
              placeholder="Describe the work done…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            {editing ? (
              <button type="button" className="btn-danger" disabled={busy} onClick={remove}>
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
