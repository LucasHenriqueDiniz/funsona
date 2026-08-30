import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth-fetch";

// target_type and target arrive as separate columns, so neither narrows the other
// on its own. Pairing them in a discriminated union is what lets report.target
// resolve to the right shape once target_type has been checked.
type Report = {
  id: string;
  target_id: string;
  reason: string | null;
  created_at: string;
  reporter: { handle: string; display_name: string } | null;
} & (
  | {
      target_type: "comment";
      target: { content: string; quiz_id: string; hidden: boolean; deleted_at: string | null } | null;
    }
  | { target_type: "quiz"; target: { title: string; slug: string; status: string } | null }
);

export default function ModerationQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    setError("");
    const res = await apiFetch<Report[]>("/moderation/reports", { auth: "required" });
    if (res.data) {
      setReports(res.data);
    } else {
      setError(res.error || "Erro ao carregar denúncias");
    }
    setLoading(false);
  }

  async function handleHide(report: Report) {
    setActingId(report.id);
    try {
      const path =
        report.target_type === "comment"
          ? `/quizzes/_/comments/${report.target_id}/hide`
          : `/quizzes/${report.target_id}/hide`;
      const res = await apiFetch(path, { method: "POST", auth: "required" });
      if (!res.error) {
        setReports((prev) => prev.filter((r) => r.id !== report.id));
      }
    } finally {
      setActingId(null);
    }
  }

  if (loading) return <p className="text-[var(--color-text-muted)]">Carregando…</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (reports.length === 0) return <p className="text-[var(--color-text-muted)]">Nenhuma denúncia pendente.</p>;

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div
          key={report.id}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5"
        >
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            <span>{report.target_type === "comment" ? "Comentário" : "Quiz"}</span>
            <span>{new Date(report.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <p className="mb-2 font-medium text-[var(--color-text-primary)]">
            {report.target_type === "comment"
              ? report.target?.content || "(conteúdo não encontrado)"
              : report.target?.title || "(quiz não encontrado)"}
          </p>
          {report.reason && (
            <p className="mb-3 text-sm text-[var(--color-text-secondary)]">Motivo: {report.reason}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleHide(report)}
              disabled={actingId === report.id}
              className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {actingId === report.id ? "Ocultando…" : "Ocultar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
