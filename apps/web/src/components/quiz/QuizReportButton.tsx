import { useState } from "react";
import { apiFetch } from "@/lib/auth-fetch";

interface QuizReportButtonProps {
  quizId: string;
  currentUserId?: string | null;
}

export default function QuizReportButton({ quizId, currentUserId }: QuizReportButtonProps) {
  const [reported, setReported] = useState(false);

  if (!currentUserId) return null;

  async function handleReport() {
    if (reported) return;
    // Silent on failure — reporting isn't critical-path.
    const res = await apiFetch(`/quizzes/${quizId}/report`, {
      method: "POST",
      auth: "required",
      body: JSON.stringify({}),
    });
    if (!res.error) setReported(true);
  }

  return (
    <button
      onClick={handleReport}
      disabled={reported}
      aria-label="Denunciar quiz"
      title="Denunciar este quiz"
      className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-xs font-bold text-[var(--color-text-muted)] transition hover:border-red-500/30 hover:text-red-500 disabled:text-red-500 disabled:opacity-70"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21V4h12l-2 4 2 4H5" />
      </svg>
      {reported ? "Denunciado" : "Denunciar"}
    </button>
  );
}
