"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Member = { id: string; email: string; name: string | null; role: string };
type Project = {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  color: string;
  billable: boolean;
  archived: boolean;
  myRole: string;
  members: Member[];
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("MEMBER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) setProject((await res.json()).project);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = project?.myRole === "OWNER";

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add member.");
        return;
      }
      setNewEmail("");
      setNewRole("MEMBER");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: string) {
    await fetch(`/api/projects/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: project!.members.find((m) => m.id === userId)!.email, role }),
    });
    load();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    const res = await fetch(`/api/projects/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Could not remove member.");
    }
    load();
  }

  async function deleteProject() {
    if (!confirm("Delete this project and all its time entries? This cannot be undone.")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
    else alert("Could not delete the project.");
  }

  if (loading) return <div className="card p-10 text-center text-slate-400">Loading…</div>;
  if (notFound || !project)
    return (
      <div className="card p-10 text-center">
        <p className="text-slate-500">Project not found or you don&apos;t have access.</p>
        <Link href="/projects" className="btn-secondary mt-4">
          Back to Projects
        </Link>
      </div>
    );

  return (
    <div className="max-w-4xl">
      <Link href="/projects" className="text-sm text-navy-600 hover:underline">
        ← All projects
      </Link>
      <div className="mt-2 mb-6 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color }} />
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{project.name}</h1>
            <p className="text-sm text-slate-500">
              {project.client || "No client"} · {project.billable ? "Billable" : "Non-billable"}
              {project.archived && " · Archived"}
            </p>
          </div>
        </div>
        {isOwner && (
          <Link href={`/reports?project=${project.id}`} className="btn-primary">
            Reports &amp; Invoices
          </Link>
        )}
      </div>

      {project.description && (
        <div className="card mb-6 p-5">
          <p className="text-sm text-slate-600">{project.description}</p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-navy-900">Team Members</h2>
        <p className="text-sm text-slate-500">
          Only members can log time to this project. Owners can extract reports and invoices.
        </p>

        <div className="mt-4 divide-y divide-slate-100">
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-navy-900">{m.name || m.email.split("@")[0]}</div>
                <div className="text-xs text-slate-400">{m.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="OWNER">Owner</option>
                  </select>
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      m.role === "OWNER"
                        ? "bg-gold-100 text-gold-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {m.role === "OWNER" ? "Owner" : "Member"}
                  </span>
                )}
                {isOwner && (
                  <button
                    className="text-sm text-red-500 hover:text-red-700"
                    onClick={() => removeMember(m.id)}
                    title="Remove member"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {isOwner && (
          <form onSubmit={addMember} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
            <div className="flex-1 min-w-[220px]">
              <label className="label">Add member by email</label>
              <input
                type="email"
                className="input"
                placeholder="colleague@surepathvaluation.ca"
                value={newEmail}
                required
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="OWNER">Owner</option>
            </select>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add"}
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {isOwner && (
        <div className="card mt-6 border-red-100 p-5">
          <h2 className="text-lg font-semibold text-navy-900">Danger zone</h2>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Delete this project</p>
              <p className="text-xs text-slate-400">
                Permanently removes the project and all time entries.
              </p>
            </div>
            <button className="btn-danger" onClick={deleteProject}>
              Delete project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
