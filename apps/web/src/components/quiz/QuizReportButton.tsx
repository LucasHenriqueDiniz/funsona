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
      className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-red-500 transition disabled:text-red-500 disabled:opacity-70"
      title="Denunciar este quiz"
    >
      {reported ? "Quiz denunciado" : "Denunciar quiz"}
    </button>
  );
}
