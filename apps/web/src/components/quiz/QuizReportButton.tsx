import { useState } from "react";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

interface QuizReportButtonProps {
  quizId: string;
  currentUserId?: string | null;
}

export default function QuizReportButton({ quizId, currentUserId }: QuizReportButtonProps) {
  const [reported, setReported] = useState(false);

  if (!currentUserId) return null;

  async function handleReport() {
    if (reported) return;
    try {
      const res = await fetch(`${PUBLIC_API_BASE_URL}/quizzes/${quizId}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) setReported(true);
    } catch {
      // silent — reporting isn't critical-path
    }
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
