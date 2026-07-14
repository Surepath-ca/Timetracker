"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Member = { id: string; email: string; name: string | null; role: string };
type Project = {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  color: string;
  billable: boolean;
  myRole: string;
  entryCount: number;
  members: Member[];
};

const COLORS = ["#16324f", "#2b578a", "#3a6fa5", "#c9a227", "#ad7f1f", "#2f7d5f", "#7a3f6d", "#a13d3d"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects((await res.json()).projects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Projects</h1>
          <p className="text-sm text-slate-500">
            Create engagements, add team members, and manage ownership.
          </p>
        </div>
        <button className="btn-gold" onClick={() => setShowNew(true)}>
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-slate-400">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500">No projects yet. Create your first engagement to get started.</p>
          <button className="btn-gold mt-4" onClick={() => setShowNew(true)}>
            + New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card group p-5 transition hover:border-navy-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <h3 className="font-semibold text-navy-900 group-hover:text-navy-700">{p.name}</h3>
                </div>
                {p.myRole === "OWNER" && (
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-gold-800">
                    Owner
                  </span>
                )}
              </div>
              {p.client && <p className="mt-1 text-sm text-slate-500">{p.client}</p>}
              {p.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">{p.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {p.members.length} member{p.members.length !== 1 ? "s" : ""}
                </span>
                <span>
                  {p.entryCount} {p.entryCount === 1 ? "entry" : "entries"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [billable, setBillable] = useState(true);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, client, description, color, billable, ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the project.");
        return;
      }
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-navy-900">New Project</h3>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="label">Project name *</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <input className="input" value={client} onChange={(e) => setClient(e.target.value)} />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full ring-offset-1 transition ${
                      color === c ? "ring-2 ring-navy-900" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[70px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Project owner</label>
            <input
              className="input"
              type="email"
              placeholder="Leave blank to make yourself the owner"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              The owner can manage members and extract time reports &amp; invoices. Must be a SurePath
              email.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Billable project
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
